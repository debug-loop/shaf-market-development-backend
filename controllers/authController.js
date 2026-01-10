const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Wallet = require('../models/Wallet');

const generateUserId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `USER${timestamp}${random}`;
};

exports.signup = async (req, res) => {
  try {
    const { fullName, email, password, telegram, country, referralCode } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      userId: generateUserId(), fullName, email, password: hashedPassword, telegram, country, emailVerified: true
    });
    await Wallet.create({ userId: user._id });

    if (referralCode) {
      const referralController = require('./referralController');
      await referralController.trackReferral(referralCode, user._id);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({
      success: true, message: 'Account created successfully',
      data: { token, user: { id: user._id, userId: user.userId, fullName: user.fullName, email: user.email, role: user.role, referralCode: user.referralCode }}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.signupBuyer = async (req, res) => {
  try {
    const { fullName, email, password, telegram, country, referralCode } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      userId: generateUserId(), fullName, email, password: hashedPassword, telegram, country, role: 'buyer', emailVerified: true
    });
    await Wallet.create({ userId: user._id });

    if (referralCode) {
      const referralController = require('./referralController');
      await referralController.trackReferral(referralCode, user._id);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({
      success: true, message: 'Buyer account created successfully',
      data: { token, user: { id: user._id, userId: user.userId, fullName: user.fullName, email: user.email, role: user.role, referralCode: user.referralCode }}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.signupSeller = async (req, res) => {
  try {
    const { fullName, email, password, telegram, country, referralCode, sellerType, selectedCategories, dailySupplyQuantity, yearsOfExperience, workDescription, portfolioLinks } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      userId: generateUserId(), fullName, email, password: hashedPassword, telegram, country, role: 'seller', sellerStatus: 'pending',
      sellerType, selectedCategories, dailySupplyQuantity, yearsOfExperience, workDescription, portfolioLinks: portfolioLinks || [], emailVerified: true
    });
    await Wallet.create({ userId: user._id });

    if (referralCode) {
      const referralController = require('./referralController');
      await referralController.trackReferral(referralCode, user._id);
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({
      success: true, message: 'Account created and seller application submitted',
      data: { token, user: { id: user._id, userId: user.userId, fullName: user.fullName, email: user.email, role: user.role, sellerStatus: user.sellerStatus, referralCode: user.referralCode }}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({
      success: true, message: 'Login successful',
      data: { token, user: { id: user._id, userId: user.userId, fullName: user.fullName, email: user.email, role: user.role, sellerStatus: user.sellerStatus }}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, whatsapp, wechat, discord, twitter, country } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { fullName, phone, whatsapp, wechat, discord, twitter, country }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Profile updated successfully', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup: exports.signup, signupSeller: exports.signupSeller, login: exports.login, getMe: exports.getMe, updateProfile: exports.updateProfile, changePassword: exports.changePassword };
