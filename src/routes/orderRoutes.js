const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const restrictTo = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const { createOrderSchema, updateOrderStatusSchema } = require('../validators/orderValidator');
const {
    createOrder,
    getCustomerOrders,
    getVendorOrders,
    getOrderById,
    updateOrderStatus
} = require('../controllers/orderController');

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: number
 *               shippingAddress:
 *                 type: object
 *                 properties:
 *                   street: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   pincode: { type: string }
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Insufficient stock or validation error
 */
router.post('/', protect, validate(createOrderSchema), createOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get logged in customer's own orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated customer order list
 */
router.get('/', protect, getCustomerOrders);

/**
 * @swagger
 * /orders/vendor:
 *   get:
 *     summary: Get orders containing the logged in vendor's products
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated vendor-scoped order list
 */
router.get('/vendor', protect, restrictTo('vendor'), getVendorOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order data (scoped based on requester)
 *       403:
 *         description: No permission to view this order
 */
router.get('/:id', protect, getOrderById);

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status transition
 *       403:
 *         description: Not a vendor on this order
 */
router.patch('/:id/status', protect, restrictTo('vendor'), validate(updateOrderStatusSchema), updateOrderStatus);

module.exports = router;