// db.js

const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',          // use your MySQL username
    password: 'di10111212',  // replace with your MySQL password
    database: 'logistics'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('✅ Connected to MySQL database');
});

module.exports = connection;
