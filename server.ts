import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import net from "net";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import QRCode from "qrcode";
import { radarEngine } from "./server/radarEngine";
import { atendimentoEngine } from "./server/atendimentoEngine";
import { asaasEngine } from "./server/asaasEngine";
import { cleanPhoneDigits } from "./server/phoneUtils";
import {
  extractWhatsAppMessageText,
  getWhatsAppMessageTimestamp,
  resolveWhatsAppGroupSender,
  unwrapWhatsAppMessage,
} from "./server/whatsappMessageUtils";


const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}
}
app.use("/uploads", express.static(UPLOADS_DIR));

function saveBase64MediaToFile(base64Data: string, prefix = "media"): string {
  if (!base64Data || typeof base64Data !== "string" || !base64Data.startsWith("data:")) return base64Data;
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64Data;
    const ext = matches[1].includes("png") ? "png" : matches[1].includes("webp") ? "webp" : matches[1].includes("gif") ? "gif" : matches[1].includes("mp4") ? "mp4" : "jpg";
    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(matches[2], "base64");
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.error("[UPLOAD] Falha ao salvar arquivo base64 no disco:", err);
    return base64Data;
  }
}

// Evolution API credentials from environment
const DEFAULT_EVOLUTION_URL = (process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
const DEFAULT_EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || "";
const DEFAULT_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "minhabagg-leads";

// Server-side in-memory cache for Evolution state & webhook events
interface EvolutionLocalCache {
  instanceName: string;
  apiUrl: string;
  apiKey: string;
  state: "disconnected" | "connecting" | "waiting_qr" | "connected" | "reconnecting" | "error";
  qrCode?: {
    code?: string;
    base64?: string;
    pairingCode?: string;
    updatedAt: number;
  };
  connectedProfile?: {
    name?: string;
    number?: string;
    pictureUrl?: string;
    connectedAt?: string;
    lastSyncAt?: string;
    version?: string;
  };
  webhookStatus: "active" | "waiting" | "inactive";
  lastError?: string;
  lastUpdated: string;
  webhookEvents: any[];
}

const instanceCacheMap = new Map<string, EvolutionLocalCache>();

function getInstanceCache(instanceName: string): EvolutionLocalCache {
  if (!instanceCacheMap.has(instanceName)) {
    instanceCacheMap.set(instanceName, {
      instanceName,
      apiUrl: DEFAULT_EVOLUTION_URL,
      apiKey: DEFAULT_EVOLUTION_KEY,
      state: "waiting_qr",
      webhookStatus: "waiting",
      lastUpdated: new Date().toISOString(),
      webhookEvents: [],
    });
  }
  return instanceCacheMap.get(instanceName)!;
}

const memoryState: EvolutionLocalCache = getInstanceCache(DEFAULT_INSTANCE_NAME);

// Helper: Normalize QR code payload and ensure a clean Base64 DataURL is always available
async function normalizeQrCode(rawQr: any): Promise<{ base64?: string; code?: string; pairingCode?: string; updatedAt: number } | null> {
  if (!rawQr) return null;
  const q = rawQr.qrcode || rawQr;
  let base64 = typeof q.base64 === "string" && q.base64.trim() ? q.base64.trim() : undefined;
  const code = typeof q.code === "string" && q.code.trim() ? q.code.trim() : undefined;
  let pairingCode = typeof q.pairingCode === "string" && q.pairingCode.trim() ? q.pairingCode.trim() : undefined;

  // If pairingCode not explicit, check if code is an 8-character pairing code (not a full QR string)
  if (!pairingCode && code && code.length <= 12 && !code.startsWith('2@') && !code.startsWith('1@') && !code.includes(',')) {
    pairingCode = code;
  }

  if (!base64 && code && (code.length > 20 || code.startsWith('2@') || code.startsWith('1@') || code.includes(','))) {
    try {
      base64 = await QRCode.toDataURL(code, {
        margin: 2,
        width: 320,
        color: { dark: "#12382c", light: "#ffffff" },
      });
    } catch (err) {
      console.error("[Evolution QR] Failed to convert code to base64 DataURL:", err);
    }
  }

  if (!base64 && !code && !pairingCode) return null;
  return { base64, code, pairingCode, updatedAt: Date.now() };
}

// Helper: Make authenticated calls to Evolution API with robust timeout & auto-retry on transient db lock
async function callEvolution(endpoint: string, options: RequestInit = {}, timeoutMs: number = 10000, retryCount = 1): Promise<{ ok: boolean; status: number; data: any }> {
  let apiUrl = memoryState.apiUrl || DEFAULT_EVOLUTION_URL;
  const apiKey = memoryState.apiKey || DEFAULT_EVOLUTION_KEY;

  if (!apiUrl || !apiKey || apiUrl.includes("yourdomain.com")) {
    return { ok: false, status: 400, data: { error: "Credenciais da Evolution API não estão configuradas." } };
  }

  if (!apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) apiUrl = `https://${apiUrl}`;
  apiUrl = apiUrl.replace(/\/+$/, "");

  const target = new URL(`${apiUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`);
  const headers: Record<string, string> = {
    apikey: apiKey,
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const body = typeof options.body === "string" ? options.body : undefined;

  try {
    const result = await new Promise<{ ok: boolean; status: number; data: any }>((resolve, reject) => {
      const transport = target.protocol === "https:" ? https : http;
      const requestOptions: https.RequestOptions = {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: options.method || "GET",
        headers,
        // Evolution is currently configured by raw IP behind Traefik, whose default
        // certificate cannot validate against the IP. Limit the TLS exception to
        // that raw-IP integration only; normal hostnames keep certificate validation.
        ...(target.protocol === "https:" && net.isIP(target.hostname)
          ? { rejectUnauthorized: false }
          : {}),
      };

      const req = transport.request(requestOptions, (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => {
          let data: any = null;
          try { data = raw ? JSON.parse(raw) : null; } catch { data = raw || null; }
          const status = res.statusCode || 500;
          resolve({ ok: status >= 200 && status < 300, status, data });
        });
      });

      req.setTimeout(timeoutMs, () => req.destroy(new Error("EVOLUTION_TIMEOUT")));
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });

    const errorMsg = JSON.stringify(result.data || "");
    const normalizedError = errorMsg.toLowerCase();
    const isRateLimited = result.status === 429 || normalizedError.includes("rate-overlimit") || normalizedError.includes("rate limit");
    if (!result.ok && !isRateLimited && retryCount > 0 && (errorMsg.includes("connection pool") || errorMsg.includes("Connection Closed") || result.status === 500)) {
      await new Promise((r) => setTimeout(r, 1500));
      return callEvolution(endpoint, options, timeoutMs, retryCount - 1);
    }
    return result;
  } catch (err: any) {
    if (retryCount > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return callEvolution(endpoint, options, timeoutMs, retryCount - 1);
    }
    if (err?.message === "EVOLUTION_TIMEOUT") {
      return { ok: false, status: 408, data: { error: "Tempo limite excedido ao conectar com a Evolution API." } };
    }
    return { ok: false, status: 502, data: { error: err?.message || "Erro de rede ao contatar a Evolution API." } };
  }
}

// Connect Evolution API caller to Radar Engine for real group messages polling
radarEngine.setEvolutionCaller(callEvolution);

// Evolution metadata is loaded on demand. Never call Evolution during Passenger startup:
// a slow/unreachable upstream must not block or destabilize the web worker.

// In-memory cache for profile pictures to avoid repeated WhatsApp queries
const profilePicCache = new Map<string, string>();

// Utility: format phone from JID or raw number
function formatPhone(jid: string): string {
  if (!jid) return "";
  if (jid.includes("@lid")) return "";
  const base = String(jid).split("@")[0].split(":")[0];
  const clean = base.replace(/\D/g, "");
  if (!clean) return "";

  if (clean.length === 13 && clean.startsWith("55")) {
    // +55 (DD) 9XXXX-XXXX
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
  }
  if (clean.length === 12 && clean.startsWith("55")) {
    // +55 (DD) XXXX-XXXX
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 8)}-${clean.substring(8)}`;
  }
  if (clean.length === 11) {
    return `+55 (${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
  }
  if (clean.length === 10) {
    return `+55 (${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  }
  if (clean.startsWith("55") && clean.length > 4) {
    return `+55 ${clean.substring(2)}`;
  }
  return `+${clean}`;
}

// Utility: extract human message preview from Evolution message JSON
function extractMessageText(msgObj: any): string {
  if (!msgObj) return "Mensagem recebida";
  const m = msgObj.message || msgObj;
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage?.caption) return `📷 ${m.imageMessage.caption}`;
  if (m.imageMessage) return "📷 Imagem";
  if (m.audioMessage) return "🎵 Áudio (" + (m.audioMessage.seconds ? `${m.audioMessage.seconds}s` : "") + ")";
  if (m.videoMessage?.caption) return `🎥 ${m.videoMessage.caption}`;
  if (m.videoMessage) return "🎥 Vídeo";
  if (m.documentMessage?.fileName) return `📄 ${m.documentMessage.fileName}`;
  if (m.documentMessage) return "📄 Documento";
  if (m.contactMessage?.displayName) return `👤 Contato: ${m.contactMessage.displayName}`;
  if (m.contactsArrayMessage?.displayName) return `👥 ${m.contactsArrayMessage.displayName}`;
  if (m.stickerMessage) return "👾 Figurinha";
  if (m.locationMessage) return "📍 Localização";
  return "Mensagem do WhatsApp";
}

// Utility: format timestamp into CRM friendly time
function formatChatTime(dateInput?: string | number): string {
  if (!dateInput) return "Agora";
  const d = typeof dateInput === "number" ? new Date(dateInput * 1000) : new Date(dateInput);
  if (isNaN(d.getTime())) return "Hoje";

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  if (isToday) {
    return `${hours}:${minutes}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Ontem";
  }

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

// ----------------------------------------------------
// BACKEND API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    evolutionConfigured: Boolean(memoryState.apiUrl && memoryState.apiKey),
    instanceName: memoryState.instanceName,
    apiUrl: memoryState.apiUrl,
  });
});

// Dynamic database loader that works seamlessly in local dev (TSX) and production (CJS bundle)
let cachedDbModule: any = null;
let initDbPromise: Promise<any> | null = null;
let adminStateHydrationPromise: Promise<void> | null = null;
async function getDatabase(): Promise<any> {
  if (!cachedDbModule) {
    if (process.env.NODE_ENV !== "production") {
      // In local development, always execute the current TypeScript source.
      // Loading dist first made migrations/tests silently use a stale build.
      cachedDbModule = await import("./server/database");
    } else {
      try {
        cachedDbModule = await import("./dist/database.cjs");
      } catch {
        cachedDbModule = await import("./database.cjs");
      }
    }
  }

  // Routes must never race migrations. Await the single shared initialization.
  if (!initDbPromise && cachedDbModule?.initDatabase) {
    initDbPromise = Promise.resolve(cachedDbModule.initDatabase());
  }
  if (initDbPromise) await initDbPromise;

  if (!adminStateHydrationPromise && cachedDbModule?.getAdminState && cachedDbModule?.setAdminState) {
    adminStateHydrationPromise = (async () => {
      const [radarState, atendimentoState] = await Promise.all([
        cachedDbModule.getAdminState("radar"),
        cachedDbModule.getAdminState("atendimento"),
      ]);
      if (radarState) radarEngine.hydrateFromState(radarState);
      if (atendimentoState) atendimentoEngine.hydrateFromState(atendimentoState);

      radarEngine.setPersistenceHandler((payload) => cachedDbModule.setAdminState("radar", payload));
      atendimentoEngine.setPersistenceHandler((payload) => cachedDbModule.setAdminState("atendimento", payload));

      if (!radarState) await cachedDbModule.setAdminState("radar", radarEngine.exportState());
      if (!atendimentoState) await cachedDbModule.setAdminState("atendimento", atendimentoEngine.exportState());
    })();
  }
  if (adminStateHydrationPromise) await adminStateHydrationPromise;
  return cachedDbModule;
}

