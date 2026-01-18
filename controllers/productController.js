const Product = require('../models/Product_');
const Category = require('../models/Category');
const { createNotification } = require('../utils/notifications');
const AdminLog = require('../models/AdminLog');

const generateProductId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PRD${timestamp}${random}`;
};

// Create product (Seller)
exports.createProduct = async (req, res) => {
  try {
    const {
      sectionId,
      categoryId,
      productName,
      description,
      price,
      bulkPricing,
      inventoryType,
      quantity,
      deliveryType,
      customDeliveryTime,
      replacementAvailable,
      replacementDuration,
      images,
      attributes,
    } = req.body;

    // Verify section exists
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    // Verify category exists and belongs to section
    const category = await Category.findById(categoryId);
    if (!category || category.sectionId.toString() !== sectionId) {
      return res.status(404).json({
        success: false,
        message: 'Invalid category for the selected section',
      });
    }

    // Create product
    const product = await Product.create({
      sellerId: req.user._id,
      sectionId,
      categoryId,
      productName,
      description,
      price,
      bulkPricing,
      inventoryType,
      quantity,
      deliveryType,
      customDeliveryTime,
      replacementAvailable,
      replacementDuration,
      images,
      status: 'pending',
    });

    // Create product attributes
    if (attributes) {
      const productAttribute = new ProductAttribute({
        productId: product._id,
        attributes,
      });

      // Validate attributes against section schema
      const validation = await productAttribute.validateAgainstSchema(sectionId);
      if (!validation.valid) {
        // Delete product if attributes are invalid
        await Product.findByIdAndDelete(product._id);
        return res.status(400).json({
          success: false,
          message: 'Invalid attributes',
          errors: validation.errors,
        });
      }

      await productAttribute.save();
    }

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    let query = { status: 'approved', isActive: true };
    if (category) query.categoryId = category;
    if (search) query.productName = { $regex: search, $options: 'i' };

    const products = await Product.find(query).populate('sellerId', 'fullName').populate('categoryId', 'name icon').sort({ createdAt: -1 }).limit(limit * 1).skip((page - 1) * limit);
    const total = await Product.countDocuments(query);

    res.json({ success: true, data: { products, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user.id }).populate('categoryId', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data: { products } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all products (Public)
exports.getProducts = async (req, res) => {
  try {
    const {
      sectionId,
      categoryId,
      quality,
      twoFa,
      emailAccess,
      recovery,
      verified,
      country,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {
      status: 'approved',
      isActive: true,
    };

    if (sectionId) filter.sectionId = sectionId;
    if (categoryId) filter.categoryId = categoryId;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Get products
    let products = await Product.find(filter)
      .populate('sellerId', 'businessName rating')
      .populate('sectionId', 'name slug icon')
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Filter by attributes
    if (quality || twoFa || emailAccess || recovery || verified || country) {
      const productIds = products.map((p) => p._id);
      const attributeFilter = { productId: { $in: productIds } };

      if (quality) attributeFilter['attributes.quality'] = quality;
      if (twoFa !== undefined) attributeFilter['attributes.twoFa'] = twoFa === 'true';
      if (emailAccess !== undefined) attributeFilter['attributes.emailAccess'] = emailAccess === 'true';
      if (recovery !== undefined) attributeFilter['attributes.recovery'] = recovery === 'true';
      if (verified !== undefined) attributeFilter['attributes.verified'] = verified === 'true';
      if (country) attributeFilter['attributes.country'] = country;

      const matchingAttributes = await ProductAttribute.find(attributeFilter);
      const matchingProductIds = matchingAttributes.map((attr) => attr.productId.toString());

      products = products.filter((p) => matchingProductIds.includes(p._id.toString()));
    }

    // Attach attributes to products
    const productAttributes = await ProductAttribute.find({
      productId: { $in: products.map((p) => p._id) },
    });

    const productsWithAttributes = products.map((product) => {
      const attributes = productAttributes.find(
        (attr) => attr.productId.toString() === product._id.toString()
      );
      return {
        ...product.toObject(),
        attributes: attributes?.attributes || {},
      };
    });

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: productsWithAttributes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update product (Seller)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Verify ownership
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product',
      });
    }

    // If product was approved, store previous version and set to pending
    if (product.status === 'approved') {
      const productAttributes = await ProductAttribute.findOne({ productId: product._id });

      product.previousVersion = {
        ...product.toObject(),
        attributes: productAttributes?.attributes || {},
      };
      product.status = 'pending';
      product.isEdited = true;
    }

    // Update product fields
    const {
      sectionId,
      categoryId,
      productName,
      description,
      price,
      bulkPricing,
      inventoryType,
      quantity,
      deliveryType,
      customDeliveryTime,
      replacementAvailable,
      replacementDuration,
      images,
      attributes,
    } = req.body;

    if (sectionId) product.sectionId = sectionId;
    if (categoryId) product.categoryId = categoryId;
    if (productName) product.productName = productName;
    if (description) product.description = description;
    if (price) product.price = price;
    if (bulkPricing) product.bulkPricing = bulkPricing;
    if (inventoryType) product.inventoryType = inventoryType;
    if (quantity !== undefined) product.quantity = quantity;
    if (deliveryType) product.deliveryType = deliveryType;
    if (customDeliveryTime) product.customDeliveryTime = customDeliveryTime;
    if (replacementAvailable !== undefined) product.replacementAvailable = replacementAvailable;
    if (replacementDuration) product.replacementDuration = replacementDuration;
    if (images) product.images = images;

    await product.save();

    // Update attributes
    if (attributes) {
      await ProductAttribute.findOneAndUpdate(
        { productId: product._id },
        { attributes },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, sellerId: req.user.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPendingProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: 'pending' }).populate('sellerId', 'fullName email').populate('categoryId', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data: { products } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.status = 'approved';
    product.isEdited = false;
    product.previousVersion = null;
    await product.save();

    // Send notification to seller
    await Notification.create({
      userId: product.sellerId,
      type: 'product_approval',
      title: 'Product Approved',
      message: `Your product "${product.productName}" has been approved and is now live.`,
    });

    // Log admin action
    await AdminLog.create({
      adminId: req.user._id,
      action: 'approve_product',
      target: 'product',
      targetId: product._id,
      details: req.body.adminNotes || `Approved product: ${product.productName}`,
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.rejectProduct = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.status !== 'pending') return res.status(400).json({ success: false, message: 'Product is not pending approval' });

    product.status = 'rejected';
    product.rejectionReason = rejectionReason;
    await product.save();

    await createNotification(product.sellerId, 'product_approval', 'Product Rejected', `Your product "${product.productName}" was rejected: ${rejectionReason}`, `/seller/products`);
    await AdminLog.create({ adminId: req.user.id, action: 'reject_product', details: { productId: product._id, productName: product.productName, reason: rejectionReason } });

    res.json({ success: true, message: 'Product rejected', data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: { categories } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createProduct: exports.createProduct,
  getAllProducts: exports.getAllProducts,
  getSellerProducts: exports.getSellerProducts,
  getProducts: exports.getProducts,
  updateProduct: exports.updateProduct,
  deleteProduct: exports.deleteProduct,
  getPendingProducts: exports.getPendingProducts,
  approveProduct: exports.approveProduct,
  rejectProduct: exports.rejectProduct,
  getAllCategories: exports.getAllCategories
};
