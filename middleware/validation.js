const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

const signupValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const productValidation = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('description').isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be greater than 0')
];

const orderValidation = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
];

const depositValidation = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
];

const withdrawValidation = [
  body('amount').isFloat({ min: 10 }).withMessage('Minimum withdrawal is $10'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  body('paymentDetails').notEmpty().withMessage('Payment details are required')
];

const sellerApplicationValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('sellerType').isIn(['Personal', 'Business']).withMessage('Invalid seller type'),
  body('selectedCategories').isArray({ min: 1, max: 10 }).withMessage('Select 1-10 categories'),
  body('dailySupplyQuantity').isInt({ min: 1 }).withMessage('Daily supply must be at least 1'),
  body('yearsOfExperience').isInt({ min: 0 }).withMessage('Years of experience must be 0 or more'),
  body('workDescription').isLength({ min: 50 }).withMessage('Work description must be at least 50 characters')
];

const disputeResolutionValidation = [
  body('resolution').isIn(['full_refund', 'partial_refund', 'seller_favor']).withMessage('Invalid resolution type'),
  body('adminNotes').notEmpty().withMessage('Admin notes are required')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const reviewValidation = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5')
];

const disputeValidation = [
  body('reason').trim().isLength({ min: 10 }).withMessage('Reason must be at least 10 characters')
];

module.exports = {
  validate, signupValidation, loginValidation, productValidation, orderValidation,
  depositValidation, withdrawValidation, sellerApplicationValidation,
  disputeResolutionValidation, changePasswordValidation, reviewValidation, disputeValidation
};