// MySQL health check isolated from application startup.
// mysql2 is loaded lazily so a database/driver failure never takes the Groply process down.
app.get("/api/database/health", async (_req, res) => {
  try {
    const mysqlModule: any = await getDatabase();
    await mysqlModule.initDatabase();
    const mysql: any = mysqlModule.mysql || mysqlModule.default || mysqlModule;
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 8000,
    });
    await connection.query(`CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(190) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const [migrations]: any = await connection.query("SELECT name FROM migrations WHERE name='001_users_sessions' LIMIT 1");
    if (!migrations.length) {
      await connection.query(`CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE,
        phone VARCHAR(30) NULL, password_hash VARCHAR(255) NOT NULL,
        plan VARCHAR(30) NOT NULL DEFAULT 'start', status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await connection.query(`CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id), INDEX(expires_at),
        CONSTRAINT fk_sessions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
      await connection.execute("INSERT INTO migrations(name) VALUES (?)", ["001_users_sessions"]);
    }
    const [rows]: any = await connection.query("SELECT DATABASE() AS db, NOW() AS now");
    await connection.end();
    res.json({ success: true, database: rows?.[0]?.db || process.env.DB_NAME, connected: true, migrations: true });
  } catch (err: any) {
    console.error("[DB] health:", err?.code || err?.message || err);
    res.status(503).json({ success: false, connected: false, code: err?.code || "DB_ERROR", error: err?.message || "MySQL indisponível" });
  }
});


function sessionTokenFromRequest(req: any): string {
  const cookieHeader = String(req.headers.cookie || "");
  const cookie = cookieHeader.split(";").map((part: string) => part.trim()).find((part: string) => part.startsWith("grolpy_session="));
  if (cookie) {
    try { return decodeURIComponent(cookie.slice("grolpy_session=".length)); } catch { return ""; }
  }
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function cookieValue(req:any,name:string){
  const raw=String(req.headers.cookie||"").split(";").map((x:string)=>x.trim()).find((x:string)=>x.startsWith(name+"="));
  if(!raw)return ""; try{return decodeURIComponent(raw.slice(name.length+1));}catch{return "";}
}
function setReferralCookie(res:any,slug:string){
  const secure=process.env.NODE_ENV==="production"?"; Secure":"";
  const current=res.getHeader("Set-Cookie"); const value=`grolpy_ref=${encodeURIComponent(slug)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`;
  res.setHeader("Set-Cookie",current?[...(Array.isArray(current)?current:[String(current)]),value]:value);
}

function setSessionCookie(res: any, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `grolpy_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
}

function clearSessionCookie(res: any) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `grolpy_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

async function authenticatedUser(req: any) {
  const token = sessionTokenFromRequest(req);
  if (!token) return null;
  const db: any = await getDatabase();
  return db.getUserByToken(token);
}

async function requireAdmin(req: any) {
  const user: any = await authenticatedUser(req);
  return user?.role === "admin" ? user : null;
}

async function requireAdminRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
    if (user.role !== "admin") return res.status(403).json({ error: "ADMIN_REQUIRED" });
    (req as any).adminUser = user;
    next();
  } catch {
    res.status(500).json({ error: "AUTHORIZATION_CHECK_FAILED" });
  }
}

async function ownedInstance(req: any, requireActive = true, createIfMissing = true) {
  const user: any = await authenticatedUser(req);
  if (!user) return { error: "UNAUTHORIZED" };
  const isAdmin = user.role === "admin";
  const db: any = await getDatabase();
  const sub = await db.getSubscriptionForUser(user.id).catch(() => null);
  // Account activation is not proof of payment. Some legacy accounts are
  // marked active even though they never received a subscription row.
  const isPaidActive = String(sub?.status || "").toLowerCase() === "active";
  if (requireActive && !isAdmin && !isPaidActive) return { error: "PAYMENT_REQUIRED", user, db };
  const inst = createIfMissing ? await db.ensureUserInstance(user.id) : await db.getUserInstance(user.id);
  if (!inst) return { error: "INSTANCE_NOT_FOUND", user, db };
  return { user, db, instance: inst.instance_name, record: inst, isAdmin };
}

// Representative referral tracking and dashboards.
app.post("/api/referral/visit/:slug", async (req,res)=>{
  try{
    const db:any=await getDatabase(); const slug=String(req.params.slug||"").toLowerCase();
    const fingerprint=crypto.createHash("sha256").update(String(req.ip||"")+"|"+String(req.headers["user-agent"]||"")).digest("hex");
    const rep=await db.trackRepresentativeVisit(slug,fingerprint); if(!rep)return res.status(404).json({error:"REPRESENTATIVE_NOT_FOUND"});
    setReferralCookie(res,slug); res.json({success:true});
  }catch(e:any){res.status(500).json({error:e?.message||"REFERRAL_TRACK_FAILED"});}
});
app.get("/api/representative/dashboard", async(req,res)=>{
  const user:any=await authenticatedUser(req); if(!user)return res.status(401).json({error:"UNAUTHORIZED"}); if(user.role!=="representative")return res.status(403).json({error:"REPRESENTATIVE_REQUIRED"});
  const db:any=await getDatabase(); const data=await db.getRepresentativeDashboard(user.id); if(!data)return res.status(404).json({error:"REPRESENTATIVE_NOT_FOUND"}); res.json({success:true,data});
});
app.get("/api/admin/representatives",requireAdminRoute,async(_req,res)=>{const db:any=await getDatabase();res.json({success:true,representatives:await db.listRepresentatives()});});
app.post("/api/admin/representatives",requireAdminRoute,async(req,res)=>{
  try{const {name,email,password,slug,commissionPercent}=req.body||{}; const pct=Number(commissionPercent); if(!name||!email||!password||!slug||!Number.isFinite(pct)||pct<0||pct>100)return res.status(400).json({error:"Dados inválidos"});
    const db:any=await getDatabase(); const created=await db.createRepresentative(String(name),String(email),String(password),String(slug),pct); res.status(201).json({success:true,...created});
  }catch(e:any){res.status(e?.code==="ER_DUP_ENTRY"?409:500).json({error:e?.code==="ER_DUP_ENTRY"?"E-mail ou link já utilizado":e?.message||"CREATE_REP_FAILED"});}
});
app.patch("/api/admin/representatives/:id",requireAdminRoute,async(req,res)=>{const pct=Number(req.body?.commissionPercent);if(!Number.isFinite(pct)||pct<0||pct>100)return res.status(400).json({error:"Porcentagem inválida"});const db:any=await getDatabase();await db.updateRepresentative(Number(req.params.id),pct,req.body?.isActive!==false);res.json({success:true});});

// Authentication backed by MySQL, loaded lazily so DB errors never crash Passenger.
app.post("/api/auth/register", async (req, res) => {
  try {
    const { registerUser } = await getDatabase();
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ success: false, error: "Preencha nome, e-mail e senha." });
    const user = await registerUser(String(name), String(email), String(phone || ""), String(password));
    const refSlug = cookieValue(req, "grolpy_ref");
    if (refSlug) {
      const db:any = await getDatabase();
      await db.attachRepresentativeReferral(refSlug, user.id).catch(() => {});
    }
    res.status(201).json({ success: true, user });
  } catch (err: any) {
    const duplicate = err?.code === "ER_DUP_ENTRY";
    res.status(duplicate ? 409 : 500).json({ success: false, error: duplicate ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta." });
  }
});

app.post("/api/auth/bootstrap-admin", async (req, res) => {
  try {
    const key = String(req.headers["x-bootstrap-key"] || "");
    if (!process.env.ADMIN_BOOTSTRAP_KEY || key !== process.env.ADMIN_BOOTSTRAP_KEY) return res.status(404).json({ error: "Not found" });
    const db: any = await getDatabase();
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: "Dados obrigatórios" });
    await db.ensureAdminAccount(String(name), String(email), String(password));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "ADMIN_BOOTSTRAP_FAILED" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { loginUser } = await getDatabase();
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: "Informe e-mail e senha." });
    const auth = await loginUser(String(email), String(password));
    if (!auth) return res.status(401).json({ success: false, error: "E-mail ou senha incorretos." });
    setSessionCookie(res, auth.token);
    res.json({ success: true, user: auth.user });
  } catch (err: any) {
    console.error("[AUTH] login:", err?.code || err?.message || err);
    res.status(500).json({ success: false, error: "Não foi possível entrar agora." });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = sessionTokenFromRequest(req);
    if (token) {
      const db: any = await getDatabase();
      await db.deleteSessionByToken(token);
    }
  } catch {}
  clearSessionCookie(res);
  res.json({ success: true });
});

app.post("/api/auth/self-test", async (_req, res) => {
  if (process.env.NODE_ENV === "production") return res.status(404).json({ error: "Not found" });
  try {
    const db: any = await getDatabase();
    const tag = Date.now();
    const email = `auth-test-${tag}@grolpy.local`;
    const password = `Test-${tag}-Aa1`;
    await db.registerUser("Auth Test", email, "", password);
    const login = await db.loginUser(email, password);
    res.json({ success: Boolean(login?.token) });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.code || e?.message });
  }
});

app.get("/api/auth/diagnostic", requireAdminRoute, async (_req, res) => {
  try {
    const db: any = await getDatabase();
    const result = await db.authDiagnostic();
    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error("[AUTH-DIAGNOSTIC]", e?.code || e?.message);
    res.status(500).json({ success: false, error: "AUTH_DATABASE_ERROR" });
  }
});

app.post("/api/admin/test-subscriber", async (req, res) => {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "ADMIN_REQUIRED" });
  try {
    const db: any = await getDatabase();
    const user = await db.createPendingTestSubscriber(req.body || {});
    res.status(201).json({ success: true, user });
  } catch (e: any) {
    res.status(e?.code === "ER_DUP_ENTRY" ? 409 : 500).json({ success: false, error: "Não foi possível criar assinante de teste." });
  }
});

app.get("/api/admin/subscriptions", async (req, res) => {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "ADMIN_REQUIRED" });
  try {
    const db: any = await getDatabase();
    res.json({ success: true, subscriptions: await db.listAdminSubscriptions() });
  } catch (e: any) {
    console.error("[ADMIN-SUBSCRIPTIONS]", e?.code || e?.message);
    res.status(500).json({ success: false, error: "Não foi possível carregar assinaturas." });
  }
});

app.post("/api/admin/subscriptions/:userId/action", async (req, res) => {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "ADMIN_REQUIRED" });
  try {
    const action = String(req.body?.action || "");
    if (!["approve", "renew", "suspend"].includes(action)) return res.status(400).json({ error: "Ação inválida" });
    const db: any = await getDatabase();
    await db.adminSetSubscription(Number(req.params.userId), action);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Não foi possível atualizar a assinatura." });
  }
});

// 2. Fetch all instances available on the Evolution server
app.get("/api/evolution/instances", async (req, res) => {
  const admin=await requireAdmin(req); if(!admin)return res.status(403).json({error:"ADMIN_REQUIRED"});
  try {
    const fetchRes = await callEvolution("/instance/fetchInstances");
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        error: "Falha ao buscar instâncias na Evolution API",
        details: fetchRes.data,
      });
    }

    const instancesList = Array.isArray(fetchRes.data) ? fetchRes.data : [];
    const formatted = instancesList.map((inst: any) => ({
      id: inst.id,
      name: inst.name,
      connectionStatus: inst.connectionStatus, // 'open' | 'close' | 'connecting'
      ownerJid: inst.ownerJid,
      ownerPhone: inst.ownerJid ? formatPhone(inst.ownerJid) : null,
      profileName: inst.profileName || inst.name,
      profilePicUrl: inst.profilePicUrl || null,
      messageCount: inst._count?.Message || 0,
      contactCount: inst._count?.Contact || 0,
      chatCount: inst._count?.Chat || 0,
      updatedAt: inst.updatedAt,
      isCurrent: inst.name === memoryState.instanceName,
    }));

    res.json({
      success: true,
      currentInstance: memoryState.instanceName,
      instances: formatted,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Select active instance
app.post("/api/evolution/select-instance", async (req, res) => {
  const admin=await requireAdmin(req);
  if(!admin)return res.status(403).json({error:"ADMIN_REQUIRED"});
  const { instanceName } = req.body;
  if (!instanceName) {
    return res.status(400).json({ error: "instanceName é obrigatório." });
  }
  memoryState.instanceName = instanceName;
  memoryState.qrCode = undefined;
  res.json({
    success: true,
    instanceName: memoryState.instanceName,
  });
});

// Helper: robust check for connected state across all Evolution API v2 payload schemas
function isEvolutionStateConnected(data: any): boolean {
  if (!data) return false;
  const val = String(
    data?.instance?.state ||
    data?.state ||
    data?.instance?.connectionStatus ||
    data?.connectionStatus ||
    data?.instance?.status ||
    data?.status ||
    ""
  ).toLowerCase().trim();
  return val === "open" || val === "connected";
}

// Helper: fetch instance WhatsApp profile with profilePictureUrl and fallback endpoint
async function fetchInstanceProfile(instance: string, stateData?: any): Promise<{ name: string; number: string; pictureUrl: string; connectedAt?: string }> {
  let name = stateData?.profileName || stateData?.name || stateData?.instance?.profileName || stateData?.instance?.name || "";
  let rawOwner = stateData?.ownerJid || stateData?.owner || stateData?.instance?.ownerJid || stateData?.instance?.owner || stateData?.number || "";
  let pictureUrl = stateData?.profilePicUrl || stateData?.profilePictureUrl || stateData?.instance?.profilePicUrl || stateData?.instance?.profilePictureUrl || "";

  if (!pictureUrl && profilePicCache.has(instance)) {
    pictureUrl = profilePicCache.get(instance) || "";
  }

  if (!pictureUrl || !name || !rawOwner) {
    try {
      const fetchRes = await callEvolution("/instance/fetchInstances", {}, 4000, 0);
      const list: any[] = Array.isArray(fetchRes.data)
        ? fetchRes.data
        : Array.isArray(fetchRes.data?.instances)
        ? fetchRes.data.instances
        : Array.isArray(fetchRes.data?.data)
        ? fetchRes.data.data
        : [];

      if (list.length > 0) {
        let instData = list.find((i: any) => {
          const iName = i.name || i.instanceName || i.instance?.instanceName || i.id;
          return iName === instance;
        });

        if (instData) {
          name = instData.profileName || instData.name || instData.instance?.profileName || instData.owner?.name || name;
          rawOwner = instData.ownerJid || instData.owner || instData.instance?.ownerJid || instData.instance?.owner || instData.number || rawOwner;
          pictureUrl = instData.profilePicUrl || instData.profilePictureUrl || instData.avatarUrl || instData.pictureUrl || instData.instance?.profilePicUrl || instData.instance?.profilePictureUrl || pictureUrl;
        }
      }
    } catch {}
  }

  const cleanDigits = cleanPhoneDigits(rawOwner);

  // If pictureUrl is still missing, query Evolution /chat/fetchProfilePictureUrl/{instance}
  if (!pictureUrl && cleanDigits) {
    try {
      let picRes = await callEvolution(`/chat/fetchProfilePictureUrl/${instance}`, {
        method: "POST",
        body: JSON.stringify({ number: `${cleanDigits}@s.whatsapp.net` }),
      }, 3500, 0);
      if (!picRes.ok || !(picRes.data?.profilePictureUrl || picRes.data?.pictureUrl || picRes.data?.profilePicUrl || picRes.data?.picture)) {
        picRes = await callEvolution(`/chat/fetchProfilePictureUrl/${instance}`, {
          method: "POST",
          body: JSON.stringify({ number: cleanDigits }),
        }, 3500, 0);
      }
      if (picRes.ok) {
        pictureUrl = picRes.data?.profilePictureUrl || picRes.data?.pictureUrl || picRes.data?.profilePicUrl || picRes.data?.picture || picRes.data?.url || pictureUrl;
      }
    } catch {}
  }

  if (pictureUrl) {
    profilePicCache.set(instance, pictureUrl);
  }

  const formatted = rawOwner ? formatPhone(rawOwner) : (cleanDigits ? formatPhone(cleanDigits) : "");

  // Always deliver safe proxy URL so browser avoids WhatsApp CDN hotlink/referrer blocks
  const proxiedPictureUrl = pictureUrl
    ? `/api/whatsapp/avatar?instance=${encodeURIComponent(instance)}&url=${encodeURIComponent(pictureUrl)}`
    : `/api/whatsapp/avatar?instance=${encodeURIComponent(instance)}`;

  return {
    name: name || "",
    number: formatted || (cleanDigits ? `+${cleanDigits}` : ""),
    pictureUrl: proxiedPictureUrl,
    connectedAt: new Date().toLocaleString("pt-BR"),
  };
}

// Global active instance resolver for Evolution API v2 (Strict per-tenant isolation)
async function resolveActiveInstance(instance: string, userId?: number, db?: any): Promise<{
  isConnected: boolean;
  activeInstance: string;
  stateRes: any;
  instanceData?: any;
}> {
  let activeInstance = instance;
  let isConnected = false;
  let stateRes: any = { ok: false, status: 500, data: null };
  let instanceData: any = null;

  if (!instance) {
    return { isConnected: false, activeInstance: "", stateRes, instanceData: null };
  }

  // 1. Direct fast check: check connectionState directly for THIS instance (instant response, ~30ms)
  try {
    stateRes = await callEvolution(`/instance/connectionState/${instance}`, {}, 3000, 0);
    if (stateRes.ok && isEvolutionStateConnected(stateRes.data)) {
      isConnected = true;
      instanceData = stateRes.data;
      return { isConnected: true, activeInstance: instance, stateRes, instanceData };
    }
  } catch {}

  // 2. Fallback: Query /instance/fetchInstances if direct connectionState was inconclusive
  try {
    const fetchRes = await callEvolution("/instance/fetchInstances", {}, 4000, 0);
    const list: any[] = Array.isArray(fetchRes.data)
      ? fetchRes.data
      : Array.isArray(fetchRes.data?.instances)
      ? fetchRes.data.instances
      : Array.isArray(fetchRes.data?.data)
      ? fetchRes.data.data
      : [];

    if (list.length > 0) {
      // Check ONLY current user's instance
      let target = list.find((i: any) => {
        const name = i.name || i.instanceName || i.instance?.instanceName || i.id;
        return name === instance;
      });

      if (target && (isEvolutionStateConnected(target) || isEvolutionStateConnected(target.instance))) {
        isConnected = true;
        activeInstance = target.name || target.instanceName || instance;
        instanceData = target;
        stateRes = { ok: true, status: 200, data: { instance: { state: "open", ...target } } };
      }
    }
  } catch {}

  return { isConnected, activeInstance: instance, stateRes, instanceData };
}

// Avatar proxy route (bypasses browser CORS & hotlink protections from WhatsApp CDN)
app.get("/api/whatsapp/avatar", async (req, res) => {
  try {
    const instance = (req.query.instance as string) || DEFAULT_INSTANCE_NAME;
    let target = "";

    // 1. Extract full URL safely even when WhatsApp CDN query parameters (oh, oe, etc.) are present
    const originalUrl = req.originalUrl || req.url || "";
    const urlIdx = originalUrl.indexOf("url=");
    if (urlIdx !== -1) {
      let extracted = originalUrl.slice(urlIdx + 4);
      const instMatch = extracted.match(/&instance=[^&]*/);
      if (instMatch && instMatch.index !== undefined) {
        extracted = extracted.slice(0, instMatch.index) + extracted.slice(instMatch.index + instMatch[0].length);
      }
      try {
        target = decodeURIComponent(extracted);
      } catch {
        target = extracted;
      }
    } else if (req.query.url) {
      target = String(req.query.url);
    }

    // Helper to query Evolution API for fresh profile picture
    const fetchFreshProfilePic = async (inst: string): Promise<string | null> => {
      try {
        const fetchRes = await callEvolution("/instance/fetchInstances", {}, 3500, 0);
        const list: any[] = Array.isArray(fetchRes.data) ? fetchRes.data : [];
        let instData = list.find((i: any) => (i.name || i.instanceName) === inst);
        const pic = instData?.profilePicUrl || instData?.profilePictureUrl || instData?.avatarUrl || instData?.instance?.profilePicUrl;
        if (pic && typeof pic === "string" && pic.startsWith("http")) {
          profilePicCache.set(inst, pic);
          return pic;
        }
      } catch {}
      return null;
    };

    // Helper to fetch image from CDN
    const fetchImage = async (url: string) => {
      const imgRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": "https://web.whatsapp.com/",
          "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        },
      });
      if (!imgRes.ok) return null;
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      return { buffer, contentType };
    };

    if (!target) {
      target = profilePicCache.get(instance) || "";
    }
    if (!target) {
      try {
        const db: any = await getDatabase();
        const [rows]: any = await db.mysql.execute("SELECT profile_pic_url FROM evolution_instances WHERE instance_name = ? LIMIT 1", [instance]);
        if (rows[0]?.profile_pic_url && rows[0].profile_pic_url.startsWith("http")) target = rows[0].profile_pic_url;
      } catch {}
    }
    if (!target) {
      target = (await fetchFreshProfilePic(instance)) || "";
    }

    if (target && target.startsWith("http")) {
      try {
        let result = await fetchImage(target);
        if (!result) {
          // Token may have expired: refresh from Evolution API
          const fresh = await fetchFreshProfilePic(instance);
          if (fresh && fresh !== target) {
            target = fresh;
            result = await fetchImage(target);
          }
        }
        if (result) {
          res.setHeader("Content-Type", result.contentType);
          res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
          return res.send(Buffer.from(result.buffer));
        }
      } catch {}
    }

    // High fidelity SVG fallback: clean user silhouette
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#109353"/>
      <circle cx="50" cy="38" r="18" fill="#ffffff"/>
      <path d="M 22 84 C 22 66, 35 58, 50 58 C 65 58, 78 66, 78 84 Z" fill="#ffffff"/>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  } catch (err: any) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <circle cx="50" cy="50" r="50" fill="#109353"/>
      <circle cx="50" cy="38" r="18" fill="#ffffff"/>
      <path d="M 22 84 C 22 66, 35 58, 50 58 C 65 58, 78 66, 78 84 Z" fill="#ffffff"/>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  }
});

// 4. Evolution API status check (Real connection state)
app.get("/api/evolution/status", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error === "UNAUTHORIZED") return res.status(401).json({ error: "Sessão inválida." });
  if (own.error) return res.status(402).json({ error: own.error, configured: true, instanceExists: false, state: "disconnected", connectedProfile: null });

  const { isConnected, activeInstance, stateRes, instanceData } = await resolveActiveInstance(own.instance, own.user?.id, own.db);
  const currentInst = getInstanceCache(activeInstance);

  try {
    let appState: EvolutionLocalCache["state"] = isConnected
      ? "connected"
      : (currentInst.qrCode?.base64 || currentInst.qrCode?.pairingCode ? "waiting_qr" : "disconnected");

    // When connected, ALWAYS clear any stale QR code from cache
    if (isConnected) {
      currentInst.qrCode = undefined;
    }

    currentInst.state = appState;
    currentInst.lastUpdated = new Date().toISOString();

    // If connected, fetch real WhatsApp profile metadata
    if (appState === "connected") {
      try {
        const prof = await fetchInstanceProfile(activeInstance, instanceData || stateRes.data);
        const realPictureUrl = prof.pictureUrl || currentInst.connectedProfile?.pictureUrl || own.record?.profile_pic_url || `/api/whatsapp/avatar?instance=${encodeURIComponent(activeInstance)}`;
        const realNumber = prof.number || currentInst.connectedProfile?.number || (own.record?.owner_phone ? formatPhone(own.record.owner_phone) : "");
        const realName = prof.name || currentInst.connectedProfile?.name || own.record?.profile_name || own.user?.name || "WhatsApp Conectado";

        currentInst.connectedProfile = {
          name: realName,
          number: realNumber,
          pictureUrl: realPictureUrl,
          connectedAt: currentInst.connectedProfile?.connectedAt || (own.record?.last_connected_at ? new Date(own.record.last_connected_at).toLocaleString("pt-BR") : prof.connectedAt),
          lastSyncAt: new Date().toLocaleString("pt-BR"),
          version: "v2.3.7",
        };
        currentInst.webhookStatus = "active";
        try {
          await own.db.setUserInstanceStatus(
            own.user.id,
            appState,
            realNumber,
            realName,
            realPictureUrl
          );
        } catch {}
        // Trigger background sync of groups
        syncAllWhatsAppGroups(false, activeInstance, { id: own.user.id, db: own.db }).catch(() => {});
      } catch (e) {
        try { await own.db.setUserInstanceStatus(own.user.id, appState); } catch {}
      }
    } else {
      try { await own.db.setUserInstanceStatus(own.user.id, appState); } catch {}
    }

    if (!currentInst.connectedProfile && (own.record?.profile_pic_url || own.record?.owner_phone)) {
      currentInst.connectedProfile = {
        name: own.record.profile_name || own.user?.name || "WhatsApp Conectado",
        number: own.record.owner_phone ? formatPhone(own.record.owner_phone) : "",
        pictureUrl: own.record.profile_pic_url || `/api/whatsapp/avatar?instance=${encodeURIComponent(activeInstance)}`,
        connectedAt: own.record.last_connected_at ? new Date(own.record.last_connected_at).toLocaleString("pt-BR") : undefined,
        lastSyncAt: new Date().toLocaleString("pt-BR"),
        version: "v2.3.7",
      };
    }

    res.json({
      configured: true,
      instanceExists: true,
      instanceName: activeInstance,
      platform: "Evolution API",
      state: appState,
      qrCode: currentInst.qrCode,
      connectedProfile: currentInst.connectedProfile,
      webhook: {
        status: appState === "connected" ? "active" : currentInst.webhookStatus,
        url: `${req.protocol}://${req.get("host")}/api/evolution/webhook`,
      },
      lastUpdated: currentInst.lastUpdated,
    });
  } catch (err: any) {
    res.status(500).json({
      configured: true,
      instanceName: activeInstance,
      state: "error",
      error: err.message,
      lastUpdated: new Date().toISOString(),
    });
  }
});

