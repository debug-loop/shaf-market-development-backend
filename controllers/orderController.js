const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Dispute = require('../models/Dispute');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');
const referralController = require('./referralController');

exports.createOrder = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product || product.status !== 'approved' || !product.isActive) return res.status(404).json({ success: false, message: 'Product not available' });
    if (product.inventoryType === 'limited' && product.quantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient inventory' });

    const totalAmount = product.price * quantity;
    const platformFeePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE || 5);
    const platformFee = (totalAmount * platformFeePercentage) / 100;
    const sellerEarnings = totalAmount - platformFee;

    const buyerWallet = await Wallet.findOne({ userId: req.user.id });
    if (!buyerWallet || buyerWallet.availableBalance < totalAmount) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    const sellerWallet = await Wallet.findOne({ userId: product.sellerId });
    if (!sellerWallet) return res.status(400).json({ success: false, message: 'Seller wallet not found' });

    buyerWallet.availableBalance -= totalAmount;
    buyerWallet.escrowBalance += totalAmount;
    sellerWallet.escrowBalance += totalAmount;
    await buyerWallet.save();
    await sellerWallet.save();

    const order = await Order.create({
      buyerId: req.user.id, sellerId: product.sellerId, productId: product._id,
      quantity, pricePerUnit: product.price, totalAmount, platformFee, sellerEarnings
    });

    if (product.inventoryType === 'limited') {
      product.quantity -= quantity;
      product.soldCount += quantity;
      await product.save();
    }

    await Transaction.create({ userId: req.user.id, type: 'escrow_hold', amount: totalAmount, status: 'completed', description: `Escrow hold for order ${order.orderId}`, balanceAfter: buyerWallet.availableBalance });
    await createNotification(product.sellerId, 'order', 'New Order', `You have a new order for ${product.productName}`, `/seller/orders/${order._id}`);

    res.status(201).json({ success: true, message: 'Order created successfully', data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBuyerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ buyerId: req.user.id }).populate('sellerId', 'fullName').populate('productId', 'productName images').sort({ createdAt: -1 });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ sellerId: req.user.id }).populate('buyerId', 'fullName').populate('productId', 'productName images').sort({ createdAt: -1 });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      $or: [{ buyerId: req.user.id }, { sellerId: req.user.id }]
    }).populate('buyerId', 'fullName email').populate('sellerId', 'fullName email').populate('productId', 'productName images price');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsDelivered = async (req, res) => {
  try {
    const { deliveryData } = req.body;
    const order = await Order.findOne({ _id: req.params.id, sellerId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ success: false, message: 'Order is not pending' });

    order.status = 'delivered';
    order.deliveryData = deliveryData;
    order.deliveredAt = new Date();
    await order.save();

    await createNotification(order.buyerId, 'order', 'Order Delivered', `Your order ${order.orderId} has been delivered`, `/buyer/orders/${order._id}`);
    res.json({ success: true, message: 'Order marked as delivered', data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.confirmReceipt = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'delivered') return res.status(400).json({ success: false, message: 'Order is not delivered yet' });

    order.status = 'completed';
    order.completedAt = new Date();
    order.escrowReleased = true;
    await order.save();

    const buyerWallet = await Wallet.findOne({ userId: order.buyerId });
    const sellerWallet = await Wallet.findOne({ userId: order.sellerId });
    buyerWallet.escrowBalance -= order.totalAmount;
    sellerWallet.escrowBalance -= order.totalAmount;
    sellerWallet.availableBalance += order.sellerEarnings;
    sellerWallet.totalEarnings += order.sellerEarnings;
    await buyerWallet.save();
    await sellerWallet.save();

    await Transaction.create({ userId: order.sellerId, type: 'escrow_release', amount: order.sellerEarnings, status: 'completed', description: `Payment for order ${order.orderId}`, balanceAfter: sellerWallet.availableBalance });
    await referralController.processReferralCommission(order.buyerId, order.totalAmount);
    await createNotification(order.sellerId, 'payment', 'Payment Released', `Payment of $${order.sellerEarnings} released for order ${order.orderId}`, `/seller/earnings`);

    res.json({ success: true, message: 'Order completed successfully', data: { order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.openDispute = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ _id: req.params.id, buyerId: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status !== 'delivered') return res.status(400).json({ success: false, message: 'Can only dispute delivered orders' });

    const existingDispute = await Dispute.findOne({ orderId: order._id });
    if (existingDispute) return res.status(400).json({ success: false, message: 'Dispute already exists for this order' });

    const dispute = await Dispute.create({
      orderId: order._id, buyerId: req.user.id, sellerId: order.sellerId, reason, amount: order.totalAmount, status: 'open'
    });

    order.status = 'disputed';
    order.disputeId = dispute._id;
    await order.save();

    await createNotification(order.sellerId, 'dispute', 'Dispute Opened', `A dispute has been opened for order ${order.orderId}`, `/seller/orders/${order._id}`);
    const admins = await User.find({ role: { $in: ['admin', 'super-admin'] } });
    for (const admin of admins) {
      await createNotification(admin._id, 'dispute', 'New Dispute', `New dispute opened for order ${order.orderId}`, `/admin/disputes`);
    }

    res.json({ success: true, message: 'Dispute opened successfully', data: { dispute, order } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder: exports.createOrder,
  getBuyerOrders: exports.getBuyerOrders,
  getSellerOrders: exports.getSellerOrders,
  getOrder: exports.getOrder,
  markAsDelivered: exports.markAsDelivered,
  confirmReceipt: exports.confirmReceipt,
  openDispute: exports.openDispute
};
