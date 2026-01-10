const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['bank', 'paypal', 'crypto'], required: true },
  paymentDetails: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  processedAt: { type: Date },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

withdrawalSchema.pre('save', async function(next) {
  if (this.isNew && !this.withdrawalId) {
    const count = await mongoose.model('Withdrawal').countDocuments();
    this.withdrawalId = `WD${Date.now()}${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
