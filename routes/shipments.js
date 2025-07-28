// routes/shipments.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// List all shipments
router.get('/', (req, res, next) => {
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

// Show form for new shipment
router.get('/new', (req, res) => {
  res.render('form', {
    shipment: null,
    action: '/shipments/new',
    error: null
  });
});

// Handle adding a new shipment
router.post('/new', async (req, res, next) => {
  try {
    console.log('🧾 form data received:', req.body);
    const { date, location, tracking, client, transport = '', courier = '', status = '' } = req.body;

    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: { date, location, tracking, client, transport, courier, status },
        action: '/shipments/new',
        error: 'Date, location, tracking, and client are required.'
      });
    }

    const insertSQL = `
      INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await new Promise((resolve, reject) => {
      db.query(insertSQL, [date, location, tracking, client, transport, courier, status], err =>
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

// Export for use in server.js
module.exports = router;
