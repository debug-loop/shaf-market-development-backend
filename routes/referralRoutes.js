const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');
const { authenticate } = require('../middleware/auth');

router.get('/referrals', authenticate, referralController.getReferralInfo);
router.post('/referrals/withdraw', authenticate, referralController.withdrawReferralEarnings);

module.exports = router;
