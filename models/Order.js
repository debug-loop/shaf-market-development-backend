const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  pricePerUnit: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  sellerEarnings: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'delivered', 'completed', 'disputed', 'cancelled'], 
    default: 'pending' 
  },
  deliveryData: { type: String },
  deliveredAt: { type: Date },
  completedAt: { type: Date },
  escrowReleased: { type: Boolean, default: false },
  disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispute' }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderSchema.virtual('productName').get(function() {
  return this.productId?.productName || 'Product';
});

orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderId = `ORD${timestamp}${random}`;
  }
  next();
});

orderSchema.index({ buyerId: 1 });
orderSchema.index({ sellerId: 1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
