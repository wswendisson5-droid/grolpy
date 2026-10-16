import { createPool } from 'mysql2/promise';

// Only ownership lookup and the cross-worker lease use this small pool. Existing
// campaign/state persistence stays in the established database implementation.
const pool = createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 2,
  connectTimeout: 8000,
  enableKeepAlive: true,
  charset: 'utf8mb4',
});

export async function findGroupAutomationUser(campaignKey: string) {
  const [rows]: any = await pool.execute(
    'SELECT u.id,u.role,u.status FROM users u JOIN user_campaigns c ON c.user_id=u.id WHERE c.campaign_key=? LIMIT 2', [campaignKey]);
  // An imported campaign key must have exactly one owner before it can be used.
  return rows.length === 1 ? rows[0] : null;
}

export async function acquireGroupAutomationLock(userId: number): Promise<(() => Promise<void>) | null> {
  const connection = await pool.getConnection();
  const key = `groply-group-automation-${userId}`;
  try {
    const [rows]: any = await connection.query('SELECT GET_LOCK(?, 0) acquired', [key]);
    if (Number(rows[0]?.acquired) !== 1) { connection.release(); return null; }
    return async () => { try { await connection.query('SELECT RELEASE_LOCK(?)', [key]); } finally { connection.release(); } };
  } catch (error) { connection.release(); throw error; }
}
