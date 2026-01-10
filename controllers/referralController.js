const Referral = require('../models/Referral');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

exports.getReferralInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('referralCode');
    const totalReferrals = await Referral.countDocuments({ referrerId: req.user.id });
    const completedReferrals = await Referral.countDocuments({ referrerId: req.user.id, status: 'completed' });
    const totalEarnings = await Referral.aggregate([
      { $match: { referrerId: req.user.id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$commissionEarned' } } }
    ]);
    const earnings = totalEarnings.length > 0 ? totalEarnings[0].total : 0;

    const referrals = await Referral.find({ referrerId: req.user.id }).populate('referredUserId', 'fullName email').sort({ createdAt: -1 });
    res.json({ success: true, data: { referralCode: user.referralCode, totalReferrals, completedReferrals, totalEarnings: earnings, referrals } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.trackReferral = async (referralCode, referredUserId) => {
  try {
    const referrer = await User.findOne({ referralCode });
    if (!referrer || referrer._id.toString() === referredUserId.toString()) return;
    await Referral.create({ referrerId: referrer._id, referredUserId, status: 'pending' });
  } catch (error) {
    console.error('Error tracking referral:', error);
  }
};

exports.processReferralCommission = async (buyerId, orderAmount) => {
  try {
    const referral = await Referral.findOne({ referredUserId: buyerId, status: 'pending' });
    if (!referral) return;

    const completedOrders = await Order.countDocuments({ buyerId, status: 'completed' });
    if (completedOrders !== 1) return;

    const commissionRate = parseFloat(process.env.REFERRAL_COMMISSION_RATE || 5);
    const commission = (orderAmount * commissionRate) / 100;

    referral.status = 'completed';
    referral.commissionEarned = commission;
    await referral.save();

    const wallet = await Wallet.findOne({ userId: referral.referrerId });
    wallet.availableBalance += commission;
    wallet.totalEarnings += commission;
    await wallet.save();

    await Transaction.create({
      userId: referral.referrerId, type: 'referral_commission', amount: commission, status: 'completed',
      description: 'Referral commission earned', balanceAfter: wallet.availableBalance
    });

    const notificationController = require('./notificationController');
    await notificationController.createNotification(referral.referrerId, 'payment', 'Referral Commission', `You earned $${commission} from a referral!`, '/referrals');
  } catch (error) {
    console.error('Error processing referral commission:', error);
  }
};

exports.withdrawReferralEarnings = async (req, res) => {
  try {
    const { amount } = req.body;
    const referrals = await Referral.find({ referrerId: req.user.id, status: 'completed' });
    const totalEarnings = referrals.reduce((sum, ref) => sum + ref.commissionEarned, 0);
    const withdrawnReferrals = referrals.filter(ref => ref.commissionPaidAt);
    const alreadyWithdrawn = withdrawnReferrals.reduce((sum, ref) => sum + ref.commissionEarned, 0);
    const availableEarnings = totalEarnings - alreadyWithdrawn;

    if (amount > availableEarnings) return res.status(400).json({ success: false, message: 'Insufficient referral earnings' });

    const wallet = await Wallet.findOne({ userId: req.user.id });
    wallet.availableBalance += amount;
    wallet.totalEarnings += amount;
    await wallet.save();

    let remainingAmount = amount;
    for (const referral of referrals) {
      if (remainingAmount <= 0) break;
      if (referral.commissionPaidAt) continue;
      if (referral.commissionEarned <= remainingAmount) {
        referral.commissionPaidAt = new Date();
        await referral.save();
        remainingAmount -= referral.commissionEarned;
      }
    }

    await Transaction.create({ userId: req.user.id, type: 'referral_commission', amount: amount, status: 'completed', description: 'Referral earnings withdrawal', balanceAfter: wallet.availableBalance });
    res.json({ success: true, message: 'Referral earnings transferred to wallet', data: { amount, newBalance: wallet.availableBalance } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getReferralInfo: exports.getReferralInfo,
  trackReferral: exports.trackReferral,
  processReferralCommission: exports.processReferralCommission,
  withdrawReferralEarnings: exports.withdrawReferralEarnings
};
