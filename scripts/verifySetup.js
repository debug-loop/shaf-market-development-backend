const mongoose = require('mongoose');
require('dotenv').config();

const verifySetup = async () => {
  console.log('🔍 Verifying Backend Setup\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connection successful');

    const User = mongoose.model('User');
    const adminCount = await User.countDocuments({ role: 'super-admin' });
    console.log(`✅ Admin accounts: ${adminCount}`);

    const Category = mongoose.model('Category');
    const catCount = await Category.countDocuments();
    console.log(`✅ Categories: ${catCount}`);

    await mongoose.connection.close();
    console.log('\n✅ Setup verified successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup verification failed:', error.message);
    process.exit(1);
  }
};

verifySetup();
