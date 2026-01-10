const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/admin/login', adminController.login);
router.get('/admin/dashboard', authenticate, requireRole(['admin', 'super-admin']), adminController.getDashboard);
router.get('/admin/sellers/pending', authenticate, requireRole(['admin', 'super-admin']), adminController.getPendingSellers);
router.post('/admin/sellers/:id/approve', authenticate, requireRole(['admin', 'super-admin']), adminController.approveSeller);
router.post('/admin/sellers/:id/reject', authenticate, requireRole(['admin', 'super-admin']), adminController.rejectSeller);
router.get('/admin/users', authenticate, requireRole(['admin', 'super-admin']), adminController.getAllUsers);
router.put('/admin/users/:id/freeze', authenticate, requireRole(['admin', 'super-admin']), adminController.freezeUser);
router.put('/admin/users/:id/unfreeze', authenticate, requireRole(['admin', 'super-admin']), adminController.unfreezeUser);
router.get('/admin/products/pending', authenticate, requireRole(['admin', 'super-admin']), productController.getPendingProducts);
router.post('/admin/products/:id/approve', authenticate, requireRole(['admin', 'super-admin']), productController.approveProduct);
router.post('/admin/products/:id/reject', authenticate, requireRole(['admin', 'super-admin']), productController.rejectProduct);
router.get('/admin/withdrawals/pending', authenticate, requireRole(['admin', 'super-admin']), adminController.getPendingWithdrawals);
router.post('/admin/withdrawals/:id/approve', authenticate, requireRole(['admin', 'super-admin']), adminController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', authenticate, requireRole(['admin', 'super-admin']), adminController.rejectWithdrawal);
router.get('/admin/settings', authenticate, requireRole(['admin', 'super-admin']), adminController.getPlatformSettings);
router.put('/admin/settings', authenticate, requireRole(['super-admin']), adminController.updatePlatformSetting);
router.get('/admin/logs', authenticate, requireRole(['admin', 'super-admin']), adminController.getAuditLogs);

module.exports = router;
