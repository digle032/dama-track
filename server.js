const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

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

// Routes
app.use('/', require('./routes/auth'));
app.use('/shipments', require('./routes/shipments'));

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Global error handler:', err.stack);
  res.status(500).send('Internal Server Error — something went wrong.');
});

// Key fix: listen on all interfaces for Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
