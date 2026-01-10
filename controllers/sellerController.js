const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Withdrawal = require('../models/Withdrawal');

exports.applyAsSeller = async (req, res) => {
  try {
    const { sellerType, selectedCategories, dailySupplyQuantity, yearsOfExperience, workDescription, portfolioLinks } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, {
      sellerStatus: 'pending', sellerType, selectedCategories, dailySupplyQuantity, yearsOfExperience, workDescription, portfolioLinks
    }, { new: true }).select('-password');
    res.json({ success: true, message: 'Seller application submitted', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplicationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('sellerStatus rejectionReason');
    res.json({ success: true, data: { sellerStatus: user.sellerStatus, rejectionReason: user.rejectionReason } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user.id });

    const totalProducts = await Product.countDocuments({ sellerId: req.user.id });
    const activeProducts = await Product.countDocuments({ sellerId: req.user.id, status: 'approved', isActive: true });
    const pendingOrders = await Order.countDocuments({ sellerId: req.user.id, status: 'pending' });
    const completedOrders = await Order.countDocuments({ sellerId: req.user.id, status: 'completed' });

    const earningsData = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(req.user.id), status: 'completed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$sellerEarnings' } } }
    ]);
    const totalEarnings = earningsData.length > 0 ? earningsData[0].totalEarnings : 0;

    res.json({
      success: true,
      data: {
        stats: { totalProducts, activeProducts, pendingOrders, completedOrders, totalEarnings, availableBalance: wallet.availableBalance, escrowBalance: wallet.escrowBalance }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id });
    const monthlyEarnings = await Order.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(req.user.id), status: 'completed', completedAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } } },
      { $group: { _id: { month: { $month: '$completedAt' }, year: { $year: '$completedAt' } }, earnings: { $sum: '$sellerEarnings' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    res.json({ success: true, data: { wallet, monthlyEarnings } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const wallet = await Wallet.findOne({ userId: req.user.id });
    const totalProducts = await Product.countDocuments({ sellerId: req.user.id, status: 'approved' });
    const totalOrders = await Order.countDocuments({ sellerId: req.user.id, status: 'completed' });

    res.json({ success: true, data: { user, wallet, stats: { totalProducts, totalOrders } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  applyAsSeller: exports.applyAsSeller,
  getApplicationStatus: exports.getApplicationStatus,
  getDashboard: exports.getDashboard,
  getEarnings: exports.getEarnings,
  getProfile: exports.getProfile
};
