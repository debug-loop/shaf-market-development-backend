const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Wallet = require('../models/Wallet');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@shahmarket.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Generate userId
    const userCount = await User.countDocuments();
    const userId = `USR${String(userCount + 1).padStart(6, '0')}`;

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);

    // Create admin user (no seller fields)
    const admin = await User.create({
      userId,
      fullName: 'Shah Admin',
      email: 'admin@shahmarket.com',
      password: hashedPassword,
      role: 'super-admin',
      accountStatus: 'active',
      country: 'Global'
    });

    console.log('✅ Admin user created successfully');
    console.log(`   Email: admin@shahmarket.com`);
    console.log(`   Password: Admin@123456`);
    console.log(`   UserId: ${userId}`);

    // Create wallet for admin
    await Wallet.create({
      userId: admin._id,
      availableBalance: 0,
      escrowBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0
    });

    console.log('✅ Admin wallet created');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
