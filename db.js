// db.js
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'yamanote.proxy.rlwy.net',
  user: 'root',           // 👈 Replace this with your actual MySQL username
  password: 'MxtkHiCAOyiwbBMRmnogZuiPsSUBAmnW', // 👈 Replace this with your actual MySQL password
  database: 'railway'   // 👈 Replace this if your database name is different
});

module.exports = pool;
