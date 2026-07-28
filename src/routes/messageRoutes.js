const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { startConversationSchema } = require('../validators/messageValidator');
const { startConversation, getInbox, getConversationMessages } = require('../controllers/messageController');

/**
 * @swagger
 * /conversations:
 *   post:
 *     summary: Start a conversation with a vendor (or send into existing one)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId:
 *                 type: string
 *               productId:
 *                 type: string
 *               initialMessage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation started or continued
 */
router.post('/', protect, validate(startConversationSchema), startConversation);

/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: Get inbox (all conversations for the logged in user)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated conversation list
 */
router.get('/', protect, getInbox);

/**
 * @swagger
 * /conversations/{conversationId}/messages:
 *   get:
 *     summary: Get message history for a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: conversationId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated message history, marks messages as read
 *       403:
 *         description: Not a participant in this conversation
 */
router.get('/:conversationId/messages', protect, getConversationMessages);

module.exports = router;