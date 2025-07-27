const bcrypt = require('bcrypt');

const password = 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('❌ Error generating hash:', err);
    return;
  }

  console.log('✅ Hash for admin123:', hash);
});
