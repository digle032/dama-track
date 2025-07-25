// routes/auth.js

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

    // Debug log to make sure form is submitting properly
    console.log('🟢 Username:', username);
    console.log('🔑 Password:', password);

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('❌ Database error:', err);
            return res.render('login', { error: 'Database error' });
        }

        if (results.length === 0) {
            console.log('❌ User not found in DB');
            return res.render('login', { error: 'User not found' });
        }

        const user = results[0];

        try {
            // EXTRA DEBUG INFO
            console.log('🔍 Raw password from form:', password);
            console.log('🔍 Hashed password from DB:', user.password);

            const match = await bcrypt.compare(password, user.password);
            console.log('🔍 Bcrypt result:', match);

            if (!match) {
                console.log('❌ Bcrypt failed: incorrect password');
                return res.render('login', { error: 'Incorrect password' });
            }

            // ✅ Login success
            console.log('✅ Login successful!');
            req.session.user = { id: user.id, username: user.username };
            res.redirect('/shipments');

        } catch (err) {
            console.error('❌ Bcrypt compare error:', err);
            res.render('login', { error: 'Something went wrong during login' });
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
