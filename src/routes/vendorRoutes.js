const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createVendorSchema, updateVendorSchema } = require('../validators/vendorValidator');
const {
    createVendor,
    uploadBanner,
    getVendorProfile,
    updateVendor,
    getVendorRevenue,
    getVendorOrderStats
} = require('../controllers/vendorController');

/**
 * @swagger
 * /vendors:
 *   post:
 *     summary: Create a vendor storefront
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               storeDescription:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vendor storefront created
 *       409:
 *         description: Store name taken or vendor already exists
 */
router.post('/', protect, validate(createVendorSchema), createVendor);

/**
 * @swagger
 * /vendors/banner:
 *   post:
 *     summary: Upload storefront banner
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               banner:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Banner uploaded successfully
 *       404:
 *         description: Vendor profile not found
 */
router.post('/banner', protect, upload.single('banner'), uploadBanner);

/**
 * @swagger
 * /vendors/me:
 *   put:
 *     summary: Update own vendor profile
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeName:
 *                 type: string
 *               storeDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Vendor profile updated
 */
router.put('/me', protect, validate(updateVendorSchema), updateVendor);

/**
 * @swagger
 * /vendors/me/analytics/revenue:
 *   get:
 *     summary: Get own storefront's revenue analytics
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue overview, monthly breakdown, top products
 */
router.get('/me/analytics/revenue', protect, restrictTo('vendor'), getVendorRevenue);

/**
 * @swagger
 * /vendors/me/analytics/orders:
 *   get:
 *     summary: Get own storefront's order status breakdown
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order counts grouped by status
 */
router.get('/me/analytics/orders', protect, restrictTo('vendor'), getVendorOrderStats);

/**
 * @swagger
 * /vendors/{id}:
 *   get:
 *     summary: Get public vendor profile
 *     tags: [Vendors]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     responses:
 *       200:
 *         description: Vendor profile data
 *       404:
 *         description: Vendor not found
 */
router.get('/:id', getVendorProfile);

module.exports = router;