// db.js
const mysql = require('mysql2');

// --- Connection pool for Railway Proxy ---
const pool = mysql.createPool({
  host: process.env.DB_HOST,                // e.g. yamanote.proxy.rlwy.net
  port: Number(process.env.DB_PORT || 3306),// must be 3306 for proxy
  user: process.env.DB_USER,                // e.g. root
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,            // e.g. railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, minVersion: 'TLSv1.2' }
    : undefined,
});

// --- Drop-in compatible query helper ---
function query(sql, params, cb) {
  if (typeof params === 'function') { cb = params; params = []; }
  pool.query(sql, params, (err, results, fields) => cb && cb(err, results, fields));
}

module.exports = { query };
