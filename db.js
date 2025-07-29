// db.js
const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'yamanote.proxy.rlwy.net',     // ✅ Replace with your actual DB host
  user: 'root',            // ✅ Replace with your DB user
  password: 'MxtkHiCAOyiwbBMRmnogZuiPsSUBAmnW',        // ✅ Replace with your DB password
  database: 'railway'             // ✅ Replace with your DB name
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
  console.log('✅ Connected to the MySQL database');
});

module.exports = connection;
