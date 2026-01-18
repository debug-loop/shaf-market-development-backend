const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Withdrawal = require('../models/Withdrawal');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const AdminLog = require('../models/AdminLog');
const PlatformSetting = require('../models/PlatformSetting');
const { createNotification } = require('../utils/notifications');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: { $in: ['admin', 'super-admin'] } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ success: true, message: 'Login successful', data: { token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBuyers = await User.countDocuments({ role: 'buyer' });
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const pendingSellers = await User.countDocuments({ sellerStatus: 'pending' });
    const totalProducts = await Product.countDocuments();
    const pendingProducts = await Product.countDocuments({ status: 'pending' });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    const revenueData = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$platformFee' } } }
    ]);
    const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

    res.json({
      success: true,
      data: { stats: { totalUsers, totalBuyers, totalSellers, pendingSellers, totalProducts, pendingProducts, totalOrders, completedOrders, totalRevenue } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingSellers = async (req, res) => {
  try {
    const sellers = await User.find({ sellerStatus: 'pending' }).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: { sellers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveSeller = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.sellerStatus !== 'pending') return res.status(400).json({ success: false, message: 'Invalid seller application' });

    user.role = 'seller';
    user.sellerStatus = 'approved';
    await user.save();

    await createNotification(user._id, 'seller_approval', 'Seller Application Approved', 'Your seller application has been approved! You can now start listing products.', '/seller/dashboard');
    await AdminLog.create({ adminId: req.user.id, action: 'approve_seller', details: { userId: user._id, email: user.email } });

    res.json({ success: true, message: 'Seller approved successfully', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectSeller = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.sellerStatus !== 'pending') return res.status(400).json({ success: false, message: 'Invalid seller application' });

    user.sellerStatus = 'rejected';
    user.rejectionReason = rejectionReason;
    await user.save();

    await createNotification(user._id, 'seller_approval', 'Seller Application Rejected', `Your seller application was rejected: ${rejectionReason}`, '/seller/application-status');
    await AdminLog.create({ adminId: req.user.id, action: 'reject_seller', details: { userId: user._id, email: user.email, reason: rejectionReason } });

    res.json({ success: true, message: 'Seller application rejected', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    let query = {};
    if (role) query.role = role;
    if (status) query.accountStatus = status;

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await User.countDocuments(query);
    res.json({ success: true, data: { users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.freezeUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: 'frozen' }, { new: true }).select('-password');
    await AdminLog.create({ adminId: req.user.id, action: 'freeze_user', details: { userId: user._id, email: user.email } });
    res.json({ success: true, message: 'User account frozen', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unfreezeUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: 'active' }, { new: true }).select('-password');
    await AdminLog.create({ adminId: req.user.id, action: 'unfreeze_user', details: { userId: user._id, email: user.email } });
    res.json({ success: true, message: 'User account unfrozen', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' }).populate('userId', 'fullName email').sort({ createdAt: -1 });
    res.json({ success: true, data: { withdrawals } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal || withdrawal.status !== 'pending') return res.status(400).json({ success: false, message: 'Invalid withdrawal request' });

    const wallet = await Wallet.findOne({ userId: withdrawal.userId });
    wallet.pendingBalance -= withdrawal.amount;
    wallet.totalWithdrawals += withdrawal.amount;
    await wallet.save();

    withdrawal.status = 'completed';
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user.id;
    await withdrawal.save();

    await Transaction.create({ userId: withdrawal.userId, type: 'withdrawal', amount: withdrawal.amount, status: 'completed', description: 'Withdrawal approved', balanceAfter: wallet.availableBalance });
    await createNotification(withdrawal.userId, 'withdrawal', 'Withdrawal Approved', `Your withdrawal of $${withdrawal.amount} has been processed`, '/wallet');
    await AdminLog.create({ adminId: req.user.id, action: 'approve_withdrawal', details: { withdrawalId: withdrawal._id, amount: withdrawal.amount } });

    res.json({ success: true, message: 'Withdrawal approved successfully', data: { withdrawal } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal || withdrawal.status !== 'pending') return res.status(400).json({ success: false, message: 'Invalid withdrawal request' });

    const wallet = await Wallet.findOne({ userId: withdrawal.userId });
    wallet.pendingBalance -= withdrawal.amount;
    wallet.availableBalance += withdrawal.amount;
    await wallet.save();

    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = rejectionReason;
    withdrawal.processedAt = new Date();
    withdrawal.processedBy = req.user.id;
    await withdrawal.save();

    await Transaction.create({ userId: withdrawal.userId, type: 'withdrawal_rejected', amount: withdrawal.amount, status: 'failed', description: `Withdrawal rejected: ${rejectionReason}`, balanceAfter: wallet.availableBalance });
    await createNotification(withdrawal.userId, 'withdrawal', 'Withdrawal Rejected', `Your withdrawal was rejected: ${rejectionReason}`, '/wallet');
    await AdminLog.create({ adminId: req.user.id, action: 'reject_withdrawal', details: { withdrawalId: withdrawal._id, reason: rejectionReason } });

    res.json({ success: true, message: 'Withdrawal rejected', data: { withdrawal } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlatformSettings = async (req, res) => {
  try {
    let settings = await PlatformSetting.find();
    if (settings.length === 0) {
      const defaults = [
        { key: 'platformFeePercentage', value: 5, description: 'Platform fee percentage' },
        { key: 'referralCommissionRate', value: 5, description: 'Referral commission rate percentage' },
        { key: 'minimumWithdrawal', value: 10, description: 'Minimum withdrawal amount' },
        { key: 'maximumWithdrawal', value: 10000, description: 'Maximum withdrawal amount' },
        { key: 'siteName', value: 'Shah Marketplace', description: 'Site name' },
        { key: 'supportEmail', value: 'support@shahmarket.com', description: 'Support email' }
      ];
      settings = await PlatformSetting.insertMany(defaults);
    }
    res.json({ success: true, data: { settings } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlatformSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    let setting = await PlatformSetting.findOne({ key });
    if (!setting) setting = await PlatformSetting.create({ key, value });
    else { setting.value = value; await setting.save(); }

    await AdminLog.create({ adminId: req.user.id, action: 'update_setting', details: { key, value } });
    res.json({ success: true, message: 'Setting updated successfully', data: { setting } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    let query = {};
    if (action) query.action = action;

    const logs = await AdminLog.find(query).populate('adminId', 'fullName email').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await AdminLog.countDocuments(query);
    res.json({ success: true, data: { logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get product changes for edited products
exports.getProductChanges = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('sectionId', 'name slug')
      .populate('categoryId', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (!product.isEdited || !product.previousVersion) {
      return res.status(400).json({
        success: false,
        message: 'Product has no changes to review',
      });
    }

    // Get product attributes
    const currentAttributes = await ProductAttribute.findOne({ productId: product._id });
    const previousAttributes = product.previousVersion.attributes || {};

    // Compare and find changes
    const changes = [];
    const currentData = {
      ...product.toObject(),
      attributes: currentAttributes?.attributes || {},
    };
    const previousData = product.previousVersion;

    // Fields to compare
    const fieldsToCompare = [
      'productName',
      'description',
      'price',
      'quantity',
      'deliveryType',
      'replacementAvailable',
      'replacementDuration',
      'bulkPricing',
    ];

    fieldsToCompare.forEach((field) => {
      const current = currentData[field];
      const previous = previousData[field];

      if (JSON.stringify(current) !== JSON.stringify(previous)) {
        changes.push({
          field,
          old: previous,
          new: current,
        });
      }
    });

    // Compare attributes
    const attributeKeys = new Set([
      ...Object.keys(currentData.attributes || {}),
      ...Object.keys(previousAttributes || {}),
    ]);

    attributeKeys.forEach((key) => {
      const current = currentData.attributes[key];
      const previous = previousAttributes[key];

      if (current !== previous) {
        changes.push({
          field: `attributes.${key}`,
          old: previous,
          new: current,
        });
      }
    });

    res.json({
      success: true,
      data: {
        product: currentData,
        previousVersion: previousData,
        changes,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  login: exports.login,
  getDashboard: exports.getDashboard,
  getPendingSellers: exports.getPendingSellers,
  approveSeller: exports.approveSeller,
  rejectSeller: exports.rejectSeller,
  getAllUsers: exports.getAllUsers,
  freezeUser: exports.freezeUser,
  unfreezeUser: exports.unfreezeUser,
  getPendingWithdrawals: exports.getPendingWithdrawals,
  approveWithdrawal: exports.approveWithdrawal,
  rejectWithdrawal: exports.rejectWithdrawal,
  getPlatformSettings: exports.getPlatformSettings,
  updatePlatformSetting: exports.updatePlatformSetting,
  getAuditLogs: exports.getAuditLogs
};
