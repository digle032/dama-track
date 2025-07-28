const express = require('express');
const router = express.Router();
const db = require('../db');

// Add Shipment: POST /new
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

    const insert = `
      INSERT INTO shipments
        (date, location, tracking, client, transport, courier, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await new Promise((resolve, reject) => {
      db.query(insert, [date, location, tracking, client, transport || '', courier || '', status || ''], err =>
        err ? reject(err) : resolve()
      );
    });

    res.redirect('/shipments');
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // Handle duplicate tracking number
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
