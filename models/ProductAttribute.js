const mongoose = require('mongoose');

const productAttributeSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
      unique: true,
      index: true,
    },
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: function (v) {
          return typeof v === 'object' && v !== null;
        },
        message: 'Attributes must be a valid object',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for filtering
productAttributeSchema.index({ 'attributes.quality': 1 });
productAttributeSchema.index({ 'attributes.country': 1 });
productAttributeSchema.index({ 'attributes.twoFa': 1 });
productAttributeSchema.index({ 'attributes.verified': 1 });

// Method to validate attributes against section schema
productAttributeSchema.methods.validateAgainstSchema = async function (sectionId) {
  const Section = mongoose.model('Section');
  const section = await Section.findById(sectionId);

  if (!section || !section.attributeSchema) {
    return { valid: true, errors: [] };
  }

  const errors = [];
  const schema = section.attributeSchema;

  // Validate required attributes
  for (const [key, config] of Object.entries(schema)) {
    if (config.required && !(key in this.attributes)) {
      errors.push(`Attribute '${key}' is required`);
    }

    // Validate enum values
    if (config.type === 'select' && config.options && this.attributes[key]) {
      if (!config.options.includes(this.attributes[key])) {
        errors.push(`Invalid value for '${key}'. Must be one of: ${config.options.join(', ')}`);
      }
    }

    // Validate boolean type
    if (config.type === 'boolean' && this.attributes[key] !== undefined) {
      if (typeof this.attributes[key] !== 'boolean') {
        errors.push(`Attribute '${key}' must be a boolean`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = mongoose.model('ProductAttribute', productAttributeSchema);
