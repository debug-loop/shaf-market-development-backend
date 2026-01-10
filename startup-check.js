require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🚀 Startup Check\n');

const required = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log('❌ Missing environment variables:', missing.join(', '));
  process.exit(1);
}

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  console.log('⚠️  uploads/ directory missing - creating...');
  fs.mkdirSync(uploadsDir);
}

console.log('✅ All environment variables present');
console.log('✅ uploads/ directory exists');
console.log('\n✅ Ready to start!\n');
