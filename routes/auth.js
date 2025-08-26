// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// GET login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST login (uses pooled db.query with retries)
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.render('login', { error: 'Please enter username and password' });
  }

  const sql = 'SELECT id, username, password FROM users WHERE username = ? LIMIT 1';
  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error('❌ Database error (login select):', err.code || err.message, err);
      return res.render('login', { error: 'Database error' });
    }

    if (!results || results.length === 0) {
      return res.render('login', { error: 'User not found' });
    }

    const user = results[0];
    try {
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.render('login', { error: 'Incorrect password' });

      // Minimal session info
      req.session.user = { id: user.id, username: user.username };
      return res.redirect('/shipments');
    } catch (e) {
      console.error('❌ Bcrypt compare error:', e);
      return res.render('login', { error: 'Something went wrong' });
    }
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
