const Wallet = require('../models/Wallet');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

exports.getWallet = async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) wallet = await Wallet.create({ userId: req.user.id });
    res.json({ success: true, data: { wallet } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const wallet = await Wallet.findOne({ userId: req.user.id });
    wallet.availableBalance += parseFloat(amount);
    await wallet.save();

    await Transaction.create({
      userId: req.user.id, type: 'deposit', amount, status: 'completed',
      description: `Deposit via ${paymentMethod}`, balanceAfter: wallet.availableBalance
    });

    res.json({ success: true, message: 'Deposit successful', data: { wallet } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const wallet = await Wallet.findOne({ userId: req.user.id });

    const minWithdrawal = parseFloat(process.env.MINIMUM_WITHDRAWAL || 10);
    const maxWithdrawal = parseFloat(process.env.MAXIMUM_WITHDRAWAL || 10000);

    if (amount < minWithdrawal) return res.status(400).json({ success: false, message: `Minimum withdrawal is $${minWithdrawal}` });
    if (amount > maxWithdrawal) return res.status(400).json({ success: false, message: `Maximum withdrawal is $${maxWithdrawal}` });
    if (wallet.availableBalance < amount) return res.status(400).json({ success: false, message: 'Insufficient balance' });

    wallet.availableBalance -= amount;
    wallet.pendingBalance += amount;
    await wallet.save();

    const withdrawal = await Withdrawal.create({
      userId: req.user.id, amount, paymentMethod, paymentDetails, status: 'pending'
    });

    await Transaction.create({
      userId: req.user.id, type: 'withdrawal_request', amount, status: 'pending',
      description: `Withdrawal request via ${paymentMethod}`, balanceAfter: wallet.availableBalance
    });

    res.json({ success: true, message: 'Withdrawal request submitted', data: { withdrawal, wallet } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Transaction.countDocuments({ userId: req.user.id });
    res.json({ success: true, data: { transactions, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllWallets = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    let userQuery = {};
    if (search) userQuery = { $or: [{ fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] };

    const users = await User.find(userQuery).select('_id');
    const userIds = users.map(u => u._id);

    const wallets = await Wallet.find({ userId: { $in: userIds } }).populate('userId', 'fullName email role').sort({ totalEarnings: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Wallet.countDocuments({ userId: { $in: userIds } });

    const totals = await Wallet.aggregate([
      { $group: { _id: null, totalAvailable: { $sum: '$availableBalance' }, totalEscrow: { $sum: '$escrowBalance' }, totalEarnings: { $sum: '$totalEarnings' } } }
    ]);

    res.json({
      success: true,
      data: { wallets, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }, totals: totals[0] || { totalAvailable: 0, totalEscrow: 0, totalEarnings: 0 } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getWallet: exports.getWallet,
  deposit: exports.deposit,
  withdraw: exports.withdraw,
  getTransactions: exports.getTransactions,
  getAllWallets: exports.getAllWallets
};
