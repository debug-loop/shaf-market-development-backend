const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { signupValidation, loginValidation, changePasswordValidation, validate } = require('../middleware/validation');

router.post('/signup/buyer', signupValidation, validate, authController.signup);
router.post('/signup/seller', authController.signupSeller);
router.post('/login', loginValidation, validate, authController.login);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);

module.exports = router;
