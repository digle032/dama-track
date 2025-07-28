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
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');

app.use('/', authRoutes);
app.use('/shipments', shipmentRoutes);

// 404 catch-all
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

// KEY FIX: Bind to all interfaces so the Render proxy can reach it
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
