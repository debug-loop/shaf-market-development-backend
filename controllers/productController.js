const Product = require('../models/Product');
const Category = require('../models/Category');
const { createNotification } = require('../utils/notifications');
const AdminLog = require('../models/AdminLog');

const generateProductId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PRD${timestamp}${random}`;
};

exports.createProduct = async (req, res) => {
  try {
    const { productName, description, categoryId, price, inventoryType, quantity, deliveryType, customDeliveryTime, replacementAvailable, replacementDuration } = req.body;
    const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const product = await Product.create({
      productId: generateProductId(), sellerId: req.user.id, productName, description, categoryId, price,
      images, inventoryType, quantity: inventoryType === 'limited' ? quantity : 999999,
      deliveryType, customDeliveryTime, replacementAvailable, replacementDuration
    });

    res.status(201).json({ success: true, message: 'Product created and submitted for approval', data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('sellerId', 'fullName email').populate('categoryId', 'name icon');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user.id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const { productName, description, categoryId, price, inventoryType, quantity, deliveryType, customDeliveryTime, replacementAvailable, replacementDuration } = req.body;
    Object.assign(product, { productName, description, categoryId, price, inventoryType, quantity: inventoryType === 'limited' ? quantity : 999999, deliveryType, customDeliveryTime, replacementAvailable, replacementDuration });

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      product.images = [...product.images, ...newImages];
    }

    await product.save();
    res.json({ success: true, message: 'Product updated successfully', data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.status !== 'pending') return res.status(400).json({ success: false, message: 'Product is not pending approval' });

    product.status = 'approved';
    await product.save();

    await createNotification(product.sellerId, 'product_approval', 'Product Approved', `Your product "${product.productName}" has been approved`, `/seller/products`);
    await AdminLog.create({ adminId: req.user.id, action: 'approve_product', details: { productId: product._id, productName: product.productName } });

    res.json({ success: true, message: 'Product approved successfully', data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
  getProduct: exports.getProduct,
  updateProduct: exports.updateProduct,
  deleteProduct: exports.deleteProduct,
  getPendingProducts: exports.getPendingProducts,
  approveProduct: exports.approveProduct,
  rejectProduct: exports.rejectProduct,
  getAllCategories: exports.getAllCategories
};
