// db.js
const mysql = require('mysql2');

const TRANSIENT = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_ENQUEUE_AFTER_QUIT',
]);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildSSL() {
  // 3 modes:
  // 1) DB_SSL_INSECURE=true  -> rejectUnauthorized:false (TEMPORARY TEST ONLY)
  // 2) DB_SSL=true & DB_CA set -> use CA + strict TLS
  // 3) DB_SSL=true (no DB_CA)  -> strict TLS, no custom CA
  if (process.env.DB_SSL_INSECURE === 'true') {
    return { rejectUnauthorized: false, minVersion: 'TLSv1.2' };
  }
  if (process.env.DB_SSL === 'true') {
    const ssl = { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
    if (process.env.DB_CA) {
      ssl.ca = process.env.DB_CA; // paste full PEM string in the env var
    }
    return ssl;
  }
  return undefined;
}

function makePool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false,

    connectTimeout: 20_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    ssl: buildSSL(),
  });
}

if (!global.__DB_POOL__) global.__DB_POOL__ = makePool();
let pool = global.__DB_POOL__;

console.log(`[DB] host=${process.env.DB_HOST} port=${process.env.DB_PORT || 3306} name=${process.env.DB_NAME} ssl=${process.env.DB_SSL === 'true'} insecure=${process.env.DB_SSL_INSECURE === 'true'} ca=${!!process.env.DB_CA}`);

function query(sql, params, cb, attempt = 1) {
  if (typeof params === 'function') { cb = params; params = []; }
  pool.query(sql, params, async (err, results, fields) => {
    if (!err) return cb && cb(null, results, fields);

    if (err.code === 'PROTOCOL_CONNECTION_LOST' && attempt === 1) {
      console.warn('[DB] PROTOCOL_CONNECTION_LOST — recreating pool and retrying');
      try { pool.end?.(() => {}); } catch {}
      pool = global.__DB_POOL__ = makePool();
      return query(sql, params, cb, attempt + 1);
    }

    if (TRANSIENT.has(err.code) && attempt < 3) {
      const wait = 300 * Math.pow(2, attempt - 1);
      console.warn(`[DB] ${err.code} — retrying in ${wait}ms (attempt ${attempt + 1}/3)`);
      await sleep(wait);
      return query(sql, params, cb, attempt + 1);
    }

    return cb && cb(err, results, fields);
  });
}

// Warm-up & heartbeat
pool.getConnection((err, conn) => {
  if (err) console.error('❌ DB warm-up failed:', err.code || err.message);
  else conn.ping(e => { if (e) console.error('❌ DB ping failed:', e.code || e.message); conn.release(); });
});
setInterval(() => {
  pool.query('SELECT 1', [], (e) => {
    if (e) console.error('[DB] Heartbeat failed:', e.code || e.message);
  });
}, 60_000);

module.exports = { query };
