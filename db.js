// db.js
const mysql = require('mysql2');

/**
 * Use a pool instead of a single connection so Render/free DBs and
 * transient network hiccups don't kill the handle you reuse.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || process.env.DB_PASS, // support either var name
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
  connectTimeout: 20_000,         // give slow/sleepy hosts time to accept
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  // If your host requires TLS, set DB_SSL=true in the environment.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

const TRANSIENT = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Drop-in replacement for connection.query(sql, params, cb)
 * Retries transient errors up to 3 times with small backoff.
 */
function query(sql, params, cb, attempt = 1) {
  if (typeof params === 'function') { cb = params; params = []; }
  pool.query(sql, params, async (err, results, fields) => {
    if (err && TRANSIENT.has(err.code) && attempt < 3) {
      const wait = 300 * Math.pow(2, attempt - 1); // 300ms, 600ms
      console.warn(`[DB] ${err.code} on query — retrying in ${wait}ms (attempt ${attempt + 1}/3)`);
      await sleep(wait);
      return query(sql, params, cb, attempt + 1);
    }
    cb && cb(err, results, fields);
  });
}

// Warm up the pool once on boot so the first real request isn't slow
pool.getConnection((err, conn) => {
  if (err) {
    console.error('❌ DB warm-up failed:', err.code || err.message);
  } else {
    conn.ping(pingErr => {
      if (pingErr) console.error('❌ DB ping failed:', pingErr.code || pingErr.message);
      conn.release();
    });
  }
});

// Heartbeat every minute to keep sleepy DBs awake
setInterval(() => {
  pool.query('SELECT 1', [], (e) => {
    if (e) console.error('[DB] Heartbeat failed:', e.code || e.message);
  });
}, 60_000);

module.exports = { query, pool };
