// generateHash.js
const bcrypt = require('bcrypt');

const password = 'adminpass'; // Change this to the password you want to hash
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Hashed password:', hash);
  }
});
