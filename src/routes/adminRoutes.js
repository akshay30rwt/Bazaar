const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const restrictTo = require('../middleware/roleMiddleware');
const {
    getPlatformOverview,
    getMostActiveVendors,
    getCategorySales,
    getMostReviewedProducts
} = require('../controllers/adminController');

/**
 * @swagger
 * /admin/analytics/overview:
 *   get:
 *     summary: Get platform-wide overview statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform stats
 *       403:
 *         description: Admin access required
 */
router.get('/analytics/overview', protect, restrictTo('admin'), getPlatformOverview);

router.get('/analytics/top-vendors', protect, restrictTo('admin'), getMostActiveVendors);
router.get('/analytics/category-sales', protect, restrictTo('admin'), getCategorySales);
router.get('/analytics/top-reviewed', protect, restrictTo('admin'), getMostReviewedProducts);

module.exports = router;