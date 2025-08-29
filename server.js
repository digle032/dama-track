// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');              // uses .query(...)

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'logisticsSecretKey',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Root → login (so DO URL "/" doesn’t 404)
app.get('/', (_req, res) => res.redirect('/login'));

// Health check (Render will use this; also handy for you)
app.get('/health', (_req, res) => {
  db.query('SELECT 1', (err) => {
    if (err) return res.status(500).send('db');
    res.send('ok');
  });
});

// Routes
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');
app.use('/', authRoutes);
app.use('/shipments', shipmentRoutes);

// 404
app.use((req, res) => res.status(404).send('Page not found.'));

// Start (Render injects PORT)
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// --- Optional watchdog: if DB is unreachable for a while, let Render restart us
let unhealthy = 0;
setInterval(() => {
  db.query('SELECT 1', (err) => {
    if (err) {
      unhealthy++;
      console.error('DB unhealthy tick', unhealthy, err.code || err.message);
      if (unhealthy >= 3) { // ~3 minutes
        console.error('Exiting to let Render restart the service');
        process.exit(1);
      }
    } else {
      unhealthy = 0;
    }
  });
}, 60_000);
