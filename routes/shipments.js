const express = require('express');
const router = express.Router();
const db = require('../db');

// View all shipments
router.get('/', (req, res) => {
  const query = 'SELECT * FROM shipments ORDER BY date DESC';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('dashboard', {
      shipments: results,
      userRole: req.session.user?.role || 'user'
    });
  });
});

// Show add form
router.get('/add', (req, res) => {
  res.render('form', { error: null });
});

// Add shipment
router.post('/add', (req, res) => {
  const { date, location, tracking, client, transport, courier, status } = req.body;

  if (!date || !location || !tracking || !client || !transport || !courier || !status) {
    return res.status(400).render('form', { error: 'All fields are required.' });
  }

  const query = `
    INSERT INTO shipments (date, location, tracking, client, transport, courier, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(query, [date, location, tracking, client, transport, courier, status], (err) => {
    if (err) {
      console.error('❌ DB insert error:', err);
      return res.status(500).render('form', { error: 'Tracking number must be unique.' });
    }
    res.redirect('/shipments');
  });
});

// Edit shipment (admin only)
router.get('/edit/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const query = 'SELECT * FROM shipments WHERE id = ?';
  db.query(query, [req.params.id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('Shipment not found.');
    }
    res.render('edit', { shipment: results[0] });
  });
});

// Update shipment (admin only)
router.post('/edit/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  const { date, location, tracking, client, transport, courier, status } = req.body;
  const query = `
    UPDATE shipments
    SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
    WHERE id = ?
  `;
  db.query(query, [date, location, tracking, client, transport, courier, status, req.params.id], (err) => {
    if (err) return res.status(500).send('Database error');
    res.redirect('/shipments');
  });
});

// Delete shipment (admin only)
router.get('/delete/:id', (req, res) => {
  if (req.session.user?.role !== 'admin') {
    return res.status(403).send('Access denied');
  }

  db.query('DELETE FROM shipments WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send('Database error');
    res.redirect('/shipments');
  });
});

module.exports = router;
