import * as mysql from "mysql2/promise";
export { mysql };
import crypto from "crypto";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

export async function initDatabase() {
  if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.warn("[DB] Credenciais ausentes; MySQL não inicializado.");
    return false;
  }
  const c = await pool.getConnection();
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [rows]: any = await c.query("SELECT name FROM migrations");
    const done = new Set(rows.map((r:any)=>r.name));
    if (!done.has("001_users_sessions")) {
      await c.beginTransaction();
      await c.query(`CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE,
        phone VARCHAR(30) NULL, password_hash VARCHAR(255) NOT NULL,
        plan VARCHAR(30) NOT NULL DEFAULT 'start', status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query(`CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id), INDEX(expires_at),
        CONSTRAINT fk_sessions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query("INSERT INTO migrations(name) VALUES (?)",["001_users_sessions"]);
      await c.commit();
    }
    if (!done.has("002_saas_billing_instances")) {
      await c.beginTransaction();
      await c.query(`ALTER TABLE users ADD COLUMN cpf_cnpj VARCHAR(20) NULL`).catch(()=>{});
      await c.query(`ALTER TABLE users MODIFY status VARCHAR(30) NOT NULL DEFAULT 'pending_payment'`);
      await c.query(`CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
        plan_id VARCHAR(30) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'pending',
        asaas_customer_id VARCHAR(80) NULL, asaas_subscription_id VARCHAR(80) NULL,
        current_payment_id VARCHAR(80) NULL, next_due_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_subscription_user(user_id), INDEX(status), INDEX(current_payment_id),
        CONSTRAINT fk_subscription_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query(`CREATE TABLE IF NOT EXISTS evolution_instances (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
        instance_name VARCHAR(120) NOT NULL UNIQUE, status VARCHAR(30) NOT NULL DEFAULT 'disconnected',
        owner_phone VARCHAR(30) NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_instance_user(user_id),
        CONSTRAINT fk_instance_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query(`CREATE TABLE IF NOT EXISTS payment_events (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_key VARCHAR(190) NOT NULL UNIQUE,
        event_type VARCHAR(80) NOT NULL, payment_id VARCHAR(80) NULL, payload_json LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(payment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query("INSERT INTO migrations(name) VALUES (?)",["002_saas_billing_instances"]);
      await c.commit();
    }
    console.log("[DB] MySQL conectado e migrations atualizadas.");
    return true;
  } catch(e){ await c.rollback(); throw e; } finally { c.release(); }
}
function hashPassword(password:string,salt=crypto.randomBytes(16).toString("hex")){
  const hash=crypto.scryptSync(password,salt,64).toString("hex"); return `${salt}:${hash}`;
}
function verifyPassword(password:string,stored:string){
  const [salt,hash]=stored.split(":"); if(!salt||!hash)return false;
  const test=crypto.scryptSync(password,salt,64); const saved=Buffer.from(hash,"hex");
  return saved.length===test.length && crypto.timingSafeEqual(saved,test);
}
export async function registerUser(name:string,email:string,phone:string,password:string){
  const passwordHash=hashPassword(password);
  const [r]:any=await pool.execute("INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)",[name,email.toLowerCase(),phone,passwordHash]);
  return {id:r.insertId,name,email:email.toLowerCase(),phone,plan:"start"};
}
export async function loginUser(email:string,password:string){
  const [rows]:any=await pool.execute("SELECT id,name,email,phone,password_hash,plan,status FROM users WHERE email=? LIMIT 1",[email.toLowerCase()]);
  const u=rows[0]; if(!u||u.status!=="active"||!verifyPassword(password,u.password_hash)) return null;
  const token=crypto.randomBytes(32).toString("hex"), tokenHash=crypto.createHash("sha256").update(token).digest("hex");
  await pool.execute("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL 30 DAY))",[u.id,tokenHash]);
  delete u.password_hash; return {user:u,token};
}
export async function databaseHealth(){ const [r]:any=await pool.query("SELECT DATABASE() db, NOW() now"); return r[0]; }

export async function getUserByToken(token:string){
  const h=crypto.createHash("sha256").update(token).digest("hex");
  const [rows]:any=await pool.execute(`SELECT u.id,u.name,u.email,u.phone,u.cpf_cnpj,u.plan,u.status
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() LIMIT 1`,[h]);
  return rows[0]||null;
}
export async function getUserInstance(userId:number){
  const [r]:any=await pool.execute("SELECT * FROM evolution_instances WHERE user_id=? LIMIT 1",[userId]); return r[0]||null;
}
export async function ensureUserInstance(userId:number){
  const existing=await getUserInstance(userId); if(existing) return existing;
  const name=`grolpy-u${userId}-${crypto.randomBytes(5).toString("hex")}`;
  await pool.execute("INSERT INTO evolution_instances(user_id,instance_name,status) VALUES(?,?,'disconnected')",[userId,name]);
  return getUserInstance(userId);
}
export async function setUserInstanceStatus(userId:number,status:string,phone?:string){
  await pool.execute("UPDATE evolution_instances SET status=?, owner_phone=COALESCE(?,owner_phone) WHERE user_id=?",[status,phone||null,userId]);
}
export async function setUserBillingIdentity(userId:number,cpfCnpj:string){ await pool.execute("UPDATE users SET cpf_cnpj=? WHERE id=?",[cpfCnpj,userId]); }
export async function upsertSubscription(userId:number,planId:string,data:any){
  await pool.execute(`INSERT INTO subscriptions(user_id,plan_id,status,asaas_customer_id,asaas_subscription_id,current_payment_id,next_due_date)
  VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id),status=VALUES(status),asaas_customer_id=COALESCE(VALUES(asaas_customer_id),asaas_customer_id),
  asaas_subscription_id=COALESCE(VALUES(asaas_subscription_id),asaas_subscription_id),current_payment_id=COALESCE(VALUES(current_payment_id),current_payment_id),
  next_due_date=COALESCE(VALUES(next_due_date),next_due_date)`,[userId,planId,data.status||"pending",data.customerId||null,data.subscriptionId||null,data.paymentId||null,data.nextDueDate||null]);
  await pool.execute("UPDATE users SET plan=?, status=? WHERE id=?",[planId,data.status==="active"?"active":"pending_payment",userId]);
}
export async function applyPaymentEvent(eventKey:string,eventType:string,payment:any){
  try{await pool.execute("INSERT INTO payment_events(event_key,event_type,payment_id,payload_json) VALUES(?,?,?,?)",[eventKey,eventType,payment?.id||null,JSON.stringify(payment||{})]);}catch(e:any){if(e?.code==="ER_DUP_ENTRY")return false;throw e;}
  const active=eventType==="PAYMENT_RECEIVED"||eventType==="PAYMENT_CONFIRMED";
  const overdue=eventType==="PAYMENT_OVERDUE";
  if(payment?.id && (active||overdue)){
    const status=active?"active":"overdue";
    await pool.execute("UPDATE subscriptions SET status=? WHERE current_payment_id=?",[status,payment.id]);
    await pool.execute(`UPDATE users u JOIN subscriptions s ON s.user_id=u.id SET u.status=? WHERE s.current_payment_id=?`,[active?"active":"suspended",payment.id]);
  }
  return true;
}
