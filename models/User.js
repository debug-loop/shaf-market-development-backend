const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  telegram: { type: String },
  phone: { type: String },
  whatsapp: { type: String },
  wechat: { type: String },
  discord: { type: String },
  twitter: { type: String },
  country: { type: String },
  
  role: { 
    type: String, 
    enum: ['buyer', 'seller', 'admin', 'super-admin'], 
    default: 'buyer' 
  },
  
  accountStatus: { 
    type: String, 
    enum: ['active', 'suspended', 'frozen'], 
    default: 'active' 
  },
  
  emailVerified: { type: Boolean, default: false },
  telegramVerified: { type: Boolean, default: false },
  
  referralCode: { 
    type: String, 
    unique: true,
    sparse: true
  },
  
  sellerStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: null 
  },
  sellerType: { type: String, enum: ['Personal', 'Business'] },
  selectedCategories: [{ type: String }],
  dailySupplyQuantity: { type: Number },
  yearsOfExperience: { type: Number },
  workDescription: { type: String },
  portfolioLinks: [{ type: String }],
  rejectionReason: { type: String },
  
  memberSince: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ userId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ sellerStatus: 1 });
userSchema.index({ referralCode: 1 });

userSchema.pre('save', function(next) {
  if (!this.referralCode && this.isNew) {
    this.referralCode = `REF${this.userId}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
