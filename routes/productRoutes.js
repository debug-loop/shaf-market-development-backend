const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, requireRole, requireSellerApproved } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const { productValidation, validate } = require('../middleware/validation');

router.post('/products', authenticate, requireRole(['seller']), requireSellerApproved, uploadMultiple, productValidation, validate, productController.createProduct);
router.get('/products', productController.getAllProducts);
router.get('/products/seller', authenticate, requireRole(['seller']), productController.getSellerProducts);
router.get('/products/:id', productController.getProduct);
router.put('/products/:id', authenticate, requireRole(['seller']), requireSellerApproved, uploadMultiple, productController.updateProduct);
router.delete('/products/:id', authenticate, requireRole(['seller']), requireSellerApproved, productController.deleteProduct);
router.get('/categories', productController.getAllCategories);

module.exports = router;
