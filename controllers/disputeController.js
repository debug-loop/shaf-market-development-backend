const Dispute = require('../models/Dispute');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { createNotification } = require('../utils/notifications');
const AdminLog = require('../models/AdminLog');

exports.getAllDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const disputes = await Dispute.find(query).populate('buyerId', 'fullName email').populate('sellerId', 'fullName email').populate('orderId', 'orderId totalAmount').sort({ createdAt: -1 });
    res.json({ success: true, data: { disputes } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id).populate('buyerId', 'fullName email').populate('sellerId', 'fullName email').populate('orderId');
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
    res.json({ success: true, data: { dispute } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, adminNotes } = req.body;
    const dispute = await Dispute.findById(req.params.id).populate('orderId');
    if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });
    if (dispute.status !== 'open') return res.status(400).json({ success: false, message: 'Dispute is already resolved' });

    const order = dispute.orderId;
    const buyerWallet = await Wallet.findOne({ userId: dispute.buyerId });
    const sellerWallet = await Wallet.findOne({ userId: dispute.sellerId });

    if (resolution === 'full_refund') {
      buyerWallet.escrowBalance -= order.totalAmount;
      buyerWallet.availableBalance += order.totalAmount;
      sellerWallet.escrowBalance -= order.totalAmount;
      await Transaction.create({ userId: dispute.buyerId, type: 'dispute_refund', amount: order.totalAmount, status: 'completed', description: `Full refund for disputed order ${order.orderId}`, balanceAfter: buyerWallet.availableBalance });
    } else if (resolution === 'partial_refund') {
      const refundAmount = order.totalAmount / 2;
      buyerWallet.escrowBalance -= order.totalAmount;
      buyerWallet.availableBalance += refundAmount;
      sellerWallet.escrowBalance -= order.totalAmount;
      sellerWallet.availableBalance += (order.totalAmount - refundAmount);
      await Transaction.create({ userId: dispute.buyerId, type: 'dispute_refund', amount: refundAmount, status: 'completed', description: `Partial refund for disputed order ${order.orderId}`, balanceAfter: buyerWallet.availableBalance });
      await Transaction.create({ userId: dispute.sellerId, type: 'dispute_payment', amount: (order.totalAmount - refundAmount), status: 'completed', description: `Partial payment for disputed order ${order.orderId}`, balanceAfter: sellerWallet.availableBalance });
    } else if (resolution === 'seller_favor') {
      buyerWallet.escrowBalance -= order.totalAmount;
      sellerWallet.escrowBalance -= order.totalAmount;
      sellerWallet.availableBalance += order.sellerEarnings;
      sellerWallet.totalEarnings += order.sellerEarnings;
      await Transaction.create({ userId: dispute.sellerId, type: 'dispute_payment', amount: order.sellerEarnings, status: 'completed', description: `Payment for disputed order ${order.orderId}`, balanceAfter: sellerWallet.availableBalance });
    }

    await buyerWallet.save();
    await sellerWallet.save();

    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.adminNotes = adminNotes;
    dispute.resolvedBy = req.user.id;
    dispute.resolvedAt = new Date();
    await dispute.save();

    order.status = 'completed';
    order.escrowReleased = true;
    await order.save();

    await createNotification(dispute.buyerId, 'dispute', 'Dispute Resolved', `Your dispute for order ${order.orderId} has been resolved`, `/buyer/orders/${order._id}`);
    await createNotification(dispute.sellerId, 'dispute', 'Dispute Resolved', `Dispute for order ${order.orderId} has been resolved`, `/seller/orders/${order._id}`);
    await AdminLog.create({ adminId: req.user.id, action: 'resolve_dispute', details: { disputeId: dispute._id, orderId: order._id, resolution } });

    res.json({ success: true, message: 'Dispute resolved successfully', data: { dispute } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllDisputes: exports.getAllDisputes,
  getDispute: exports.getDispute,
  resolveDispute: exports.resolveDispute
};
