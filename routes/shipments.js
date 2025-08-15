// routes/shipments.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Helpers to normalize inputs (scanner-safe) and fix DATETIME format
function toMySQLDateTime(input) {
  // Accepts "YYYY-MM-DDTHH:MM" from <input type="datetime-local"> and returns "YYYY-MM-DD HH:MM:SS"
  if (!input) return null;
  const s = String(input).trim();
  const withSpace = s.replace('T', ' ');
  // If missing seconds, add ":00"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(withSpace)) return withSpace + ':00';
  return withSpace;
}
function cleanText(s) {
  return (s ?? '').toString().replace(/\s+/g, ' ').trim();
}
function cleanTracking(s) {
  // Many scanners inject whitespace or CR/LF — strip all whitespace inside the code
  return (s ?? '').toString().replace(/\s+/g, '').trim();
}

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
    console.log('🧾 form data received:', req.body);

    const dateRaw = req.body.date;
    const date = toMySQLDateTime(dateRaw);

    const location = cleanText(req.body.location);
    const tracking = cleanTracking(req.body.tracking);
    const client = cleanText(req.body.client);
    const transport = cleanText(req.body.transport || '');
    const courier = cleanText(req.body.courier || '');
    const status = cleanText(req.body.status || '');

    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
        action: '/shipments/new',
        error: 'Date, description, tracking, and client are required.'
      });
    }

    const insert = `
      INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await new Promise((resolve, reject) => {
      db.query(insert, [date, location, tracking, client, transport, courier, status], (err) =>
        err ? reject(err) : resolve()
      );
    });

    return res.redirect('/shipments');
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: `Tracking number "${cleanTracking(req.body.tracking)}" already exists.`
      });
    }
    if (err && err.errno === 1292) { // Incorrect datetime value
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: 'Invalid Date/Time format. Please reselect the date/time.'
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
    res.render('form', {
      shipment: results[0],
      action: `/shipments/edit/${id}`,
      error: null
    });
  });
});

// Handle update submission
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;

  const dateRaw = req.body.date;
  const date = toMySQLDateTime(dateRaw);

  const location = cleanText(req.body.location);
  const tracking = cleanTracking(req.body.tracking);
  const client = cleanText(req.body.client);
  const transport = cleanText(req.body.transport || '');
  const courier = cleanText(req.body.courier || '');
  const status = cleanText(req.body.status || '');

  if (!date || !location || !tracking || !client) {
    return res.status(400).render('form', {
      shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
      action: `/shipments/edit/${id}`,
      error: 'Date, description, tracking, and client are required.'
    });
  }

  const update = `
    UPDATE shipments
    SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
    WHERE id = ?
  `;

  db.query(update, [date, location, tracking, client, transport, courier, status, id], err => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).render('form', {
          shipment: req.body,
          action: `/shipments/edit/${id}`,
          error: `Tracking number "${tracking}" already exists.`
        });
      }
      if (err.errno === 1292) {
        return res.status(400).render('form', {
          shipment: req.body,
          action: `/shipments/edit/${id}`,
          error: 'Invalid Date/Time format. Please reselect the date/time.'
        });
      }
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
