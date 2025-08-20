// routes/shipments.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const ExcelJS = require('exceljs'); // for true .xlsx export

// ---------- Helpers (scanner-safe + MySQL DATETIME) ----------
function toMySQLDateTime(input) {
  if (!input) return null; // expect "YYYY-MM-DDTHH:MM"
  const s = String(input).trim();
  const withSpace = s.replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(withSpace)) return withSpace + ':00';
  return withSpace; // if already has seconds
}
function cleanText(s) {
  return (s ?? '').toString().replace(/\s+/g, ' ').trim();
}
function cleanTracking(s) {
  // Also prevents “empty after delete” and scanner CR/LF
  return (s ?? '').toString().replace(/\s+/g, '').trim();
}
// -------------------------------------------------------------

// List all shipments (search)
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

// Create shipment (strong validation + duplicate pre-check)
router.post('/new', (req, res) => {
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

  // Duplicate check (NEW)
  const dupSql = 'SELECT id FROM shipments WHERE tracking = ? LIMIT 1';
  db.query(dupSql, [tracking], (dupErr, dupRows) => {
    if (dupErr) {
      console.error('❌ Error checking duplicate on insert:', dupErr);
      return res.status(500).render('form', {
        shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
        action: '/shipments/new',
        error: 'Database error while checking duplicates.'
      });
    }

    if (dupRows.length > 0) {
      return res.status(400).render('form', {
        shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
        action: '/shipments/new',
        error: `Tracking number "${tracking}" already exists.`
      });
    }

    const insert = `
      INSERT INTO shipments (date, location, tracking, client, transport, courier, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(insert, [date, location, tracking, client, transport, courier, status], (err) => {
      if (err) {
        console.error('❌ Uncaught error in POST /new:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).render('form', {
            shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
            action: '/shipments/new',
            error: `Tracking number "${tracking}" already exists.`
          });
        }
        if (err.errno === 1292) {
          return res.status(400).render('form', {
            shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
            action: '/shipments/new',
            error: 'Invalid Date/Time format. Please reselect the date/time.'
          });
        }
        return res.status(500).render('form', {
          shipment: { date: dateRaw, location, tracking, client, transport, courier, status },
          action: '/shipments/new',
          error: 'An unexpected error occurred.'
        });
      }
      return res.redirect('/shipments');
    });
  });
});

// Edit form
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

// Update shipment (duplicate pre-check on EDIT)
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
      shipment: { id, date: dateRaw, location, tracking, client, transport, courier, status },
      action: `/shipments/edit/${id}`,
      error: 'Date, description, tracking, and client are required.'
    });
  }

  // Duplicate check (EDIT)
  const dupSql = 'SELECT id FROM shipments WHERE tracking = ? AND id <> ? LIMIT 1';
  db.query(dupSql, [tracking, id], (dupErr, dupRows) => {
    if (dupErr) {
      console.error('❌ Error checking duplicate tracking (edit):', dupErr);
      return res.status(500).render('form', {
        shipment: { id, date: dateRaw, location, tracking, client, transport, courier, status },
        action: `/shipments/edit/${id}`,
        error: 'Database error while checking duplicates.'
      });
    }

    if (dupRows.length > 0) {
      return res.status(400).render('form', {
        shipment: { id, date: dateRaw, location, tracking, client, transport, courier, status },
        action: `/shipments/edit/${id}`,
        error: `Tracking number "${tracking}" is already used by another shipment.`
      });
    }

    const update = `
      UPDATE shipments
      SET date = ?, location = ?, tracking = ?, client = ?, transport = ?, courier = ?, status = ?
      WHERE id = ?
    `;
    db.query(update, [date, location, tracking, client, transport, courier, status, id], (err) => {
      if (err) {
        console.error('❌ Error updating shipment:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).render('form', {
            shipment: { id, date: dateRaw, location, tracking, client, transport, courier, status },
            action: `/shipments/edit/${id}`,
            error: `Tracking number "${tracking}" already exists.`
          });
        }
        if (err.errno === 1292) {
          return res.status(400).render('form', {
            shipment: { id, date: dateRaw, location, tracking, client, transport, courier, status },
            action: `/shipments/edit/${id}`,
            error: 'Invalid Date/Time format. Please reselect the date/time.'
          });
        }
        return res.status(500).render('form', {
          shipment: { id, date: dateRaw, location, tracking, client, transport, courier, status },
          action: `/shipments/edit/${id}`,
          error: 'An unexpected error occurred while saving.'
        });
      }
      return res.redirect('/shipments');
    });
  });
});

// Delete shipment (server-side password via modal form field)
router.post('/delete/:id', (req, res) => {
  const id = req.params.id;
  const provided = (req.body.delete_password || '').trim();
  const expected = process.env.DELETE_PASSWORD || 'dama2025';

  if (provided !== expected) {
    console.warn('⚠️ Incorrect delete password attempt for id:', id);
    return res.redirect('/shipments');
  }

  db.query('DELETE FROM shipments WHERE id = ?', [id], err => {
    if (err) {
      console.error('❌ Error deleting shipment:', err);
      return res.status(500).send('Database error');
    }
    res.redirect('/shipments');
  });
});

// Excel Backup
router.get('/backup', (req, res) => {
  const sql = `
    SELECT id, date, tracking, client, location, transport, courier, status
    FROM shipments
    ORDER BY date DESC
  `;
  db.query(sql, [], async (err, rows) => {
    if (err) {
      console.error('❌ Error exporting shipments:', err);
      return res.status(500).send('Database error during export');
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Shipments');

      sheet.columns = [
        { header: 'ID',         key: 'id',       width: 8  },
        { header: 'Date',       key: 'date',     width: 20 },
        { header: 'Tracking',   key: 'tracking', width: 24 },
        { header: 'Client',     key: 'client',   width: 24 },
        { header: 'Description',key: 'location', width: 40 },
        { header: 'Transport',  key: 'transport',width: 16 },
        { header: 'Courier',    key: 'courier',  width: 18 },
        { header: 'Status',     key: 'status',   width: 16 }
      ];

      rows.forEach(r => {
        const dateVal = (r.date instanceof Date) ? r.date : new Date(r.date);
        sheet.addRow({
          id: r.id,
          date: dateVal,
          tracking: r.tracking,
          client: r.client,
          location: r.location,
          transport: r.transport,
          courier: r.courier,
          status: r.status
        });
      });

      sheet.getColumn('date').numFmt = 'yyyy-mm-dd hh:mm';

      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const filename = `shipments_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (e) {
      console.error('❌ Error generating Excel:', e);
      return res.status(500).send('Failed to generate Excel file');
    }
  });
});

module.exports = router;
