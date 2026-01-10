const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Controller Exports\n');

const controllers = {
  'authController.js': ['signup', 'signupSeller', 'login', 'getMe', 'updateProfile', 'changePassword'],
  'productController.js': ['createProduct', 'getAllProducts', 'getSellerProducts', 'getProduct', 'updateProduct', 'deleteProduct', 'getPendingProducts', 'approveProduct', 'rejectProduct', 'getAllCategories'],
  'orderController.js': ['createOrder', 'getBuyerOrders', 'getSellerOrders', 'getOrder', 'markAsDelivered', 'confirmReceipt', 'openDispute']
};

let allGood = true;

Object.keys(controllers).forEach(file => {
  const filePath = path.join(__dirname, 'controllers', file);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`📄 ${file}`);

  controllers[file].forEach(method => {
    const defined = content.includes(`exports.${method}`);
    const exported = content.includes(`${method}:`) || content.includes(`${method},`);
    if (defined && exported) {
      console.log(`   ✅ ${method}`);
    } else {
      console.log(`   ❌ ${method} - NOT PROPERLY EXPORTED`);
      allGood = false;
    }
  });
  console.log('');
});

if (allGood) {
  console.log('✅ All exports verified!\n');
  process.exit(0);
} else {
  console.log('❌ Some exports missing\n');
  process.exit(1);
}
