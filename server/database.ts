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
  connectTimeout: 8000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: "utf8mb4",
});

// Keepalive periódico: evita que o LiteSpeed ou o cPanel derrubem conexões inativas
setInterval(async () => {
  try {
    if (process.env.DB_NAME && process.env.DB_USER) {
      await pool.query("SELECT 1");
    }
  } catch {}
}, 45000);

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
      await c.query("INSERT INTO migrations(name) VALUES (?)",["005_roles_admin"]);
    }
    if (!done.has("006_admin_accounts")) {
      await c.query("UPDATE users SET role='admin',status='active' WHERE LOWER(TRIM(email)) IN ('wswendisson5@gmail.com','mateus@gmail.com')");
      await c.query("INSERT INTO migrations(name) VALUES (?)",["006_admin_accounts"]);
    }
    if (!done.has("007_lock_admin_roles")) {
      await c.query("UPDATE users SET role='client' WHERE LOWER(TRIM(email)) NOT IN ('wswendisson5@gmail.com','mateus@gmail.com')");
      await c.query("UPDATE users SET role='admin',status='active' WHERE LOWER(TRIM(email)) IN ('wswendisson5@gmail.com','mateus@gmail.com')");
      await c.query("INSERT INTO migrations(name) VALUES (?)",["007_lock_admin_roles"]);
    }
    if (!done.has("008_provision_admin_credentials")) {
      const admins=[
        ["Wendisson","wswendisson5@gmail.com","a66654fd42a970b2c412e452d878f9ae:ccfc1e3e07d7368d483129a14120f209745b2ad359143d79d2599fbb3a01796527e9c3bd6ef6ae9f3b19fa2618cd52eb3f39670d6a1bce36c84cfc55e1406191"],
        ["Mateus","mateus@gmail.com","17f2beeb734f5aecab7f5923fabd81af:11ad5a8c4d7b48bcc2869ae92897ce2813fc3add54783ec8fa40d355363e61cef58708b679205f056bbc9b301a13cb8298c2f926e4b14d5559f0c06ce5784797"]
      ];
      for(const [name,email,passwordHash] of admins){
        const [r]:any=await c.query("SELECT id FROM users WHERE LOWER(TRIM(email))=? LIMIT 1",[email]);
        if(r[0]) await c.query("UPDATE users SET name=?,password_hash=?,role='admin',status='active' WHERE id=?",[name,passwordHash,r[0].id]);
        else await c.query("INSERT INTO users(name,email,phone,password_hash,role,status) VALUES(?,?,?,?,'admin','active')",[name,email,"",passwordHash]);
      }
      await c.query("INSERT INTO migrations(name) VALUES (?)",["008_provision_admin_credentials"]);
    }
    if (!done.has("009_plans_and_invoices")) {
      await c.beginTransaction();
      await c.query(`CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(30) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        tagline VARCHAR(190) NULL,
        price_formatted VARCHAR(30) NOT NULL,
        monthly_price DECIMAL(10,2) NOT NULL,
        max_groups INT NOT NULL DEFAULT 20,
        max_rounds_per_day INT NOT NULL DEFAULT 1,
        max_monthly_sends INT NOT NULL DEFAULT 600,
        max_active_campaigns INT NOT NULL DEFAULT 2,
        history_days INT NOT NULL DEFAULT 7,
        support_type VARCHAR(50) NOT NULL DEFAULT 'E-mail',
        features_json LONGTEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await c.query(`INSERT INTO plans (id, name, tagline, price_formatted, monthly_price, max_groups, max_rounds_per_day, max_monthly_sends, max_active_campaigns, history_days, support_type, is_active)
      VALUES
        ('start', 'Start', 'Comece a divulgar', '39,90', 39.90, 20, 1, 600, 2, 7, 'E-mail', 1),
        ('pro', 'Pro', 'Mais resultados', '69,90', 69.90, 45, 2, 2700, 5, 30, 'Prioritário', 1),
        ('max', 'Max', 'Sem limites para crescer', '119,90', 119.90, 90, 3, 8100, 10, 90, 'VIP', 1)
      ON DUPLICATE KEY UPDATE
        name=VALUES(name), tagline=VALUES(tagline), price_formatted=VALUES(price_formatted),
        monthly_price=VALUES(monthly_price), max_groups=VALUES(max_groups),
        max_rounds_per_day=VALUES(max_rounds_per_day), max_monthly_sends=VALUES(max_monthly_sends),
        max_active_campaigns=VALUES(max_active_campaigns), history_days=VALUES(history_days),
        support_type=VALUES(support_type)`);

      await c.query(`CREATE TABLE IF NOT EXISTS invoices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        payment_id VARCHAR(80) NOT NULL UNIQUE,
        plan_id VARCHAR(30) NOT NULL,
        billing_type VARCHAR(30) NOT NULL DEFAULT 'PIX',
        value DECIMAL(10,2) NOT NULL,
        net_value DECIMAL(10,2) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        due_date DATE NULL,
        paid_at DATETIME NULL,
        pix_payload TEXT NULL,
        pix_image_url LONGTEXT NULL,
        boleto_url VARCHAR(255) NULL,
        gateway VARCHAR(30) NOT NULL DEFAULT 'ASAAS',
        payload_json LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(user_id), INDEX(status), INDEX(payment_id),
        CONSTRAINT fk_invoices_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await c.query("ALTER TABLE evolution_instances ADD COLUMN profile_name VARCHAR(150) NULL").catch(()=>{});
      await c.query("ALTER TABLE evolution_instances ADD COLUMN profile_pic_url LONGTEXT NULL").catch(()=>{});
      await c.query("ALTER TABLE evolution_instances ADD COLUMN last_connected_at DATETIME NULL").catch(()=>{});

      await c.query("INSERT INTO migrations(name) VALUES (?)",["009_plans_and_invoices"]);
      await c.commit();
    }
    if (!done.has("010_crm_leads_opportunities")) {
      await c.beginTransaction();
      await c.query(`CREATE TABLE IF NOT EXISTS crm_leads (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        remote_jid VARCHAR(190) NOT NULL,
        phone VARCHAR(30) NULL,
        name VARCHAR(190) NULL,
        avatar_url LONGTEXT NULL,
        tags_json LONGTEXT NULL,
        notes TEXT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_lead(user_id, remote_jid),
        INDEX(user_id), INDEX(phone),
        CONSTRAINT fk_leads_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await c.query(`CREATE TABLE IF NOT EXISTS radar_opportunities (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        opp_key VARCHAR(120) NOT NULL,
        group_jid VARCHAR(190) NULL,
        group_name VARCHAR(190) NULL,
        sender_jid VARCHAR(190) NULL,
        sender_phone VARCHAR(30) NULL,
        sender_name VARCHAR(190) NULL,
        message_text TEXT NULL,
        confidence_score INT NOT NULL DEFAULT 0,
        category VARCHAR(80) NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'new',
        ai_analysis_json LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_opp(user_id, opp_key),
        INDEX(user_id), INDEX(status),
        CONSTRAINT fk_opp_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

      await c.query("INSERT INTO migrations(name) VALUES (?)",["010_crm_leads_opportunities"]);
      await c.commit();
    }
    if (!done.has("011_evolution_profile_columns")) {
      await c.query("ALTER TABLE evolution_instances ADD COLUMN profile_name VARCHAR(150) NULL").catch(()=>{});
      await c.query("ALTER TABLE evolution_instances ADD COLUMN profile_pic_url LONGTEXT NULL").catch(()=>{});
      await c.query("ALTER TABLE evolution_instances ADD COLUMN last_connected_at DATETIME NULL").catch(()=>{});
      await c.query("INSERT INTO migrations(name) VALUES (?)",["011_evolution_profile_columns"]).catch(()=>{});
    }
    if (!done.has("012_campaign_longtext")) {
      await c.query("ALTER TABLE user_campaigns MODIFY media_url LONGTEXT NULL").catch(()=>{});
      await c.query("ALTER TABLE user_campaigns MODIFY config_json LONGTEXT NULL").catch(()=>{});
      await c.query("INSERT INTO migrations(name) VALUES (?)",["012_campaign_longtext"]).catch(()=>{});
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
export async function ensureAdminAccount(name:string,email:string,password:string){
 const normalized=String(email).trim().toLowerCase(); const passwordHash=hashPassword(password);
 const [rows]:any=await pool.execute("SELECT id FROM users WHERE LOWER(TRIM(email))=? LIMIT 1",[normalized]);
 if(rows[0]) await pool.execute("UPDATE users SET name=?,password_hash=?,role='admin',status='active' WHERE id=?",[name,passwordHash,rows[0].id]);
 else await pool.execute("INSERT INTO users(name,email,phone,password_hash,role,status) VALUES(?,?,?,?,'admin','active')",[name,normalized,"",passwordHash]);
 return true;
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
export async function updateUserInstanceName(userId:number, instanceName:string){
  try {
    await pool.execute("UPDATE evolution_instances SET instance_name=? WHERE user_id=?", [instanceName, userId]);
  } catch {}
}
export async function setUserInstanceStatus(userId:number,status:string,phone?:string,profileName?:string,profilePicUrl?:string){
  const isConnected = status === 'connected' || status === 'open';
  try {
    await pool.execute(
      `UPDATE evolution_instances 
       SET status=?, 
           owner_phone=COALESCE(?,owner_phone),
           profile_name=COALESCE(?,profile_name),
           profile_pic_url=COALESCE(?,profile_pic_url),
           last_connected_at=CASE WHEN ?=1 THEN NOW() ELSE last_connected_at END
       WHERE user_id=?`,
      [status, phone||null, profileName||null, profilePicUrl||null, isConnected ? 1 : 0, userId]
    );
  } catch (err: any) {
    try {
      await pool.execute(
        `UPDATE evolution_instances SET status=?, owner_phone=COALESCE(?,owner_phone) WHERE user_id=?`,
        [status, phone||null, userId]
      );
    } catch {}
  }
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

let campaignsTableEnsured = false;
export async function ensureCampaignsTable(): Promise<void> {
  if (campaignsTableEnsured) return;
  try {
    // 1. user_campaigns table (Safe: without foreign key constraint to eliminate MySQL errno 150)
    await pool.query(`CREATE TABLE IF NOT EXISTS user_campaigns (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      client_id VARCHAR(80) NOT NULL,
      campaign_key VARCHAR(120) NOT NULL,
      name VARCHAR(190) NOT NULL,
      message TEXT NULL,
      media_url LONGTEXT NULL,
      config_json LONGTEXT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      scheduled_at DATETIME NULL,
      interval_seconds INT NOT NULL DEFAULT 30,
      total_sent INT NOT NULL DEFAULT 0,
      total_failed INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_campaign (user_id, campaign_key),
      INDEX idx_camp_user (user_id),
      INDEX idx_camp_client (client_id),
      INDEX idx_camp_status (status),
      INDEX idx_camp_sched (scheduled_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await pool.query("ALTER TABLE user_campaigns MODIFY media_url LONGTEXT NULL").catch(() => {});
    await pool.query("ALTER TABLE user_campaigns MODIFY config_json LONGTEXT NULL").catch(() => {});

    // 2. user_history table
    await pool.query(`CREATE TABLE IF NOT EXISTS user_history (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      client_id VARCHAR(80) NOT NULL,
      campaign_key VARCHAR(120) NULL,
      campaign_title VARCHAR(190) NULL,
      group_jid VARCHAR(190) NULL,
      group_name VARCHAR(190) NULL,
      message_text TEXT NULL,
      media_url LONGTEXT NULL,
      media_type VARCHAR(30) NULL,
      duration VARCHAR(40) NULL,
      status VARCHAR(30) NOT NULL,
      error_text TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_hist_user (user_id),
      INDEX idx_hist_client (client_id),
      INDEX idx_hist_campaign (campaign_key),
      INDEX idx_hist_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await pool.query("ALTER TABLE user_history ADD COLUMN campaign_title VARCHAR(190) NULL").catch(() => {});
    await pool.query("ALTER TABLE user_history ADD COLUMN message_text TEXT NULL").catch(() => {});
    await pool.query("ALTER TABLE user_history ADD COLUMN media_url LONGTEXT NULL").catch(() => {});
    await pool.query("ALTER TABLE user_history ADD COLUMN media_type VARCHAR(30) NULL").catch(() => {});
    await pool.query("ALTER TABLE user_history ADD COLUMN duration VARCHAR(40) NULL").catch(() => {});

    // 3. user_groups table
    await pool.query(`CREATE TABLE IF NOT EXISTS user_groups (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      group_jid VARCHAR(190) NOT NULL,
      group_name VARCHAR(190) NULL,
      members_count INT NOT NULL DEFAULT 0,
      selected TINYINT(1) NOT NULL DEFAULT 1,
      payload_json LONGTEXT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_group (user_id, group_jid),
      INDEX idx_groups_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    campaignsTableEnsured = true;
  } catch (err) {
    console.error("[DB] Falha ao verificar/criar tabelas de campanhas:", err);
  }
}

export async function saveCampaignForUser(userId: number, data: any) {
  await ensureCampaignsTable().catch(() => {});
  const clientId = "client-" + userId;
  const key = String(data.id || data.campaignKey || ("camp-" + Date.now()));
  let safeScheduledAt: string | null = null;
  const rawDate = data.scheduleDate || data.scheduledAt;
  if (rawDate && typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const timePart = data.scheduleTime && /^\d{2}:\d{2}/.test(String(data.scheduleTime))
        ? `${String(data.scheduleTime).slice(0, 5)}:00`
        : '00:00:00';
      safeScheduledAt = `${trimmed} ${timePart}`;
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        safeScheduledAt = parsed.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
  }

  const title = String(data.title || data.name || "Divulgação").trim().slice(0, 190);
  const message = String(data.previewText || data.message || "").trim();
  const mediaUrl = data.imageUrl || data.mediaUrl || null;
  const status = String(data.status || "draft").slice(0, 30);
  const intervalSeconds = Number(data.delaySeconds ?? data.intervalSeconds) || 30;
  const totalSent = Number(data.totalSent) || 0;
  const totalFailed = Number(data.totalFailed) || 0;

  try {
    await pool.execute(`INSERT INTO user_campaigns(user_id,client_id,campaign_key,name,message,media_url,config_json,status,scheduled_at,interval_seconds,total_sent,total_failed)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),message=VALUES(message),media_url=VALUES(media_url),config_json=VALUES(config_json),status=VALUES(status),scheduled_at=VALUES(scheduled_at),interval_seconds=VALUES(interval_seconds),total_sent=VALUES(total_sent),total_failed=VALUES(total_failed)`,
    [userId, clientId, key, title, message, mediaUrl, JSON.stringify(data), status, safeScheduledAt, intervalSeconds, totalSent, totalFailed]);
    return key;
  } catch (err: any) {
    console.error(`[DB] Erro ao salvar campanha user=${userId} key=${key}:`, err);
    throw err;
  }
}
export async function listCampaignsForUser(userId:number){
  await ensureCampaignsTable().catch(() => {});
  try {
    const [r]:any=await pool.execute("SELECT config_json FROM user_campaigns WHERE user_id=? ORDER BY created_at DESC",[userId]);
    return r.map((x:any)=>{try{return JSON.parse(x.config_json)}catch{return {}}});
  } catch(err) {
    console.warn("[DB] Erro ao listar campanhas user=" + userId, err);
    return [];
  }
}
export async function deleteCampaignForUser(userId:number,key:string){
  await ensureCampaignsTable().catch(() => {});
  try {
    const [r]:any=await pool.execute("DELETE FROM user_campaigns WHERE user_id=? AND campaign_key=?",[userId,key]);
    return r.affectedRows>0;
  } catch(err) {
    console.warn("[DB] Erro ao deletar campanha user=" + userId, err);
    return false;
  }
}
export async function addHistoryForUser(userId:number,data:any){
  await ensureCampaignsTable().catch(() => {});
  try {
    await pool.execute(`INSERT INTO user_history(user_id,client_id,campaign_key,campaign_title,group_jid,group_name,message_text,media_url,media_type,status,error_text,duration) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,[userId,"client-"+userId,data.campaignId||null,data.campaignTitle||null,data.groupJid||null,data.groupName||null,data.messageText||"",data.imageUrl||data.mediaUrl||null,data.mediaType||null,data.status||"unknown",data.error||null,data.duration||null]);
  } catch(err) {
    console.warn("[DB] Erro ao adicionar historico user=" + userId, err);
  }
}
export async function listHistoryForUser(userId:number,days=90){
  await ensureCampaignsTable().catch(() => {});
  try {
    const [r]:any=await pool.execute("SELECT CAST(id AS CHAR) id,campaign_key AS campaignId,COALESCE(campaign_title,'Divulgação') campaignTitle,group_jid AS groupJid,COALESCE(group_name,'Grupo') groupName,COALESCE(message_text,'') messageText,media_url AS imageUrl,media_type AS mediaType,status,error_text AS error,duration,DATE_FORMAT(created_at,'%H:%i') timeFormatted,created_at AS timestamp FROM user_history WHERE user_id=? AND created_at>=DATE_SUB(NOW(),INTERVAL ? DAY) ORDER BY created_at DESC",[userId,days]);
    return r;
  } catch(err) {
    console.warn("[DB] Erro ao listar historico user=" + userId, err);
    return [];
  }
}
export async function saveGroupsForUser(userId:number,groups:any[]){
  await ensureCampaignsTable().catch(() => {});
  try {
    for(const g of groups||[]){const jid=String(g.jid||g.id||g.groupJid||"");if(!jid)continue;await pool.execute(`INSERT INTO user_groups(user_id,group_jid,group_name,members_count,selected,payload_json) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE group_name=VALUES(group_name),members_count=VALUES(members_count),selected=VALUES(selected),payload_json=VALUES(payload_json)`,[userId,jid,g.name||g.subject||"Grupo",Number(g.membersCount||g.participants?.length||0),g.selected===false?0:1,JSON.stringify(g)]);}
  } catch(err) {
    console.warn("[DB] Erro ao salvar grupos user=" + userId, err);
  }
}
export async function listGroupsForUser(userId:number){
  await ensureCampaignsTable().catch(() => {});
  try {
    const [r]:any=await pool.execute("SELECT payload_json FROM user_groups WHERE user_id=? ORDER BY updated_at DESC",[userId]);
    return r.map((x:any)=>{try{return JSON.parse(x.payload_json)}catch{return null}}).filter(Boolean);
  } catch(err) {
    console.warn("[DB] Erro ao listar grupos user=" + userId, err);
    return [];
  }
}

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

// ----------------------------------------------------
// PLANS & INVOICES PERSISTENCE (100% REAL MYSQL)
// ----------------------------------------------------

export async function listPlans() {
  const [rows]: any = await pool.query(
    "SELECT id, name, tagline, price_formatted AS priceFormatted, monthly_price AS monthlyPrice, max_groups AS maxGroups, max_rounds_per_day AS maxRoundsPerDay, max_monthly_sends AS maxMonthlySends, max_active_campaigns AS maxActiveCampaigns, history_days AS historyDays, support_type AS supportType, is_active AS isActive FROM plans WHERE is_active = 1 ORDER BY monthly_price ASC"
  );
  return rows;
}

export async function getPlanById(planId: string) {
  const [rows]: any = await pool.execute(
    "SELECT id, name, tagline, price_formatted AS priceFormatted, monthly_price AS monthlyPrice, max_groups AS maxGroups, max_rounds_per_day AS maxRoundsPerDay, max_monthly_sends AS maxMonthlySends, max_active_campaigns AS maxActiveCampaigns, history_days AS historyDays, support_type AS supportType, is_active AS isActive FROM plans WHERE id = ? LIMIT 1",
    [planId]
  );
  return rows[0] || null;
}

export async function createInvoice(userId: number, data: {
  paymentId: string;
  planId: string;
  billingType?: string;
  value: number;
  netValue?: number;
  status?: string;
  dueDate?: string;
  pixPayload?: string;
  pixImageUrl?: string;
  boletoUrl?: string;
  gateway?: string;
  payloadJson?: any;
}) {
  await pool.execute(
    `INSERT INTO invoices (
      user_id, payment_id, plan_id, billing_type, value, net_value,
      status, due_date, pix_payload, pix_image_url, boleto_url, gateway, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      plan_id = VALUES(plan_id),
      billing_type = VALUES(billing_type),
      value = VALUES(value),
      net_value = VALUES(net_value),
      status = VALUES(status),
      due_date = VALUES(due_date),
      pix_payload = VALUES(pix_payload),
      pix_image_url = VALUES(pix_image_url),
      boleto_url = VALUES(boleto_url),
      payload_json = VALUES(payload_json)`,
    [
      userId,
      data.paymentId,
      data.planId,
      data.billingType || "PIX",
      data.value,
      data.netValue || null,
      data.status || "PENDING",
      data.dueDate || null,
      data.pixPayload || null,
      data.pixImageUrl || null,
      data.boletoUrl || null,
      data.gateway || "ASAAS",
      data.payloadJson ? JSON.stringify(data.payloadJson) : null,
    ]
  );
  return data.paymentId;
}

export async function getInvoiceByPaymentId(paymentId: string) {
  const [rows]: any = await pool.execute(
    `SELECT i.*, u.name AS userName, u.email AS userEmail, u.phone AS userPhone
     FROM invoices i JOIN users u ON u.id = i.user_id
     WHERE i.payment_id = ? LIMIT 1`,
    [paymentId]
  );
  return rows[0] || null;
}

export async function getUserInvoices(userId: number) {
  const [rows]: any = await pool.execute(
    `SELECT id, payment_id AS paymentId, plan_id AS planId, billing_type AS billingType,
            value, net_value AS netValue, status, due_date AS dueDate, paid_at AS paidAt,
            pix_payload AS pixPayload, pix_image_url AS pixImageUrl, boleto_url AS boletoUrl,
            gateway, created_at AS createdAt
     FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows;
}

export async function confirmInvoicePayment(paymentId: string, eventType = "PAYMENT_CONFIRMED", paymentPayload?: any) {
  const [invoices]: any = await pool.execute(
    "SELECT id, user_id, plan_id, value FROM invoices WHERE payment_id = ? LIMIT 1",
    [paymentId]
  );
  const inv = invoices[0];
  if (!inv) return false;

  await pool.execute(
    "UPDATE invoices SET status = 'CONFIRMED', paid_at = NOW() WHERE payment_id = ?",
    [paymentId]
  );

  // Update Subscription
  await pool.execute(
    `INSERT INTO subscriptions (user_id, plan_id, status, current_payment_id, next_due_date)
     VALUES (?, ?, 'active', ?, DATE_ADD(CURDATE(), INTERVAL 1 MONTH))
     ON DUPLICATE KEY UPDATE
       plan_id = VALUES(plan_id),
       status = 'active',
       current_payment_id = VALUES(current_payment_id),
       next_due_date = DATE_ADD(COALESCE(GREATEST(next_due_date, CURDATE()), CURDATE()), INTERVAL 1 MONTH)`,
    [inv.user_id, inv.plan_id, paymentId]
  );

  // Update User account to active and plan
  await pool.execute(
    "UPDATE users SET status = 'active', plan = ? WHERE id = ?",
    [inv.plan_id, inv.user_id]
  );

  if (paymentPayload) {
    try {
      await pool.execute(
        "INSERT INTO payment_events(event_key, event_type, payment_id, payload_json) VALUES (?, ?, ?, ?)",
        [`confirm:${paymentId}:${Date.now()}`, eventType, paymentId, JSON.stringify(paymentPayload)]
      );
    } catch {}
  }

  return true;
}

// ----------------------------------------------------
// CRM & RADAR PERSISTENCE
// ----------------------------------------------------

export async function saveLeadForUser(userId: number, lead: {
  remoteJid: string;
  phone?: string;
  name?: string;
  avatarUrl?: string;
  tags?: string[];
  notes?: string;
  status?: string;
}) {
  await pool.execute(
    `INSERT INTO crm_leads (user_id, remote_jid, phone, name, avatar_url, tags_json, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = COALESCE(VALUES(name), name),
       phone = COALESCE(VALUES(phone), phone),
       avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
       tags_json = COALESCE(VALUES(tags_json), tags_json),
       notes = COALESCE(VALUES(notes), notes),
       status = COALESCE(VALUES(status), status)`,
    [
      userId,
      lead.remoteJid,
      lead.phone || null,
      lead.name || null,
      lead.avatarUrl || null,
      lead.tags ? JSON.stringify(lead.tags) : null,
      lead.notes || null,
      lead.status || "new",
    ]
  );
}

export async function listLeadsForUser(userId: number) {
  const [rows]: any = await pool.execute(
    "SELECT id, remote_jid AS remoteJid, phone, name, avatar_url AS avatarUrl, tags_json AS tagsJson, notes, status, created_at AS createdAt FROM crm_leads WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200",
    [userId]
  );
  return rows.map((r: any) => {
    let tags = [];
    try { tags = r.tagsJson ? JSON.parse(r.tagsJson) : []; } catch {}
    return { ...r, tags };
  });
}

