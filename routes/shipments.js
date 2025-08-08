// routes/shipments.js
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

// Export all shipments to CSV (Excel-friendly)
router.get('/export', (req, res) => {
  const sql = 'SELECT * FROM shipments ORDER BY date DESC';
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ Error exporting shipments:', err);
      return res.status(500).send('Database error');
    }

    // Helper to safely format CSV values
    const toCsvValue = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    // Format date as YYYY-MM-DD HH:MM (Excel-friendly)
    const fmtDate = (d) => {
      try {
        const dt = d instanceof Date ? d : new Date(d);
        if (isNaN(dt)) return '';
        const pad = (n) => String(n).padStart(2, '0');
        const Y = dt.getFullYear();
        const M = pad(dt.getMonth() + 1);
        const D = pad(dt.getDate());
        const h = pad(dt.getHours());
        const m = pad(dt.getMinutes());
        return `${Y}-${M}-${D} ${h}:${m}`;
      } catch {
        return '';
      }
    };

    const headers = ['Date', 'Tracking', 'Client', 'Description', 'Transport', 'Courier', 'Status'];
    const lines = [headers.map(toCsvValue).join(',')];

    for (const r of rows) {
      lines.push([
        fmtDate(r.date),
        toCsvValue(r.tracking),
        toCsvValue(r.client),
        toCsvValue(r.location),   // stored as "location", shown as "Description"
        toCsvValue(r.transport),
        toCsvValue(r.courier),
        toCsvValue(r.status)
      ].join(','));
    }

    const csv = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="shipments_backup_${stamp}.csv"`);
    res.send(csv);
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
    const { date, location, tracking, client, transport = '', courier = '', status = '' } = req.body;

    if (!date || !location || !tracking || !client) {
      return res.status(400).render('form', {
        shipment: req.body,
        action: '/shipments/new',
        error: 'Date, location, tracking, and client are required.'
      });
    }

    const insert = `
      INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await new Promise((resolve, reject) => {
      db.query(insert, [date, location, tracking, client, transport, courier, status], err =>
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
  const { date, location, tracking, client, transport = '', courier = '', status = '' } = req.body;

  if (!date || !location || !tracking || !client) {
    return res.status(400).render('form', {
      shipment: req.body,
      action: `/shipments/edit/${id}`,
      error: 'Date, location, tracking, and client are required.'
    });
  }

  const update = `
    UPDATE shipments
    SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
    WHERE id = ?
  `;

  db.query(update, [date, location, tracking, client, transport, courier, status, id], err => {
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
