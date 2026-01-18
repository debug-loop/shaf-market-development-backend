const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sectionSchema = new mongoose.Schema(
  {
    sectionId: {
      type: String,
      default: () => `SEC-${uuidv4().slice(0, 8).toUpperCase()}`,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
      minlength: [2, 'Section name must be at least 2 characters'],
      maxlength: [50, 'Section name must not exceed 50 characters'],
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
      required: [true, 'Section icon is required'],
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
    attributeSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v) {
          return typeof v === 'object' && v !== null;
        },
        message: 'Attribute schema must be a valid object',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
sectionSchema.index({ sectionId: 1 });
sectionSchema.index({ slug: 1 });
sectionSchema.index({ order: 1, isActive: 1 });

// Auto-generate slug from name before saving
sectionSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

// Method to get active categories count
sectionSchema.methods.getCategoryCount = async function () {
  const Category = mongoose.model('Category');
  return await Category.countDocuments({ sectionId: this._id, isActive: true });
};

module.exports = mongoose.model('Section', sectionSchema);
