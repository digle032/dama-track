// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'logisticsSecretKey',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Mount routers
app.use('/', authRoutes);
app.use('/shipments', shipmentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Global error handler:', err.stack);
  res.status(500).send('Internal Server Error — something went wrong.');
});

// Start server on all interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
