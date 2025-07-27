const express = require('express');
const router = express.Router();
const db = require('../db');

// Show all shipments
router.get('/', (req, res) => {
  const query = 'SELECT * FROM shipments ORDER BY date DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('❌ Error fetching shipments:', err);
      return res.status(500).send('Database error');
    }
    res.render('dashboard', { shipments: results });
  });
});

// Show form to add shipment
router.get('/add', (req, res) => {
  res.render('form', { error: null });
});

// Add shipment (status optional, all others required)
router.post('/add', (req, res) => {
  const tracking = req.body.tracking;
  const date = req.body.date?.trim() === '' ? null : req.body.date;
  const location = req.body.location;
  const client = req.body.client;
  const transport = req.body.transport;
  const courier = req.body.courier;
  const status = req.body.status?.trim() === '' ? null : req.body.status;

  // Validate all required fields except status
  if (!tracking || !date || !location || !client || !transport || !courier) {
    return res.status(400).render('form', { error: 'All fields except status are required.' });
  }

  const query = `
    INSERT INTO shipments (date, location, tracking, client, transport, courier, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [date, location, tracking, client, transport, courier, status],
    (err) => {
      if (err) {
        console.error('❌ DB insert error:', err);
        return res.status(500).render('form', { error: 'Database error.' });
      }
      res.redirect('/shipments');
    }
  );
});

// Edit shipment form
router.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  const query = 'SELECT * FROM shipments WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('Shipment not found.');
    }
    res.render('edit', { shipment: results[0] });
  });
});

// Update shipment
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;
  const tracking = req.body.tracking;
  const date = req.body.date?.trim() === '' ? null : req.body.date;
  const location = req.body.location;
  const client = req.body.client;
  const transport = req.body.transport;
  const courier = req.body.courier;
  const status = req.body.status?.trim() === '' ? null : req.body.status;

  if (!tracking || !date || !location || !client || !transport || !courier) {
    return res.status(400).send('All fields except status are required.');
  }

  const query = `
    UPDATE shipments SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [date, location, tracking, client, transport, courier, status, id],
    (err) => {
      if (err) {
        console.error('❌ Error updating shipment:', err);
        return res.status(500).send('Database error');
      }
      res.redirect('/shipments');
    }
  );
});

// Delete shipment
router.get('/delete/:id', (req, res) => {
  const id = req.params.id;
  const query = 'DELETE FROM shipments WHERE id = ?';

  db.query(query, [id], (err) => {
    if (err) {
      console.error('❌ Error deleting shipment:', err);
      return res.status(500).send('Database error');
    }
    res.redirect('/shipments');
  });
});

module.exports = router;
