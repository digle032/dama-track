const express = require('express');
const router = express.Router();
const db = require('../db');

// 🔐 Auth middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// 📦 Dashboard (list + search)
router.get('/', isAuthenticated, (req, res) => {
    const search = req.query.search || '';
    const query = search
        ? `SELECT * FROM shipments WHERE tracking LIKE ? OR client LIKE ? ORDER BY date DESC`
        : `SELECT * FROM shipments ORDER BY date DESC`;

    const params = search ? [`%${search}%`, `%${search}%`] : [];

    db.query(query, params, (err, results) => {
        if (err) return res.send('Database error');
        res.render('dashboard', { shipments: results, user: req.session.user, search });
    });
});

// ➕ Add shipment (form)
router.get('/new', isAuthenticated, (req, res) => {
    res.render('form', { shipment: null, action: '/shipments/new' });
});

// ➕ Handle new shipment POST
router.post('/new', isAuthenticated, (req, res) => {
    const { date, location, tracking, client, transport, courier, status } = req.body;

    const query = `INSERT INTO shipments (date, location, tracking, client, transport, courier, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [date, location, tracking, client, transport, courier, status], (err) => {
        if (err) {
            console.error(err);
            return res.send('Database error');
        }
        res.redirect('/shipments');
    });
});

// ✏️ Edit shipment (form)
router.get('/edit/:id', isAuthenticated, (req, res) => {
    const query = `SELECT * FROM shipments WHERE id = ?`;
    db.query(query, [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.send('Record not found');
        res.render('form', { shipment: results[0], action: `/shipments/edit/${req.params.id}` });
    });
});

// ✏️ Handle edit POST
router.post('/edit/:id', isAuthenticated, (req, res) => {
    const { date, location, tracking, client, transport, courier, status } = req.body;
    const query = `UPDATE shipments SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ? WHERE id = ?`;

    db.query(query, [date, location, tracking, client, transport, courier, status, req.params.id], (err) => {
        if (err) return res.send('Database update error');
        res.redirect('/shipments');
    });
});

// 🗑️ Delete shipment
router.post('/delete/:id', isAuthenticated, (req, res) => {
    const query = `DELETE FROM shipments WHERE id = ?`;
    db.query(query, [req.params.id], (err) => {
        if (err) return res.send('Error deleting record');
        res.redirect('/shipments');
    });
});

// ✅ Export router
module.exports = router;

