// db.js
const mysql = require('mysql2/promise');

// Optional safeguard in dev so Nodemon doesn't create multiple pools
if (!global.__POOL__) {
  global.__POOL__ = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });
}

const pool = global.__POOL__;

// Retry once if it’s a transient connection error
async function query(sql, params = []) {
  try {
    return await pool.query(sql, params);
  } catch (err) {
    const transient = new Set([
      'PROTOCOL_CONNECTION_LOST',
      'ECONNRESET',
      'ETIMEDOUT',
      'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
      'PROTOCOL_ENQUEUE_AFTER_QUIT',
    ]);
    if (transient.has(err.code)) {
      console.warn('[DB] Transient error, retrying once:', err.code);
      return await pool.query(sql, params);
    }
    throw err;
  }
}

// Keep DB awake on free/idle hosts
setInterval(async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
  } catch (e) {
    console.error('[DB] Heartbeat failed:', e.code || e.message);
  }
}, 60_000);

module.exports = { pool, query };
