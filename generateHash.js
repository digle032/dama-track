const bcrypt = require('bcrypt');

const passwords = {
  admin: 'admin123',
  user: 'user123'
};

for (const [role, plainPassword] of Object.entries(passwords)) {
  bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) {
      console.error(`❌ Error hashing ${role} password:`, err);
    } else {
      console.log(`✅ Hashed ${role} password (${plainPassword}):`, hash);
    }
  });
}
