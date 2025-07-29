const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();
const port = 10000;

// MySQL DB setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Change this if needed
  database: 'logistics'
});

db.connect((err) => {
  if (err) throw err;
  console.log('✅ Connected to MySQL database');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'secret123',
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  res.locals.role = req.session.role;
  next();
});

app.use('/', require('./routes/auth'));
app.use('/shipments', require('./routes/shipments'));

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
