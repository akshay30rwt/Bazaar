const Joi = require('joi');

const createReviewSchema = Joi.object({
    product: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
            'string.pattern.base': 'Invalid product ID format',
            'any.required': 'Product ID is required'
        }),
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'number.integer': 'Rating must be a whole number',
            'any.required': 'Rating is required'
        }),
    comment: Joi.string().trim().max(1000).allow('').optional()
});

module.exports = { createReviewSchema };