// 5. Request REAL QR Code from Evolution API: GET /instance/connect/{instance}
// Ultra-resilient implementation: Handles cold-start instance initialization,
// integrates with webhook cache, auto-converts raw strings to Base64, and returns 200
// pending instead of premature 502 error pages so the user experience is smooth and uninterrupted.
app.get("/api/evolution/qrcode", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error === "UNAUTHORIZED") return res.status(401).json({ error: "Sessão inválida." });
  if (own.error) return res.status(402).json({ error: "Plano inativo." });

  const { isConnected, activeInstance, stateRes } = await resolveActiveInstance(own.instance, own.user?.id, own.db);
  const instance = activeInstance;
  const currentInst = getInstanceCache(instance);
  const force = req.query.force === "true" || req.query.force === "1";

  // If already connected, return connected profile immediately (0ms)
  if (isConnected) {
    currentInst.state = "connected";
    const prof = await fetchInstanceProfile(instance, stateRes.data);
    currentInst.connectedProfile = {
      name: prof.name || currentInst.connectedProfile?.name || "WhatsApp Conectado",
      number: prof.number || currentInst.connectedProfile?.number || "",
      pictureUrl: prof.pictureUrl || currentInst.connectedProfile?.pictureUrl || "",
      connectedAt: currentInst.connectedProfile?.connectedAt || prof.connectedAt,
      lastSyncAt: new Date().toLocaleString("pt-BR"),
      version: "v2.3.7",
    };
    try {
      await own.db.setUserInstanceStatus(own.user.id, "connected", prof.number, prof.name, prof.pictureUrl);
    } catch {}
    return res.json({
      success: true,
      instanceName: instance,
      state: "connected",
      connectedProfile: currentInst.connectedProfile,
      message: "WhatsApp já está conectado.",
    });
  }

  // If we already have a valid QR code generated recently and force refresh wasn't requested, return it immediately
  if (!force && currentInst.qrCode?.base64 && Date.now() - currentInst.qrCode.updatedAt < 25000) {
    return res.json({
      success: true,
      instanceName: instance,
      qrCode: currentInst.qrCode,
      state: "waiting_qr",
      cached: true,
    });
  }

  try {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // 2. Request connection / QR code
    let connectRes = await callEvolution(`/instance/connect/${instance}`, { method: "GET" }, 6000, 0);

    // If 404, instance does not exist on Evolution server -> proactively create it
    if (!connectRes.ok && connectRes.status === 404) {
      const createRes = await callEvolution(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({ instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true }),
        },
        8000,
        0
      );

      if (createRes.ok) {
        const norm = await normalizeQrCode(createRes.data);
        if (norm) {
          currentInst.qrCode = norm;
          currentInst.state = "waiting_qr";
          currentInst.lastUpdated = new Date().toISOString();
          try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
          return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode, state: "waiting_qr" });
        }
      }
    } else if (connectRes.ok) {
      const norm = await normalizeQrCode(connectRes.data);
      if (norm) {
        currentInst.qrCode = norm;
        currentInst.state = "waiting_qr";
        currentInst.lastUpdated = new Date().toISOString();
        try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
        return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode, state: "waiting_qr" });
      }
    }

    // 3. Resilient polling loop: poll connect endpoint while also observing webhook memory cache
    for (let attempt = 0; attempt < 10; attempt++) {
      await sleep(650);

      // Check if incoming webhook event delivered the QR Code while we were waiting
      if (currentInst.qrCode?.base64 && Date.now() - currentInst.qrCode.updatedAt < 25000) {
        currentInst.state = "waiting_qr";
        try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
        return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode, state: "waiting_qr" });
      }

      const poll = await callEvolution(`/instance/connect/${instance}`, { method: "GET" }, 4000, 0);
      if (poll.ok) {
        const norm = await normalizeQrCode(poll.data);
        if (norm) {
          currentInst.qrCode = norm;
          currentInst.state = "waiting_qr";
          currentInst.lastUpdated = new Date().toISOString();
          try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
          return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode, state: "waiting_qr" });
        }
      } else if (poll.status === 404 && attempt === 0) {
        await callEvolution(
          "/instance/create",
          {
            method: "POST",
            body: JSON.stringify({ instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true }),
          },
          6000,
          0
        );
      }
    }

    // Never return 502 when Baileys socket is still preparing; return 200 with pending state
    currentInst.state = "waiting_qr";
    return res.json({
      success: true,
      pending: true,
      instanceName: instance,
      qrCode: currentInst.qrCode || null,
      state: "waiting_qr",
      message: "A Evolution está gerando o QR Code. Aguarde...",
    });
  } catch (err: any) {
    console.error("[Evolution qrcode]", instance, err?.message || err);
    return res.json({
      success: true,
      pending: true,
      instanceName: instance,
      qrCode: currentInst.qrCode || null,
      state: "waiting_qr",
      message: "Aguardando QR Code...",
    });
  }
});

// 5.1 Clean Reset & Refresh QR Code (Preserves instance session, refreshes QR)
app.post("/api/evolution/reset-instance", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
  const instance = own.instance;
  const currentInst = getInstanceCache(instance);
  currentInst.qrCode = undefined;

  try {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let connectRes = await callEvolution(`/instance/connect/${instance}`, { method: "GET" }, 5000, 0);
    if (!connectRes.ok && connectRes.status === 404) {
      await callEvolution(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({ instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true }),
        },
        7000,
        0
      );
    }

    for (let attempt = 0; attempt < 8; attempt++) {
      if (attempt > 0) await sleep(600);

      if (currentInst.qrCode?.base64) {
        currentInst.state = "waiting_qr";
        try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
        return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode });
      }

      const poll = await callEvolution(`/instance/connect/${instance}`, { method: "GET" }, 3500, 0);
      if (poll.ok) {
        const norm = await normalizeQrCode(poll.data);
        if (norm) {
          currentInst.qrCode = norm;
          currentInst.state = "waiting_qr";
          currentInst.lastUpdated = new Date().toISOString();
          try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
          return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode });
        }
      }
    }

    return res.json({
      success: true,
      pending: true,
      instanceName: instance,
      state: "waiting_qr",
      message: "Novo QR Code solicitado.",
    });
  } catch (err: any) {
    console.error("[Evolution reset-instance]", instance, err?.message || err);
    return res.json({ success: true, pending: true, instanceName: instance, state: "waiting_qr" });
  }
});

// 5.2 Request Pairing Code from Evolution API (Connect with Phone Number)
app.post("/api/evolution/pairing-code", async (req: Request, res: Response) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error === "UNAUTHORIZED") return res.status(401).json({ error: "Sessão inválida." });
  if (own.error) return res.status(402).json({ error: "Plano inativo." });

  const { isConnected, activeInstance, stateRes } = await resolveActiveInstance(own.instance, own.user?.id, own.db);
  const instance = activeInstance;
  const currentInst = getInstanceCache(instance);

  const { phone, number } = req.body || {};
  const rawPhone = String(phone || number || "").trim();
  let cleanPhone = cleanPhoneDigits(rawPhone);

  if (!cleanPhone) {
    return res.status(400).json({ error: "Informe o número do WhatsApp para gerar o código." });
  }

  // Remove leading zeros (e.g. 011987654321 -> 11987654321)
  cleanPhone = cleanPhone.replace(/^0+/, "");

  // If 10 or 11 digits (Brazilian phone without country code), prepend DDI 55
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = `55${cleanPhone}`;
  }

  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    return res.status(400).json({
      error: "Número de telefone inválido. Informe o DDD e o número completo (ex: 11987654321).",
    });
  }

  try {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // 1. Check if instance is already open/connected
    if (isConnected) {
      currentInst.state = "connected";
      const prof = await fetchInstanceProfile(instance, stateRes.data);
      currentInst.connectedProfile = {
        name: prof.name || currentInst.connectedProfile?.name || "WhatsApp Conectado",
        number: prof.number || currentInst.connectedProfile?.number || "",
        pictureUrl: prof.pictureUrl || currentInst.connectedProfile?.pictureUrl || "",
        connectedAt: currentInst.connectedProfile?.connectedAt || prof.connectedAt,
        lastSyncAt: new Date().toLocaleString("pt-BR"),
        version: "v2.3.7",
      };
      try {
        await own.db.setUserInstanceStatus(own.user.id, "connected", prof.number, prof.name, prof.pictureUrl);
      } catch {}
      return res.json({
        success: true,
        instanceName: instance,
        state: "connected",
        connectedProfile: currentInst.connectedProfile,
        message: "WhatsApp já está conectado.",
      });
    }

    // 2. Request pairing code from Evolution API
    // GET /instance/connect/{instance}?number={cleanPhone}
    let connectRes = await callEvolution(`/instance/connect/${instance}?number=${cleanPhone}`, { method: "GET" }, 8000, 0);

    // If 404, instance does not exist on Evolution server -> proactively create it
    if (!connectRes.ok && connectRes.status === 404) {
      const createRes = await callEvolution(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({ instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true }),
        },
        8000,
        0
      );

      if (createRes.ok) {
        await sleep(800);
        connectRes = await callEvolution(`/instance/connect/${instance}?number=${cleanPhone}`, { method: "GET" }, 8000, 0);
      }
    }

    let pairingCode: string | undefined = undefined;

    if (connectRes.ok && connectRes.data) {
      const norm = await normalizeQrCode(connectRes.data);
      pairingCode = norm?.pairingCode || connectRes.data?.pairingCode || connectRes.data?.code;
      if (pairingCode && (pairingCode.length > 15 || pairingCode.includes("@") || pairingCode.includes(","))) {
        pairingCode = connectRes.data?.pairingCode;
      }
    }

    // 3. If pairingCode not returned in initial call, poll briefly
    if (!pairingCode) {
      for (let attempt = 0; attempt < 6; attempt++) {
        await sleep(700);

        if (currentInst.qrCode?.pairingCode) {
          pairingCode = currentInst.qrCode.pairingCode;
          break;
        }

        const poll = await callEvolution(`/instance/connect/${instance}?number=${cleanPhone}`, { method: "GET" }, 4000, 0);
        if (poll.ok && poll.data) {
          const norm = await normalizeQrCode(poll.data);
          pairingCode = norm?.pairingCode || poll.data?.pairingCode || poll.data?.code;
          if (pairingCode && (pairingCode.length > 15 || pairingCode.includes("@") || pairingCode.includes(","))) {
            pairingCode = poll.data?.pairingCode;
          }
          if (pairingCode) break;
        }
      }
    }

    if (pairingCode) {
      const formattedCode = String(pairingCode).trim();
      currentInst.qrCode = {
        pairingCode: formattedCode,
        updatedAt: Date.now(),
      };
      currentInst.state = "waiting_qr";
      currentInst.lastUpdated = new Date().toISOString();
      try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}

      return res.json({
        success: true,
        instanceName: instance,
        pairingCode: formattedCode,
        code: formattedCode,
        phone: cleanPhone,
        state: "waiting_qr",
        message: "Código de pareamento gerado com sucesso!",
      });
    }

    currentInst.state = "waiting_qr";
    return res.json({
      success: true,
      pending: true,
      instanceName: instance,
      phone: cleanPhone,
      pairingCode: currentInst.qrCode?.pairingCode || null,
      state: "waiting_qr",
      message: "Solicitando código de pareamento à Evolution API. Aguarde...",
    });
  } catch (err: any) {
    console.error("[Evolution pairing-code]", instance, err?.message || err);
    return res.status(500).json({
      error: "Falha ao solicitar código de pareamento. Verifique se o número está correto e tente novamente.",
    });
  }
});

// 6. Create instance manually / Initiate WhatsApp Connection
app.post("/api/evolution/create-instance", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error === "UNAUTHORIZED") return res.status(401).json({ error: "Sessão inválida." });
  if (own.error) return res.status(402).json({ error: "Plano aguardando pagamento ou suspenso." });
  const instance = own.instance;
  const currentInst = getInstanceCache(instance);

  try {
    let norm = null;
    const connectRes = await callEvolution(`/instance/connect/${instance}`, {}, 6000, 0);
    if (connectRes.ok) {
      norm = await normalizeQrCode(connectRes.data);
    } else if (connectRes.status === 404) {
      const createRes = await callEvolution(
        "/instance/create",
        {
          method: "POST",
          body: JSON.stringify({ instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true }),
        },
        8000,
        0
      );
      if (createRes.ok) norm = await normalizeQrCode(createRes.data);
    }

    if (!norm) {
      for (let attempt = 0; attempt < 8; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (currentInst.qrCode?.base64) {
          norm = currentInst.qrCode;
          break;
        }
        const poll = await callEvolution(`/instance/connect/${instance}`, {}, 4000, 0);
        if (poll.ok) {
          norm = await normalizeQrCode(poll.data);
          if (norm) break;
        }
      }
    }

    if (norm) {
      currentInst.qrCode = norm;
      currentInst.state = "waiting_qr";
      currentInst.lastUpdated = new Date().toISOString();
      try { await own.db.setUserInstanceStatus(own.user.id, "waiting_qr"); } catch {}
      return res.json({ success: true, instanceName: instance, qrCode: currentInst.qrCode, state: "waiting_qr" });
    }

    return res.json({
      success: true,
      pending: true,
      instanceName: instance,
      state: "waiting_qr",
      message: "Gerando QR Code...",
    });
  } catch (err: any) {
    console.error("[Evolution create-instance]", instance, err?.message || err);
    return res.json({ success: true, pending: true, instanceName: instance, state: "waiting_qr" });
  }
});

