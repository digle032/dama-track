// server.js

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

// ✅ Modern body parsing (replaces body-parser)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session config
app.use(session({
    secret: 'logisticsSecretKey',
    resave: false,
    saveUninitialized: true
}));

// Static files and view engine
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Load routes
try {
    const authRoutes = require('./routes/auth');
    const shipmentRoutes = require('./routes/shipments');

    app.use('/', authRoutes);
    app.use('/shipments', shipmentRoutes);
    console.log('✅ Routes loaded successfully');
} catch (err) {
    console.error('❌ Error loading routes:', err.message);
}

// Start server
console.log('💡 Ready to start server...');
try {
    app.listen(PORT, () => {
        console.log(`✅ Server running on http://localhost:${PORT}`);
    });
} catch (err) {
    console.error('❌ Error starting server:', err.message);
}
