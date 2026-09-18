import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import http from "http";
import https from "https";
import net from "net";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { radarEngine } from "./server/radarEngine";
import { atendimentoEngine } from "./server/atendimentoEngine";
import { asaasEngine } from "./server/asaasEngine";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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
    if (!result.ok && retryCount > 0 && (errorMsg.includes("connection pool") || errorMsg.includes("Connection Closed") || result.status === 500)) {
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

// Preload real group metadata into radarEngine cache
async function preloadRadarGroups() {
  try {
    const res = await callEvolution(`/group/fetchAllGroups/${memoryState.instanceName}?getParticipants=false`);
    if (res.ok && Array.isArray(res.data)) {
      for (const g of res.data) {
        const jid = g.id || g.jid;
        const name = g.subject || g.name || "Grupo WhatsApp";
        const avatar = g.pictureUrl || g.profilePicUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=150&q=80";
        radarEngine.updateGroupMetadata(jid, name, avatar);
      }
      console.log(`[Radar] Preloaded metadata for ${res.data.length} groups.`);
    }
  } catch (e) {
    // silent catch
  }
}
setTimeout(preloadRadarGroups, 1500);

// In-memory cache for profile pictures to avoid repeated WhatsApp queries
const profilePicCache = new Map<string, string>();

// Utility: format phone from JID or raw number
function formatPhone(jid: string): string {
  if (!jid) return "";
  const clean = jid.replace("@s.whatsapp.net", "").replace("@lid", "").replace("@g.us", "");
  
  if (clean.length === 12 && clean.startsWith("55")) {
    // 55 27 9999-9999
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 8)}-${clean.substring(8)}`;
  }
  if (clean.length === 13 && clean.startsWith("55")) {
    // 55 27 99999-9999
    return `+55 (${clean.substring(2, 4)}) ${clean.substring(4, 9)}-${clean.substring(9)}`;
  }
  if (clean.length === 10 || clean.length === 11) {
    const ddd = clean.substring(0, 2);
    const rest = clean.substring(2);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
    }
    return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
  }
  if (clean.startsWith("55") && clean.length >= 10 && clean.length <= 14) {
    return `+55 ${clean.substring(2)}`;
  }
  // If it is an internal WhatsApp LID (usually 14-16 digits not matching a phone), don't return raw digits
  if (jid.includes("@lid")) {
    return "";
  }
  return clean;
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

// MySQL health check isolated from application startup.
// mysql2 is loaded lazily so a database/driver failure never takes the Groply process down.
app.get("/api/database/health", async (_req, res) => {
  try {
    const mysqlModule: any = await import("./database.cjs");
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


async function authenticatedUser(req:any){
  const token=String(req.headers.authorization||"").replace(/^Bearer\s+/i,"").trim();
  if(!token) return null;
  const db:any=await import("./database.cjs");
  return db.getUserByToken(token);
}

async function ownedInstance(req:any, requireActive=true){
  const user:any=await authenticatedUser(req); if(!user) return {error:"UNAUTHORIZED"};
  if(requireActive && user.status!=="active") return {error:"PAYMENT_REQUIRED",user};
  const db:any=await import("./database.cjs"); const inst=await db.ensureUserInstance(user.id);
  return {user,db,instance:inst.instance_name,record:inst};
}

// Authentication backed by MySQL, loaded lazily so DB errors never crash Passenger.
app.post("/api/auth/register", async (req, res) => {
  try {
    const { registerUser } = await import("./database.cjs");
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ success:false, error:"Preencha nome, e-mail e senha." });
    const user = await registerUser(String(name), String(email), String(phone || ""), String(password));
    res.status(201).json({ success:true, user });
  } catch (err:any) {
    const duplicate = err?.code === "ER_DUP_ENTRY";
    res.status(duplicate ? 409 : 500).json({ success:false, error: duplicate ? "Este e-mail já está cadastrado." : "Não foi possível criar a conta." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { loginUser } = await import("./database.cjs");
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success:false, error:"Informe e-mail e senha." });
    const result = await loginUser(String(email), String(password));
    if (!result) return res.status(401).json({ success:false, error:"E-mail ou senha incorretos." });
    res.json({ success:true, ...result });
  } catch (err:any) {
    console.error("[AUTH] login:", err?.code || err?.message || err);
    res.status(500).json({ success:false, error:"Não foi possível entrar agora." });
  }
});

// 2. Fetch all instances available on the Evolution server
app.get("/api/evolution/instances", async (_req, res) => {
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
app.post("/api/evolution/select-instance", (req, res) => {
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

// 4. Evolution API status check (Real connection state)
app.get("/api/evolution/status", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error==="UNAUTHORIZED")return res.status(401).json({error:"Sessão inválida."}); if(own.error)return res.status(402).json({error:"Plano inativo."});
  const instance = own.instance;
  const currentInst = getInstanceCache(instance);

  try {
    // 1. Fetch connection state: GET /instance/connectionState/{instance}
    const stateRes = await callEvolution(`/instance/connectionState/${instance}`, {}, 5000);

    if (!stateRes.ok && stateRes.status === 404) {
      return res.json({
        configured: true,
        instanceExists: false,
        instanceName: instance,
        platform: "Evolution API",
        state: "disconnected",
        webhook: {
          status: "waiting",
          url: `${req.protocol}://${req.get("host")}/api/evolution/webhook`,
        },
        lastUpdated: new Date().toISOString(),
      });
    }

    if (!stateRes.ok && (stateRes.status === 400 || stateRes.status === 408 || stateRes.status === 502)) {
      return res.json({
        configured: Boolean(memoryState.apiUrl && !memoryState.apiUrl.includes("yourdomain.com")),
        instanceExists: true,
        instanceName: instance,
        platform: "Evolution API",
        state: currentInst.state || "disconnected",
        qrCode: currentInst.qrCode,
        connectedProfile: currentInst.connectedProfile,
        warning: stateRes.data?.error || "Servidor Evolution API temporariamente indisponível.",
        webhook: {
          status: currentInst.webhookStatus,
          url: `${req.protocol}://${req.get("host")}/api/evolution/webhook`,
        },
        lastUpdated: currentInst.lastUpdated,
      });
    }

    const rawState = stateRes.data?.instance?.state || stateRes.data?.state || "close";
    let appState: EvolutionLocalCache["state"] = "disconnected";

    if (rawState === "open") {
      appState = "connected";
    } else {
      // In Evolution API / Baileys, while waiting for the QR code to be scanned,
      // the socket status is "connecting". Do NOT set appState to "connecting",
      // because that hides the QR Code and confuses the user!
      // Keep it as "waiting_qr" until connection reaches "open".
      appState = "waiting_qr";
    }

    currentInst.state = appState;
    currentInst.lastUpdated = new Date().toISOString();
    await own.db.setUserInstanceStatus(own.user.id, appState);

    // If connected, fetch real WhatsApp profile metadata
    if (appState === "connected") {
      try {
        const fetchRes = await callEvolution("/instance/fetchInstances", {}, 3000);
        if (fetchRes.ok && Array.isArray(fetchRes.data)) {
          const instData = fetchRes.data.find((i: any) => i.name === instance);

          if (instData) {
            currentInst.connectedProfile = {
              name: instData.profileName || instData.name || "Groply WhatsApp",
              number: instData.ownerJid ? formatPhone(instData.ownerJid) : (currentInst.connectedProfile?.number || ""),
              pictureUrl: instData.profilePicUrl || "",
              connectedAt: currentInst.connectedProfile?.connectedAt || new Date(instData.updatedAt || Date.now()).toLocaleString("pt-BR"),
              lastSyncAt: new Date().toLocaleString("pt-BR"),
              version: "v2.3.7",
            };
            currentInst.webhookStatus = "active";
          }
        }
      } catch (e) {
        // silent fallback to existing profile cache
      }
    }

    res.json({
      configured: true,
      instanceExists: true,
      instanceName: instance,
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
      instanceName: instance,
      state: "error",
      error: err.message,
      lastUpdated: new Date().toISOString(),
    });
  }
});

