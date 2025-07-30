const express = require('express');
const router = express.Router();
const db = require('../db');

// List all shipments
router.get('/', (req, res) => {
  const search = req.query.search || '';
  const params = [];
  let sql = 'SELECT * FROM shipments';
  if (search) {
    sql += ' WHERE tracking LIKE ? OR client LIKE ?';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY date DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('❌ Error fetching shipments:', err);
      return res.status(500).send('Database error');
    }
    res.render('dashboard', { shipments: results, search });
  });
});

// Show Add Shipment form
router.get('/new', (req, res) => {
  res.render('form', {
    shipment: null,
    action: '/shipments/new',
    error: null
  });
});

// Handle submission of new shipment
router.post('/new', async (req, res) => {
  try {
    const { date, location, tracking, client, transport = '', courier = '', status = '', description = '' } = req.body;

    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: 'Date, location, tracking, and client are required.'
      });
    }

    const insert = `
      INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await new Promise((resolve, reject) => {
      db.query(insert, [date, location, tracking, client, transport, courier, status, description], err =>
        err ? reject(err) : resolve()
      );
    });

    res.redirect('/shipments');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: `Tracking number "${req.body.tracking}" already exists.`
      });
    }
    console.error('❌ Uncaught error in POST /new:', err);
    return res.status(500).render('form', {
      shipment: req.body,
      action: '/shipments/new',
      error: 'An unexpected error occurred.'
    });
  }
});

// Show shipment edit form
router.get('/edit/:id', (req, res) => {
  const id = req.params.id;
  db.query('SELECT * FROM shipments WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      console.error('❌ Shipment not found or DB error:', err);
      return res.status(404).send('Shipment not found.');
    }
    const shipment = results[0];
    if (shipment.date && !(shipment.date instanceof Date)) {
      shipment.date = new Date(shipment.date);
    }
    res.render('form', {
      shipment,
      action: `/shipments/edit/${id}`,
      error: null
    });
  });
});

// Handle update submission
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;
  const { date, location, tracking, client, transport = '', courier = '', status = '', description = '' } = req.body;

  if (!date || !location || !tracking || !client) {
    return res.status(400).render('form', {
      shipment: req.body,
      action: `/shipments/edit/${id}`,
      error: 'Date, location, tracking, and client are required.'
    });
  }

  const update = `
    UPDATE shipments
    SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?, description = ?
    WHERE id = ?
  `;

  db.query(update, [date, location, tracking, client, transport, courier, status, description, id], err => {
    if (err) {
      console.error('❌ Error updating shipment:', err);
      return res.status(500).render('form', {
        shipment: req.body,
        action: `/shipments/edit/${id}`,
        error: 'Database error.'
      });
    }
    res.redirect('/shipments');
  });
});

// Handle delete shipment
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
