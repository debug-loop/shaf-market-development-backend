const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const { authenticate, requireRole } = require('../middleware/auth');
const sectionController = require('../controllers/sectionController');
const categoryController = require('../controllers/categoryController');

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

// Section Management Routes
router.post('/sections', authenticate, requireRole(['admin', 'super-admin']), sectionController.create);
router.get('/sections', authenticate, requireRole(['admin', 'super-admin']), sectionController.getAll);
router.get('/sections/:id', authenticate, requireRole(['admin', 'super-admin']), sectionController.getById);
router.put('/sections/:id', authenticate, requireRole(['admin', 'super-admin']), sectionController.update);
router.delete('/sections/:id', authenticate, requireRole(['admin', 'super-admin']), sectionController.delete);
router.patch('/sections/reorder', authenticate, requireRole(['admin', 'super-admin']), sectionController.reorder);

// Category Management Routes
router.post('/categories', authenticate, requireRole(['admin', 'super-admin']), categoryController.create);
router.get('/categories', authenticate, requireRole(['admin', 'super-admin']), categoryController.getAll);
router.get('/categories/:id', authenticate, requireRole(['admin', 'super-admin']), categoryController.getById);
router.put('/categories/:id', authenticate, requireRole(['admin', 'super-admin']), categoryController.update);
router.delete('/categories/:id', authenticate, requireRole(['admin', 'super-admin']), categoryController.delete);
router.patch('/categories/reorder', authenticate, requireRole(['admin', 'super-admin']), categoryController.reorder);

// Update existing product approval route
router.get('/products/:id/changes', authenticate, requireRole(['admin', 'super-admin']), adminController.getProductChanges);

module.exports = router;