// 7. Restart instance: POST /instance/restart/{instance}
app.post("/api/evolution/restart", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
  const instance = own.instance;

  try {
    const restartRes = await callEvolution(`/instance/restart/${instance}`, {
      method: "POST",
    });

    res.json({
      success: true,
      instanceName: instance,
      result: restartRes.data,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Logout instance: DELETE /instance/logout/{instance}
app.post("/api/evolution/logout", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error) return res.status(401).json({ error: "Sessão inválida." });
  const instance = own.instance;
  const currentInst = getInstanceCache(instance);

  try {
    const logoutRes = await callEvolution(`/instance/logout/${instance}`, {
      method: "DELETE",
    });

    currentInst.state = "disconnected";
    currentInst.qrCode = undefined;
    currentInst.connectedProfile = undefined;
    cachedGroupsByInstance.delete(instance);
    clientImportedGroupsStore.delete(instance);
    try {
      await own.db.setUserInstanceStatus(own.user.id, "disconnected");
      await own.db.clearGroupsForUser(own.user.id);
    } catch {}

    res.json({
      success: true,
      instanceName: instance,
      result: logoutRes.data,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Configure Webhook
app.post("/api/evolution/set-webhook", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const instance = own.instance;
  const host = req.get("host");
  const protocol = req.protocol;
  const appUrl = process.env.APP_URL || `${protocol}://${host}`;
  const webhookUrl = `${appUrl}/api/evolution/webhook`;

  try {
    const webhookPayload = {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      events: [
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE",
      ],
    };

    const setRes = await callEvolution(`/webhook/set/${instance}`, {
      method: "POST",
      body: JSON.stringify({ webhook: webhookPayload }),
    });

    memoryState.webhookStatus = "active";

    res.json({
      success: true,
      webhookUrl,
      result: setRes.data,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Webhook endpoint
app.post("/api/evolution/webhook", async (req: Request, res: Response) => {
  try {
    // O MySQL é a fonte de verdade dos grupos monitorados. Nunca processe o
    // primeiro webhook de um worker Passenger antes de hidratar esse estado.
    await getDatabase();
  } catch (error: any) {
    console.error("[RadarWebhook] Estado do Radar indisponível:", error?.code || error?.message || "DB_ERROR");
    return res.status(503).json({ received: false, error: "RADAR_STATE_UNAVAILABLE" });
  }
  const event = req.body;
  const eventType = event?.event || event?.type || "unknown";
  const instanceName = event?.instance || event?.data?.instance || event?.sender || DEFAULT_INSTANCE_NAME;
  const targetCache = getInstanceCache(instanceName);

  targetCache.webhookEvents.unshift({
    type: eventType,
    data: event,
    timestamp: new Date().toISOString(),
  });
  if (targetCache.webhookEvents.length > 50) {
    targetCache.webhookEvents.pop();
  }

  if (targetCache !== memoryState) {
    memoryState.webhookEvents.unshift({
      type: eventType,
      data: event,
      timestamp: new Date().toISOString(),
    });
    if (memoryState.webhookEvents.length > 50) {
      memoryState.webhookEvents.pop();
    }
  }

  if (eventType === "connection.update" || eventType === "CONNECTION_UPDATE") {
    const rawState = event.data?.state || event.data?.connection;
    if (rawState === "open") {
      targetCache.state = "connected";
      targetCache.webhookStatus = "active";
      if (instanceName === DEFAULT_INSTANCE_NAME) {
        memoryState.state = "connected";
        memoryState.webhookStatus = "active";
      }

      // Automatically trigger real-time profile update & group sync for this tenant
      (async () => {
        try {
          const db: any = await getDatabase().catch(() => null);
          if (!db) return;
          const user = await db.getUserByInstance(instanceName).catch(() => null);
          const userId = user?.id || (instanceName.match(/^grolpy-u(\d+)-/) ? parseInt(instanceName.match(/^grolpy-u(\d+)-/)![1], 10) : null);
          if (userId) {
            const prof = await fetchInstanceProfile(instanceName).catch(() => null);
            if (prof) {
              await db.setUserInstanceStatus(userId, "connected", prof.number, prof.name, prof.pictureUrl).catch(() => {});
            }
            await syncAllWhatsAppGroups(true, instanceName, { id: userId, db }).catch(() => {});
            console.log(`[Webhook] ✅ Real-time groups & profile synced on connect for user ${userId} (${instanceName})`);
          }
        } catch (err: any) {
          console.warn(`[Webhook] Error auto-syncing on connect:`, err?.message || err);
        }
      })();
    } else if (rawState === "close") {
      targetCache.state = "disconnected";
      if (instanceName === DEFAULT_INSTANCE_NAME) {
        memoryState.state = "disconnected";
      }
    }
  }

  // Handle real-time groups events from Evolution API
  if (eventType === "groups.upsert" || eventType === "GROUPS_UPSERT" || eventType === "group.update" || eventType === "GROUP_UPDATE" || eventType === "chats.set" || eventType === "CHATS_SET") {
    (async () => {
      try {
        const db: any = await getDatabase().catch(() => null);
        if (!db) return;
        const user = await db.getUserByInstance(instanceName).catch(() => null);
        const userId = user?.id || (instanceName.match(/^grolpy-u(\d+)-/) ? parseInt(instanceName.match(/^grolpy-u(\d+)-/)![1], 10) : null);
        if (userId) {
          await syncAllWhatsAppGroups(true, instanceName, { id: userId, db }).catch(() => {});
          console.log(`[Webhook] ✅ Real-time groups updated on ${eventType} for user ${userId} (${instanceName})`);
        }
      } catch (err: any) {
        console.warn(`[Webhook] Warning on group event ${eventType}:`, err?.message || err);
      }
    })();
  }

  if (eventType === "qrcode.updated" || eventType === "QRCODE_UPDATED") {
    const rawQr = event.data?.qrcode || event.data;
    normalizeQrCode(rawQr).then((norm) => {
      if (norm) {
        targetCache.qrCode = norm;
        targetCache.state = "waiting_qr";
        targetCache.lastUpdated = new Date().toISOString();
        if (instanceName === DEFAULT_INSTANCE_NAME) {
          memoryState.qrCode = norm;
          memoryState.state = "waiting_qr";
          memoryState.lastUpdated = new Date().toISOString();
        }
      }
    }).catch(() => {});
  }

  // Handle typing presence events
  if (eventType === "presence.update" || eventType === "PRESENCE_UPDATE") {
    const data = event.data;
    const targetJid = data?.id || data?.remoteJid;
    const presence = data?.presence;
    if (presence === "composing" || presence === "recording") {
      radarEngine.setTyping(targetJid);
    } else {
      radarEngine.clearTyping(targetJid);
    }
  }

  // Handle incoming WhatsApp messages for Radar analysis
  if (eventType === "messages.upsert" || eventType === "MESSAGES_UPSERT") {
    const msgData = event.data;
    const records = Array.isArray(msgData?.messages)
      ? msgData.messages
      : Array.isArray(msgData)
      ? msgData
      : msgData ? [msgData] : [];

    for (const msg of records) {
      const remoteJid = msg.key?.remoteJid || "";
      // Only process group messages for Radar
      if (remoteJid.endsWith("@g.us")) {
        const text = extractWhatsAppMessageText(msg);
        const sender = resolveWhatsAppGroupSender(msg);
        const senderJid = sender.jid;
        const senderPhone = sender.phone;
        const senderName = msg.pushName || `WhatsApp ${senderPhone.slice(-4)}`;
        const message = unwrapWhatsAppMessage(msg.message);

        // Extract real attached image from WhatsApp message if present
        let attachedImageUrl: string | undefined = undefined;
        const msgId = msg.key?.id;
        const instance = memoryState.instanceName || "nexus-radar";

        if (message?.imageMessage) {
          const imgMsg = message.imageMessage;
          if (imgMsg.url && typeof imgMsg.url === "string" && imgMsg.url.startsWith("http")) {
            attachedImageUrl = imgMsg.url;
          } else if (imgMsg.jpegThumbnail) {
            attachedImageUrl = `data:image/jpeg;base64,${imgMsg.jpegThumbnail}`;
          } else if (imgMsg.base64) {
            attachedImageUrl = `data:image/jpeg;base64,${imgMsg.base64}`;
          } else if (msgId) {
            attachedImageUrl = `/api/crm/media/${msgId}?instance=${instance}`;
          }
        } else if (msg.base64 && (msg.mimetype?.startsWith("image/") || msg.messageType === "imageMessage")) {
          attachedImageUrl = `data:${msg.mimetype || 'image/jpeg'};base64,${msg.base64}`;
        } else if (msg.mediaUrl && typeof msg.mediaUrl === "string" && msg.mediaUrl.startsWith("http")) {
          attachedImageUrl = msg.mediaUrl;
        }

        radarEngine.handleIncomingGroupMessage({
          groupJid: remoteJid,
          senderJid,
          senderPhone,
          senderName,
          messageId: String(msgId || ""),
          messageText: text,
          attachedImageUrl,
          fromMe: Boolean(msg.key?.fromMe),
          timestamp: getWhatsAppMessageTimestamp(msg),
          senderSource: sender.source,
        });
      } else if (!msg.key?.fromMe) {
        // Private replies from Radar leads belong to IA Chat. Other inbound contacts
        // remain isolated for the regular CRM flow.
        radarEngine.clearTyping(remoteJid);
        const text = extractWhatsAppMessageText(msg);
        const directJidCandidates = [
          msg.key?.senderPn,
          msg.senderPn,
          msg.key?.participantAlt,
          msg.participantAlt,
          msg.key?.participant,
          msg.participant,
          msg.key?.remoteJidAlt,
          msg.remoteJidAlt,
          msg.key?.remoteJid,
          msg.remoteJid,
          msg.sender,
          event?.sender,
        ].filter((value): value is string => typeof value === "string" && value.length > 0);
        const matchedLead = directJidCandidates
          .map((candidate) => atendimentoEngine.findLead(candidate))
          .find(Boolean);
        if (text && matchedLead) {
          atendimentoEngine
            .handleIncomingClientMessage(matchedLead.contactJid, text, String(msg.key?.id || ''))
            .catch((error) => console.error('[AtendimentoEngine] Falha ao processar mensagem recebida:', error));
        }
      }
    }
  }

  res.status(200).json({ received: true });
});

// ----------------------------------------------------
// REAL CRM DATA ROUTES (Direct Evolution WhatsApp Sync)
// ----------------------------------------------------

// 11. Fetch REAL CRM conversations strictly focused on saved opportunity contacts
app.get("/api/crm/conversations", requireAdminRoute, async (_req, res) => {
  // CRM comum e reservado para atendimento inbound. Leads do Radar vivem no IA Chat.
  // A sincronizacao inbound sera persistida separadamente; nao reutilizar atendimentoEngine aqui.
  res.json({ success: true, total: 0, conversations: [] });
});

// Endpoint to fetch profile picture dynamically for any WhatsApp JID / number
app.get("/api/crm/profile-picture", requireAdminRoute, async (req, res) => {
  const instance = (req.query.instance as string) || memoryState.instanceName;
  const number = req.query.number as string;

  if (!number) {
    return res.status(400).json({ error: "number é obrigatório" });
  }

  if (profilePicCache.has(number)) {
    return res.json({ success: true, profilePictureUrl: profilePicCache.get(number) });
  }

  try {
    const picRes = await callEvolution(`/chat/fetchProfilePictureUrl/${instance}`, {
      method: "POST",
      body: JSON.stringify({ number }),
    });

    const url = picRes.data?.profilePictureUrl || null;
    if (url) {
      profilePicCache.set(number, url);
    }

    res.json({
      success: true,
      profilePictureUrl: url,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cache for media files (images, audio notes, videos, stickers)
const mediaMemoryCache = new Map<string, { buffer: Buffer; mimetype: string }>();

// 12a. Serve/Stream REAL WhatsApp Media: GET /api/crm/media/:messageId
app.get("/api/crm/media/:messageId", requireAdminRoute, async (req, res) => {
  const { messageId } = req.params;
  const instance = (req.query.instance as string) || memoryState.instanceName;

  if (!messageId) {
    return res.status(400).send("messageId é obrigatório");
  }

  const cacheKey = `${instance}:${messageId}`;
  if (mediaMemoryCache.has(cacheKey)) {
    const cached = mediaMemoryCache.get(cacheKey)!;
    res.setHeader("Content-Type", cached.mimetype);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(cached.buffer);
  }

  try {
    const mediaRes = await callEvolution(`/chat/getBase64FromMediaMessage/${instance}`, {
      method: "POST",
      body: JSON.stringify({
        message: {
          key: {
            id: messageId,
          },
        },
        convertToMp4: false,
      }),
    });

    if (!mediaRes.ok || !mediaRes.data?.base64) {
      return res.status(404).send("Mídia não encontrada");
    }

    const { base64, mimetype } = mediaRes.data;
    const buffer = Buffer.from(base64, "base64");
    const mime = mimetype || "application/octet-stream";

    if (mediaMemoryCache.size > 250) {
      const firstKey = mediaMemoryCache.keys().next().value;
      if (firstKey) mediaMemoryCache.delete(firstKey);
    }
    mediaMemoryCache.set(cacheKey, { buffer, mimetype: mime });

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (err: any) {
    console.error("Error serving media:", err.message);
    res.status(500).send("Erro ao obter mídia do WhatsApp");
  }
});

// 12. Fetch REAL messages for a specific WhatsApp contact/chat: POST /chat/findMessages/{instance}
app.get("/api/crm/messages", requireAdminRoute, async (req, res) => {
  let instance = (req.query.instance as string) || memoryState.instanceName;
  const jid = req.query.jid as string;

  if (!jid) {
    return res.status(400).json({ error: "jid é obrigatório (ex: 552799999999@s.whatsapp.net ou id@lid)" });
  }

  try {
    const payload = {
      where: {
        key: {
          remoteJid: jid,
        },
      },
      limit: 60,
    };

    let msgRes = await callEvolution(`/chat/findMessages/${instance}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    let records = msgRes.data?.messages?.records || (Array.isArray(msgRes.data) ? msgRes.data : []);

    // If 0 records and no explicit instance parameter was passed, check if another instance has these messages
    if (records.length === 0 && !req.query.instance) {
      try {
        const listRes = await callEvolution("/instance/fetchInstances");
        const openInstances = (listRes.data || []).filter((i: any) => i.connectionStatus === "open" && i.name !== instance);
        for (const inst of openInstances) {
          const tryRes = await callEvolution(`/chat/findMessages/${inst.name}`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
          const found = tryRes.data?.messages?.records || (Array.isArray(tryRes.data) ? tryRes.data : []);
          if (found.length > 0) {
            instance = inst.name;
            records = found;
            break;
          }
        }
      } catch {
        // Continue with current result
      }
    }

    // Sort messages chronologically (oldest to newest)
    const sorted = [...records].sort((a: any, b: any) => {
      const tA = a.messageTimestamp || 0;
      const tB = b.messageTimestamp || 0;
      return tA - tB;
    });

    // DEDUPLICATION: ensure no message is duplicated by key.id or id
    const seenIds = new Set<string>();
    const deduplicatedRecords: any[] = [];
    for (const m of sorted) {
      const msgId = m.key?.id || m.id;
      if (msgId && !seenIds.has(msgId)) {
        seenIds.add(msgId);
        deduplicatedRecords.push(m);
      }
    }

    // Se o contato pertencer ao arquivo de contatos com oportunidades
    const lead = atendimentoEngine.findLead(jid);
    if (lead) {
      // Se a Evolution API retornou mensagens, sincroniza com o histórico do lead
      if (deduplicatedRecords.length > 0) {
        const evolutionMsgs = deduplicatedRecords.map((m: any) => ({
          id: m.key?.id || m.id || `msg_${Date.now()}`,
          sender: m.key?.fromMe ? ("agent" as const) : ("client" as const),
          senderName: m.key?.fromMe ? "Você" : (lead.contactName || m.pushName || "Cliente"),
          text: extractMessageText(m),
          timestamp: (m.messageTimestamp || Math.floor(Date.now() / 1000)) * 1000,
          time: formatChatTime(m.messageTimestamp),
          status: m.status === "READ" ? ("read" as const) : (m.status === "DELIVERY_ACK" ? ("delivered" as const) : ("sent" as const)),
          type: "text" as const,
        }));
        atendimentoEngine.syncMessages(jid, evolutionMsgs);
      }

      // Retornar as mensagens salvas no arquivo crm_contatos_oportunidades.json
      const leadMessages = (lead.messages || []).map((m) => ({
        id: m.id,
        sender: m.sender === "client" ? "contact" : "agent",
        senderName: m.senderName,
        senderPhone: lead.contactPhone,
        content: m.text,
        type: m.type || "text",
        mediaUrl: m.mediaUrl,
        mimetype: m.mimetype,
        timestamp: m.time,
        status: m.status,
        channel: "whatsapp",
      }));

      return res.json({
        success: true,
        jid,
        instanceName: instance,
        total: leadMessages.length,
        messages: leadMessages,
      });
    }

    const messages = deduplicatedRecords.map((m: any) => {
      const fromMe = Boolean(m.key?.fromMe);
      const text = extractMessageText(m);
      const time = formatChatTime(m.messageTimestamp);
      const msgId = m.key?.id || m.id;

      // Extract sender identity especially for WhatsApp groups
      const rawParticipant = m.key?.participant || m.participant || "";
      const rawParticipantAlt = m.key?.participantAlt || m.participantAlt || "";
      const senderPhone = formatPhone(rawParticipantAlt || rawParticipant);
      const senderName = fromMe
        ? "Você"
        : m.pushName || senderPhone || "Participante";

      // Detect Media Type & Extract Media Attributes
      const msgObj = m.message || {};
      const mType = m.messageType || "";

      let type: "text" | "image" | "audio" | "video" | "sticker" | "document" = "text";
      let mediaUrl: string | undefined = undefined;
      let mimetype: string | undefined = undefined;
      let caption: string | undefined = undefined;
      let fileName: string | undefined = undefined;
      let duration: number | undefined = undefined;

      if (mType === "imageMessage" || msgObj.imageMessage) {
        type = "image";
        mediaUrl = `/api/crm/media/${msgId}?instance=${instance}`;
        mimetype = msgObj.imageMessage?.mimetype || "image/jpeg";
        caption = msgObj.imageMessage?.caption || text || "";
      } else if (mType === "videoMessage" || msgObj.videoMessage) {
        type = "video";
        mediaUrl = `/api/crm/media/${msgId}?instance=${instance}`;
        mimetype = msgObj.videoMessage?.mimetype || "video/mp4";
        caption = msgObj.videoMessage?.caption || text || "";
        duration = msgObj.videoMessage?.seconds || 0;
      } else if (mType === "audioMessage" || msgObj.audioMessage) {
        type = "audio";
        mediaUrl = `/api/crm/media/${msgId}?instance=${instance}`;
        mimetype = msgObj.audioMessage?.mimetype || "audio/ogg; codecs=opus";
        duration = msgObj.audioMessage?.seconds || 0;
      } else if (mType === "stickerMessage" || msgObj.stickerMessage) {
        type = "sticker";
        mediaUrl = `/api/crm/media/${msgId}?instance=${instance}`;
        mimetype = msgObj.stickerMessage?.mimetype || "image/webp";
      } else if (mType === "documentMessage" || msgObj.documentMessage) {
        type = "document";
        mediaUrl = `/api/crm/media/${msgId}?instance=${instance}`;
        mimetype = msgObj.documentMessage?.mimetype || "application/pdf";
        fileName = msgObj.documentMessage?.fileName || "documento.pdf";
      }

      let status = "sent";
      if (m.status === "READ") status = "read";
      else if (m.status === "DELIVERY_ACK") status = "delivered";

      return {
        id: msgId,
        sender: fromMe ? "agent" : "contact",
        senderName,
        senderPhone: senderPhone || undefined,
        participant: rawParticipant,
        participantAlt: rawParticipantAlt,
        content: text,
        type,
        mediaUrl,
        mimetype,
        caption,
        fileName,
        duration,
        timestamp: time,
        status,
        channel: "whatsapp",
      };
    });

    res.json({
      success: true,
      jid,
      instanceName: instance,
      total: messages.length,
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. SEND REAL WhatsApp Message via Evolution API: POST /message/sendText/{instance}
app.post("/api/crm/send-message", requireAdminRoute, async (req, res) => {
  const { instanceName, jid, text } = req.body;
  const instance = instanceName || memoryState.instanceName;

  if (!jid || !text) {
    return res.status(400).json({ error: "jid e text são obrigatórios para envio." });
  }

  try {
    const sendRes = await callEvolution(`/message/sendText/${instance}`, {
      method: "POST",
      body: JSON.stringify({
        number: jid,
        text,
      }),
    });

    if (!sendRes.ok) {
      return res.status(sendRes.status).json({
        error: "Falha ao enviar mensagem pelo WhatsApp na Evolution API.",
        details: sendRes.data,
      });
    }

    // Salva no histórico do IA Chat. Só o botão Assumir desativa a IA; envio manual não muda o responsável.
    const adminName = (req as any).adminUser?.name || "Administrador";
    atendimentoEngine.addHumanMessage(jid, text, adminName);

    res.json({
      success: true,
      instanceName: instance,
      result: sendRes.data,
      message: {
        id: sendRes.data?.key?.id || `sent_${Date.now()}`,
        sender: "agent",
        content: text,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        status: "sent",
        channel: "whatsapp",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// REAL RADAR ENGINE ROUTES
// ----------------------------------------------------

// Status & Metrics
app.get("/api/radar/status", requireAdminRoute, (_req, res) => {
  // O Radar administrativo usa a instância Evolution do admin.
  // Mantenha a mesma instância usada pelas rotas /api/radar/groups também no polling.
  radarEngine.instanceName = memoryState.instanceName || DEFAULT_INSTANCE_NAME;
  radarEngine.ensureMonitoringStarted();
  res.json(radarEngine.getStatus());
});

app.post("/api/radar/status", requireAdminRoute, (req, res) => {
  const { status } = req.body;
  if (status === "active" || status === "paused") {
    radarEngine.setStatus(status);
    return res.json({ success: true, status: radarEngine.status });
  }
  res.status(400).json({ error: "Status inválido (use 'active' ou 'paused')" });
});

// Real Groups from connected Evolution instance
app.get("/api/radar/groups", requireAdminRoute, async (req, res) => {
  const instance = (req.query.instance as string) || memoryState.instanceName;

  try {
    const chatsRes = await callEvolution(`/chat/findChats/${instance}`, {
      method: "POST",
      body: JSON.stringify({ limit: 150 }),
    });

    if (!chatsRes.ok) {
      return res.json({ success: true, groups: [] });
    }

    const chatsList = Array.isArray(chatsRes.data) ? chatsRes.data : [];
    const groups = chatsList
      .filter((c: any) => c.remoteJid?.includes("@g.us") || c.isGroup)
      .map((c: any) => {
        const jid = c.remoteJid;
        const isMonitored = radarEngine.monitoredGroupJids.has(jid);
        const name = c.name || c.pushName || c.subject || "Grupo WhatsApp";
        const avatar =
          c.profilePicUrl ||
          profilePicCache.get(jid) ||
          "";

        // Keep radarEngine metadata cache in sync
        radarEngine.updateGroupMetadata(jid, name, avatar);

        return {
          id: jid,
          jid,
          name,
          avatar,
          messageCount: c.unreadCount || 0,
          status: isMonitored ? "active" : "inactive",
          isMonitored,
          lastMessageTime: formatChatTime(c.lastMessage?.messageTimestamp || c.updatedAt),
        };
      });

    res.json({
      success: true,
      instanceName: instance,
      total: groups.length,
      groups,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, groups: [] });
  }
});

// Update monitored groups list or toggle individual group
app.post("/api/radar/monitored-groups", requireAdminRoute, (req, res) => {
  const { groupJids, groupJid, isMonitored } = req.body;

  if (Array.isArray(groupJids)) {
    const list = radarEngine.setMonitoredGroups(groupJids);
    return res.json({ success: true, monitoredGroupJids: list });
  }

  if (groupJid && typeof isMonitored === "boolean") {
    const current = radarEngine.toggleMonitoredGroup(groupJid, isMonitored);
    return res.json({ success: true, groupJid, isMonitored: current });
  }

  res.status(400).json({ error: "Parâmetros inválidos" });
});

// Real opportunities list
app.get("/api/radar/opportunities", requireAdminRoute, (_req, res) => {
  res.json({
    success: true,
    total: radarEngine.opportunities.length,
    opportunities: radarEngine.opportunities,
  });
});

// Update opportunity status / stage
app.post("/api/radar/opportunities/:id/stage", requireAdminRoute, (req, res) => {
  const { id } = req.params;
  const { stage, assignedUserName } = req.body;

  const updated = radarEngine.updateOpportunityStage(id, stage, assignedUserName);
  if (!updated) {
    return res.status(404).json({ error: "Oportunidade não encontrada" });
  }

  res.json({ success: true, opportunity: updated });
});

// Start Contact / Assumir no CRM
app.post("/api/radar/start-contact", requireAdminRoute, (req, res) => {
  const { opportunityId } = req.body;

  if (!opportunityId) {
    return res.status(400).json({ error: "opportunityId é obrigatório" });
  }

  try {
    const result = radarEngine.startContactInCrm({
      opportunityId,
      assignedUserName: (req as any).adminUser?.name || "Administrador",
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Real Activity log
app.get("/api/radar/activities", requireAdminRoute, (_req, res) => {
  res.json({
    success: true,
    total: radarEngine.activities.length,
    activities: radarEngine.activities,
  });
});

// Update CRM contact stage
app.post("/api/crm/contact-stage", requireAdminRoute, (req, res) => {
  const { contactId, stage } = req.body;
  if (!contactId || !stage) {
    return res.status(400).json({ error: "contactId e stage são obrigatórios" });
  }

  radarEngine.setContactStage(contactId, stage);
  // Atualizar também no arquivo de contatos com oportunidades
  atendimentoEngine.updateLeadStatus(contactId, stage, (req as any).adminUser?.name || "Administrador");
  res.json({ success: true, contactId, stage });
});

// Update lead status in CRM Atendimento and save to disk
app.post("/api/atendimento/status", requireAdminRoute, (req, res) => {
  const { leadId, status, userName } = req.body;
  if (!leadId || !status) {
    return res.status(400).json({ error: "leadId e status são obrigatórios" });
  }

  const updated = atendimentoEngine.updateLeadStatus(leadId, status, (req as any).adminUser?.name || userName || "Administrador");
  if (!updated) {
    return res.status(404).json({ error: "Lead não encontrado" });
  }
  res.json({ success: true, lead: updated });
});

// Check typing status for contact
app.get("/api/crm/typing-status", requireAdminRoute, (req, res) => {
  const jid = req.query.jid as string;
  if (!jid) {
    return res.json({ isTyping: false });
  }
  res.json({ isTyping: radarEngine.isTyping(jid) });
});

// ----------------------------------------------------
// CRM ATENDIMENTO & AI AGENT ROUTES
// ----------------------------------------------------

// Keep the commercial pipeline synchronized with what the AI learns in the conversation.
atendimentoEngine.setStageUpdater((jid, stage) => radarEngine.setContactStage(jid, stage));

// Wire up real Evolution sender for AI Agent follow-ups
atendimentoEngine.setEvolutionSender(async (
  targetJid: string,
  text: string,
  kind = "proactive",
  mediaPath?: string
) => {
  try {
    const instance = memoryState.instanceName;
    const cleanNumber = targetJid.replace(/\D/g, "");
    const sendPricingTable = async () => {
      if (!mediaPath) return true;
      const fullMediaPath = path.resolve(process.cwd(), mediaPath);
      if (!fs.existsSync(fullMediaPath)) {
        console.error(`[AtendimentoEngine] Tabela de planos não encontrada: ${fullMediaPath}`);
        return false;
      }
      const extension = path.extname(fullMediaPath).toLowerCase();
      const mimetype = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      const mediaRes = await callEvolution(`/message/sendMedia/${instance}`, {
        method: "POST",
        body: JSON.stringify({
          number: targetJid,
          mediatype: "image",
          mimetype,
          media: fs.readFileSync(fullMediaPath).toString("base64"),
          caption: "",
          fileName: path.basename(fullMediaPath),
        }),
      }, 60000, 0);
      if (!mediaRes.ok) console.error("[AtendimentoEngine] Evolution recusou a tabela de planos:", mediaRes.data);
      return mediaRes.ok;
    };
    if (!(await sendPricingTable())) return false;
    if (kind !== "reply") {
      const db = await getDatabase();
      if (await db.isOutboundProtectedNumber(cleanNumber || targetJid)) {
        console.warn("[AtendimentoEngine] Envio proativo bloqueado: número protegido/registrado no banco.");
        return false;
      }
    }
    const sendRes = await callEvolution(`/message/sendText/${instance}`, {
      method: "POST",
      body: JSON.stringify({
        number: targetJid,
        text,
      }),
    });
    if (!sendRes.ok) return false;
    // sendText 2xx = Evolution aceitou o envio; o histórico pode refletir depois do WhatsApp.
    return true;
  } catch (err: any) {
    console.error("[AtendimentoEngine] Error sending via Evolution:", err.message);
    return false;
  }
});

// Webhook is primary. Reconcile real Evolution history too, so private replies
// cannot disappear from IA Chat when webhook delivery is interrupted.
let atendimentoInboundSyncRunning = false;
setInterval(() => {
  if (atendimentoInboundSyncRunning) return;
  atendimentoInboundSyncRunning = true;
  void (async () => {
    try {
      await getDatabase();
      const instance = memoryState.instanceName || DEFAULT_INSTANCE_NAME;
      const response = await callEvolution(`/chat/findMessages/${instance}`, {
        method: "POST",
        body: JSON.stringify({ limit: 100 }),
      });
      const payload = response.data;
      const records = payload?.messages?.records || payload?.records || (Array.isArray(payload) ? payload : []);
      if (!Array.isArray(records)) return;
      const ordered = [...records].sort((a: any, b: any) => getWhatsAppMessageTimestamp(a) - getWhatsAppMessageTimestamp(b));
      for (const msg of ordered) {
        const remoteJid = String(msg?.key?.remoteJid || msg?.remoteJid || "");
        if (!remoteJid || remoteJid.endsWith("@g.us") || msg?.key?.fromMe) continue;
        const text = extractWhatsAppMessageText(msg);
        if (!text) continue;
        const candidates = [
          msg?.key?.senderPn, msg?.senderPn, msg?.key?.participantAlt, msg?.participantAlt,
          msg?.key?.participant, msg?.participant, msg?.key?.remoteJidAlt, msg?.remoteJidAlt,
          msg?.key?.remoteJid, msg?.remoteJid, msg?.sender,
        ].filter((value): value is string => typeof value === "string" && value.length > 0);
        const lead = candidates.map((candidate) => atendimentoEngine.findLead(candidate)).find(Boolean);
        if (!lead) continue;
        await atendimentoEngine.handleIncomingClientMessage(lead.contactJid, text, String(msg?.key?.id || msg?.id || ""));
      }
    } catch (error: any) {
      console.error("[AtendimentoEngine] Falha na reconciliacao inbound:", error?.message || error);
    } finally {
      atendimentoInboundSyncRunning = false;
    }
  })();
}, 3000);

// List leads originating from Radar in CRM Atendimento
app.get("/api/atendimento/leads", requireAdminRoute, (_req, res) => {
  res.json({
    success: true,
    total: atendimentoEngine.atendimentos.length,
    leads: atendimentoEngine.atendimentos,
  });
});

// Get single lead details with internal notes history
app.get("/api/atendimento/lead/:id", requireAdminRoute, (req, res) => {
  const lead = atendimentoEngine.atendimentos.find(
    (a) => a.id === req.params.id || a.contactJid === req.params.id
  );
  if (!lead) return res.status(404).json({ error: "Atendimento não encontrado" });
  res.json({ success: true, lead });
});

// Human takes over lead
app.post("/api/atendimento/assume", requireAdminRoute, (req, res) => {
  const { leadId, userName } = req.body;
  const updated = atendimentoEngine.assumeLead(leadId, (req as any).adminUser?.name || userName || "Administrador");
  if (!updated) return res.status(404).json({ error: "Lead não encontrado" });
  res.json({ success: true, lead: updated });
});

// Toggle AI on/off for specific contact
app.post("/api/atendimento/toggle-ai", requireAdminRoute, (req, res) => {
  const { leadId, active, userName } = req.body;
  if (Boolean(active) && !atendimentoEngine.getAiRuntimeInfo().configured) {
    return res.status(409).json({ error: "Configure um provedor de IA antes de ativar a automação." });
  }
  const updated = atendimentoEngine.toggleAiForContact(leadId, Boolean(active), (req as any).adminUser?.name || userName || "Administrador");
  if (!updated) return res.status(404).json({ error: "Lead não encontrado" });
  res.json({ success: true, lead: updated });
});

// Manual AI re-engagement: generate from the real conversation context and send only after Evolution confirms.
app.post("/api/atendimento/force-conversation", requireAdminRoute, async (req, res) => {
  const { leadId } = req.body || {};
  if (!leadId) return res.status(400).json({ error: "leadId é obrigatório" });
  const result = await atendimentoEngine.forceAiConversation(String(leadId));
  if (!result.ok) return res.status(result.error === "Lead não encontrado" ? 404 : 409).json({ error: result.error });
  res.json({ success: true, lead: result.lead, message: result.message });
});

// Get AI Agent configuration
app.get("/api/atendimento/config", requireAdminRoute, (_req, res) => {
  res.json({
    success: true,
    config: atendimentoEngine.config,
    ai: atendimentoEngine.getAiRuntimeInfo(),
  });
});

// Update AI Agent configuration
app.post("/api/atendimento/config", requireAdminRoute, (req, res) => {
  if (req.body?.enabled === true && !atendimentoEngine.getAiRuntimeInfo().configured) {
    return res.status(409).json({ error: "Configure OPENAI_API_KEY (ou GEMINI_API_KEY) no servidor antes de ativar a automação." });
  }
  const updated = atendimentoEngine.updateConfig(req.body);
  res.json({ success: true, config: updated, ai: atendimentoEngine.getAiRuntimeInfo() });
});

// Token saver metrics
app.get("/api/radar/token-metrics", requireAdminRoute, (_req, res) => {
  res.json({
    success: true,
    metrics: radarEngine.prefilterMetrics,
  });
});

// ----------------------------------------------------
// ----------------------------------------------------
// SAAS CLIENT CAMPAIGNS, REAL GROUP SYNC & DISPATCH ROUTES
// ----------------------------------------------------

interface ClientCampaign {
  id: string;
  title: string;
  category: string;
  active: boolean;
  status: 'ativa' | 'pausada' | 'agendada' | 'enviando' | 'concluida' | 'falha' | 'parcial';
  scheduleMode?: 'agendar' | 'recorrente' | 'sequencia' | 'imediato';
  scheduleDays: string;
  scheduleDate?: string;
  scheduleDateText?: string;
  scheduleTime: string;
  scheduleTimes?: string[];
  intervalMinutes?: number;
  delaySeconds?: number;
  intervalText?: string;
  dailyLimit?: string;
  groupsCount: number;
  totalTarget?: number;
  selectedGroupJids: string[];
  totalSent: number;
  totalFailed?: number;
  imageUrl?: string;
  mediaList?: any[];
  previewText: string;
  tags: string[];
  createdAt: string;
  lastSentAt?: string;
  lastExecutedSlot?: string;
  lastExecutedMinute?: string;
  executed?: boolean;
  instanceName?: string;
  userId?: number;
}

interface ClientHistoryLog {
  id: string;
  campaignId?: string;
  campaignTitle: string;
  groupJid: string;
  groupName: string;
  groupMembersCount?: number;
  messageText: string;
  imageUrl?: string;
  mediaType?: "imagem" | "texto" | "video" | "documento";
  status: "delivered" | "sent" | "failed";
  error?: string;
  timestamp: string;
  timeFormatted: string;
  duration?: string;
}

// In-memory cache for active instance and groups to eliminate latency
let cachedActiveInstance: { name: string; timestamp: number } | null = null;
const cachedGroupsByInstance = new Map<string, { timestamp: number; groups: any[] }>();
const groupSyncInFlight = new Map<string, Promise<any[]>>();
const groupSyncBlockedUntil = new Map<string, number>();
let lastSyncGroupsTimestamp = 0;

// Helper to dynamically resolve the best active/connected instance fast
async function getActiveConnectedInstance(preferred?: string): Promise<string> {
  const targetInstance = preferred || "minhabagg-leads";
  const now = Date.now();

  if (cachedActiveInstance && now - cachedActiveInstance.timestamp < 15000) {
    if (cachedActiveInstance.name === targetInstance) {
      return cachedActiveInstance.name;
    }
  }

  // Fast check targetInstance
  try {
    const stateRes = await callEvolution(`/instance/connectionState/${targetInstance}`, {}, 2500);
    const rawState = stateRes.data?.instance?.state || stateRes.data?.state;
    if (rawState === "open") {
      cachedActiveInstance = { name: targetInstance, timestamp: now };
      return targetInstance;
    }
  } catch {}

  // If not open, just return it so it fails locally on that instance instead of defaulting to admin
  return targetInstance;
}

// Ultra-fast background sync for WhatsApp groups for a specific instance with full Evolution API v2 payload mapping
async function syncAllWhatsAppGroups(force: boolean = false, targetInstance: string = "", dbUser?: { id: number; db: any }): Promise<any[]> {
  if (!targetInstance) return [];

  const runningSync = groupSyncInFlight.get(targetInstance);
  if (runningSync) return runningSync;

  const task = syncAllWhatsAppGroupsInternal(force, targetInstance, dbUser)
    .finally(() => groupSyncInFlight.delete(targetInstance));
  groupSyncInFlight.set(targetInstance, task);
  return task;
}

async function syncAllWhatsAppGroupsInternal(force: boolean = false, targetInstance: string = "", dbUser?: { id: number; db: any }): Promise<any[]> {
  const now = Date.now();
  if (!targetInstance) return [];

  // Try to get cached for this specific instance
  const cachedForInstance = cachedGroupsByInstance.get(targetInstance);
  if (!force && cachedForInstance && now - cachedForInstance.timestamp < 15000 && cachedForInstance.groups.length > 0) {
    return cachedForInstance.groups;
  }

  // A forced UI refresh must not hammer an upstream that has already asked us
  // to slow down. During the backoff window, serve only the last confirmed data.
  const blockedUntil = groupSyncBlockedUntil.get(targetInstance) || 0;
  if (now < blockedUntil) {
    if (cachedForInstance) return cachedForInstance.groups;
    if (dbUser?.db && dbUser?.id) {
      const persisted = await dbUser.db.listGroupsForUser(dbUser.id).catch(() => []);
      if (Array.isArray(persisted)) return persisted;
    }
    return [];
  }

  // Verify that targetInstance is actually connected before attempting Evolution group fetch
  try {
    const { isConnected } = await resolveActiveInstance(targetInstance, dbUser?.id, dbUser?.db);
    if (!isConnected) {
      return [];
    }
  } catch {}

  const collectedGroupsMap = new Map<string, any>();
  let evolutionQuerySucceeded = false;
  const instName = targetInstance;

  const extractGroupsFromPayload = (data: any, iName: string) => {
    if (!data) return;
    let list: any[] = [];
    if (Array.isArray(data)) {
      list = data;
    } else if (Array.isArray(data?.groups)) {
      list = data.groups;
    } else if (Array.isArray(data?.data)) {
      list = data.data;
    } else if (Array.isArray(data?.response)) {
      list = data.response;
    } else if (Array.isArray(data?.chats)) {
      list = data.chats;
    } else if (Array.isArray(data?.result)) {
      list = data.result;
    } else if (Array.isArray(data?.data?.groups)) {
      list = data.data.groups;
    } else if (Array.isArray(data?.data?.chats)) {
      list = data.data.chats;
    } else if (typeof data === "object" && data !== null) {
      const values = Object.values(data);
      if (values.length > 0 && typeof values[0] === "object") {
        list = values;
      }
    }

    for (const g of list) {
      if (!g || typeof g !== "object") continue;
      const jid = String(g.id || g.jid || g.remoteJid || g.chatJid || "").trim();
      if (!jid) continue;
      // Strictly WhatsApp groups ending or containing @g.us, NEVER broadcasts, channels/newsletters or personal contacts
      const isGroup = jid.includes("@g.us") && !jid.includes("@broadcast") && !jid.includes("@newsletter") && !jid.includes("@s.whatsapp.net") && !jid.includes("@lid");
      if (!isGroup) continue;

      const name = g.subject || g.name || g.pushName || g.title || "Grupo WhatsApp";
      const membersCount = g.size || g.participants?.length || (Array.isArray(g.participants) ? g.participants.length : 0) || 15;
      const avatar = g.pictureUrl || g.profilePicUrl || g.avatarUrl || g.avatar || "";

      if (!collectedGroupsMap.has(jid) || (name !== "Grupo WhatsApp" && collectedGroupsMap.get(jid)?.name === "Grupo WhatsApp")) {
        collectedGroupsMap.set(jid, {
          id: jid,
          jid,
          name,
          membersCount,
          category: "Vendas & Negócios",
          status: "ativo",
          totalPosts: 0,
          lastPostTime: "Recente",
          avatar,
          instanceName: iName,
        });
      }
    }
  };

  try {
    // Evolution API v2 exposes groups through this endpoint. Do not cascade to
    // chat endpoints: that multiplies requests and can turn a rate-limit failure
    // into a misleading successful empty snapshot.
    const groupsResponse = await callEvolution(`/group/fetchAllGroups/${instName}?getParticipants=false`, {}, 15000, 0);
    const responseText = JSON.stringify(groupsResponse.data || "").toLowerCase();
    const rateLimited = groupsResponse.status === 429 || responseText.includes("rate-overlimit") || responseText.includes("rate limit");

    if (rateLimited) {
      groupSyncBlockedUntil.set(instName, Date.now() + 60_000);
      console.warn(`[GroupsSync] Evolution limitou consultas para ${instName}; aguardando 60s e preservando snapshot.`);
    } else if (groupsResponse.ok) {
      evolutionQuerySucceeded = true;
      groupSyncBlockedUntil.delete(instName);
      extractGroupsFromPayload(groupsResponse.data, instName);
    } else {
      console.warn(`[GroupsSync] Evolution respondeu HTTP ${groupsResponse.status} para ${instName}; preservando snapshot.`);
    }
  } catch (err: any) {
    console.warn(`[GroupsSync] Warning while querying ${instName}:`, err?.message || err);
  }

  // A resposta bem-sucedida da Evolution é a fonte de verdade, inclusive quando vier vazia.
  // Nunca reutilizar o snapshot antigo do MySQL para mascarar uma lista vazia.
  if (evolutionQuerySucceeded) {
    const freshGroups = Array.from(collectedGroupsMap.values());
    cachedGroupsByInstance.set(instName, { timestamp: now, groups: freshGroups });
    clientImportedGroupsStore.set(instName, freshGroups);

    if (dbUser?.db && dbUser?.id) {
      try {
        await dbUser.db.saveGroupsForUser(dbUser.id, freshGroups);
      } catch (err) {
        console.warn(`[GroupsSync] Falha ao persistir snapshot de grupos user=${dbUser.id}:`, err);
      }
    }

    console.log(`[GroupsSync] ✅ Snapshot sincronizado: ${freshGroups.length} grupos para ${instName}.`);
    return freshGroups;
  }

  console.warn(`[GroupsSync] Evolution indisponivel para ${instName}; preservando ultimo snapshot confirmado.`);
  if (dbUser?.db && dbUser?.id) {
    const persisted = await dbUser.db.listGroupsForUser(dbUser.id).catch(() => []);
    if (Array.isArray(persisted)) {
      cachedGroupsByInstance.set(instName, { timestamp: now, groups: persisted });
      return persisted;
    }
  }
  // An upstream outage must never become an unhandled Express rejection and
  // terminate the whole Node process. No snapshot is safer than fake targets.
  return [];
}

// Background scheduler for group syncing (run only once on start or every hour to keep Evolution DB pool clean)
// Do not start Evolution/group synchronization from the Passenger process.
// Tenant group data is loaded on authenticated demand. Background Evolution calls here
// were able to monopolize the single cPanel/Passenger worker and freeze even /api/health.


// Store for the current authenticated instance only.
// Do not hydrate this cache from a global disk snapshot: that can leak stale groups
// from a previous connection/user into the current tenant.
const clientImportedGroupsStore = new Map<string, any[]>();

// Dedicated Client WhatsApp Status endpoint (Strict tenant isolation)
app.get("/api/client/whatsapp/status", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error === "UNAUTHORIZED") {
    return res.status(401).json({ error: "Sessão inválida." });
  }
  if (own.error) return res.status(402).json({ error: own.error });

  const instance = own.instance;
  if (!instance) {
    return res.json({
      success: true,
      configured: true,
      isConnected: false,
      state: "disconnected",
      profile: {
        name: own.user?.name || "Cliente",
        number: undefined,
        pictureUrl: "",
        instanceName: "",
      },
    });
  }

  try {
    const { isConnected, activeInstance, stateRes, instanceData } = await resolveActiveInstance(instance, own.user?.id, own.db);
    if (isConnected) {
      const prof = await fetchInstanceProfile(activeInstance, instanceData || stateRes.data);
      const realName = prof.name || own.record?.profile_name || own.user?.name || "WhatsApp Conectado";
      const realNumber = prof.number || (own.record?.owner_phone ? formatPhone(own.record.owner_phone) : undefined);
      const realPictureUrl = prof.pictureUrl || own.record?.profile_pic_url || `/api/whatsapp/avatar?instance=${encodeURIComponent(activeInstance)}`;

      await own.db.setUserInstanceStatus(
        own.user.id,
        "connected",
        realNumber || null,
        realName,
        realPictureUrl
      ).catch(() => {});

      return res.json({
        success: true,
        configured: true,
        isConnected: true,
        state: "connected",
        profile: {
          name: realName,
          number: realNumber,
          pictureUrl: realPictureUrl,
          instanceName: activeInstance,
          connectedAt: prof.connectedAt || (own.record?.last_connected_at ? new Date(own.record.last_connected_at).toLocaleString("pt-BR") : undefined),
        },
      });
    }
  } catch {}

  // Fallback if not connected or doesn't exist
  await own.db.setUserInstanceStatus(own.user.id, "disconnected").catch(() => {});
  res.json({
    success: true,
    configured: true,
    isConnected: false,
    state: "disconnected",
    profile: {
      name: own.user?.name || "Cliente",
      number: undefined,
      pictureUrl: "",
      instanceName: instance,
    },
  });
});

// Get imported groups saved for client instance (Instant response)
app.get("/api/client/imported-groups", async (req,res)=>{
 const own:any=await ownedInstance(req, true, true); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
 const groups=await own.db.listGroupsForUser(own.user.id); res.json({success:true,instanceName:own.instance,total:groups.length,groups});
});

// Save/Update imported groups for client instance
app.post("/api/client/imported-groups", async (req, res) => {
  const own:any=await ownedInstance(req, true, true); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const instance = own.instance;
  const { groups } = req.body;
  if (!Array.isArray(groups)) {
    return res.status(400).json({ error: "groups deve ser um array." });
  }
  clientImportedGroupsStore.set(instance, groups);
  cachedGroupsByInstance.set(instance, { timestamp: Date.now(), groups });
  await own.db.saveGroupsForUser(own.user.id, groups);
  res.json({
    success: true,
    instanceName: instance,
    total: groups.length,
    groups,
  });
});

// Get real groups from connected WhatsApp instance with 0-ms instant response
app.get("/api/client/groups", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error === "UNAUTHORIZED") return res.status(401).json({ error: "Sessão inválida." });
  if (own.error) return res.status(402).json({ error: "Plano inativo." });
  const reqInstance = own.instance;
  const forceRefresh = req.query.refresh === "true" || req.query.force === "true";

  // Strictly check if user's WhatsApp is connected
  const { isConnected } = await resolveActiveInstance(reqInstance, own.user?.id, own.db);
  if (!isConnected) {
    return res.json({
      success: true,
      instanceName: reqInstance,
      total: 0,
      groups: [],
      isConnected: false,
    });
  }

  // 1. Check memory cache for this specific instance
  const cached = cachedGroupsByInstance.get(reqInstance);
  if (!forceRefresh && cached && Array.isArray(cached.groups) && cached.groups.length > 0 && (Date.now() - cached.timestamp < 20000)) {
    return res.json({
      success: true,
      instanceName: reqInstance,
      total: cached.groups.length,
      groups: cached.groups,
      cached: true,
      isConnected: true,
    });
  }

  // 2. Perform sync with Evolution for this specific instance
  const fresh = await syncAllWhatsAppGroups(forceRefresh, reqInstance, { id: own.user.id, db: own.db });
  if (fresh.length > 0) {
    return res.json({
      success: true,
      instanceName: reqInstance,
      total: fresh.length,
      groups: fresh,
      isConnected: true,
    });
  }

  // Evolution respondeu: o resultado (inclusive 0 grupos) é o estado atual.
  res.json({
    success: true,
    instanceName: reqInstance,
    total: fresh.length,
    groups: fresh,
    isConnected: true,
  });
});

// ==========================================
// CLIENT PLAN & ENTITLEMENTS SYSTEM
// ==========================================
interface PlanEntitlementLimits {
  maxGroups: number;
  maxRoundsPerDay: number;
  maxMonthlySends: number;
  maxActiveCampaigns: number;
  historyDays: number;
}

const CLIENT_PLAN_LIMITS: Record<'start' | 'pro' | 'max', PlanEntitlementLimits> = {
  start: {
    maxGroups: 20,
    maxRoundsPerDay: 1,
    maxMonthlySends: 600,
    maxActiveCampaigns: 2,
    historyDays: 7,
  },
  pro: {
    maxGroups: 45,
    maxRoundsPerDay: 2,
    maxMonthlySends: 2700,
    maxActiveCampaigns: 5,
    historyDays: 30,
  },
  max: {
    maxGroups: 90,
    maxRoundsPerDay: 3,
    maxMonthlySends: 8100,
    maxActiveCampaigns: 10,
    historyDays: 90,
  },
};

function getUniqueGroupsInAutomations(campaigns: ClientCampaign[], excludeId?: string): Set<string> {
  const set = new Set<string>();
  for (const c of campaigns) {
    if (excludeId && c.id === excludeId) continue;
    if (c.status !== 'concluida' && c.status !== 'falha') {
      if (Array.isArray(c.selectedGroupJids)) {
        c.selectedGroupJids.forEach((jid) => {
          if (jid) set.add(jid);
        });
      }
    }
  }
  return set;
}

// Plan endpoints (100% MySQL backed)
app.get("/api/client/plans", async (_req, res) => {
  try {
    const db: any = await getDatabase();
    const plans = await db.listPlans();
    res.json({ success: true, plans });
  } catch (err: any) {
    res.json({
      success: true,
      plans: [
        { id: "start", name: "Start", priceFormatted: "39,90", monthlyPrice: 39.90, maxGroups: 20, maxRoundsPerDay: 1, maxMonthlySends: 600, maxActiveCampaigns: 2, historyDays: 7, supportType: "E-mail" },
        { id: "pro", name: "Pro", priceFormatted: "69,90", monthlyPrice: 69.90, maxGroups: 45, maxRoundsPerDay: 2, maxMonthlySends: 2700, maxActiveCampaigns: 5, historyDays: 30, supportType: "Prioritário" },
        { id: "max", name: "Max", priceFormatted: "119,90", monthlyPrice: 119.90, maxGroups: 90, maxRoundsPerDay: 3, maxMonthlySends: 8100, maxActiveCampaigns: 10, historyDays: 90, supportType: "VIP" },
      ],
    });
  }
});

app.get("/api/client/plan", async (req, res) => {
  const own: any = await ownedInstance(req, true);
  if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
  const sub = await own.db.getSubscriptionForUser(own.user.id);
  const planId = (sub?.plan_id || own.user.plan || "start") as 'start' | 'pro' | 'max';
  const planDetails = await own.db.getPlanById(planId);
  const limits: PlanEntitlementLimits = planDetails ? {
    maxGroups: planDetails.maxGroups,
    maxRoundsPerDay: planDetails.maxRoundsPerDay,
    maxMonthlySends: planDetails.maxMonthlySends,
    maxActiveCampaigns: planDetails.maxActiveCampaigns,
    historyDays: planDetails.historyDays,
  } : (CLIENT_PLAN_LIMITS[planId] || CLIENT_PLAN_LIMITS.start);

  const campaigns = await own.db.listCampaignsForUser(own.user.id);
  const history = await own.db.listHistoryForUser(own.user.id, limits.historyDays || 31);
  res.json({
    success: true,
    subscription: {
      planId,
      status: sub?.status || own.user.status || "pending",
      validUntil: sub?.next_due_date || null,
    },
    limits,
    usage: {
      uniqueGroupsCount: getUniqueGroupsInAutomations(campaigns).size,
      activeCampaignsCount: campaigns.filter((c: any) => c.active && c.status !== "concluida").length,
      monthlySendsCount: history.filter((h: any) => h.status === "delivered").length,
    },
  });
});

app.post("/api/client/plan", async (_req, res) => res.status(405).json({ error: "O plano é alterado somente pelo fluxo de assinatura." }));

app.get("/api/onboarding/payment-status", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Sessão inválida." });
    const db: any = await getDatabase();
    const sub = await db.getSubscriptionForUser(user.id);
    if (!sub?.current_payment_id) return res.json({ success: true, status: "pending", access: false });
    const pay: any = await asaasEngine.getPayment(sub.current_payment_id);
    const st = String(pay?.status || "").toUpperCase();
    const paid = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(st);
    if (paid) {
      await db.confirmInvoicePayment(sub.current_payment_id, "POLL_CONFIRMED");
      await db.applyPaymentEvent(`poll:${sub.current_payment_id}:${st}`, "PAYMENT_CONFIRMED", { id: sub.current_payment_id });
    }
    const refreshed = await db.getUserByToken(sessionTokenFromRequest(req));
    res.json({ success: true, status: st || sub.status, access: refreshed?.status === "active" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Não foi possível confirmar o pagamento." });
  }
});

app.get("/api/account/status", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Sessão inválida." });
    const db: any = await getDatabase();
    const subscription = await db.getSubscriptionForUser(user.id);
    const instance = await db.getUserInstance(user.id);
    const isAdmin = user.role === "admin";
    const hasActiveSubscription = String(subscription?.status || "").toLowerCase() === "active";
    res.json({
      success: true,
      user,
      subscription: subscription ? { planId: subscription.plan_id, status: subscription.status, nextDueDate: subscription.next_due_date } : null,
      whatsapp: instance ? { status: instance.status, connected: instance.status === "connected" } : null,
      access: Boolean(isAdmin || hasActiveSubscription),
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Não foi possível consultar a conta." });
  }
});

// Public onboarding: authenticated account chooses a plan and receives the first real recurring Pix charge.
app.post("/api/onboarding/subscribe", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Faça login para continuar." });
    const { planId, cpfCnpj } = req.body || {};
    const prices: Record<string, number> = { start: 39.9, pro: 69.9, max: 119.9 };
    const names: Record<string, string> = { start: "Start", pro: "Pro", max: "Max" };
    if (!prices[planId] || !cpfCnpj) return res.status(400).json({ success: false, error: "Plano e CPF são obrigatórios." });
    const db: any = await getDatabase();
    await db.setUserBillingIdentity(user.id, String(cpfCnpj));
    const sub: any = await asaasEngine.createMonthlyPixSubscription({
      planId,
      planName: names[planId],
      value: prices[planId],
      customer: { name: user.name, email: user.email, cpfCnpj: String(cpfCnpj), phone: user.phone },
      externalReference: `grolpy:user:${user.id}:plan:${planId}`,
    });
    await db.upsertSubscription(user.id, planId, {
      status: "pending",
      customerId: sub.customerId,
      subscriptionId: sub.subscriptionId,
      paymentId: sub.paymentId,
      nextDueDate: sub.nextDueDate,
    });
    await db.createInvoice(user.id, {
      paymentId: sub.paymentId,
      planId,
      billingType: "PIX",
      value: prices[planId],
      status: "PENDING",
      dueDate: sub.nextDueDate,
      pixPayload: sub.pix?.payload,
      pixImageUrl: sub.pix?.encodedImage,
      gateway: "ASAAS",
      payloadJson: sub,
    });
    res.json({ success: true, subscription: { planId, status: "pending", asaasSubscriptionId: sub.subscriptionId }, payment: { id: sub.paymentId, status: sub.status, pix: sub.pix } });
  } catch (err: any) {
    console.error("[Onboarding]", err?.message || err);
    res.status(500).json({ success: false, error: err?.message || "Falha ao iniciar assinatura." });
  }
});

// Asaas Checkout API: Create Payment (Pix, Credit Card, or Boleto) & Persist to MySQL
app.post("/api/client/checkout/create", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    const db: any = await getDatabase();
    const { planId, billingType, customer, creditCard } = req.body;
    const planPrices: Record<string, number> = {
      start: 39.9,
      pro: 69.9,
      max: 119.9,
    };
    const planNames: Record<string, string> = {
      start: "Start",
      pro: "Pro",
      max: "Max",
    };

    const targetPlan = (planId === "start" || planId === "max" ? planId : "pro") as "start" | "pro" | "max";
    const payment = await asaasEngine.createPayment({
      planId: targetPlan,
      planName: planNames[targetPlan] || "Pro",
      value: planPrices[targetPlan] || 69.9,
      billingType: billingType || "PIX",
      customer: customer || {
        name: user?.name || "Cliente",
        email: user?.email || "",
        cpfCnpj: user?.cpf_cnpj || undefined,
        phone: user?.phone || undefined,
      },
      creditCard,
    });

    if (user?.id) {
      await db.createInvoice(user.id, {
        paymentId: payment.id,
        planId: targetPlan,
        billingType: payment.billingType,
        value: payment.value,
        netValue: payment.netValue,
        status: payment.status,
        dueDate: payment.dueDate,
        pixPayload: payment.pix?.payload,
        pixImageUrl: payment.pix?.encodedImage,
        gateway: "ASAAS",
        payloadJson: payment,
      });

      await db.upsertSubscription(user.id, targetPlan, {
        status: payment.status === "CONFIRMED" ? "active" : "pending",
        paymentId: payment.id,
        nextDueDate: payment.dueDate,
      });

      if (payment.status === "CONFIRMED") {
        await db.confirmInvoicePayment(payment.id, "INSTANT_CONFIRM", payment);
      }
    }

    res.json({ success: true, payment });
  } catch (err: any) {
    console.error("[Asaas Checkout] Error creating payment:", err);
    res.status(500).json({ success: false, error: err.message || "Erro ao processar pagamento com Asaas." });
  }
});

// Asaas Checkout API: Check payment status in MySQL & memory
app.get("/api/client/checkout/status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db: any = await getDatabase();
    const inv = await db.getInvoiceByPaymentId(id);
    const payment = asaasEngine.getPayment(id);

    if (!inv && !payment) {
      return res.status(404).json({ success: false, error: "Pagamento não encontrado" });
    }

    res.json({
      success: true,
      payment: payment || {
        id: inv.payment_id,
        status: inv.status,
        billingType: inv.billing_type,
        value: Number(inv.value),
        netValue: inv.net_value ? Number(inv.net_value) : undefined,
        planId: inv.plan_id,
        planName: inv.plan_id === "max" ? "Max" : (inv.plan_id === "start" ? "Start" : "Pro"),
        customer: {
          name: inv.userName || "Cliente",
          email: inv.userEmail || "",
        },
        dueDate: inv.due_date,
        pix: inv.pix_payload ? {
          encodedImage: inv.pix_image_url || "",
          payload: inv.pix_payload,
          expirationDate: inv.due_date || "",
        } : undefined,
        createdAt: inv.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Asaas Webhook: Receives official Asaas webhooks and persists to MySQL
app.post("/api/webhook/asaas", async (req, res) => {
  try {
    const db: any = await getDatabase();
    const { event, payment } = req.body || {};
    const paymentId = payment?.id;
    console.log(`[Asaas Webhook] Event received: ${event}`, paymentId);

    if (paymentId) {
      const eventKey = String(req.body?.id || `${paymentId}:${event}:${Date.now()}`);
      await db.applyPaymentEvent(eventKey, event, payment);

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        asaasEngine.confirmPayment(paymentId);
        await db.confirmInvoicePayment(paymentId, event, payment);
      }
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    console.error("[Asaas Webhook] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// User Invoices API
app.get("/api/client/invoices", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    const db: any = await getDatabase();
    const invoices = await db.getUserInvoices(user.id);
    res.json({ success: true, invoices });
  } catch (err: any) {
    console.error("[Client Invoices] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// User CRM Leads API (100% MySQL backed)
app.get("/api/client/leads", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    const db: any = await getDatabase();
    const leads = await db.listLeadsForUser(user.id);
    res.json({ success: true, leads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/client/leads", async (req, res) => {
  try {
    const user: any = await authenticatedUser(req);
    if (!user) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
    const db: any = await getDatabase();
    await db.saveLeadForUser(user.id, req.body);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get real campaigns
app.get("/api/client/campaigns", async (req, res) => {
  try {
    const own: any = await ownedInstance(req, true);
    if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
    if (own.db?.ensureCampaignsTable) {
      await own.db.ensureCampaignsTable().catch(() => {});
    }
    const campaigns = await own.db.listCampaignsForUser(own.user.id);
    res.json({ success: true, campaigns: Array.isArray(campaigns) ? campaigns : [] });
  } catch (err: any) {
    console.error("[CAMPAIGNS] Erro ao listar campanhas:", err);
    res.status(500).json({ success: false, error: err.message || "Erro ao carregar campanhas", campaigns: [] });
  }
});

// Create new campaign with real schedule support
app.post("/api/client/campaigns/create", async (req, res) => {
  try {
    const own: any = await ownedInstance(req, true, true);
    if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });

    if (own.db?.ensureCampaignsTable) {
      await own.db.ensureCampaignsTable().catch(() => {});
    }

    const {
      id,
      title,
      category,
      scheduleMode,
      scheduleDate,
      scheduleDateText,
      scheduleDays,
      scheduleTime,
      scheduleTimes,
      intervalMinutes,
      delaySeconds,
      dailyLimit,
      previewText,
      imageUrl,
      mediaList,
      selectedGroupJids,
      groupsCount,
      active,
      instanceName,
    } = req.body;

    const { isConnected, activeInstance } = scheduleMode === 'imediato'
      ? await resolveActiveInstance(own.instance, own.user?.id, own.db)
      : { isConnected: false, activeInstance: own.instance };
    const targetInstance = activeInstance;
    console.log(`\n[VALIDATION] Validando criação de divulgação '${title}' na instância ${targetInstance}...`);

    if (!title || !previewText) {
      console.log(`[VALIDATION] Falha: Título e texto da mensagem são obrigatórios.`);
      return res.status(400).json({ error: "Título e texto da mensagem são obrigatórios." });
    }

    const rawIncomingJids = Array.isArray(selectedGroupJids) ? selectedGroupJids : [];
    const incomingJids = Array.from(new Set(rawIncomingJids
      .map((jid: any) => String(jid || "").trim())
      .filter((jid: string) => jid.endsWith("@g.us") && !jid.includes("@broadcast") && !jid.includes("@newsletter") && !jid.includes("@s.whatsapp.net") && !jid.includes("@lid"))));
    if (incomingJids.length !== rawIncomingJids.length) {
      return res.status(400).json({
        error: "A selecao contem um destino invalido. Atualize os grupos e selecione somente grupos reais do WhatsApp.",
        code: "INVALID_GROUP_TARGETS",
      });
    }
    if (incomingJids.length === 0) {
      console.log(`[VALIDATION] Falha: Nenhum grupo selecionado.`);
      return res.status(400).json({ error: "Você precisa selecionar pelo menos um grupo." });
    }

    const persistedGroups = await own.db.listGroupsForUser(own.user.id).catch(() => []);
    const ownedGroupJids = new Set((persistedGroups || []).map((g: any) => String(g.jid || g.id || "").trim()));
    if (incomingJids.some((jid: string) => !ownedGroupJids.has(jid))) {
      return res.status(400).json({
        error: "Um ou mais grupos nao pertencem a conexao atual. Sincronize os grupos e tente novamente.",
        code: "STALE_GROUP_TARGETS",
      });
    }

    // If immediate dispatch is requested, WhatsApp MUST be connected
    if (scheduleMode === 'imediato' && !isConnected) {
      console.log(`[VALIDATION] Falha: Instância ${targetInstance} desconectada para disparo imediato.`);
      return res.status(400).json({ error: "O WhatsApp selecionado está desconectado. Conecte seu WhatsApp antes de disparar agora." });
    }

    const sub = await own.db.getSubscriptionForUser(own.user.id).catch(() => null);
    const userPlanId = (sub?.plan_id || own.user?.plan || "start") as 'start' | 'pro' | 'max';
    const planDetails = await own.db.getPlanById(userPlanId).catch(() => null);
    const currentLimits: PlanEntitlementLimits = planDetails ? {
      maxGroups: planDetails.maxGroups,
      maxRoundsPerDay: planDetails.maxRoundsPerDay,
      maxMonthlySends: planDetails.maxMonthlySends,
      maxActiveCampaigns: planDetails.maxActiveCampaigns,
      historyDays: planDetails.historyDays,
    } : (CLIENT_PLAN_LIMITS[userPlanId] || CLIENT_PLAN_LIMITS.start);

    const userCampaigns: any[] = (await own.db.listCampaignsForUser(own.user.id).catch(() => [])) || [];
    const userHistory: any[] = (await own.db.listHistoryForUser(own.user.id, currentLimits.historyDays || 31).catch(() => [])) || [];

    // 1. Validate Active Campaigns Limit
    if (active !== false) {
      const activeCount = userCampaigns.filter((c: any) => c && c.active && c.status !== 'concluida').length;
      if (activeCount >= currentLimits.maxActiveCampaigns) {
        console.log(`[VALIDATION] Falha: Limite de campanhas ativas excedido.`);
        return res.status(403).json({
          error: `Você atingiu o limite de ${currentLimits.maxActiveCampaigns} divulgações ativas do seu plano.`,
          code: 'LIMIT_ACTIVE_CAMPAIGNS',
          limit: currentLimits.maxActiveCampaigns,
          activeCount,
        });
      }
    }

    // 2. Validate Unique Groups Limit
    const reservedGroups = getUniqueGroupsInAutomations(userCampaigns);
    const candidateUnique = new Set([...reservedGroups, ...incomingJids]);
    if (candidateUnique.size > currentLimits.maxGroups) {
      console.log(`[VALIDATION] Falha: Limite de grupos mensais excedido.`);
      return res.status(403).json({
        error: `Limite de grupos únicos atingido (${currentLimits.maxGroups} grupos permitidos no plano ${userPlanId.toUpperCase()}).`,
        code: 'LIMIT_GROUPS',
        limit: currentLimits.maxGroups,
        used: candidateUnique.size,
      });
    }
    
    // 3. Validate Monthly Limit
    const currentMonth = new Date().getMonth();
    const sentThisMonth = userHistory.filter((h: any) => h && h.status === 'delivered' && new Date(h.timestamp).getMonth() === currentMonth).length;
    if (sentThisMonth + incomingJids.length > currentLimits.maxMonthlySends) {
      console.log(`[VALIDATION] Falha: Limite mensal de envios excedido.`);
      return res.status(403).json({
        error: `Esta divulgação excederia seu limite mensal de ${currentLimits.maxMonthlySends} envios.`,
        code: 'LIMIT_MONTHLY',
      });
    }

    console.log(`[VALIDATION] Limites validados: OK. Agendamento permitido.`);

    // Process and save any base64 media to disk to avoid massive MySQL packets
    let safeImageUrl = imageUrl;
    if (safeImageUrl && typeof safeImageUrl === "string" && safeImageUrl.startsWith("data:")) {
      safeImageUrl = saveBase64MediaToFile(safeImageUrl, "camp");
    }

    let safeMediaList = undefined;
    if (Array.isArray(mediaList)) {
      safeMediaList = mediaList.map((m: any) => {
        if (m && m.url && typeof m.url === "string" && m.url.startsWith("data:")) {
          return { ...m, url: saveBase64MediaToFile(m.url, "camp") };
        }
        return m;
      });
    }

    const isScheduled = scheduleMode === 'agendar' || scheduleMode === 'recorrente';
    const initialStatus: 'ativa' | 'agendada' | 'pausada' = active === false ? 'pausada' : (isScheduled ? 'agendada' : 'ativa');
    const targetCount = incomingJids.length > 0 ? incomingJids.length : (groupsCount || 1);

    const timesList = Array.isArray(scheduleTimes) && scheduleTimes.length > 0
      ? scheduleTimes
      : [scheduleTime || "14:00"];

    const parsedDelaySeconds = delaySeconds !== undefined && delaySeconds !== null && !isNaN(Number(delaySeconds))
      ? Number(delaySeconds)
      : (intervalMinutes !== undefined && !isNaN(Number(intervalMinutes)) ? Number(intervalMinutes) * 60 : 30);

    const parsedIntervalMinutes = intervalMinutes !== undefined && !isNaN(Number(intervalMinutes))
      ? Number(intervalMinutes)
      : Math.max(1, Math.round(parsedDelaySeconds / 60));

    const intervalText = parsedDelaySeconds < 60 ? `A cada ${parsedDelaySeconds}s` : `A cada ${parsedIntervalMinutes} min`;

    const newCampaign: ClientCampaign = {
      id: id || `camp-${Date.now()}`,
      title: title.trim(),
      category: category || "Vendas & Ofertas",
      active: active !== false,
      status: initialStatus,
      scheduleMode: scheduleMode || 'agendar',
      scheduleDate: scheduleDate || undefined,
      scheduleDateText: scheduleDateText || (scheduleMode === "agendar" ? "Hoje" : "Recorrente"),
      scheduleDays: scheduleDays || "Todos os dias",
      scheduleTime: timesList[0],
      scheduleTimes: timesList,
      intervalMinutes: parsedIntervalMinutes,
      delaySeconds: parsedDelaySeconds,
      intervalText,
      dailyLimit: dailyLimit || "Sem limite",
      groupsCount: targetCount,
      totalTarget: targetCount,
      selectedGroupJids: incomingJids,
      totalSent: 0,
      totalFailed: 0,
      imageUrl: safeImageUrl || undefined,
      mediaList: safeMediaList,
      previewText: previewText.trim(),
      tags: [category ? category.split("&")[0].trim() : "Divulgação", scheduleMode === 'agendar' ? 'Agendada' : (scheduleMode === 'recorrente' ? 'Recorrente' : 'Imediata')],
      createdAt: new Date().toISOString(),
      executed: false,
      instanceName: targetInstance || own.instance,
      userId: own.user.id,
    };

    try {
      await own.db.saveCampaignForUser(own.user.id, newCampaign);
    } catch (err: any) {
      console.error("[CAMPAIGNS] Erro ao salvar campanha no MySQL:", err);
      return res.status(500).json({ error: "Erro ao gravar divulgação no banco de dados: " + (err.message || err) });
    }
    return res.json({ success: true, campaign: newCampaign });
  } catch (err: any) {
    console.error("[CAMPAIGNS] Erro fatal em /api/client/campaigns/create:", err);
    return res.status(500).json({ error: "Erro ao criar divulgação: " + (err.message || "Erro desconhecido") });
  }
});

// Toggle campaign active state
app.post("/api/client/campaigns/toggle", async (req, res) => {
  try {
    const own: any = await ownedInstance(req, true, true);
    if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
    if (own.db?.ensureCampaignsTable) {
      await own.db.ensureCampaignsTable().catch(() => {});
    }
    const clientCampaignsStore: any[] = await own.db.listCampaignsForUser(own.user.id);
    const sub = await own.db.getSubscriptionForUser(own.user.id);
    const userPlanId = (sub?.plan_id || "start") as any;
    const { id } = req.body;
    const camp = clientCampaignsStore.find((c) => c.id === id);
    if (!camp) {
      return res.status(404).json({ error: "Campanha não encontrada" });
    }

    const currentLimits = CLIENT_PLAN_LIMITS[userPlanId] || CLIENT_PLAN_LIMITS.start;

    if (!camp.active) {
      // Activating: validate limits
      const activeCount = clientCampaignsStore.filter((c) => c.active && c.id !== id && c.status !== 'concluida').length;
      if (activeCount >= currentLimits.maxActiveCampaigns) {
        return res.status(403).json({
          error: `Você atingiu o limite de ${currentLimits.maxActiveCampaigns} divulgações ativas do seu plano.`,
          code: 'LIMIT_ACTIVE_CAMPAIGNS',
          limit: currentLimits.maxActiveCampaigns,
        });
      }

      const reservedGroups = getUniqueGroupsInAutomations(clientCampaignsStore, id);
      const campJids = Array.isArray(camp.selectedGroupJids) ? camp.selectedGroupJids : [];
      const combined = new Set([...reservedGroups, ...campJids]);
      if (combined.size > currentLimits.maxGroups) {
        return res.status(403).json({
          error: `Limite de grupos únicos atingido (${currentLimits.maxGroups}).`,
          code: 'LIMIT_GROUPS',
          limit: currentLimits.maxGroups,
          used: combined.size,
        });
      }

      camp.active = true;
      camp.status = camp.scheduleMode === 'agendar' ? 'agendada' : 'ativa';
      camp.executed = false; // Reset executed flag if user re-activates
    } else {
      camp.active = false;
      camp.status = 'pausada';
    }

    await own.db.saveCampaignForUser(own.user.id, camp);
    res.json({ success: true, campaign: camp });
  } catch (err: any) {
    console.error("[CAMPAIGNS] Erro ao alternar status da campanha:", err);
    res.status(500).json({ error: err.message || "Erro ao alternar status da campanha" });
  }
});

// Delete campaign
app.delete("/api/client/campaigns/:id", async (req, res) => {
  try {
    const own: any = await ownedInstance(req, true, true);
    if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
    if (own.db?.ensureCampaignsTable) {
      await own.db.ensureCampaignsTable().catch(() => {});
    }
    const ok = await own.db.deleteCampaignForUser(own.user.id, String(req.params.id));
    if (!ok) return res.status(404).json({ error: "Campanha não encontrada" });
    res.json({ success: true });
  } catch (err: any) {
    console.error("[CAMPAIGNS] Erro ao excluir campanha:", err);
    res.status(500).json({ error: err.message || "Erro ao excluir campanha" });
  }
});

// Helper to look up real group name
function lookupGroupName(jid: string, instance: string): string {
  const list = clientImportedGroupsStore.get(instance) || [];
  const found = list.find((g: any) => g.jid === jid || g.id === jid);
  return found?.name || "Grupo WhatsApp";
}

// Real Dispatch Function with robust base64 / URL media support and fail-safe text fallback
const activeCampaignsRunning = new Set<string>();

async function executeGroupDispatch(
  targets: string[],
  textToSend: string,
  imgToSend: string | undefined,
  preferredInstance: string,
  campaignTitle: string,
  campaignId?: string,
  intervalMs: number = 0,
  onProgress?: (processedCount: number, successfulCount: number, failedCount: number, targetTotal: number) => void,
  userId?: number,
  db?: any
) {
  const instance = preferredInstance;
  console.log(`\n[Dispatch] 🚀 Dispatching '${campaignTitle}' to ${targets.length} groups via '${instance}' (hasImage: ${Boolean(imgToSend)}, intervalMs: ${intervalMs})`);

  // Verify that the instance is actively connected before attempting dispatch
  try {
    const { isConnected } = await resolveActiveInstance(instance, userId, db);
    if (!isConnected) {
      console.warn(`[Dispatch] ⚠️ Instância ${instance} desconectada do WhatsApp. Cancelando disparo.`);
      return targets.map((rawJid) => ({
        jid: rawJid,
        success: false,
        error: "WhatsApp desconectado. Conecte seu WhatsApp para enviar divulgações.",
      }));
    }
  } catch {}

  const dispatchResults: Array<{ jid: string; success: boolean; error?: string }> = [];
  let successfulCount = 0;
  let failedCount = 0;

  // Pre-register pending history items in MySQL so they immediately reflect on Dashboard and History panel
  const targetHistoryIds = new Map<string, number>();
  if (userId && db?.addHistoryForUser) {
    for (const rawTarget of targets) {
      const targetJid = String(rawTarget || "").trim();
      const normJid = targetJid;
      if (!normJid.endsWith("@g.us") || normJid.includes("@broadcast") || normJid.includes("@newsletter") || normJid.includes("@s.whatsapp.net") || normJid.includes("@lid")) continue;
      const gName = lookupGroupName(normJid, instance);
      try {
        const histId = await db.addHistoryForUser(userId, {
          campaignId: campaignId || "manual",
          campaignTitle: campaignTitle || "Divulgação",
          groupJid: normJid,
          groupName: gName,
          messageText: textToSend,
          imageUrl: imgToSend || null,
          mediaType: imgToSend ? "imagem" : "texto",
          status: "pending",
        });
        if (histId) targetHistoryIds.set(normJid, histId);
      } catch {}
    }
  }

  for (let i = 0; i < targets.length; i++) {
    const rawJid = String(targets[i] || "").trim();
    const jid = rawJid;
    const groupName = lookupGroupName(jid, instance);
    const startRequestTime = Date.now();

    // Strict validation: target must be a real WhatsApp group (@g.us)
    if (!jid.endsWith("@g.us") || jid.includes("@broadcast") || jid.includes("@newsletter") || jid.includes("@s.whatsapp.net") || jid.includes("@lid")) {
      console.warn(`[Dispatch] ⚠️ Destino inválido ignorado: '${jid}'. Disparos de campanha são exclusivos para grupos.`);
      dispatchResults.push({ jid, success: false, error: "Destino inválido: não é um grupo de WhatsApp." });
      failedCount++;
      if (onProgress) onProgress(i + 1, successfulCount, failedCount, targets.length);
      continue;
    }

    // If not the first group, apply interval between groups
    if (i > 0 && intervalMs > 0) {
      console.log(`[Dispatch] ⏳ Waiting ${intervalMs / 1000}s interval before sending to group ${i + 1}/${targets.length}...`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    console.log(`\n[SEND]`);
    console.log(`instance: ${instance}`);
    console.log(`groupJid: ${jid} (${groupName})`);
    console.log(`campaignId: ${campaignId || 'manual'}`);

    try {
      let isOk = false;
      let lastErr = "";
      let httpStatus = 0;
      let endpointUsed = "";
      let attemptCount = 0;

      // 1. If image provided, attempt sendMedia
      if (imgToSend && (imgToSend.startsWith("http") || imgToSend.startsWith("data:") || imgToSend.startsWith("/uploads/") || imgToSend.startsWith("uploads/") || imgToSend.length > 20)) {
        attemptCount++;
        console.log(`attempt: ${attemptCount} (sendMedia)`);
        endpointUsed = `/message/sendMedia/${instance}`;
        
        try {
          let cleanMedia = imgToSend.trim();
          let mime = "image/jpeg";
          let fileName = "imagem.jpg";

          if (cleanMedia.startsWith("data:")) {
            const commaIdx = cleanMedia.indexOf(",");
            if (commaIdx !== -1) {
              const header = cleanMedia.substring(0, commaIdx);
              cleanMedia = cleanMedia.substring(commaIdx + 1).replace(/[\r\n\s]/g, "");
              if (header.includes("png")) mime = "image/png";
              else if (header.includes("webp")) mime = "image/webp";
              else if (header.includes("gif")) mime = "image/gif";
              else if (header.includes("mp4")) mime = "video/mp4";
              else mime = "image/jpeg";
              fileName = `imagem.${mime.split("/")[1] || "jpg"}`;
            }
          } else if (cleanMedia.startsWith("http://") || cleanMedia.startsWith("https://")) {
            cleanMedia = cleanMedia.trim();
            if (cleanMedia.includes(".png")) mime = "image/png";
            else if (cleanMedia.includes(".webp")) mime = "image/webp";
            else if (cleanMedia.includes(".gif")) mime = "image/gif";
            else if (cleanMedia.includes(".mp4")) mime = "video/mp4";
            fileName = `imagem.${mime.split("/")[1] || "jpg"}`;
          } else if (cleanMedia.startsWith("/uploads/") || cleanMedia.startsWith("uploads/")) {
            const relPath = cleanMedia.replace(/^\/+/, "");
            const fullLocal = path.join(process.cwd(), relPath);
            if (fs.existsSync(fullLocal)) {
              const ext = path.extname(fullLocal).toLowerCase();
              mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : ext === ".mp4" ? "video/mp4" : "image/jpeg";
              fileName = path.basename(fullLocal);
              cleanMedia = fs.readFileSync(fullLocal).toString("base64");
            } else {
              cleanMedia = `https://grolpy.minhabagg.com.br/${relPath}`;
            }
          } else {
            cleanMedia = cleanMedia.replace(/[\r\n\s]/g, "");
          }

          const isVideo = mime.startsWith("video/") || fileName.endsWith(".mp4");
          const mediaPayload = {
            number: jid,
            mediatype: isVideo ? "video" : "image",
            mimetype: mime,
            media: cleanMedia,
            caption: textToSend || "",
            fileName,
            delay: 1000,
            linkPreview: false,
          };

          const mediaRes = await callEvolution(endpointUsed, {
            method: "POST",
            body: JSON.stringify(mediaPayload),
          }, 60000, 0);

          console.log(`[EVOLUTION RESPONSE]`);
          console.log(`status: ${mediaRes.status}`);
          console.log(`body: ${JSON.stringify(mediaRes.data)}`);
          httpStatus = mediaRes.status;

          if (mediaRes.ok) {
            isOk = true;
          } else {
            lastErr = mediaRes.data?.message || mediaRes.data?.error || JSON.stringify(mediaRes.data) || "Falha ao enviar imagem (Evolution API).";
          }
        } catch (e: any) {
          console.log(`[EVOLUTION RESPONSE] Error exception: ${e.message}`);
          lastErr = e.message || "Erro no envio da mídia.";
        }
      }

      // 2. If text-only or (sendMedia failed AND we have text to fall back to), send via sendText
      if (!isOk && textToSend) {
        for (let attempt = 1; attempt <= 1 && !isOk; attempt++) {
          attemptCount++;
          console.log(`attempt: ${attemptCount} (sendText)`);
          endpointUsed = `/message/sendText/${instance}`;
          
          try {
            const sendTextPayload = {
              number: jid,
              text: textToSend,
              delay: 1000,
              linkPreview: false,
            };

            console.log(`\n[SEND DIAGNOSTIC]`);
            console.log(`Target Instance: ${instance}`);
            console.log(`Target Group JID: ${jid}`);
            console.log(`Endpoint: ${endpointUsed}`);

            const sendRes = await callEvolution(endpointUsed, {
              method: "POST",
              body: JSON.stringify(sendTextPayload),
            }, 25000, 0);

            console.log(`[EVOLUTION DIAGNOSTIC RESPONSE]`);
            console.log(`status: ${sendRes.status}`);
            console.log(`body: ${JSON.stringify(sendRes.data, null, 2)}`);
            httpStatus = sendRes.status;

            if (sendRes.ok) {
              isOk = true;
              lastErr = ""; // Clear media error if text fallback succeeded
            } else {
              lastErr = sendRes.data?.message || sendRes.data?.error || JSON.stringify(sendRes.data) || "Falha Evolution sendText";
            }
          } catch (e: any) {
            console.log(`[EVOLUTION RESPONSE] Error exception: ${e.message}`);
            lastErr = e.message;
          }
        }
      }

      const durationMs = Date.now() - startRequestTime;
      const durationSeconds = (durationMs / 1000).toFixed(1);

      if (isOk) {
        console.log(`[SUCCESS] Enviado para ${jid} em ${durationSeconds}s`);
        successfulCount++;
      } else {
        console.log(`[FAILED] Falha ao enviar para ${jid} após ${durationSeconds}s. Erro: ${lastErr}`);
        failedCount++;
      }

      dispatchResults.push({ jid, success: isOk, error: isOk ? undefined : lastErr });
      if (onProgress) onProgress(i + 1, successfulCount, failedCount, targets.length);

      // Detailed history logging
      const errorDetails = !isOk ? `HTTP ${httpStatus} (${endpointUsed}): ${lastErr} (Tentativas: ${attemptCount})` : undefined;
      const groId = `#GRO-${Math.floor(100000 + Math.random() * 900000)}`;

      if (userId && db?.updateHistoryItem && targetHistoryIds.has(jid)) {
        try {
          await db.updateHistoryItem(userId, targetHistoryIds.get(jid)!, {
            status: isOk ? "delivered" : "failed",
            error: errorDetails || null,
            duration: `${durationSeconds} segundos`,
          });
        } catch (dbErr) {
          console.warn("[DB] Erro ao atualizar historico de envio:", dbErr);
        }
      } else if (userId && db?.addHistoryForUser) {
        try {
          await db.addHistoryForUser(userId, {
            campaignId: campaignId || "manual",
            campaignTitle: campaignTitle || "Divulgação",
            groupJid: jid,
            groupName,
            messageText: textToSend,
            imageUrl: imgToSend || null,
            mediaType: imgToSend ? "imagem" : "texto",
            status: isOk ? "delivered" : "failed",
            error: errorDetails || null,
            duration: `${durationSeconds} segundos`,
          });
        } catch (dbErr) {
          console.warn("[DB] Erro ao gravar historico de envio:", dbErr);
        }
      }
    } catch (err: any) {
      const errDuration = ((Date.now() - startRequestTime) / 1000).toFixed(1);
      console.log(`[FAILED] Erro catastrofico ao enviar para ${jid}: ${err.message}`);
      failedCount++;
      dispatchResults.push({ jid, success: false, error: err.message });
      if (userId && db?.updateHistoryItem && targetHistoryIds.has(jid)) {
        try {
          await db.updateHistoryItem(userId, targetHistoryIds.get(jid)!, {
            status: "failed",
            error: err.message,
            duration: `${errDuration} segundos`,
          });
        } catch {}
      } else if (userId && db?.addHistoryForUser) {
        try {
          await db.addHistoryForUser(userId, {
            campaignId: campaignId || "manual",
            campaignTitle: campaignTitle || "Divulgação",
            groupJid: jid,
            groupName,
            messageText: textToSend,
            imageUrl: imgToSend || null,
            mediaType: imgToSend ? "imagem" : "texto",
            status: "failed",
            error: err.message,
            duration: `${errDuration} segundos`,
          });
        } catch {}
      }
      if (onProgress) onProgress(i + 1, successfulCount, failedCount, targets.length);
    }
  }

  return dispatchResults;
}

// Real Dispatch of Campaign to WhatsApp Groups via Evolution API
app.post("/api/client/campaigns/send-now", async (req, res) => {
  const own: any = await ownedInstance(req, true, true);
  if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
  const { campaignId, customGroupJids, customMessage, imageUrl, instanceName, intervalSeconds } = req.body;
  const instanceParam = own.instance;
  const clientCampaignsStore:any[]=await own.db.listCampaignsForUser(own.user.id);
  const clientHistoryStore:any[]=await own.db.listHistoryForUser(own.user.id,31);
  const sub=await own.db.getSubscriptionForUser(own.user.id); const userPlanId=(sub?.plan_id||"start") as any;
  const { isConnected, activeInstance } = await resolveActiveInstance(own.instance, own.user?.id, own.db);
  if (!isConnected) {
    return res.status(400).json({ error: "O WhatsApp selecionado está desconectado. Conecte seu WhatsApp antes de disparar." });
  }
  const instance = activeInstance || own.instance;

  let camp = clientCampaignsStore.find((c) => c.id === campaignId);
  const textToSend = customMessage || camp?.previewText;
  const imgToSend = imageUrl || camp?.imageUrl;

  if (!textToSend) {
    return res.status(400).json({ error: "Texto da mensagem não fornecido." });
  }

  // Revalidate the targets against the current Evolution snapshot before sending.
  // This prevents a deleted/foreign/stale group from entering the dispatch queue.
  const liveGroups = await syncAllWhatsAppGroups(true, instance, { id: own.user.id, db: own.db });
  const liveGroupJids = new Set(liveGroups.map((g: any) => String(g.jid || g.id || "").trim()).filter((jid: string) => jid.endsWith("@g.us")));

  let rawTargets: string[] = customGroupJids || camp?.selectedGroupJids || [];
  if (rawTargets.length === 0) {
    rawTargets = liveGroups.map((g: any) => g.jid || g.id).filter(Boolean);
  }

  // Strictly filter for real WhatsApp groups AND groups that currently exist in Evolution.
  let targets = rawTargets.filter((jid: string) => {
    const normalized = String(jid || "").trim();
    return normalized.endsWith("@g.us") && !normalized.includes("@broadcast") && !normalized.includes("@newsletter") && !normalized.includes("@s.whatsapp.net") && !normalized.includes("@lid") && liveGroupJids.has(normalized);
  });

  // Filter out already successful targets if we are retrying a campaign
  if (camp && !customGroupJids && targets.length > 0) {
    const successfulJids = clientHistoryStore
      .filter(h => h.campaignId === camp.id && h.status === 'delivered')
      .map(h => h.groupJid);
    
    if (successfulJids.length > 0) {
      targets = targets.filter(jid => !successfulJids.includes(jid));
      if (targets.length === 0) {
        return res.status(400).json({ error: "Todos os grupos desta campanha já foram enviados com sucesso." });
      }
    }
  }

  if (targets.length === 0) {
    return res.status(400).json({
      error: "Nenhum grupo de destino válido selecionado para o disparo. Conecte seu WhatsApp e selecione ao menos um grupo.",
    });
  }

  const currentLimits = CLIENT_PLAN_LIMITS[userPlanId];
  const totalSentFromCampaigns = clientCampaignsStore.reduce((acc, c) => acc + (c.totalSent || 0), 0);
  if (totalSentFromCampaigns + targets.length > currentLimits.maxMonthlySends) {
    return res.status(403).json({
      success: false,
      error: `Você atingiu o limite de envios do seu plano (${currentLimits.maxMonthlySends} envios mensais). Faça um upgrade para continuar disparando.`,
      code: 'LIMIT_MONTHLY_SENDS',
      limit: currentLimits.maxMonthlySends,
      used: totalSentFromCampaigns,
    });
  }

  if (camp) {
    camp.status = "enviando";
    camp.totalSent = 0;
    camp.totalTarget = targets.length;
    camp.groupsCount = targets.length;
    camp.executed = true;
    await own.db.saveCampaignForUser(own.user.id,camp);
  }

  const intervalMs = intervalSeconds !== undefined && Number(intervalSeconds) >= 0
    ? Number(intervalSeconds) * 1000
    : (camp?.delaySeconds !== undefined && Number(camp.delaySeconds) >= 0
      ? Number(camp.delaySeconds) * 1000
      : (camp?.intervalMinutes ? Number(camp.intervalMinutes) * 60 * 1000 : 30000));

  console.log(`[SendNow] 🚀 Disparo manual iniciado para campanha '${camp?.title || campaignId}' (${targets.length} grupos, intervalo: ${intervalMs / 1000}s)`);

  // Execute in background so the UI doesn't time out or block
  (async () => {
    if (camp) activeCampaignsRunning.add(camp.id);
    try {
      const dispatchResults = await executeGroupDispatch(
        targets,
        textToSend,
        imgToSend,
        instance,
        camp?.title || "Disparo Imediato",
        camp?.id,
        intervalMs,
        (processedCount, successfulCount, failedCount) => {
          if (camp) {
            camp.totalSent = successfulCount;
            camp.totalFailed = failedCount;
            camp.status = "enviando";
            own.db.saveCampaignForUser(own.user.id, camp).catch(() => {});
          }
        },
        own.user.id,
        own.db
      );

      const successfulCount = dispatchResults.filter((r) => r.success).length;

      if (camp) {
        camp.totalSent = successfulCount;
        camp.status = successfulCount === targets.length ? "concluida" : (successfulCount > 0 ? "parcial" : "falha");
        camp.active = false;
        camp.lastSentAt = `Hoje às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`;
        await own.db.saveCampaignForUser(own.user.id,camp);
      }
    } catch (err) {
      console.error("[Dispatch] Error during execution:", err);
      if (camp) {
        camp.status = "falha";
        await own.db.saveCampaignForUser(own.user.id,camp);
      }
    } finally {
      if (camp) activeCampaignsRunning.delete(camp.id);
    }
  })();

  res.json({
    success: true,
    started: true,
    totalTarget: targets.length,
    message: "Disparo iniciado com sucesso!",
  });
});

// Helper for Brazil Timezone
function getBrazilTimeData() {
  const now = new Date();
  const brTimeStr = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false });
  const brDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
  const brWeekday = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short" });
  const dayNames: Record<string, string> = {
    "dom": "Dom", "seg": "Seg", "ter": "Ter", "qua": "Qua", "qui": "Qui", "sex": "Sex", "sáb": "Sáb", "sab": "Sáb"
  };
  const prefix = brWeekday.slice(0, 3).toLowerCase().replace(".", "");
  const brDayName = dayNames[prefix] || "Seg";
  return { brTimeStr, brDateStr, brDayName, now };
}

// Automatic Background Scheduling Engine (Checks MySQL every 3 seconds for scheduled campaigns)
let isSchedulerRunning = false;
setInterval(async () => {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  try {
    const db: any = await getDatabase().catch(() => null);
    if (!db) return;

    const { brTimeStr, brDateStr, brDayName } = getBrazilTimeData();

    // Watchdog: Auto-recover any campaigns stuck in 'enviando' for > 3 minutes with no active runner
    if (db.recoverStuckCampaigns && Math.random() < 0.25) {
      db.recoverStuckCampaigns(3).catch(() => {});
    }

    // 1. Fetch all active/scheduled campaigns directly from MySQL (Shared Single Source of Truth)
    const dbCampaigns = await db.listActiveScheduledCampaigns().catch(() => []);

    for (const item of dbCampaigns) {
      const camp = item.config;
      const userId = item.userId;
      const campId = camp.id || item.campaignKey;

      if (!camp.active && camp.status !== 'enviando') continue;
      if (camp.status === 'concluida' || camp.status === 'falha') continue;
      if (activeCampaignsRunning.has(campId)) continue;

      let shouldTrigger = false;
      const slotKey = `${brDateStr}_${brTimeStr}`;

      // Auto-Resume any interrupted campaign
      if (camp.status === 'enviando') {
        shouldTrigger = true;
        console.log(`[Scheduler] 🔄 Resumindo campanha interrompida '${camp.title}' (progresso: ${camp.totalSent || 0}/${camp.totalTarget || camp.selectedGroupJids?.length || 0})`);
      }
      // Mode 1: Agendar / Programado (Disparo Único com Data e Hora)
      else if (camp.scheduleMode === 'agendar' || camp.scheduleMode === 'programado') {
        const campDate = camp.scheduleDate || brDateStr;
        const campTime = (camp.scheduleTime || "00:00").slice(0, 5);

        if (campDate < brDateStr || (campDate === brDateStr && campTime <= brTimeStr)) {
          if (!camp.executed && (camp.status === 'agendada' || camp.status === 'ativa')) {
            shouldTrigger = true;
          }
        }
      }
      // Mode 2: Recorrente (Dias da semana & horários do dia)
      else if (camp.scheduleMode === 'recorrente') {
        const days = camp.scheduleDays || "Todos os dias";
        const isDayMatch = days === "Todos os dias" || days.includes(brDayName);

        if (isDayMatch) {
          const times = (Array.isArray(camp.scheduleTimes) && camp.scheduleTimes.length > 0
            ? camp.scheduleTimes
            : [camp.scheduleTime || "00:00"]).map((t: any) => String(t).slice(0, 5));

          if (times.includes(brTimeStr) && camp.lastExecutedSlot !== slotKey) {
            shouldTrigger = true;
            camp.lastExecutedSlot = slotKey;
          }
        }
      }

      if (!shouldTrigger) continue;

      // Stop scheduled sends as soon as the subscription loses access.
      // Admin accounts remain exempt for diagnostics.
      const [schedulerUser, schedulerSubscription] = await Promise.all([
        db.getUserById(userId).catch(() => null),
        db.getSubscriptionForUser(userId).catch(() => null),
      ]);
      const schedulerIsAdmin = schedulerUser?.role === "admin";
      const schedulerHasAccess = schedulerIsAdmin || String(schedulerSubscription?.status || "").toLowerCase() === "active";
      if (!schedulerHasAccess) {
        camp.status = 'pausada';
        camp.active = false;
        await db.saveCampaignForUser(userId, camp).catch(() => {});
        console.warn(`[Scheduler] Campanha '${camp.title}' pausada: assinatura inativa para usuario ${userId}.`);
        continue;
      }

      console.log(`[Scheduler] 🚀 Disparo agendado acionado para '${camp.title}' (usuário ${userId}) às ${brTimeStr} (BRT)`);
      activeCampaignsRunning.add(campId);
      camp.status = 'enviando';
      camp.executed = true;
      await db.saveCampaignForUser(userId, camp).catch(() => {});

      // Resolve user's WhatsApp instance
      let targetInstName = camp.instanceName;
      try {
        const uInst = await db.getUserInstance(userId).catch(() => null);
        if (uInst?.instance_name) targetInstName = uInst.instance_name;
      } catch {}

      // Verify connection before attempting dispatch
      const { isConnected, activeInstance } = await resolveActiveInstance(targetInstName, userId, db);
      if (!isConnected) {
        console.warn(`[Scheduler] ⚠️ WhatsApp desconectado para usuário ${userId} (instância ${targetInstName}). Disparo cancelado.`);
        camp.status = 'falha';
        camp.active = false;
        await db.saveCampaignForUser(userId, camp).catch(() => {});
        await db.addHistoryForUser(userId, {
          campaignId: campId,
          campaignTitle: camp.title || "Divulgação Agendada",
          groupJid: "N/A",
          groupName: "Falha de Conexão",
          messageText: camp.previewText || "",
          status: "failed",
          error: "WhatsApp desconectado no horário agendado. Conecte seu WhatsApp para enviar divulgações.",
        }).catch(() => {});
        activeCampaignsRunning.delete(campId);
        continue;
      }

      let allTargets = Array.isArray(camp.selectedGroupJids) ? camp.selectedGroupJids : [];
      if (allTargets.length === 0) {
        console.warn(`[Scheduler] ⚠️ Nenhum grupo selecionado para '${camp.title}'`);
        camp.status = 'falha';
        camp.active = false;
        await db.saveCampaignForUser(userId, camp).catch(() => {});
        activeCampaignsRunning.delete(campId);
        continue;
      }

      camp.totalTarget = allTargets.length;
      camp.groupsCount = allTargets.length;

      // Filter out already successful targets from this campaign based on history
      const userHistory = await db.listHistoryForUser(userId, 30).catch(() => []);
      const successfulJids = (userHistory || [])
        .filter((h: any) => h.campaignId === campId && h.status === 'delivered')
        .map((h: any) => h.groupJid);

      const remainingTargets = allTargets.filter((jid: string) => !successfulJids.includes(jid));
      const totalAlreadySent = successfulJids.length;

      if (remainingTargets.length === 0) {
        console.log(`[Scheduler] ✅ Todos os grupos já foram enviados para '${camp.title}'`);
        camp.status = 'concluida';
        camp.active = false;
        await db.saveCampaignForUser(userId, camp).catch(() => {});
        activeCampaignsRunning.delete(campId);
        continue;
      }

      const intervalMs = (camp.delaySeconds !== undefined && camp.delaySeconds !== null && Number(camp.delaySeconds) >= 0)
        ? Number(camp.delaySeconds) * 1000
        : (camp.intervalMinutes ? Number(camp.intervalMinutes) * 60 * 1000 : 30000);

      console.log(`[Scheduler] 🚀 Iniciando envio da campanha '${camp.title}' para ${remainingTargets.length} grupos restantes com intervalo de ${intervalMs / 1000}s`);

      // Execute dispatch in background
      (async () => {
        try {
          const results = await executeGroupDispatch(
            remainingTargets,
            camp.previewText,
            camp.imageUrl,
            activeInstance,
            camp.title,
            campId,
            intervalMs,
            (processedCount, successfulCount, failedCount) => {
              camp.totalSent = totalAlreadySent + successfulCount;
              camp.totalFailed = (camp.totalFailed || 0) + failedCount;
              camp.status = 'enviando';
              db.saveCampaignForUser(userId, camp).catch(() => {});
            },
            userId,
            db
          );

          const successCount = results.filter((r) => r.success).length;
          const failedCount = results.filter((r) => !r.success).length;
          const totalSuccess = totalAlreadySent + successCount;
          camp.totalSent = totalSuccess;
          camp.totalFailed = (camp.totalFailed || 0) + failedCount;
          camp.lastSentAt = `Hoje às ${getBrazilTimeData().brTimeStr}`;

          if (camp.scheduleMode === 'recorrente') {
            camp.status = 'ativa';
            camp.active = true;
          } else {
            camp.status = totalSuccess >= allTargets.length ? 'concluida' : (totalSuccess > 0 ? 'parcial' : 'falha');
            camp.active = false;
          }
          await db.saveCampaignForUser(userId, camp).catch(() => {});
        } catch (err: any) {
          console.error(`[Scheduler] Erro durante execução da campanha '${camp.title}':`, err);
          camp.status = 'falha';
          camp.active = false;
          await db.saveCampaignForUser(userId, camp).catch(() => {});
        } finally {
          activeCampaignsRunning.delete(campId);
        }
      })();
    }
  } catch (err: any) {
    console.warn("[Scheduler] Erro no loop de agendamento:", err?.message || err);
  } finally {
    isSchedulerRunning = false;
  }
}, 3000);

// Get real history
app.get("/api/client/history", async (req, res) => {
  const own: any = await ownedInstance(req, true);
  if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ success: false, error: own.error });
  const sub = await own.db.getSubscriptionForUser(own.user.id);
  const planId = (sub?.plan_id || own.user.plan || "start") as 'start' | 'pro' | 'max';
  const days = CLIENT_PLAN_LIMITS[planId]?.historyDays || 30;
  const history = await own.db.listHistoryForUser(own.user.id, days);
  res.json({ success: true, total: history.length, history });
});

// Client Dashboard Unified Stats - 100% REAL DATA, 0 MOCK
app.get("/api/client/stats", async (req, res) => {
  const own: any = await ownedInstance(req, true);
  if (own.error) return res.status(own.error === "UNAUTHORIZED" ? 401 : 402).json({ error: own.error });
  const instance = own.instance;
  const clientCampaignsStore: any[] = await own.db.listCampaignsForUser(own.user.id);
  const clientHistoryStore: any[] = await own.db.listHistoryForUser(own.user.id, 31);
  const sub = await own.db.getSubscriptionForUser(own.user.id);
  const userPlanId = (sub?.plan_id || own.user.plan || "start") as 'start' | 'pro' | 'max';

  // Dashboard metrics must stay fast and must not trigger another external
  // Evolution request. The dedicated status/groups endpoints own live sync.
  const persistedGroups = await own.db.listGroupsForUser(own.user.id).catch(() => []);
  const realGroupsCount = Array.isArray(persistedGroups) ? persistedGroups.length : 0;

  const totalSentFromCampaigns = clientCampaignsStore.reduce((acc, c) => acc + (c.totalSent || 0), 0);
  const deliveredHistory = clientHistoryStore.filter((h) => h.status === "delivered" || h.status === "sent").length;
  const totalMessagesSent = Math.max(totalSentFromCampaigns, deliveredHistory);

  const todayIso = new Date().toISOString().split('T')[0];
  const nowBr = new Date();
  const todayBr = nowBr.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
  const sentToday = clientHistoryStore.filter((h) => {
    if (h.status !== "delivered" && h.status !== "sent") return false;
    const tStr = String(h.timestamp || "");
    return tStr.startsWith(todayBr) || tStr.startsWith(todayIso);
  }).length;

  const failedHistory = clientHistoryStore.filter((h) => h.status === "failed").length;
  const pendingHistory = clientHistoryStore.filter((h) => h.status === "pending").length;
  const activeCampaignsCount = clientCampaignsStore.filter((c) => c.active && c.status !== 'concluida').length;
  const scheduledCount = clientCampaignsStore.filter((c) => c.status === 'agendada' || (c.active && c.scheduleMode === 'agendar')).length;
  const pendingFromCampaigns = clientCampaignsStore
    .filter((c) => c.status === 'agendada' || c.status === 'ativa' || c.status === 'enviando')
    .reduce((acc, c) => acc + Math.max(0, (c.groupsCount || 1) - (c.totalSent || 0)), 0);
  const pendingCount = Math.max(pendingHistory, pendingFromCampaigns);

  const currentPlanLimits = CLIENT_PLAN_LIMITS[userPlanId];
  const uniqueGroups = getUniqueGroupsInAutomations(clientCampaignsStore);

  // Daily rounds used today (distinct scheduled campaign runs today)
  const activeRecurringRuns = clientCampaignsStore.filter((c) => c.active && c.scheduleMode === 'recorrente').length;
  const dailyRoundsUsed = Math.min(currentPlanLimits.maxRoundsPerDay, Math.max(activeRecurringRuns, sentToday > 0 ? 1 : 0));

  const totalAttempts = totalMessagesSent + failedHistory;
  const successRate = totalAttempts > 0 ? Math.round((totalMessagesSent / totalAttempts) * 100) : (totalMessagesSent > 0 ? 100 : 0);
  const monthlyLimit = currentPlanLimits.maxMonthlySends || 2700;
  const monthlyPercentage = Math.min(100, Math.round((totalMessagesSent / monthlyLimit) * 100));

  res.json({
    success: true,
    instanceName: instance,
    stats: {
      messagesSent: totalMessagesSent,
      sentToday,
      activeGroups: realGroupsCount,
      successRate,
      activeCampaigns: activeCampaignsCount,
      scheduledToday: scheduledCount,
      pending: pendingCount,
      failed: failedHistory,
    },
    usage: {
      sent: totalMessagesSent,
      limit: monthlyLimit,
      percentage: monthlyPercentage,
      pending: pendingCount,
      failed: failedHistory,
      monthly: {
        used: totalMessagesSent,
        limit: monthlyLimit,
        percentage: monthlyPercentage,
        remaining: Math.max(0, monthlyLimit - totalMessagesSent),
      },
      daily: {
        roundsUsed: dailyRoundsUsed,
        roundsLimit: currentPlanLimits.maxRoundsPerDay,
        sentToday,
      },
      groups: {
        used: uniqueGroups.size,
        limit: currentPlanLimits.maxGroups,
      },
      campaigns: {
        activeCount: activeCampaignsCount,
        limit: currentPlanLimits.maxActiveCampaigns,
      },
    },
  });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production" && process.env.GROPLY_DEV === "true") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Nexus Evolution Backend running on http://0.0.0.0:${PORT}`);

    // Radar polling can work while the webhook is missing, hiding failures in
    // private inbound messages. Re-register the admin webhook on every boot.
    const appUrl = String(process.env.APP_URL || "https://grolpy.minhabagg.com.br").replace(/\/$/, "");
    if (appUrl && DEFAULT_EVOLUTION_URL && DEFAULT_EVOLUTION_KEY) {
      void callEvolution(`/webhook/set/${DEFAULT_INSTANCE_NAME}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: `${appUrl}/api/evolution/webhook`,
            webhookByEvents: false,
            events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "SEND_MESSAGE", "CONNECTION_UPDATE"],
          },
        }),
      }).then((result) => {
        memoryState.webhookStatus = result.ok ? "active" : "inactive";
        if (!result.ok) console.error("[Evolution webhook] Falha ao registrar webhook:", result.status);
      }).catch((error) => {
        memoryState.webhookStatus = "inactive";
        console.error("[Evolution webhook] Falha ao registrar webhook:", error?.message || error);
      });
    }
  });
}

startServer();
