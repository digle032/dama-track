// routes/shipments.js
const express = require('express');
const router = express.Router();
const db = require('../db');

const DELETE_PASSWORD = process.env.DELETE_PASSWORD || 'dama2025';

// Protect routes (basic example; adjust to your roles if needed)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.redirect('/login');
  next();
}

// List shipments
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, tracking, client, courier, status, description, created_at FROM shipments ORDER BY created_at DESC LIMIT 500'
    );
    res.render('shipments/index', { shipments: rows, error: null, success: null });
  } catch (err) {
    console.error('❌ [SHIPMENTS][LIST]', err.code || err.message, err);
    res.status(500).render('shipments/index', { shipments: [], error: 'Database error loading shipments.', success: null });
  }
});

// Add shipment (form)
router.get('/new', requireAuth, (_req, res) => {
  res.render('shipments/new', { error: null });
});

// Create shipment (submit)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { tracking, client, courier, status, description } = req.body || {};
    if (!tracking || !client) {
      return res.status(400).render('shipments/new', { error: 'Tracking and Client are required.' });
    }

    await db.query(
      'INSERT INTO shipments (tracking, client, courier, status, description, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [tracking, client, courier || 'Unknown', status || 'Unknown', description || null]
    );

    res.redirect('/shipments');
  } catch (err) {
    console.error('❌ [SHIPMENTS][CREATE]', err.code || err.message, err);
    res.status(500).render('shipments/new', { error: 'Database error creating shipment.' });
  }
});

// Edit shipment (form)
router.get('/:id/edit', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM shipments WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).send('Shipment not found.');
    res.render('shipments/edit', { shipment: rows[0], error: null });
  } catch (err) {
    console.error('❌ [SHIPMENTS][EDIT GET]', err.code || err.message, err);
    res.status(500).send('Database error.');
  }
});

// Update shipment (submit) — note: no password required to EDIT per your recent requirement
router.post('/:id', requireAuth, async (req, res) => {
  try {
    const { tracking, client, courier, status, description } = req.body || {};
    await db.query(
      'UPDATE shipments SET tracking = ?, client = ?, courier = ?, status = ?, description = ? WHERE id = ?',
      [tracking, client, courier, status, description, req.params.id]
    );
    res.redirect('/shipments');
  } catch (err) {
    console.error('❌ [SHIPMENTS][UPDATE]', err.code || err.message, err);
    res.status(500).send('Database error updating shipment.');
  }
});

// Delete shipment (requires password)
router.post('/:id/delete', requireAuth, async (req, res) => {
  try {
    const { deletePassword } = req.body || {};
    if (deletePassword !== DELETE_PASSWORD) {
      // Re-render list with an error (or redirect with a flash message system if you have one)
      const [rows] = await db.query(
        'SELECT id, tracking, client, courier, status, description, created_at FROM shipments ORDER BY created_at DESC LIMIT 500'
      );
      return res.status(403).render('shipments/index', {
        shipments: rows,
        error: 'Incorrect delete password.',
        success: null
      });
    }

    await db.query('DELETE FROM shipments WHERE id = ?', [req.params.id]);
    const [rows] = await db.query(
      'SELECT id, tracking, client, courier, status, description, created_at FROM shipments ORDER BY created_at DESC LIMIT 500'
    );
    res.render('shipments/index', { shipments: rows, error: null, success: 'Shipment deleted.' });
  } catch (err) {
    console.error('❌ [SHIPMENTS][DELETE]', err.code || err.message, err);
    res.status(500).send('Database error deleting shipment.');
  }
});

module.exports = router;
