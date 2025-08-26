const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

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

// Routes
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');

app.use('/', authRoutes);
app.use('/shipments', shipmentRoutes);

// 404
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

