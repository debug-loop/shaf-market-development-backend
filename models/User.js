const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['buyer', 'seller', 'admin', 'super-admin'], 
    default: 'buyer' 
  },
  accountStatus: { 
    type: String, 
    enum: ['active', 'frozen', 'suspended'], 
    default: 'active' 
  },
  
  // Seller-specific fields (only for sellers)
  sellerStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    required: function() { return this.role === 'seller'; }
  },
  sellerType: { 
    type: String, 
    enum: ['Personal', 'Business'],
    required: function() { return this.role === 'seller'; }
  },
  selectedCategories: [{ type: String }],
  dailySupplyQuantity: { type: Number },
  yearsOfExperience: { type: Number },
  workDescription: { type: String },
  portfolioLinks: [{ type: String }],
  rejectionReason: { type: String },
  
  // Contact info
  telegram: { type: String },
  country: { type: String },
  
  // Referral system
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String },
  
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ sellerStatus: 1 });
userSchema.index({ referralCode: 1 });

userSchema.pre('save', function(next) {
  if (!this.referralCode && this.isNew) {
    this.referralCode = `REF${this.userId}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
