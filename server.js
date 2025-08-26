// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db'); // uses the pooled db with db.query(...)

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'logisticsSecretKey',
  resave: false,
  saveUninitialized: true
}));

// Static + views
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');

app.use('/', authRoutes);
app.use('/shipments', shipmentRoutes);

// --- Health: DB connectivity (helps diagnose "Database error")
app.get('/health/db', (req, res) => {
  db.query('SELECT 1 AS ok', [], (err, rows) => {
    if (err) {
      return res
        .status(500)
        .json({ db: 'down', code: err.code || null, msg: err.message });
    }
    return res.json({
      db: rows && rows[0] && rows[0].ok === 1 ? 'up' : 'unknown'
    });
  });
});

// 404
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
