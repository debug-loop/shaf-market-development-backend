const express = require('express');
const router = express.Router();
const buyerController = require('../controllers/buyerController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/dashboard', authenticate, requireRole(['buyer']), buyerController.getDashboard);

module.exports = router;
