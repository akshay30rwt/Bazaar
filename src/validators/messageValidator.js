const Joi = require('joi');

const startConversationSchema = Joi.object({
    vendorId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
            'string.pattern.base': 'Invalid vendor ID format',
            'any.required': 'Vendor ID is required'
        }),
    productId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    initialMessage: Joi.string().trim().min(1).max(2000).required()
        .messages({
            'string.empty': 'Message cannot be empty',
            'any.required': 'An initial message is required to start a conversation'
        })
});

module.exports = { startConversationSchema };