// 5. Request REAL QR Code from Evolution API: GET /instance/connect/{instance}
app.get("/api/evolution/qrcode", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error==="UNAUTHORIZED")return res.status(401).json({error:"Sessão inválida."}); if(own.error)return res.status(402).json({error:"Plano inativo."});
  const instance = own.instance;
  const currentInst = getInstanceCache(instance);

  try {
    let connectRes = await callEvolution(`/instance/connect/${instance}`, {
      method: "GET",
    });

    // If connect returned error, 401 logout, 404, or invalid object, recreate session cleanly
    if (!connectRes.ok || connectRes.data?.error || !connectRes.data?.base64 && !connectRes.data?.code) {
      console.log(`[Evolution] connect failed for ${instance} (status: ${connectRes.status}), attempting clean recreation...`);
      try {
        await callEvolution(`/instance/delete/${instance}`, { method: "DELETE" });
      } catch (e) {}
      await new Promise((r) => setTimeout(r, 600));

      const createRes = await callEvolution("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName: instance,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      if (createRes.data?.qrcode?.base64 || createRes.data?.qrcode?.code) {
        const q = createRes.data.qrcode;
        currentInst.qrCode = {
          base64: q.base64,
          code: q.code,
          pairingCode: q.pairingCode,
          updatedAt: Date.now(),
        };
        currentInst.state = "waiting_qr";
        return res.json({
          success: true,
          instanceName: instance,
          qrCode: currentInst.qrCode,
          state: "waiting_qr",
        });
      }

      // Retry connect once after creation
      connectRes = await callEvolution(`/instance/connect/${instance}`, { method: "GET" });
    }

    if (!connectRes.ok) {
      return res.status(connectRes.status || 500).json({
        error: connectRes.data?.response?.message || connectRes.data?.message || "Falha ao obter QR Code da Evolution API.",
        details: connectRes.data,
      });
    }

    const qrData = connectRes.data;
    const base64 = qrData?.base64;
    const code = qrData?.code;
    const pairingCode = qrData?.pairingCode;

    currentInst.qrCode = {
      base64,
      code,
      pairingCode,
      updatedAt: Date.now(),
    };
    currentInst.state = "waiting_qr";
    currentInst.lastUpdated = new Date().toISOString();

    res.json({
      success: true,
      instanceName: instance,
      qrCode: currentInst.qrCode,
      state: "waiting_qr",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5.1 Clean Reset & Recreate Instance (Fixes corrupt Baileys session or stuck count)
app.post("/api/evolution/reset-instance", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const instance = own.instance;
  const currentInst = getInstanceCache(instance);

  try {
    // 1. Delete old instance cleanly
    try {
      await callEvolution(`/instance/delete/${instance}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (e) {
      console.warn("Delete attempt during reset:", e);
    }

    // 2. Wait 1 second for Baileys file cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. Create fresh instance with Baileys and QR code enabled
    const createRes = await callEvolution("/instance/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceName: instance,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });

    let q = createRes.data?.qrcode;
    if (!q?.base64) {
      // Connect to get QR if not in create response
      const connectRes = await callEvolution(`/instance/connect/${instance}`);
      q = connectRes.data;
    }

    if (q) {
      currentInst.qrCode = {
        base64: q.base64,
        code: q.code,
        pairingCode: q.pairingCode,
        updatedAt: Date.now(),
      };
      currentInst.state = "waiting_qr";
      currentInst.lastUpdated = new Date().toISOString();
    }

    await own.db.setUserInstanceStatus(own.user.id, "waiting_qr");
    res.json({
      success: true,
      instanceName: instance,
      qrCode: currentInst.qrCode,
      message: "Instância reiniciada com sucesso. Novo QR Code limpo gerado.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Erro ao resetar instância." });
  }
});

// 6. Create instance manually: POST /instance/create
app.post("/api/evolution/create-instance", async (req, res) => {
  const user:any = await authenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Sessão inválida." });
  if (user.status !== "active") return res.status(402).json({ error: "Plano aguardando pagamento ou suspenso." });
  const db:any = await import("./database.cjs");
  const owned = await db.ensureUserInstance(user.id);
  const instance = owned.instance_name;
  const currentInst = getInstanceCache(instance);

  try {
    const payload = {
      instanceName: instance,
      token: "",
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    };

    const createRes = await callEvolution("/instance/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const qrcode = createRes.data?.qrcode;
    if (qrcode) {
      currentInst.qrCode = {
        code: qrcode.code,
        base64: qrcode.base64,
        pairingCode: qrcode.pairingCode,
        updatedAt: Date.now(),
      };
      currentInst.state = "waiting_qr";
    }

    await db.setUserInstanceStatus(user.id, "waiting_qr");
    res.json({
      success: true,
      instanceName: instance,
      result: createRes.data,
      qrCode: currentInst.qrCode,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Restart instance: POST /instance/restart/{instance}
app.post("/api/evolution/restart", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
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
  const own:any=await ownedInstance(req,false); if(own.error)return res.status(401).json({error:"Sessão inválida."});
  const instance = own.instance;

  try {
    const logoutRes = await callEvolution(`/instance/logout/${instance}`, {
      method: "DELETE",
    });

    memoryState.state = "disconnected";
    memoryState.qrCode = undefined;
    memoryState.connectedProfile = undefined;

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
      body: JSON.stringify(webhookPayload),
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
app.post("/api/evolution/webhook", (req: Request, res: Response) => {
  const event = req.body;
  const eventType = event?.event || event?.type || "unknown";

  memoryState.webhookEvents.unshift({
    type: eventType,
    data: event,
    timestamp: new Date().toISOString(),
  });
  if (memoryState.webhookEvents.length > 50) {
    memoryState.webhookEvents.pop();
  }

  if (eventType === "connection.update" || eventType === "CONNECTION_UPDATE") {
    const state = event.data?.state;
    if (state === "open") {
      memoryState.state = "connected";
      memoryState.webhookStatus = "active";
    } else if (state === "close") {
      memoryState.state = "disconnected";
    }
  }

  if (eventType === "qrcode.updated" || eventType === "QRCODE_UPDATED") {
    const qrcode = event.data?.qrcode;
    if (qrcode) {
      memoryState.qrCode = {
        base64: qrcode.base64,
        code: qrcode.code,
        pairingCode: qrcode.pairingCode,
        updatedAt: Date.now(),
      };
      memoryState.state = "waiting_qr";
    }
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
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          "";

        const senderJid =
          msg.key?.participantAlt ||
          msg.key?.participant ||
          msg.participant ||
          "";
        const senderPhone = senderJid.split("@")[0];
        const senderName = msg.pushName || `WhatsApp ${senderPhone.slice(-4)}`;

        // Extract real attached image from WhatsApp message if present
        let attachedImageUrl: string | undefined = undefined;
        const msgId = msg.key?.id;
        const instance = memoryState.instanceName || "nexus-radar";

        if (msg.message?.imageMessage) {
          const imgMsg = msg.message.imageMessage;
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
          messageId: msgId || `msg-${Date.now()}`,
          messageText: text,
          attachedImageUrl,
          fromMe: Boolean(msg.key?.fromMe),
          timestamp: Number(msg.messageTimestamp || msg.timestamp) || Math.floor(Date.now() / 1000),
        });
      } else if (!msg.key?.fromMe) {
        // Direct message from lead - clear typing indicator and process multi-step AI response
        radarEngine.clearTyping(remoteJid);
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          "";
        if (text) {
          atendimentoEngine.handleIncomingClientMessage(remoteJid, text);
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
app.get("/api/crm/conversations", async (req, res) => {
  const instance = (req.query.instance as string) || memoryState.instanceName;

  try {
    // As únicas informações no CRM de atendimento são os contatos com oportunidades captadas
    const leads = atendimentoEngine.atendimentos;

    // Se temos oportunidades captadas, transformar em conversas do CRM
    if (leads.length > 0) {
      const conversations = leads.map((lead, idx) => {
        const lastMsg = lead.messages && lead.messages.length > 0 ? lead.messages[lead.messages.length - 1] : null;
        const isFromMe = lastMsg ? (lastMsg.sender === "agent" || lastMsg.sender === "ai") : false;
        const timestamp = lastMsg ? lastMsg.time : new Date(lead.lastInteractionAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const content = lastMsg ? ((isFromMe ? (lastMsg.sender === "ai" ? "IA: " : "Você: ") : "") + lastMsg.text) : lead.demandSummary;
        const storedStage = radarEngine.getContactStage(lead.contactJid);
        const stage = storedStage || (lead.status === "convertido" ? "ganho" : (lead.status === "humano_assumiu" ? "em_atendimento" : "novo"));

        return {
          id: lead.id,
          contact: {
            id: lead.id,
            name: lead.contactName,
            phone: lead.contactPhone,
            avatar: lead.contactAvatar || profilePicCache.get(lead.contactJid) || "",
            status: "online",
            stage,
            dealValue: 2500 + ((idx * 850) % 15000),
            tags: ["Radar IA", lead.recommendedService || "Oportunidade", lead.aiActiveForContact ? "IA Ativa 🤖" : "Humano 👤"],
            assignedTo: lead.assignedTo || "Enzo Santos",
            lastContactDate: timestamp,
            notesCount: lead.notes?.length || 1,
            tasksCount: 0,
            isGroup: false,
            remoteJid: lead.contactJid,
            opportunityId: lead.opportunityId,
            score: lead.score,
            originGroup: { id: lead.groupJid, name: lead.groupName },
            demandSummary: lead.demandSummary,
            originalMessage: { text: lead.originalMessage, time: "Hoje" },
            aiActiveForContact: lead.aiActiveForContact,
            conversationStep: lead.conversationStep,
          },
          lastMessage: {
            content,
            timestamp,
            unread: false,
            unreadCount: 0,
            isFromMe,
          },
          channel: "whatsapp",
        };
      });

      return res.json({
        success: true,
        instanceName: instance,
        total: conversations.length,
        conversations,
      });
    }

    // Se ainda não houver leads de oportunidade no arquivo, retornar lista vazia
    return res.json({
      success: true,
      instanceName: instance,
      total: 0,
      conversations: [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch profile picture dynamically for any WhatsApp JID / number
app.get("/api/crm/profile-picture", async (req, res) => {
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
app.get("/api/crm/media/:messageId", async (req, res) => {
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
app.get("/api/crm/messages", async (req, res) => {
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
app.post("/api/crm/send-message", async (req, res) => {
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

    // Se houver atendimento para este contato, salvar mensagem humana no histórico permanente e registrar assunção
    atendimentoEngine.addHumanMessage(jid, text, "Enzo Santos");
    atendimentoEngine.assumeLead(jid, "Enzo Santos");

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
app.get("/api/radar/status", (_req, res) => {
  res.json(radarEngine.getStatus());
});

app.post("/api/radar/status", (req, res) => {
  const { status } = req.body;
  if (status === "active" || status === "paused") {
    radarEngine.setStatus(status);
    return res.json({ success: true, status: radarEngine.status });
  }
  res.status(400).json({ error: "Status inválido (use 'active' ou 'paused')" });
});

// Real Groups from connected Evolution instance
app.get("/api/radar/groups", async (req, res) => {
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
          "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=150&q=80";

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
app.post("/api/radar/monitored-groups", (req, res) => {
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
app.get("/api/radar/opportunities", (_req, res) => {
  res.json({
    success: true,
    total: radarEngine.opportunities.length,
    opportunities: radarEngine.opportunities,
  });
});

// Update opportunity status / stage
app.post("/api/radar/opportunities/:id/stage", (req, res) => {
  const { id } = req.params;
  const { stage, assignedUserName } = req.body;

  const updated = radarEngine.updateOpportunityStage(id, stage, assignedUserName);
  if (!updated) {
    return res.status(404).json({ error: "Oportunidade não encontrada" });
  }

  res.json({ success: true, opportunity: updated });
});

// Start Contact / Assumir no CRM
app.post("/api/radar/start-contact", (req, res) => {
  const { opportunityId, assignedUserName } = req.body;

  if (!opportunityId) {
    return res.status(400).json({ error: "opportunityId é obrigatório" });
  }

  try {
    const result = radarEngine.startContactInCrm({
      opportunityId,
      assignedUserName: assignedUserName || "Enzo Santos",
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Real Activity log
app.get("/api/radar/activities", (_req, res) => {
  res.json({
    success: true,
    total: radarEngine.activities.length,
    activities: radarEngine.activities,
  });
});

// Update CRM contact stage
app.post("/api/crm/contact-stage", (req, res) => {
  const { contactId, stage } = req.body;
  if (!contactId || !stage) {
    return res.status(400).json({ error: "contactId e stage são obrigatórios" });
  }

  radarEngine.setContactStage(contactId, stage);
  // Atualizar também no arquivo de contatos com oportunidades
  atendimentoEngine.updateLeadStatus(contactId, stage, "Enzo Santos");
  res.json({ success: true, contactId, stage });
});

// Update lead status in CRM Atendimento and save to disk
app.post("/api/atendimento/status", (req, res) => {
  const { leadId, status, userName } = req.body;
  if (!leadId || !status) {
    return res.status(400).json({ error: "leadId e status são obrigatórios" });
  }

  const updated = atendimentoEngine.updateLeadStatus(leadId, status, userName || "Enzo Santos");
  if (!updated) {
    return res.status(404).json({ error: "Lead não encontrado" });
  }
  res.json({ success: true, lead: updated });
});

// Check typing status for contact
app.get("/api/crm/typing-status", (req, res) => {
  const jid = req.query.jid as string;
  if (!jid) {
    return res.json({ isTyping: false });
  }
  res.json({ isTyping: radarEngine.isTyping(jid) });
});

// ----------------------------------------------------
// CRM ATENDIMENTO & AI AGENT ROUTES
// ----------------------------------------------------

// Wire up real Evolution sender for AI Agent follow-ups
atendimentoEngine.setEvolutionSender(async (targetJid: string, text: string) => {
  try {
    const instance = memoryState.instanceName;
    const cleanNumber = targetJid.replace(/\D/g, "");
    const sendRes = await callEvolution(`/message/sendText/${instance}`, {
      method: "POST",
      body: JSON.stringify({
        number: cleanNumber || targetJid,
        text,
      }),
    });
    return sendRes.ok;
  } catch (err: any) {
    console.error("[AtendimentoEngine] Error sending via Evolution:", err.message);
    return false;
  }
});

// List leads originating from Radar in CRM Atendimento
app.get("/api/atendimento/leads", (_req, res) => {
  res.json({
    success: true,
    total: atendimentoEngine.atendimentos.length,
    leads: atendimentoEngine.atendimentos,
  });
});

// Get single lead details with internal notes history
app.get("/api/atendimento/lead/:id", (req, res) => {
  const lead = atendimentoEngine.atendimentos.find(
    (a) => a.id === req.params.id || a.contactJid === req.params.id
  );
  if (!lead) return res.status(404).json({ error: "Atendimento não encontrado" });
  res.json({ success: true, lead });
});

// Human takes over lead
app.post("/api/atendimento/assume", (req, res) => {
  const { leadId, userName } = req.body;
  const updated = atendimentoEngine.assumeLead(leadId, userName || "Enzo Santos");
  if (!updated) return res.status(404).json({ error: "Lead não encontrado" });
  res.json({ success: true, lead: updated });
});

// Toggle AI on/off for specific contact
app.post("/api/atendimento/toggle-ai", (req, res) => {
  const { leadId, active, userName } = req.body;
  const updated = atendimentoEngine.toggleAiForContact(leadId, Boolean(active), userName || "Enzo Santos");
  if (!updated) return res.status(404).json({ error: "Lead não encontrado" });
  res.json({ success: true, lead: updated });
});

// Get AI Agent configuration
app.get("/api/atendimento/config", (_req, res) => {
  res.json({
    success: true,
    config: atendimentoEngine.config,
  });
});

// Update AI Agent configuration
app.post("/api/atendimento/config", (req, res) => {
  const updated = atendimentoEngine.updateConfig(req.body);
  res.json({ success: true, config: updated });
});

// Token saver metrics
app.get("/api/radar/token-metrics", (_req, res) => {
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
  imageUrl?: string;
  previewText: string;
  tags: string[];
  createdAt: string;
  lastSentAt?: string;
  lastExecutedSlot?: string;
  lastExecutedMinute?: string;
  executed?: boolean;
  instanceName?: string;
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
let globalCachedGroups: any[] = [];
let lastSyncGroupsTimestamp = 0;

// Disk persistence file paths
const GROUPS_CACHE_FILE = path.join(process.cwd(), "groups_cache.json");
const CAMPAIGNS_FILE = path.join(process.cwd(), "campaigns_data.json");
const HISTORY_FILE = path.join(process.cwd(), "history_data.json");
const IMPORTED_GROUPS_FILE = path.join(process.cwd(), "imported_groups.json");

// Helper to safely load JSON from disk
function loadJsonSafe(filePath: string, fallback: any) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn(`[Persistence] Error reading ${filePath}:`, e);
  }
  return fallback;
}

// Helper to safely save JSON to disk
function saveJsonSafe(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`[Persistence] Error writing ${filePath}:`, e);
  }
}

// Initialize global cache from disk immediately
const initialDiskGroups = loadJsonSafe(GROUPS_CACHE_FILE, []);
if (Array.isArray(initialDiskGroups) && initialDiskGroups.length > 0) {
  globalCachedGroups = initialDiskGroups;
  cachedGroupsByInstance.set("default", { timestamp: Date.now(), groups: initialDiskGroups });
  cachedGroupsByInstance.set("minhabagg-leads", { timestamp: Date.now(), groups: initialDiskGroups });
}

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

// Ultra-fast background sync for WhatsApp groups for a specific instance
async function syncAllWhatsAppGroups(force: boolean = false, targetInstance: string = "minhabagg-leads") {
  const now = Date.now();
  
  // Try to get cached for this specific instance
  const cachedForInstance = cachedGroupsByInstance.get(targetInstance);
  if (!force && cachedForInstance && now - cachedForInstance.timestamp < 15000 && cachedForInstance.groups.length > 0) {
    return cachedForInstance.groups;
  }
  if (targetInstance === "minhabagg-leads") {
    lastSyncGroupsTimestamp = now;
  }

  try {
    const instName = targetInstance;
    const collectedGroupsMap = new Map<string, any>();

    // 1. fetchAllGroups
    try {
      const gRes = await callEvolution(`/group/fetchAllGroups/${instName}?getParticipants=false`, {}, 6000);
      if (gRes.ok && Array.isArray(gRes.data)) {
        gRes.data.forEach((g: any) => {
          const jid = g.id || g.jid;
          if (jid && (jid.endsWith("@g.us") || !jid.includes("@s.whatsapp.net"))) {
            collectedGroupsMap.set(jid, {
              id: jid,
              jid: jid,
              name: g.subject || g.name || "Grupo WhatsApp",
              membersCount: g.size || g.participants?.length || 50,
              category: "Vendas & Negócios",
              status: "ativo",
              totalPosts: 0,
              lastPostTime: "Recente",
              avatar: g.pictureUrl || g.profilePicUrl || "",
              instanceName: instName,
            });
          }
        });
      }
    } catch {}

    // 2. findChats (to capture all active group chats)
    try {
      const cRes = await callEvolution(`/chat/findChats/${instName}`, {
        method: "POST",
        body: JSON.stringify({ limit: 1000 }),
      }, 6000);
      if (cRes.ok && Array.isArray(cRes.data)) {
        const groupChats = cRes.data.filter((c: any) => c.remoteJid && (c.remoteJid.includes("@g.us") || c.isGroup));
        groupChats.forEach((c: any) => {
          const jid = c.remoteJid;
          if (jid) {
            const existing = collectedGroupsMap.get(jid);
            const resolvedName = (existing && existing.name !== "Grupo WhatsApp") ? existing.name : (c.name || c.pushName || c.subject || existing?.name || "Grupo WhatsApp");
            collectedGroupsMap.set(jid, {
              id: jid,
              jid: jid,
              name: resolvedName,
              membersCount: existing?.membersCount || c.participants?.length || c.size || 50,
              category: "Vendas & Negócios",
              status: "ativo",
              totalPosts: existing?.totalPosts || 0,
              lastPostTime: "Recente",
              avatar: existing?.avatar || c.profilePicUrl || c.pictureUrl || "",
              instanceName: instName,
            });
          }
        });
      }
    } catch {}

    if (collectedGroupsMap.size > 0) {
      const freshGroups = Array.from(collectedGroupsMap.values());
      cachedGroupsByInstance.set(instName, { timestamp: now, groups: freshGroups });
      clientImportedGroupsStore.set(instName, freshGroups);
      
      if (instName === "minhabagg-leads") {
        globalCachedGroups = freshGroups;
        saveJsonSafe(GROUPS_CACHE_FILE, freshGroups);
        saveJsonSafe(IMPORTED_GROUPS_FILE, freshGroups);
      }
      
      console.log(`[GroupsSync] ✅ Synced ${freshGroups.length} real WhatsApp groups for instance ${instName}.`);
      return freshGroups;
    }
  } catch (err: any) {
    console.warn(`[GroupsSync] Background sync notice for ${targetInstance}:`, err.message);
  }

  // Fallback to cache for this instance, or empty
  const fallbackCache = cachedGroupsByInstance.get(targetInstance);
  return fallbackCache ? fallbackCache.groups : [];
}

// Background scheduler for group syncing (run only once on start or every hour to keep Evolution DB pool clean)
setInterval(() => {
  syncAllWhatsAppGroups().catch(() => {});
}, 3600000);
setTimeout(() => {
  syncAllWhatsAppGroups(false).catch(() => {});
}, 3000);

// Load persisted campaigns and history
const clientCampaignsStore: ClientCampaign[] = loadJsonSafe(CAMPAIGNS_FILE, []);
const clientHistoryStore: ClientHistoryLog[] = loadJsonSafe(HISTORY_FILE, []);

// Store for client imported groups (per instance)
const clientImportedGroupsStore = new Map<string, any[]>();
const initialImported = loadJsonSafe(IMPORTED_GROUPS_FILE, []);
if (Array.isArray(initialImported) && initialImported.length > 0) {
  clientImportedGroupsStore.set("default", initialImported);
  clientImportedGroupsStore.set("minhabagg-leads", initialImported);
  clientImportedGroupsStore.set("cliente-wendisson", initialImported);
}

// Dedicated Client WhatsApp Status endpoint (Instant response + background check)
app.get("/api/client/whatsapp/status", async (req, res) => {
  const instance = (req.query.instance as string) || "minhabagg-leads";

  // Check state of the requested instance
  try {
    const fetchRes = await callEvolution(`/instance/connectionState/${instance}`, {}, 4000);
    if (fetchRes.ok && fetchRes.data) {
      const state = fetchRes.data.instance?.state || fetchRes.data.state;
      const isConnected = state === "open";
      
      return res.json({
        success: true,
        configured: true,
        isConnected,
        state: isConnected ? "connected" : "disconnected",
        profile: {
          name: fetchRes.data.instance?.profileName || "Groply Cliente",
          number: fetchRes.data.instance?.ownerJid ? formatPhone(fetchRes.data.instance.ownerJid) : undefined,
          pictureUrl: fetchRes.data.instance?.profilePicUrl || "",
          instanceName: instance,
        }
      });
    }
  } catch {}

  // Fallback if not connected or doesn't exist
  res.json({
    success: true,
    configured: true,
    isConnected: false,
    state: "disconnected",
    profile: {
      name: "Groply Cliente",
      number: undefined,
      pictureUrl: "",
      instanceName: instance,
    }
  });
});

// Get imported groups saved for client instance (Instant response)
app.get("/api/client/imported-groups", (req, res) => {
  const instance = (req.query.instance as string) || "minhabagg-leads";
  let groups = clientImportedGroupsStore.get(instance) || [];
  if (instance === "minhabagg-leads" && groups.length === 0 && globalCachedGroups.length > 0) {
    groups = globalCachedGroups;
  }
  res.json({
    success: true,
    instanceName: instance,
    total: groups.length,
    groups,
  });
});

// Save/Update imported groups for client instance
app.post("/api/client/imported-groups", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const instance = own.instance;
  const { groups } = req.body;
  if (!Array.isArray(groups)) {
    return res.status(400).json({ error: "groups deve ser um array." });
  }
  clientImportedGroupsStore.set(instance, groups);
  
  if (instance === "minhabagg-leads") {
    globalCachedGroups = groups;
    saveJsonSafe(IMPORTED_GROUPS_FILE, groups);
    saveJsonSafe(GROUPS_CACHE_FILE, groups);
    cachedGroupsByInstance.set("default", { timestamp: Date.now(), groups });
  }

  cachedGroupsByInstance.set(instance, { timestamp: Date.now(), groups });
  res.json({
    success: true,
    instanceName: instance,
    total: groups.length,
    groups,
  });
});

// Get real groups from connected WhatsApp instance with 0-ms instant response
app.get("/api/client/groups", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const reqInstance = own.instance;
  const forceRefresh = req.query.refresh === "true";

  if (forceRefresh) {
    // Trigger background refresh and return updated or cached list
    syncAllWhatsAppGroups(true, reqInstance).catch(() => {});
  }

  // Check memory / disk cache first (Instant < 1ms)
  let groups = clientImportedGroupsStore.get(reqInstance) || [];
  
  if (reqInstance === "minhabagg-leads" && groups.length === 0) {
    groups = globalCachedGroups;
  }

  if (groups.length > 0 && !forceRefresh) {
    return res.json({
      success: true,
      instanceName: reqInstance,
      total: groups.length,
      groups,
      cached: true,
    });
  }

  // If memory was empty, perform fast sync
  const fresh = await syncAllWhatsAppGroups(true, reqInstance);
  res.json({
    success: true,
    instanceName: reqInstance,
    total: fresh.length,
    groups: fresh,
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

const clientPlanState = {
  planId: 'pro' as 'start' | 'pro' | 'max',
  validUntil: '20/10/2026',
  status: 'active' as 'active' | 'expired' | 'canceled',
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

// Plan endpoints
app.get("/api/client/plan", async (req,res)=>{
 const own:any=await ownedInstance(req,false); if(own.error)return res.status(401).json({error:"UNAUTHORIZED"});
 const sub=await own.db.getSubscriptionForUser(own.user.id); const planId=(sub?.plan_id||"start") as 'start'|'pro'|'max'; const limits=CLIENT_PLAN_LIMITS[planId];
 const campaigns=await own.db.listCampaignsForUser(own.user.id); const history=await own.db.listHistoryForUser(own.user.id,31);
 res.json({success:true,subscription:{planId,status:sub?.status||"pending",validUntil:sub?.next_due_date||null},limits,usage:{uniqueGroupsCount:getUniqueGroupsInAutomations(campaigns).size,activeCampaignsCount:campaigns.filter((c:any)=>c.active&&c.status!=="concluida").length,monthlySendsCount:history.filter((h:any)=>h.status==="delivered").length}});
});
app.post("/api/client/plan", async (req,res)=>res.status(405).json({error:"O plano é alterado somente pelo fluxo de assinatura."}));

app.get("/api/onboarding/payment-status", async (req,res)=>{
 try{
  const user:any=await authenticatedUser(req); if(!user)return res.status(401).json({success:false,error:"Sessão inválida."});
  const db:any=await import("./database.cjs"); const sub=await db.getSubscriptionForUser(user.id); if(!sub?.current_payment_id)return res.json({success:true,status:"pending",access:false});
  const pay:any=await asaasEngine.getPayment(sub.current_payment_id); const st=String(pay?.status||"").toUpperCase(); const paid=["RECEIVED","CONFIRMED","RECEIVED_IN_CASH"].includes(st);
  if(paid){await db.applyPaymentEvent(`poll:${sub.current_payment_id}:${st}`,"PAYMENT_CONFIRMED",{id:sub.current_payment_id});}
  const refreshed=await db.getUserByToken(String(req.headers.authorization||"").replace(/^Bearer\s+/i,"").trim());
  res.json({success:true,status:st||sub.status,access:refreshed?.status==="active"});
 }catch(e:any){res.status(500).json({success:false,error:"Não foi possível confirmar o pagamento."});}
});

app.get("/api/account/status", async (req,res)=>{
  try{
    const user:any=await authenticatedUser(req); if(!user)return res.status(401).json({success:false,error:"Sessão inválida."});
    const db:any=await import("./database.cjs"); const subscription=await db.getSubscriptionForUser(user.id); const instance=await db.getUserInstance(user.id);
    res.json({success:true,user,subscription:subscription?{planId:subscription.plan_id,status:subscription.status,nextDueDate:subscription.next_due_date}:null,whatsapp:instance?{status:instance.status,connected:instance.status==="connected"}:null,access:user.status==="active"});
  }catch(e:any){res.status(500).json({success:false,error:"Não foi possível consultar a conta."});}
});

// Public onboarding: authenticated account chooses a plan and receives the first real recurring Pix charge.
app.post("/api/onboarding/subscribe", async (req,res)=>{
  try{
    const user:any=await authenticatedUser(req); if(!user)return res.status(401).json({success:false,error:"Faça login para continuar."});
    const {planId,cpfCnpj}=req.body||{}; const prices:any={start:39.9,pro:69.9,max:119.9}; const names:any={start:"Start",pro:"Pro",max:"Max"};
    if(!prices[planId]||!cpfCnpj)return res.status(400).json({success:false,error:"Plano e CPF são obrigatórios."});
    const db:any=await import("./database.cjs"); await db.setUserBillingIdentity(user.id,String(cpfCnpj));
    const sub:any=await asaasEngine.createMonthlyPixSubscription({planId,planName:names[planId],value:prices[planId],customer:{name:user.name,email:user.email,cpfCnpj:String(cpfCnpj),phone:user.phone},externalReference:`grolpy:user:${user.id}:plan:${planId}`});
    await db.upsertSubscription(user.id,planId,{status:"pending",customerId:sub.customerId,subscriptionId:sub.subscriptionId,paymentId:sub.paymentId,nextDueDate:sub.nextDueDate});
    res.json({success:true,subscription:{planId,status:"pending",asaasSubscriptionId:sub.subscriptionId},payment:{id:sub.paymentId,status:sub.status,pix:sub.pix}});
  }catch(err:any){console.error("[Onboarding]",err?.message||err);res.status(500).json({success:false,error:err?.message||"Falha ao iniciar assinatura."});}
});

// Asaas Checkout API: Create Payment (Pix, Credit Card, or Boleto)
app.post("/api/client/checkout/create", async (req, res) => {
  try {
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

    const targetPlan = planId === "start" || planId === "max" ? planId : "pro";
    const payment = await asaasEngine.createPayment({
      planId: targetPlan,
      planName: planNames[targetPlan] || "Pro",
      value: planPrices[targetPlan] || 69.9,
      billingType: billingType || "PIX",
      customer: customer || {
        name: "Wendisson Santos",
        email: "wendisson@email.com",
      },
      creditCard,
    });

    if (payment.status === "CONFIRMED") {
      clientPlanState.planId = targetPlan;
      clientPlanState.status = "active";
    }

    res.json({ success: true, payment });
  } catch (err: any) {
    console.error("[Asaas Checkout] Error creating payment:", err);
    res.status(500).json({ success: false, error: err.message || "Erro ao processar pagamento com Asaas." });
  }
});

// Asaas Checkout API: Check payment status
app.get("/api/client/checkout/status/:id", (req, res) => {
  const { id } = req.params;
  const payment = asaasEngine.getPayment(id);
  if (!payment) {
    return res.status(404).json({ success: false, error: "Pagamento não encontrado" });
  }
  res.json({ success: true, payment });
});

// Asaas Checkout API: Simulate instant confirmation (Webhook simulation / Test button)
app.post("/api/client/checkout/simulate-confirm/:id", (req, res) => {
  const { id } = req.params;
  const payment = asaasEngine.confirmPayment(id);
  if (!payment) {
    return res.status(404).json({ success: false, error: "Pagamento não encontrado" });
  }

  // Update subscription in database
  clientPlanState.planId = payment.planId;
  clientPlanState.status = "active";

  res.json({
    success: true,
    payment,
    subscription: clientPlanState,
    limits: CLIENT_PLAN_LIMITS[clientPlanState.planId],
  });
});

// Asaas Webhook: Receives official Asaas webhooks (PAYMENT_RECEIVED, PAYMENT_CONFIRMED)
app.post("/api/webhook/asaas", async (req, res) => {
  try {
    const db:any = await import("./database.cjs");
    const eventKey = String(req.body?.id || req.body?.payment?.id + ":" + req.body?.event);
    await db.applyPaymentEvent(eventKey, req.body?.event, req.body?.payment);
    const { event, payment } = req.body;
    console.log(`[Asaas Webhook] Event received: ${event}`, payment?.id);

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      if (payment?.id) {
        asaasEngine.confirmPayment(payment.id);
      }
      if (payment?.description?.includes("Start")) {
        clientPlanState.planId = "start";
      } else if (payment?.description?.includes("Max")) {
        clientPlanState.planId = "max";
      } else {
        clientPlanState.planId = "pro";
      }
      clientPlanState.status = "active";
    }

    res.json({ success: true, received: true });
  } catch (err: any) {
    console.error("[Asaas Webhook] Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get real campaigns
app.get("/api/client/campaigns", async (req,res)=>{
 const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
 const campaigns=await own.db.listCampaignsForUser(own.user.id); res.json({success:true,campaigns});
});

// Create new campaign with real schedule support
app.post("/api/client/campaigns/create", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
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
    selectedGroupJids,
    groupsCount,
    active,
    instanceName,
  } = req.body;

  const targetInstance = own.instance;
  console.log(`\n[VALIDATION] Validando criação de divulgação '${title}' na instância ${targetInstance}...`);

  if (!title || !previewText) {
    console.log(`[VALIDATION] Falha: Título e texto da mensagem são obrigatórios.`);
    return res.status(400).json({ error: "Título e texto da mensagem são obrigatórios." });
  }

  const incomingJids = Array.isArray(selectedGroupJids) ? selectedGroupJids : [];
  if (incomingJids.length === 0) {
    console.log(`[VALIDATION] Falha: Nenhum grupo selecionado.`);
    return res.status(400).json({ error: "Você precisa selecionar pelo menos um grupo." });
  }

  // Check instance connection
  try {
    const fetchRes = await callEvolution(`/instance/connectionState/${targetInstance}`, {}, 4000);
    const state = fetchRes.data?.instance?.state || fetchRes.data?.state;
    if (state !== "open") {
      console.log(`[VALIDATION] Falha: Instância ${targetInstance} desconectada (estado: ${state}).`);
      return res.status(400).json({ error: "O WhatsApp selecionado está desconectado. Reconecte antes de agendar." });
    }
    console.log(`[VALIDATION] Instância conectada: OK`);
  } catch (err: any) {
    console.log(`[VALIDATION] Falha: Erro ao verificar instância: ${err.message}`);
    return res.status(400).json({ error: "Não foi possível verificar a conexão do seu WhatsApp." });
  }

  const currentLimits = CLIENT_PLAN_LIMITS[clientPlanState.planId] || CLIENT_PLAN_LIMITS.pro;

  // 1. Validate Active Campaigns Limit
  if (active !== false) {
    const activeCount = clientCampaignsStore.filter((c) => c.active && c.status !== 'concluida').length;
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
  const reservedGroups = getUniqueGroupsInAutomations(clientCampaignsStore);
  const candidateUnique = new Set([...reservedGroups, ...incomingJids]);
  if (candidateUnique.size > currentLimits.maxGroups) {
    console.log(`[VALIDATION] Falha: Limite de grupos mensais excedido.`);
    return res.status(403).json({
      error: `Limite de grupos únicos atingido (${currentLimits.maxGroups} grupos permitidos no plano ${clientPlanState.planId.toUpperCase()}).`,
      code: 'LIMIT_GROUPS',
      limit: currentLimits.maxGroups,
      used: candidateUnique.size,
    });
  }
  
  // 3. Validate Monthly Limit
  const currentMonth = new Date().getMonth();
  const sentThisMonth = clientHistoryStore.filter(h => h.status === 'delivered' && new Date(h.timestamp).getMonth() === currentMonth).length;
  if (sentThisMonth + incomingJids.length > currentLimits.maxMonthlySends) {
    console.log(`[VALIDATION] Falha: Limite mensal de envios excedido.`);
    return res.status(403).json({
      error: `Esta divulgação excederia seu limite mensal de ${currentLimits.maxMonthlySends} envios.`,
      code: 'LIMIT_MONTHLY',
    });
  }

  console.log(`[VALIDATION] Limites validados: OK. Agendamento permitido.`);

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
    selectedGroupJids: Array.isArray(selectedGroupJids) ? selectedGroupJids : [],
    totalSent: 0,
    totalFailed: 0,
    imageUrl: imageUrl || undefined,
    previewText: previewText.trim(),
    tags: [category ? category.split("&")[0].trim() : "Divulgação", scheduleMode === 'agendar' ? 'Agendada' : (scheduleMode === 'recorrente' ? 'Recorrente' : 'Imediata')],
    createdAt: new Date().toISOString(),
    executed: false,
    instanceName: targetInstance,
  };

  clientCampaignsStore.unshift(newCampaign);
  await own.db.saveCampaignForUser(own.user.id,newCampaign);
  saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
  res.json({ success: true, campaign: newCampaign });
});

// Toggle campaign active state
app.post("/api/client/campaigns/toggle", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const clientCampaignsStore:any[]=await own.db.listCampaignsForUser(own.user.id);
  const sub=await own.db.getSubscriptionForUser(own.user.id); const userPlanId=(sub?.plan_id||"start") as any;
  const { id } = req.body;
  const camp = clientCampaignsStore.find((c) => c.id === id);
  if (!camp) {
    return res.status(404).json({ error: "Campanha não encontrada" });
  }

  const currentLimits = CLIENT_PLAN_LIMITS[userPlanId];

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

  await own.db.saveCampaignForUser(own.user.id,camp);
  res.json({ success: true, campaign: camp });
});

// Delete campaign
app.delete("/api/client/campaigns/:id", async (req,res)=>{\n const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});\n const ok=await own.db.deleteCampaignForUser(own.user.id,String(req.params.id)); if(!ok)return res.status(404).json({error:"Campanha não encontrada"});\n res.json({success:true});\n});\n\n// Helper to look up real group name
function lookupGroupName(jid: string, instance: string): string {
  const list = clientImportedGroupsStore.get(instance) || clientImportedGroupsStore.get("default") || [];
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
  onProgress?: (processedCount: number, successfulCount: number, failedCount: number, targetTotal: number) => void
) {
  const instance = await getActiveConnectedInstance(preferredInstance || "minhabagg-leads");
  console.log(`\n[Dispatch] 🚀 Dispatching '${campaignTitle}' to ${targets.length} groups via '${instance}' (hasImage: ${Boolean(imgToSend)}, intervalMs: ${intervalMs})`);

  const dispatchResults: Array<{ jid: string; success: boolean; error?: string }> = [];
  let successfulCount = 0;
  let failedCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const rawJid = targets[i];
    const jid = rawJid.includes("@") ? rawJid : `${rawJid}@g.us`;
    const groupName = lookupGroupName(jid, instance);
    const startRequestTime = Date.now();

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
      if (imgToSend && (imgToSend.startsWith("http") || imgToSend.startsWith("data:") || imgToSend.length > 50)) {
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
              else mime = "image/jpeg";
              fileName = `imagem.${mime.split("/")[1] || "jpg"}`;
            }
          } else if (cleanMedia.startsWith("http://") || cleanMedia.startsWith("https://")) {
            cleanMedia = cleanMedia.trim();
            if (cleanMedia.includes(".png")) mime = "image/png";
            else if (cleanMedia.includes(".webp")) mime = "image/webp";
            else if (cleanMedia.includes(".gif")) mime = "image/gif";
            fileName = `imagem.${mime.split("/")[1] || "jpg"}`;
          } else {
            cleanMedia = cleanMedia.replace(/[\r\n\s]/g, "");
          }

          const mediaPayload = {
            number: jid,
            mediatype: "image",
            mimetype: mime,
            media: cleanMedia,
            caption: textToSend || "",
            fileName,
            delay: 1200, // Evolution V1
            options: { // Evolution V2
              delay: 1200
            },
            mediaMessage: { // Evolution V2 fallback structure
              mediatype: "image",
              caption: textToSend || "",
              media: cleanMedia,
              fileName
            }
          };

          const mediaRes = await callEvolution(endpointUsed, {
            method: "POST",
            body: JSON.stringify(mediaPayload),
          }, 20000, 0);

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
        // Reduced to 1 attempt to prevent retries obfuscating the real 400 error
        for (let attempt = 1; attempt <= 1 && !isOk; attempt++) {
          attemptCount++;
          console.log(`attempt: ${attemptCount} (sendText)`);
          endpointUsed = `/message/sendText/${instance}`;
          
          try {
            const sendTextPayload = {
              number: jid,
              text: textToSend,
              delay: 1200, // Evolution V1
              linkPreview: false, // Evolution V1
              options: {
                delay: 1200, // Evolution V2
                linkPreview: false // Evolution V2 (Crucial to prevent 500 error / 53s timeout on mediaMessage)
              },
              textMessage: { // Evolution V2 fallback
                text: textToSend
              }
            };

            console.log(`\n[SEND DIAGNOSTIC]`);
            console.log(`Target Instance: ${instance}`);
            console.log(`Target JID (number): ${jid}`);
            console.log(`Endpoint: ${endpointUsed}`);
            console.log(`Payload (no secrets): ${JSON.stringify(sendTextPayload, null, 2)}`);

            const sendRes = await callEvolution(endpointUsed, {
              method: "POST",
              body: JSON.stringify(sendTextPayload),
            }, 40000);

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
      clientHistoryStore.unshift({
        id: groId,
        campaignId,
        campaignTitle,
        groupJid: jid,
        groupName,
        groupMembersCount: undefined,
        messageText: textToSend,
        imageUrl: imgToSend || undefined,
        mediaType: imgToSend ? "imagem" : "texto",
        status: isOk ? "delivered" : "failed",
        error: errorDetails,
        timestamp: new Date().toISOString(),
        timeFormatted: `${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`,
        duration: `${durationSeconds} segundos`,
      });
      saveJsonSafe(HISTORY_FILE, clientHistoryStore);
    } catch (err: any) {
      console.log(`[FAILED] Erro catastrofico ao enviar para ${jid}: ${err.message}`);
      failedCount++;
      dispatchResults.push({ jid, success: false, error: err.message });
      if (onProgress) onProgress(i + 1, successfulCount, failedCount, targets.length);
    }
  }

  return dispatchResults;
}

// Real Dispatch of Campaign to WhatsApp Groups via Evolution API
app.post("/api/client/campaigns/send-now", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const { campaignId, customGroupJids, customMessage, imageUrl, instanceName, intervalSeconds } = req.body;
  const instanceParam = own.instance;
  const clientCampaignsStore:any[]=await own.db.listCampaignsForUser(own.user.id);
  const clientHistoryStore:any[]=await own.db.listHistoryForUser(own.user.id,31);
  const sub=await own.db.getSubscriptionForUser(own.user.id); const userPlanId=(sub?.plan_id||"start") as any;
  const instance = await getActiveConnectedInstance(instanceParam);

  let camp = clientCampaignsStore.find((c) => c.id === campaignId);
  const textToSend = customMessage || camp?.previewText;
  const imgToSend = imageUrl || camp?.imageUrl;

  if (!textToSend) {
    return res.status(400).json({ error: "Texto da mensagem não fornecido." });
  }

  let targets: string[] = customGroupJids || camp?.selectedGroupJids || [];
  
  if (targets.length === 0) {
    const imported = clientImportedGroupsStore.get(instance) || [];
    targets = imported.map((g: any) => g.jid || g.id).filter(Boolean);
  }

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
      error: "Nenhum grupo de destino selecionado para o disparo. Conecte seu WhatsApp e selecione ao menos um grupo.",
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
    saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
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
            saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
          }
        }
      );

      const successfulCount = dispatchResults.filter((r) => r.success).length;

      if (camp) {
        camp.totalSent = successfulCount;
        camp.status = successfulCount === targets.length ? "concluida" : (successfulCount > 0 ? "parcial" : "falha");
        camp.active = false;
        camp.lastSentAt = `Hoje às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`;
        saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
      }
    } catch (err) {
      console.error("[Dispatch] Error during execution:", err);
      if (camp) {
        camp.status = "falha";
        saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
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
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const brDayName = dayNames[now.getDay()];
  return { brTimeStr, brDateStr, brDayName, now };
}

// Automatic Background Scheduling Engine (Checks every 3 seconds for scheduled campaigns)
setInterval(async () => {
  const { brTimeStr, brDateStr, brDayName } = getBrazilTimeData();

  for (const camp of clientCampaignsStore) {
    if (!camp.active && camp.status !== 'enviando') continue;
    if (camp.status === 'concluida' || camp.status === 'falha') continue;
    if (activeCampaignsRunning.has(camp.id)) continue;

    let shouldTrigger = false;
    const slotKey = `${brDateStr}_${brTimeStr}`;

    // Auto-Resume any interrupted campaign
    if (camp.status === 'enviando' && !activeCampaignsRunning.has(camp.id)) {
      shouldTrigger = true;
      console.log(`[Scheduler] 🔄 Resumindo campanha interrompida '${camp.title}' (progresso: ${camp.totalSent || 0}/${camp.totalTarget || camp.selectedGroupJids?.length || 0})`);
    }

    // Mode 1: Agendar (Disparo Único com Data e Hora)
    else if (camp.scheduleMode === 'agendar') {
      const campDate = camp.scheduleDate || brDateStr;
      const campTime = camp.scheduleTime || "00:00";
      
      // If scheduled date has arrived and time is reached
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
        const times = Array.isArray(camp.scheduleTimes) && camp.scheduleTimes.length > 0
          ? camp.scheduleTimes
          : [camp.scheduleTime || "00:00"];

        if (times.includes(brTimeStr) && camp.lastExecutedSlot !== slotKey) {
          shouldTrigger = true;
          camp.lastExecutedSlot = slotKey;
        }
      }
    }

    if (shouldTrigger) {
      console.log(`[Scheduler] 🚀 Triggering campaign '${camp.title}' (${camp.scheduleMode}) at ${brTimeStr} (BRT)`);
      camp.status = 'enviando';
      camp.executed = true; // Mark as executed immediately so it NEVER re-triggers for one-time agendamento

      const instance = await getActiveConnectedInstance(camp.instanceName || "minhabagg-leads");
      let allTargets = camp.selectedGroupJids || [];
      if (allTargets.length === 0) {
        const imported = clientImportedGroupsStore.get(instance) || [];
        allTargets = imported.map((g: any) => g.jid || g.id).filter(Boolean);
      }

      if (allTargets.length === 0) {
        console.warn(`[Scheduler] ⚠️ No targets found for campaign '${camp.title}'`);
        camp.status = 'falha';
        camp.active = false;
        continue;
      }

      camp.totalTarget = allTargets.length;
      camp.groupsCount = allTargets.length;
      // Filter out already successful targets from this campaign based on history
      const successfulJids = clientHistoryStore
        .filter(h => h.campaignId === camp.id && h.status === 'delivered')
        .map(h => h.groupJid);
      
      const remainingTargets = allTargets.filter(jid => !successfulJids.includes(jid));
      const totalAlreadySent = successfulJids.length;

      if (remainingTargets.length === 0) {
        console.warn(`[Scheduler] ⚠️ Todos os alvos já foram enviados para a campanha '${camp.title}'`);
        camp.status = 'concluida';
        camp.active = false;
        continue;
      }

      // Interval between groups (in milliseconds)
      const intervalMs = (camp.delaySeconds !== undefined && camp.delaySeconds !== null && Number(camp.delaySeconds) >= 0)
        ? Number(camp.delaySeconds) * 1000
        : (camp.intervalMinutes ? Number(camp.intervalMinutes) * 60 * 1000 : 30000);

      console.log(`[Scheduler] 🚀 Iniciando disparo da campanha '${camp.title}' para ${remainingTargets.length} grupos restantes (de ${allTargets.length}) com intervalo de ${intervalMs / 1000}s`);

      activeCampaignsRunning.add(camp.id);

      // Execute dispatch in background
      (async () => {
        try {
          const results = await executeGroupDispatch(
            remainingTargets,
            camp.previewText,
            camp.imageUrl,
            instance,
            camp.title,
            camp.id,
            intervalMs,
            (processedCount, successfulCount, failedCount) => {
              camp.totalSent = totalAlreadySent + successfulCount;
              camp.totalFailed = (camp.totalFailed || 0) + failedCount; // Keep previous failures if retrying
              camp.status = 'enviando';
              saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
            }
          );

          const successCount = results.filter((r) => r.success).length;
          const failedCount = results.filter((r) => !r.success).length;
          const totalSuccess = totalAlreadySent + successCount;
          camp.totalSent = totalSuccess;
          camp.totalFailed = (camp.totalFailed || 0) + failedCount;
          camp.lastSentAt = `Hoje às ${getBrazilTimeData().brTimeStr}`;
          
          if (camp.scheduleMode === 'recorrente') {
            camp.status = 'ativa'; // Stays active for next recurring schedule
            camp.active = true;
          } else {
            if (totalSuccess >= allTargets.length) {
              camp.status = 'concluida';
            } else if (totalSuccess > 0) {
              camp.status = 'parcial';
            } else {
              camp.status = 'falha';
            }
            camp.active = false; // Finished one-time scheduled run!
          }
          saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
        } catch (err: any) {
          console.error(`[Scheduler] Error running campaign '${camp.title}':`, err);
          camp.status = 'falha';
          camp.active = false;
          saveJsonSafe(CAMPAIGNS_FILE, clientCampaignsStore);
        } finally {
          activeCampaignsRunning.delete(camp.id);
        }
      })();
    }
  }
}, 3000);

// Get real history
app.get("/api/client/history", async (req,res)=>{
 const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
 const sub=await own.db.getSubscriptionForUser(own.user.id); const planId=(sub?.plan_id||"start") as 'start'|'pro'|'max'; const days=CLIENT_PLAN_LIMITS[planId].historyDays;
 const history=await own.db.listHistoryForUser(own.user.id,days); res.json({success:true,total:history.length,history});
});

// Client Dashboard Unified Stats - 100% REAL DATA, 0 MOCK
app.get("/api/client/stats", async (req, res) => {
  const own:any=await ownedInstance(req); if(own.error)return res.status(own.error==="UNAUTHORIZED"?401:402).json({error:own.error});
  const instance = own.instance;
  const clientCampaignsStore:any[]=await own.db.listCampaignsForUser(own.user.id);
  const clientHistoryStore:any[]=await own.db.listHistoryForUser(own.user.id,31);
  const sub=await own.db.getSubscriptionForUser(own.user.id);
  const userPlanId=(sub?.plan_id||"start") as 'start'|'pro'|'max';

  const importedGroups = clientImportedGroupsStore.get(instance) || [];
  const totalSentFromCampaigns = clientCampaignsStore.reduce((acc, c) => acc + (c.totalSent || 0), 0);
  const deliveredHistory = clientHistoryStore.filter((h) => h.status === "delivered").length;
  const totalMessagesSent = Math.max(totalSentFromCampaigns, deliveredHistory);

  const todayIso = new Date().toISOString().split('T')[0];
  const sentToday = clientHistoryStore.filter((h) => h.timestamp && h.timestamp.startsWith(todayIso) && h.status === "delivered").length;

  const failedHistory = clientHistoryStore.filter((h) => h.status === "failed").length;
  const activeCampaignsCount = clientCampaignsStore.filter((c) => c.active && c.status !== 'concluida').length;
  const scheduledCount = clientCampaignsStore.filter((c) => c.status === 'agendada' || (c.active && c.scheduleMode === 'agendar')).length;
  const pendingCount = clientCampaignsStore
    .filter((c) => c.status === 'agendada' || c.status === 'ativa' || c.status === 'enviando')
    .reduce((acc, c) => acc + Math.max(0, (c.groupsCount || 1) - (c.totalSent || 0)), 0);

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
      activeGroups: importedGroups.length,
      successRate,
      activeCampaigns: activeCampaignsCount,
      scheduledToday: scheduledCount,
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nexus Evolution Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
