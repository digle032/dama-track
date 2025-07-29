const express = require('express');
const router = express.Router();
const db = require('../db');

// Show login page
router.get('/', (req, res) => {
  res.render('login', { error: null });
});

// Handle login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('❌ Login DB error:', err);
      return res.render('login', { error: 'Server error.' });
    }

    if (results.length === 0) {
      return res.render('login', { error: 'Invalid credentials.' });
    }

    const user = results[0];
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role // 'admin' or 'user'
    };

    res.redirect('/shipments');
  });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
