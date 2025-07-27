const express = require('express');
const router = express.Router();
const db = require('../db');

// Show all shipments
router.get('/', (req, res) => {
  const query = 'SELECT * FROM shipments ORDER BY date DESC';
  db.query(query, (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.render('dashboard', { shipments: results });
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
    if (err) return res.status(500).render('form', { error: 'Database error.' });
    res.redirect('/shipments');
  });
});

// Edit form
router.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM shipments WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).send('Not found');
    res.render('edit', { shipment: results[0] });
  });
});

// Update shipment
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;
  const { date, location, tracking, client, transport, courier, status } = req.body;

  if (!date || !location || !tracking || !client || !transport || !courier || !status) {
    return res.status(400).send('All fields are required.');
  }

  const query = `
    UPDATE shipments SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
    WHERE id = ?
  `;
  db.query(query, [date, location, tracking, client, transport, courier, status, id], (err) => {
    if (err) return res.status(500).send('Database error');
    res.redirect('/shipments');
  });
});

// Delete shipment
router.get('/delete/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM shipments WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).send('Database error');
    res.redirect('/shipments');
  });
});

module.exports = router;
