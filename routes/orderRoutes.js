const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, requireRole } = require('../middleware/auth');
const { orderValidation, disputeValidation, validate } = require('../middleware/validation');

router.post('/orders', authenticate, requireRole(['buyer']), orderValidation, validate, orderController.createOrder);
router.get('/orders/buyer', authenticate, requireRole(['buyer']), orderController.getBuyerOrders);
router.get('/orders/seller', authenticate, requireRole(['seller']), orderController.getSellerOrders);
router.get('/orders/:id', authenticate, orderController.getOrder);
router.post('/orders/:id/deliver', authenticate, requireRole(['seller']), orderController.markAsDelivered);
router.post('/orders/:id/confirm', authenticate, requireRole(['buyer']), orderController.confirmReceipt);
router.post('/orders/:id/dispute', authenticate, requireRole(['buyer']), disputeValidation, validate, orderController.openDispute);

module.exports = router;
