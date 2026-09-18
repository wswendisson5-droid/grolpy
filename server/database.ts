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
    if (!done.has("003_user_campaigns")) {
      await c.query(`CREATE TABLE IF NOT EXISTS user_campaigns (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,client_id VARCHAR(80) NOT NULL,
        campaign_key VARCHAR(120) NOT NULL,name VARCHAR(190) NOT NULL,message TEXT NULL,media_url LONGTEXT NULL,
        config_json LONGTEXT NULL,status VARCHAR(30) NOT NULL DEFAULT 'draft',scheduled_at DATETIME NULL,
        interval_seconds INT NOT NULL DEFAULT 30,total_sent INT NOT NULL DEFAULT 0,total_failed INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_campaign(user_id,campaign_key),INDEX(user_id),INDEX(client_id),INDEX(status),
        CONSTRAINT fk_campaign_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query(`CREATE TABLE IF NOT EXISTS user_history (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,client_id VARCHAR(80) NOT NULL,
        campaign_key VARCHAR(120) NULL,group_jid VARCHAR(190) NULL,group_name VARCHAR(190) NULL,status VARCHAR(30) NOT NULL,
        error_text TEXT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,INDEX(user_id),INDEX(client_id),INDEX(campaign_key),
        CONSTRAINT fk_history_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query("INSERT INTO migrations(name) VALUES (?)",["003_user_campaigns"]);
    }
    if (!done.has("004_history_payload_groups")) {
      await c.query("ALTER TABLE user_history ADD COLUMN campaign_title VARCHAR(190) NULL").catch(()=>{});
      await c.query("ALTER TABLE user_history ADD COLUMN message_text TEXT NULL").catch(()=>{});
      await c.query("ALTER TABLE user_history ADD COLUMN media_url LONGTEXT NULL").catch(()=>{});
      await c.query("ALTER TABLE user_history ADD COLUMN media_type VARCHAR(30) NULL").catch(()=>{});
      await c.query("ALTER TABLE user_history ADD COLUMN duration VARCHAR(40) NULL").catch(()=>{});
      await c.query(`CREATE TABLE IF NOT EXISTS user_groups (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,group_jid VARCHAR(190) NOT NULL,
        group_name VARCHAR(190) NULL,members_count INT NOT NULL DEFAULT 0,selected TINYINT(1) NOT NULL DEFAULT 1,
        payload_json LONGTEXT NULL,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_group(user_id,group_jid),INDEX(user_id),
        CONSTRAINT fk_groups_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await c.query("INSERT INTO migrations(name) VALUES (?)",["004_history_payload_groups"]);
    }
    if (!done.has("005_roles_admin")) {
      await c.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'client'").catch(()=>{});
      await c.query("UPDATE users SET role='admin' WHERE id=1");
      await c.query("INSERT INTO migrations(name) VALUES (?)",["005_roles_admin"]);
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
  const [r]:any=await pool.execute("INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)",[name.trim(),email.trim().toLowerCase(),phone,passwordHash]);
  return {id:r.insertId,name,email:email.toLowerCase(),phone,plan:"start"};
}
export async function loginUser(email:string,password:string){
  const normalizedEmail=String(email||"").trim().toLowerCase();
  const [rows]:any=await pool.execute("SELECT id,name,email,phone,password_hash,plan,status,role FROM users WHERE LOWER(TRIM(email))=? LIMIT 1",[normalizedEmail]);
  const u=rows[0]; if(!u||!verifyPassword(String(password),u.password_hash)) return null;
  const token=crypto.randomBytes(32).toString("hex"), tokenHash=crypto.createHash("sha256").update(token).digest("hex");
  await pool.execute("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(), INTERVAL 30 DAY))",[u.id,tokenHash]);
  delete u.password_hash; return {user:u,token};
}
export async function databaseHealth(){ const [r]:any=await pool.query("SELECT DATABASE() db, NOW() now"); return r[0]; }

export async function getUserByToken(token:string){
  const h=crypto.createHash("sha256").update(token).digest("hex");
  const [rows]:any=await pool.execute(`SELECT u.id,u.name,u.email,u.phone,u.cpf_cnpj,u.plan,u.status,u.role
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

export async function saveCampaignForUser(userId:number,data:any){
 const clientId="client-"+userId; const key=String(data.id||data.campaignKey||("camp-"+Date.now()));
 await pool.execute(`INSERT INTO user_campaigns(user_id,client_id,campaign_key,name,message,media_url,config_json,status,scheduled_at,interval_seconds,total_sent,total_failed)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),message=VALUES(message),media_url=VALUES(media_url),config_json=VALUES(config_json),status=VALUES(status),scheduled_at=VALUES(scheduled_at),interval_seconds=VALUES(interval_seconds),total_sent=VALUES(total_sent),total_failed=VALUES(total_failed)`,
 [userId,clientId,key,data.title||data.name||"Divulgação",data.previewText||data.message||"",data.imageUrl||data.mediaUrl||null,JSON.stringify(data),data.status||"draft",data.scheduleDate||data.scheduledAt||null,Number(data.delaySeconds||data.intervalSeconds||30),Number(data.totalSent||0),Number(data.totalFailed||0)]);
 return key;
}
export async function listCampaignsForUser(userId:number){const [r]:any=await pool.execute("SELECT config_json FROM user_campaigns WHERE user_id=? ORDER BY created_at DESC",[userId]);return r.map((x:any)=>{try{return JSON.parse(x.config_json)}catch{return {}}});}
export async function deleteCampaignForUser(userId:number,key:string){const [r]:any=await pool.execute("DELETE FROM user_campaigns WHERE user_id=? AND campaign_key=?",[userId,key]);return r.affectedRows>0;}
export async function addHistoryForUser(userId:number,data:any){await pool.execute(`INSERT INTO user_history(user_id,client_id,campaign_key,campaign_title,group_jid,group_name,message_text,media_url,media_type,status,error_text,duration) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,[userId,"client-"+userId,data.campaignId||null,data.campaignTitle||null,data.groupJid||null,data.groupName||null,data.messageText||"",data.imageUrl||data.mediaUrl||null,data.mediaType||null,data.status||"unknown",data.error||null,data.duration||null]);}
export async function listHistoryForUser(userId:number,days=90){const [r]:any=await pool.execute("SELECT CAST(id AS CHAR) id,campaign_key AS campaignId,COALESCE(campaign_title,'Divulgação') campaignTitle,group_jid AS groupJid,COALESCE(group_name,'Grupo') groupName,COALESCE(message_text,'') messageText,media_url AS imageUrl,media_type AS mediaType,status,error_text AS error,duration,DATE_FORMAT(created_at,'%H:%i') timeFormatted,created_at AS timestamp FROM user_history WHERE user_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? DAY) ORDER BY created_at DESC",[userId,days]);return r;}
export async function saveGroupsForUser(userId:number,groups:any[]){for(const g of groups||[]){const jid=String(g.jid||g.id||g.groupJid||"");if(!jid)continue;await pool.execute(`INSERT INTO user_groups(user_id,group_jid,group_name,members_count,selected,payload_json) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE group_name=VALUES(group_name),members_count=VALUES(members_count),selected=VALUES(selected),payload_json=VALUES(payload_json)`,[userId,jid,g.name||g.subject||"Grupo",Number(g.membersCount||g.participants?.length||0),g.selected===false?0:1,JSON.stringify(g)]);}}
export async function listGroupsForUser(userId:number){const [r]:any=await pool.execute("SELECT payload_json FROM user_groups WHERE user_id=? ORDER BY updated_at DESC",[userId]);return r.map((x:any)=>{try{return JSON.parse(x.payload_json)}catch{return null}}).filter(Boolean);}

export async function getSubscriptionForUser(userId:number){const [r]:any=await pool.execute("SELECT * FROM subscriptions WHERE user_id=? LIMIT 1",[userId]);return r[0]||null;}
export async function setSubscriptionByPayment(paymentId:string,status:string,nextDueDate?:string){
 await pool.execute("UPDATE subscriptions SET status=?,next_due_date=COALESCE(?,next_due_date) WHERE current_payment_id=?",[status,nextDueDate||null,paymentId]);
}

export async function authDiagnostic(){
 const [u]:any=await pool.query("SELECT COUNT(*) total, SUM(password_hash IS NOT NULL AND password_hash<>'') with_password FROM users");
 const [ss]:any=await pool.query("SELECT COUNT(*) total FROM sessions WHERE expires_at>NOW()");
 return {users:Number(u[0]?.total||0),usersWithPassword:Number(u[0]?.with_password||0),activeSessions:Number(ss[0]?.total||0)};
}

export async function listAdminSubscriptions(){
 const [r]:any=await pool.query(`SELECT u.id AS user_id,u.name,u.email,u.phone,u.status AS user_status,u.created_at,
 s.plan_id,s.status AS subscription_status,s.next_due_date
 FROM users u LEFT JOIN subscriptions s ON s.user_id=u.id WHERE COALESCE(u.role,'client')='client' ORDER BY u.created_at DESC`);
 for(const x of r){
   try{const [c]:any=await pool.execute("SELECT COUNT(*) n FROM user_campaigns WHERE user_id=?",[x.user_id]);x.campaigns=Number(c[0]?.n||0)}catch{x.campaigns=0}
   try{const [h]:any=await pool.execute("SELECT COUNT(*) n FROM user_history WHERE user_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)",[x.user_id]);x.monthly_events=Number(h[0]?.n||0)}catch{x.monthly_events=0}
 }
 return r;
}
export async function adminSetSubscription(userId:number,action:string){
 if(action==="approve"){await pool.execute("UPDATE users SET status='active' WHERE id=?",[userId]);await pool.execute("UPDATE subscriptions SET status='active' WHERE user_id=?",[userId]);}
 else if(action==="suspend"){await pool.execute("UPDATE users SET status='suspended' WHERE id=?",[userId]);await pool.execute("UPDATE subscriptions SET status='suspended' WHERE user_id=?",[userId]);}
 else if(action==="renew"){await pool.execute("UPDATE users SET status='active' WHERE id=?",[userId]);await pool.execute("UPDATE subscriptions SET status='active',next_due_date=DATE_ADD(COALESCE(GREATEST(next_due_date,CURDATE()),CURDATE()),INTERVAL 1 MONTH) WHERE user_id=?",[userId]);}
 else throw new Error("INVALID_ACTION");
}

export async function createPendingTestSubscriber(data:any){
 const email=String(data.email).trim().toLowerCase(); let [rows]:any=await pool.execute("SELECT id,name,email,status FROM users WHERE email=? LIMIT 1",[email]); let user=rows[0];
 if(!user){user=await registerUser(String(data.name).trim(),email,String(data.phone||""),String(data.password));}
 await pool.execute("UPDATE users SET status='pending_payment',plan=? WHERE id=?",[data.planId||"start",user.id]);
 await pool.execute(`INSERT INTO subscriptions(user_id,plan_id,status,next_due_date) VALUES(?,?, 'pending', CURDATE())
 ON DUPLICATE KEY UPDATE plan_id=VALUES(plan_id),status='pending',next_due_date=CURDATE()`,[user.id,data.planId||"start"]);
 return {id:user.id,name:data.name,email,status:"pending_payment",planId:data.planId||"start"};
}
