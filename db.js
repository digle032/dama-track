// db.js
// Keeps the same API you already use: db.query(...)

const fs = require('fs');
const mysql = require('mysql2');

const {
  DB_HOST,
  DB_PORT = 25060,       // DigitalOcean Managed MySQL default
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL_CA,             // paste full CA text here (or use DB_SSL_CA_PATH)
  DB_SSL_CA_PATH
} = process.env;

function resolveCA() {
  if (DB_SSL_CA && DB_SSL_CA.trim()) {
    // support "\n" escaped certs or normal multi-line pastes
    return DB_SSL_CA.includes('\\n') ? DB_SSL_CA.replace(/\\n/g, '\n') : DB_SSL_CA;
  }
  if (DB_SSL_CA_PATH && fs.existsSync(DB_SSL_CA_PATH)) {
    return fs.readFileSync(DB_SSL_CA_PATH, 'utf8');
  }
  return null;
}

function buildPool() {
  const ca = resolveCA();
  return mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 8,      // small & steady avoids hitting plan limits
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000
  });
}

let _pool = buildPool();

// sanity check at boot
_pool.getConnection((err, conn) => {
  if (err) console.error('❌ Database init error:', err.code || err.message);
  else { console.log('✅ Database pool connected'); conn.release(); }
});

// expose the same shape you already use
function query(sql, params, cb) {
  if (typeof params === 'function') { cb = params; params = []; }
  return _pool.query(sql, params, cb);
}
function execute(sql, params, cb) {
  if (typeof params === 'function') { cb = params; params = []; }
  return _pool.execute(sql, params, cb);
}
function getConnection(cb) { return _pool.getConnection(cb); }

// keepalive + auto-rebuild if DO kills connections / DNS changes
setInterval(() => {
  _pool.query('SELECT 1', (err) => {
    if (!err) return;
    console.error('⚠️ DB keepalive failed; rebuilding pool:', err.code || err.message);
    try { _pool.end?.(); } catch {}
    _pool = buildPool();
  });
}, 60_000);

module.exports = { query, execute, getConnection };
