// ✅ START OF FILE
console.log('📢 Script started');

const bcrypt = require('bcrypt');

const password = 'admin123';

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('✅ Generated hash:', hash);
  })
  .catch(err => {
    console.error('❌ Error generating hash:', err);
  });
