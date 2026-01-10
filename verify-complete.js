const fs = require('fs');
const path = require('path');

console.log('🔍 Final System Verification\n');

const checks = {
  models: ['User', 'Product', 'Order', 'Wallet', 'Transaction', 'Withdrawal', 'Dispute', 'Referral', 'Review', 'Notification', 'Category', 'AdminLog', 'PlatformSetting'],
  controllers: ['authController', 'buyerController', 'sellerController', 'productController', 'orderController', 'walletController', 'disputeController', 'adminController', 'notificationController', 'reviewController', 'referralController'],
  routes: ['authRoutes', 'buyerRoutes', 'sellerRoutes', 'productRoutes', 'orderRoutes', 'walletRoutes', 'disputeRoutes', 'adminRoutes', 'notificationRoutes', 'reviewRoutes', 'referralRoutes'],
  middleware: ['auth', 'validation', 'upload', 'errorHandler', 'rateLimiter', 'asyncHandler']
};

let allGood = true;

Object.keys(checks).forEach(dir => {
  console.log(`📁 ${dir}:`);
  checks[dir].forEach(file => {
    const filePath = path.join(__dirname, dir, `${file}.js`);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file}.js`);
    } else {
      console.log(`   ❌ ${file}.js - MISSING`);
      allGood = false;
    }
  });
  console.log('');
});

if (allGood) {
  console.log('✅ ALL FILES PRESENT!\n');
  process.exit(0);
} else {
  console.log('❌ Some files are missing\n');
  process.exit(1);
}
