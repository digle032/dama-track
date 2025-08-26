// db.js
const mysql = require('mysql2');

// --- Build a pooled MySQL client for Railway (TLS + custom port) ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,                     // e.g. yamanote.proxy.rlwy.net
  port: Number(process.env.DB_PORT || 3306),     // your env has 29964
  user: process.env.DB_USER,                     // e.g. root
  password: process.env.DB_PASSWORD,             // your Railway password
  database: process.env.DB_NAME,                 // e.g. railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: false,
  connectTimeout: 20_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  // Railway’s proxy requires TLS; no custom CA needed
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, minVersion: 'TLSv1.2' }
    : undefined,
});

// --- Drop-in compatible helper: db.query(sql, params, cb) ---
function query(sql, params, cb) {
  if (typeof params === 'function') { cb = params; params = []; }
  pool.query(sql, params, (err, results, fields) => cb && cb(err, results, fields));
}

module.exports = { query };
