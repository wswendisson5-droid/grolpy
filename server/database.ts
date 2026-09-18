import mysql from "mysql2/promise";
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
