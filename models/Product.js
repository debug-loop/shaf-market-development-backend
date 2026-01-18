const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      default: () => `PROD-${uuidv4().slice(0, 8).toUpperCase()}`,
      unique: true,
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller is required'],
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [3, 'Product name must be at least 3 characters'],
      maxlength: [200, 'Product name must not exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters'],
      maxlength: [5000, 'Description must not exceed 5000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than 0'],
    },
    bulkPricing: [
      {
        minQty: {
          type: Number,
          required: true,
          min: [1, 'Minimum quantity must be at least 1'],
        },
        maxQty: {
          type: Number,
          default: null,
          validate: {
            validator: function (value) {
              return value === null || value > this.minQty;
            },
            message: 'Max quantity must be greater than min quantity',
          },
        },
        price: {
          type: Number,
          required: true,
          min: [0.01, 'Price must be greater than 0'],
        },
      },
    ],
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    inventoryType: {
      type: String,
      enum: ['unlimited', 'limited'],
      default: 'unlimited',
    },
    quantity: {
      type: Number,
      default: 999999,
      min: [0, 'Quantity cannot be negative'],
    },
    soldCount: {
      type: Number,
      default: 0,
      min: [0, 'Sold count cannot be negative'],
    },
    deliveryType: {
      type: String,
      enum: ['instant', '1-6h', '12h', '24h', 'custom'],
      default: 'instant',
    },
    customDeliveryTime: {
      type: String,
      trim: true,
    },
    replacementAvailable: {
      type: Boolean,
      default: false,
    },
    replacementDuration: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, 'Review count cannot be negative'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // NEW FIELDS FOR EDIT TRACKING
    isEdited: {
      type: Boolean,
      default: false,
      index: true,
    },
    previousVersion: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for better query performance
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ sectionId: 1, categoryId: 1, status: 1, isActive: 1 });
productSchema.index({ productId: 1 });
productSchema.index({ status: 1, isActive: 1 });
productSchema.index({ status: 1, isEdited: 1 });

// Pre-save middleware to handle edit tracking
productSchema.pre('save', function (next) {
  // If product is being edited (status changes from approved to pending)
  if (this.isModified() && !this.isNew) {
    const wasApproved = this._original && this._original.status === 'approved';
    const isPending = this.status === 'pending';

    if (wasApproved && isPending) {
      this.isEdited = true;
    }
  }
  next();
});

// Method to get bulk price for quantity
productSchema.methods.getBulkPrice = function (quantity) {
  if (!this.bulkPricing || this.bulkPricing.length === 0) {
    return this.price;
  }

  // Find applicable price tier
  for (const tier of this.bulkPricing) {
    if (quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty)) {
      return tier.price;
    }
  }

  return this.price;
};

// Method to decrement stock
productSchema.methods.decrementStock = async function (quantity) {
  if (this.inventoryType === 'limited' && this.quantity < quantity) {
    throw new Error('Insufficient stock');
  }

  if (this.inventoryType === 'limited') {
    this.quantity -= quantity;
  }
  this.soldCount += quantity;
  await this.save();
};

module.exports = mongoose.model('Product', productSchema);
