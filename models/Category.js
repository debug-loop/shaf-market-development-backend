const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [50, 'Category name must not exceed 50 characters'],
    },
    slug: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    icon: {
      type: String,
      default: '📦',
      maxlength: [10, 'Icon must not exceed 10 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    order: {
      type: Number,
      default: 0,
      min: [0, 'Order must be a positive number'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
categorySchema.index({ sectionId: 1, order: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ sectionId: 1, isActive: 1 });

// Auto-generate slug from name before saving
categorySchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to get active products count
categorySchema.methods.getProductCount = async function () {
  const Product = mongoose.model('Product');
  return await Product.countDocuments({
    categoryId: this._id,
    status: 'approved',
    isActive: true
  });
};

module.exports = mongoose.model('Category', categorySchema);
