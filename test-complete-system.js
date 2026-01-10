const fs = require('fs');
const path = require('path');

console.log('🔍 Complete System Integrity Test\n');

const requiredFiles = [
  'server.js', 'package.json', '.env.example',
  'models/User.js', 'models/Product.js', 'models/Order.js',
  'controllers/authController.js', 'controllers/productController.js',
  'routes/authRoutes.js', 'routes/productRoutes.js',
  'middleware/auth.js', 'middleware/validation.js',
  'scripts/createAdmin.js', 'scripts/seedCategories.js',
  'utils/notifications.js'
];

let allGood = true;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allGood = false;
  }
});

if (allGood) {
  console.log('\n✅ System integrity check passed!\n');
  process.exit(0);
} else {
  console.log('\n❌ Some files are missing\n');
  process.exit(1);
}
