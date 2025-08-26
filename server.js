// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db'); // ensures pool gets created

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'logisticsSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  }
}));

// Static + views
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');
app.use('/', authRoutes);
app.use('/shipments', shipmentRoutes);

// Dashboard (example protected route)
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.render('dashboard', { user: { id: req.session.userId, username: req.session.username } });
});

// Health check routes
app.get('/health/db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({ db: rows[0].ok === 1 ? 'up' : 'unknown' });
  } catch (e) {
    res.status(500).json({ db: 'down', code: e.code, msg: e.message });
  }
});
app.get('/health', (_req, res) => res.json({ ok: true }));

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[APP ERROR]', err);
  res.status(500).send('Unexpected server error');
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
