const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  availableBalance: { type: Number, default: 0, min: 0 },
  escrowBalance: { type: Number, default: 0, min: 0 },
  pendingBalance: { type: Number, default: 0, min: 0 },
  totalEarnings: { type: Number, default: 0, min: 0 },
  totalWithdrawals: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

walletSchema.index({ userId: 1 });

module.exports = mongoose.model('Wallet', walletSchema);
