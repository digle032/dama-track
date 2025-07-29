const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check login
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

// Shipments Dashboard
router.get('/', isAuthenticated, (req, res) => {
  db.query('SELECT * FROM shipments ORDER BY id DESC', (err, results) => {
    if (err) return res.send('Database error');
    res.render('dashboard', {
      shipments: results,
      username: req.session.user.username,
      role: req.session.user.role
    });
  });
});

// New Shipment Form
router.get('/new', isAuthenticated, (req, res) => {
  res.render('form', { shipment: null });
});

// Add Shipment
router.post('/new', isAuthenticated, (req, res) => {
  const { date, location, tracking, client, transport, courier, status } = req.body;

  const query = `
    INSERT INTO shipments (date, location, tracking, client, transport, courier, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(query, [date, location, tracking, client, transport, courier, status], (err) => {
    if (err) {
      console.error('❌ DB insert error:', err);
      return res.status(500).send('Database insert failed');
    }
    res.redirect('/shipments');
  });
});

// Edit Form
router.get('/edit/:id', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).send('Unauthorized');

  db.query('SELECT * FROM shipments WHERE id = ?', [req.params.id], (err, results) => {
    if (err || results.length === 0) return res.send('Error loading shipment');
    res.render('form', { shipment: results[0] });
  });
});

// Update Shipment
router.post('/edit/:id', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).send('Unauthorized');

  const { date, location, tracking, client, transport, courier, status } = req.body;

  const query = `
    UPDATE shipments
    SET date=?, location=?, tracking=?, client=?, transport=?, courier=?, status=?
    WHERE id=?
  `;

  db.query(query, [date, location, tracking, client, transport, courier, status, req.params.id], (err) => {
    if (err) return res.send('Error updating');
    res.redirect('/shipments');
  });
});

// Delete Shipment
router.get('/delete/:id', isAuthenticated, (req, res) => {
  if (req.session.user.role !== 'admin') return res.status(403).send('Unauthorized');

  db.query('DELETE FROM shipments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.send('Delete failed');
    res.redirect('/shipments');
  });
});

module.exports = router;
