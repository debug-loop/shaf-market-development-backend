const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/disputeController');
const { authenticate, requireRole } = require('../middleware/auth');
const { disputeResolutionValidation, validate } = require('../middleware/validation');

router.get('/disputes', authenticate, requireRole(['admin', 'super-admin']), disputeController.getAllDisputes);
router.get('/disputes/:id', authenticate, disputeController.getDispute);
router.post('/disputes/:id/resolve', authenticate, requireRole(['admin', 'super-admin']), disputeResolutionValidation, validate, disputeController.resolveDispute);

module.exports = router;
