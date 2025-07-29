const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// GET login page
router.get('/login', (req, res) => {
  res.render('login');
});

// POST login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) {
      console.error('DB query error:', err);
      return res.status(500).send('Internal server error');
    }

    if (results.length === 0) {
      return res.send('Invalid credentials');
    }

    const user = results[0];

    try {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.send('Invalid credentials');
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      res.redirect('/dashboard');
    } catch (error) {
      console.error('Bcrypt error:', error);
      res.status(500).send('Error verifying password');
    }
  });
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
