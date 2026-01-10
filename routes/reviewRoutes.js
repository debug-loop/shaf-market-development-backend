const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, requireRole } = require('../middleware/auth');
const { reviewValidation, validate } = require('../middleware/validation');

router.post('/reviews', authenticate, requireRole(['buyer']), reviewValidation, validate, reviewController.createReview);
router.get('/reviews/product/:productId', reviewController.getProductReviews);
router.get('/reviews/seller/:sellerId', reviewController.getSellerReviews);
router.delete('/reviews/:id', authenticate, reviewController.deleteReview);

module.exports = router;
