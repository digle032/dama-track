// generateHash.js
const bcrypt = require('bcrypt');

const adminPassword = 'adminpass';
const userPassword = 'userpass';
const saltRounds = 10;

bcrypt.hash(adminPassword, saltRounds, (err, adminHash) => {
  if (err) {
    console.error('Error hashing admin password:', err);
  } else {
    console.log('✅ Admin hashed password:', adminHash);

    bcrypt.hash(userPassword, saltRounds, (err, userHash) => {
      if (err) {
        console.error('Error hashing user password:', err);
      } else {
        console.log('✅ User hashed password:', userHash);
      }
    });
  }
});
