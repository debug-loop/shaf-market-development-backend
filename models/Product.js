const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  productName: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String }],
  inventoryType: { type: String, enum: ['unlimited', 'limited'], default: 'unlimited' },
  quantity: { type: Number, default: 999999 },
  soldCount: { type: Number, default: 0 },
  deliveryType: { type: String, enum: ['instant', '1-6h', '12h', '24h', 'custom'], default: 'instant' },
  customDeliveryTime: { type: String },
  replacementAvailable: { type: Boolean, default: false },
  replacementDuration: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

productSchema.index({ sellerId: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ productId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
