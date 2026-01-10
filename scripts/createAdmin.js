const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Wallet = require('../models/Wallet');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: 'admin@shahmarket.com' });
    if (existing) {
      console.log('⚠️  Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    const admin = await User.create({
      userId: `ADMIN${Date.now()}`,
      fullName: 'Super Admin',
      email: 'admin@shahmarket.com',
      password: hashedPassword,
      role: 'super-admin',
      emailVerified: true
    });

    await Wallet.create({ userId: admin._id });

    console.log('✅ Admin account created successfully');
    console.log('   Email: admin@shahmarket.com');
    console.log('   Password: Admin@123456');
    console.log('   ⚠️  CHANGE PASSWORD IMMEDIATELY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
