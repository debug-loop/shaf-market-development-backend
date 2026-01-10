const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');

exports.createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;
    const order = await Order.findOne({ _id: orderId, buyerId: req.user.id, status: 'completed' });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found or not completed' });

    const existingReview = await Review.findOne({ orderId });
    if (existingReview) return res.status(400).json({ success: false, message: 'Review already exists for this order' });

    const review = await Review.create({
      buyerId: req.user.id, sellerId: order.sellerId, productId: order.productId, orderId, rating, comment
    });

    const allReviews = await Review.find({ productId: order.productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await Product.findByIdAndUpdate(order.productId, { rating: avgRating, reviewCount: allReviews.length });

    res.status(201).json({ success: true, message: 'Review submitted successfully', data: { review } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).populate('buyerId', 'fullName').sort({ createdAt: -1 });
    res.json({ success: true, data: { reviews } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSellerReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ sellerId: req.params.sellerId }).populate('buyerId', 'fullName').populate('productId', 'productName').sort({ createdAt: -1 });
    res.json({ success: true, data: { reviews } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, buyerId: req.user.id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const allReviews = await Review.find({ productId: review.productId });
    const avgRating = allReviews.length > 0 ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length : 0;
    await Product.findByIdAndUpdate(review.productId, { rating: avgRating, reviewCount: allReviews.length });

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReview: exports.createReview,
  getProductReviews: exports.getProductReviews,
  getSellerReviews: exports.getSellerReviews,
  deleteReview: exports.deleteReview
};
