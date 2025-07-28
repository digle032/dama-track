const express = require('express');
const router = express.Router();
const db = require('../db');

// -- List shipments with optional search --
router.get('/', (req, res) => {
  const search = req.query.search;
  let query = 'SELECT * FROM shipments ORDER BY date DESC';
  const params = [];

  if (search) {
    query = `SELECT * FROM shipments
             WHERE tracking LIKE ? OR client LIKE ?
             ORDER BY date DESC`;
    params.push(`%${search}%`, `%${search}%`);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('❌ Error fetching shipments:', err);
      return res.status(500).send('Database error');
    }
    res.render('dashboard', { shipments: results, search });
  });
});

// -- Show shipment "Add" form --
router.get('/new', (req, res) => {
  res.render('form', {
    shipment: null,
    action: '/shipments/new',
    error: null
  });
});

// -- Handle new shipment submission --
router.post('/new', (req, res) => {
  console.log('🧾 form data received:', req.body);
  const { date, location, tracking, client, transport, courier, status } = req.body;

  if (!date || !location || !tracking || !client) {
    return res.status(400).render('form', {
      shipment: { date, location, tracking, client, transport, courier, status },
      action: '/shipments/new',
      error: 'Date, location, tracking, and client are required.'
    });
  }

  const query = `
    INSERT INTO shipments
      (date, location, tracking, client, transport, courier, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    query,
    [
      date,
      location,
      tracking,
      client,
      transport || '',
      courier || '',
      status || ''
    ],
    err => {
      if (err) {
        console.error('❌ DB insert error:', err);
        return res.status(500).render('form', {
          shipment: { date, location, tracking, client, transport, courier, status },
          action: '/shipments/new',
          error: 'Database error.'
        });
      }
      res.redirect('/shipments');
    }
  );
});

// -- Show shipment "Edit" form --
router.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM shipments WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('Shipment not found.');
    }
    res.render('form', {
      shipment: results[0],
      action: `/shipments/edit/${id}`,
      error: null
    });
  });
});

// -- Handle shipment updates --
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;
  const { date, location, tracking, client, transport, courier, status } = req.body;

  if (!date || !location || !tracking || !client) {
    return res.status(400).render('form', {
      shipment: { id, date, location, tracking, client, transport, courier, status },
      action: `/shipments/edit/${id}`,
      error: 'Date, location, tracking, and client are required.'
    });
  }

  const query = `
    UPDATE shipments
    SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
    WHERE id = ?
  `;
  db.query(
    query,
    [
      date,
      location,
      tracking,
      client,
      transport || '',
      courier || '',
      status || '',
      id
    ],
    err => {
      if (err) {
        console.error('❌ DB update error:', err);
        return res.status(500).render('form', {
          shipment: { id, date, location, tracking, client, transport, courier, status },
          action: `/shipments/edit/${id}`,
          error: 'Database error.'
        });
      }
      res.redirect('/shipments');
    }
  );
});

// -- Handle deletion --
router.post('/delete/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM shipments WHERE id = ?', [id], err => {
    if (err) {
      console.error('❌ Error deleting shipment:', err);
      return res.status(500).send('Database error');
    }
    res.redirect('/shipments');
  });
});

module.exports = router;
