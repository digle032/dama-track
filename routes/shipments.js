const express = require('express');
const router = express.Router();
const db = require('../db');

// List shipments
router.get('/', (req, res) => {
  const search = req.query.search;
  let query = 'SELECT * FROM shipments ORDER BY date DESC';
  const params = [];
  if (search) {
    query = `SELECT * FROM shipments WHERE tracking LIKE ? OR client LIKE ? ORDER BY date DESC`;
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

// Show add shipment form
router.get('/new', (req, res) => {
  res.render('form', {
    shipment: null,
    action: '/shipments/new',
    error: null
  });
});

// Handle new shipment
router.post('/new', async (req, res, next) => {
  try {
    console.log('🧾 form data received:', req.body);
    const { date, location, tracking, client, transport, courier, status } = req.body;
    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: { date, location, tracking, client, transport, courier, status },
        action: '/shipments/new',
        error: 'Date, location, tracking, and client are required.'
      });
    }

    await new Promise((resolve, reject) => {
      const insert = `INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.query(insert, [date, location, tracking, client, transport || '', courier || '', status || ''], err =>
        err ? reject(err) : resolve()
      );
    });

    res.redirect('/shipments');
  } catch (err) {
    console.error('❌ Uncaught error in POST /new:', err);
    next(err);
  }
});

// Show edit form
router.get('/edit/:id', (req, res, next) => {
  const id = req.params.id;
  db.query('SELECT * FROM shipments WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      const e = err || new Error('Shipment not found');
      return next(e);
    }
    res.render('form', {
      shipment: results[0],
      action: `/shipments/edit/${id}`,
      error: null
    });
  });
});

// Handle update
router.post('/edit/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { date, location, tracking, client, transport, courier, status } = req.body;
    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: { id, date, location, tracking, client, transport, courier, status },
        action: `/shipments/edit/${id}`,
        error: 'Date, location, tracking, and client are required.'
      });
    }

    await new Promise((resolve, reject) => {
      const update = `UPDATE shipments
        SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
        WHERE id = ?`;
      db.query(update, [date, location, tracking, client, transport || '', courier || '', status || '', id],
        err => err ? reject(err) : resolve()
      );
    });

    res.redirect('/shipments');
  } catch (err) {
    console.error('❌ Uncaught error in POST /edit:', err);
    next(err);
  }
});

// Handle delete
router.post('/delete/:id', (req, res, next) => {
  const id = req.params.id;
  db.query('DELETE FROM shipments WHERE id = ?', [id], err => {
    if (err) {
      console.error('❌ Error deleting shipment:', err);
      return next(err);
    }
    res.redirect('/shipments');
  });
});

module.exports = router;
