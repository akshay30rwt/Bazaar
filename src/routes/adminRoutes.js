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

/**
 * @swagger
 * /admin/analytics/top-vendors:
 *   get:
 *     summary: Get top 10 vendors by revenue
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of top vendors with revenue and items sold
 *       403:
 *         description: Admin access required
 */
router.get('/analytics/top-vendors', protect, restrictTo('admin'), getMostActiveVendors);

/**
 * @swagger
 * /admin/analytics/category-sales:
 *   get:
 *     summary: Get sales breakdown by product category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue and items sold per category
 *       403:
 *         description: Admin access required
 */
router.get('/analytics/category-sales', protect, restrictTo('admin'), getCategorySales);

/**
 * @swagger
 * /admin/analytics/top-reviewed:
 *   get:
 *     summary: Get top 10 most reviewed products
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Products with highest review counts and average ratings
 *       403:
 *         description: Admin access required
 */
router.get('/analytics/top-reviewed', protect, restrictTo('admin'), getMostReviewedProducts);

module.exports = router;