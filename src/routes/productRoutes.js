const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const restrictTo = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createProductSchema, updateProductSchema } = require('../validators/productValidator');
const {
    createProduct,
    getAllProducts,
    searchProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    addProductImages,
    removeProductImage
} = require('../controllers/productController');

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               stock:
 *                 type: number
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       403:
 *         description: Not a vendor or storefront suspended
 */
router.post(
    '/',
    protect,
    restrictTo('vendor'),
    upload.multiple('images', 5),
    validate(createProductSchema),
    createProduct
);

/**
 * @swagger
 * /products/search:
 *   get:
 *     summary: Search products by keyword
 *     tags: [Products]
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Matching products
 *       400:
 *         description: Search query cannot be empty
 */
router.get('/search', searchProducts);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products (paginated, filterable)
 *     tags: [Products]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer }
 *       - name: limit
 *         in: query
 *         schema: { type: integer }
 *       - name: category
 *         in: query
 *         schema: { type: string }
 *       - name: minPrice
 *         in: query
 *         schema: { type: number }
 *       - name: maxPrice
 *         in: query
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Paginated product list
 */
router.get('/', getAllProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     responses:
 *       200:
 *         description: Product data
 *       404:
 *         description: Product not found
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product fields (not images)
 *     tags: [Products]
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
 *         description: Product updated
 *       403:
 *         description: Not the owning vendor
 */
router.put('/:id', protect, restrictTo('vendor'), validate(updateProductSchema), updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
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
 *         description: Product deleted
 *       403:
 *         description: Not the owning vendor
 */
router.delete('/:id', protect, restrictTo('vendor'), deleteProduct);

/**
 * @swagger
 * /products/{id}/images:
 *   post:
 *     summary: Add images to an existing product
 *     tags: [Products]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Images added
 *       400:
 *         description: Max image limit reached
 */
router.post('/:id/images', protect, restrictTo('vendor'), upload.multiple('images', 5), addProductImages);

/**
 * @swagger
 * /products/{id}/images/{imageId}:
 *   delete:
 *     summary: Remove a specific image from a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: imageId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image removed
 *       400:
 *         description: Cannot remove last remaining image
 */
router.delete('/:id/images/:imageId', protect, restrictTo('vendor'), removeProductImage);

module.exports = router;