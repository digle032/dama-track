// db.js
const mysql = require('mysql2/promise');

const TRANSIENT_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENETUNREACH',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

if (!global.__POOL__) {
  global.__POOL__ = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false,

    // Give sleepy/slow providers more time to accept the first TCP handshake.
    connectTimeout: 20_000,     // 20s TCP connect timeout
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,

    // Some hosts (e.g., PlanetScale) require SSL. Flip this env if needed.
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });
}
const pool = global.__POOL__;

// Generic retry wrapper with exponential backoff (0.5s, 1s, 2s)
async function withRetry(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!TRANSIENT_CODES.has(err.code)) throw err;
      const wait = 500 * Math.pow(2, i);
      console.warn(`[DB] ${err.code} — retrying in ${wait}ms (${i + 1}/${attempts})`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

// Use retry for every query (covers connect-time and mid-query hiccups)
async function query(sql, params = []) {
  return withRetry(() => pool.query(sql, params));
}

// Keep DB awake and surface issues
setInterval(async () => {
  try {
    const conn = await withRetry(() => pool.getConnection());
    await conn.ping();
    conn.release();
  } catch (e) {
    console.error('[DB] Heartbeat failed:', e.code || e.message);
  }
}, 60_000);

// Warm-up once on boot so the *first* real request isn’t hit by cold start
(async () => {
  try {
    await query('SELECT 1');
    console.log('[DB] Warm-up successful');
  } catch (e) {
    console.error('[DB] Warm-up failed:', e.code || e.message);
  }
})();

module.exports = { pool, query };
