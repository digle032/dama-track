const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to check if logged in
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

router.get('/dashboard', isLoggedIn, (req, res) => {
  db.query('SELECT * FROM shipments', (err, results) => {
    if (err) throw err;
    res.render('dashboard', { shipments: results, role: req.session.role });
  });
});

router.get('/new', isLoggedIn, (req, res) => {
  res.render('form', { shipment: null });
});

router.post('/new', isLoggedIn, (req, res) => {
  const { date, location, tracking, client, transport, courier, status } = req.body;
  db.query('INSERT INTO shipments (date, location, tracking, client, transport, courier, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [date, location, tracking, client, transport, courier, status],
    (err) => {
      if (err) {
        console.error('❌ DB insert error:', err);
        return res.render('form', { error: 'Failed to add shipment.', shipment: null });
      }
      res.redirect('/shipments/dashboard');
    });
});

router.get('/edit/:id', isLoggedIn, (req, res) => {
  if (req.session.role !== 'admin') return res.status(403).send('Unauthorized');
  const id = req.params.id;
  db.query('SELECT * FROM shipments WHERE id = ?', [id], (err, results) => {
    if (err) throw err;
    if (results.length === 0) return res.send('Shipment not found');
    res.render('form', { shipment: results[0] });
  });
});

router.post('/edit/:id', isLoggedIn, (req, res) => {
  if (req.session.role !== 'admin') return res.status(403).send('Unauthorized');
  const id = req.params.id;
  const { date, location, tracking, client, transport, courier, status } = req.body;
  db.query('UPDATE shipments SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ? WHERE id = ?',
    [date, location, tracking, client, transport, courier, status, id],
    (err) => {
      if (err) throw err;
      res.redirect('/shipments/dashboard');
    });
});

router.get('/delete/:id', isLoggedIn, (req, res) => {
  if (req.session.role !== 'admin') return res.status(403).send('Unauthorized');
  const id = req.params.id;
  db.query('DELETE FROM shipments WHERE id = ?', [id], (err) => {
    if (err) throw err;
    res.redirect('/shipments/dashboard');
  });
});

module.exports = router;
