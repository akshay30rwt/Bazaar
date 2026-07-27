const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { createReviewSchema } = require('../validators/reviewValidator');
const { createReview, getProductReviews } = require('../controllers/reviewController');

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Submit a review for a purchased, delivered product
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *               rating:
 *                 type: number
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted
 *       403:
 *         description: Not delivered yet, or reviewing own product
 *       409:
 *         description: Already reviewed
 */
router.post('/', protect, validate(createReviewSchema), createReview);

/**
 * @swagger
 * /reviews/product/{productId}:
 *   get:
 *     summary: Get all reviews for a product
 *     tags: [Reviews]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated review list
 */
router.get('/product/:productId', getProductReviews);

module.exports = router;