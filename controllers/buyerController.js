const mongoose = require('mongoose');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');

exports.getDashboard = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user.id });

    const totalOrders = await Order.countDocuments({ buyerId: req.user.id });
    const activeOrders = await Order.countDocuments({ buyerId: req.user.id, status: { $in: ['pending', 'delivered'] } });
    const recentOrders = await Order.find({ buyerId: req.user.id }).populate('sellerId', 'fullName').populate('productId', 'productName images').sort({ createdAt: -1 }).limit(5).lean();

    res.json({
      success: true,
      data: { stats: { totalOrders, activeOrders, balance: wallet.availableBalance, escrow: wallet.escrowBalance }, recentOrders }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboard: exports.getDashboard };
