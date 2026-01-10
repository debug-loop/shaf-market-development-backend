const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');
const { depositValidation, withdrawValidation, validate } = require('../middleware/validation');

router.get('/wallet', authenticate, walletController.getWallet);
router.post('/wallet/deposit', authenticate, depositValidation, validate, walletController.deposit);
router.post('/wallet/withdraw', authenticate, withdrawValidation, validate, walletController.withdraw);
router.get('/wallet/transactions', authenticate, walletController.getTransactions);

module.exports = router;
