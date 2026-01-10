const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  disputeId: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['open', 'resolved', 'cancelled'], default: 'open' },
  resolution: { type: String, enum: ['full_refund', 'partial_refund', 'seller_favor'] },
  adminNotes: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date }
}, { timestamps: true });

disputeSchema.pre('save', async function(next) {
  if (this.isNew && !this.disputeId) {
    const count = await mongoose.model('Dispute').countDocuments();
    this.disputeId = `DIS${Date.now()}${count + 1}`;
  }
  next();
});

disputeSchema.index({ orderId: 1 });
disputeSchema.index({ status: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
