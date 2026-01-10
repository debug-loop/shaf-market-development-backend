const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { authenticate, requireRole, requireSellerApproved } = require('../middleware/auth');

router.post('/apply', authenticate, sellerController.applyAsSeller);
router.get('/application-status', authenticate, sellerController.getApplicationStatus);
router.get('/dashboard', authenticate, requireRole(['seller']), requireSellerApproved, sellerController.getDashboard);
router.get('/earnings', authenticate, requireRole(['seller']), requireSellerApproved, sellerController.getEarnings);
router.get('/profile', authenticate, requireRole(['seller']), sellerController.getProfile);

module.exports = router;
