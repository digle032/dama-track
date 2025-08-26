// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// GET: login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST: login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  try {
    if (!username || !password) {
      return res.render('login', { error: 'Please enter username and password.' });
    }

    const [rows] = await db.query(
      'SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (!rows || rows.length === 0) {
      return res.render('login', { error: 'Invalid username or password.' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.render('login', { error: 'Invalid username or password.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ [LOGIN] Database error:', err.code || err.message, err);
    return res.render('login', { error: 'Database error. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
