const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

// GET login page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], async (err, results) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.render('login', { error: 'Database error' });
    }

    if (!results || results.length === 0) {
      return res.render('login', { error: 'User not found' });
    }

    const user = results[0];
    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.render('login', { error: 'Incorrect password' });
      }

      // Minimal session info
      req.session.user = { id: user.id, username: user.username };
      res.redirect('/shipments');
    } catch (e) {
      console.error('❌ Bcrypt error:', e);
      res.render('login', { error: 'Something went wrong' });
    }
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
