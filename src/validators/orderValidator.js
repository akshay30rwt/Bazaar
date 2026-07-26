const Joi = require('joi');

const orderItemInputSchema = Joi.object({
    product: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
        .messages({
            'string.pattern.base': 'Invalid product ID format',
            'any.required': 'Product ID is required'
        }),
    quantity: Joi.number().integer().min(1).required()
        .messages({
            'number.min': 'Quantity must be at least 1',
            'number.integer': 'Quantity must be a whole number',
            'any.required': 'Quantity is required'
        })
});

const createOrderSchema = Joi.object({
    items: Joi.array().items(orderItemInputSchema).min(1).required()
        .messages({
            'array.min': 'Order must contain at least one item',
            'any.required': 'Order items are required'
        }),
    shippingAddress: Joi.object({
        street: Joi.string().trim().min(3).max(200).required(),
        city: Joi.string().trim().min(2).max(100).required(),
        state: Joi.string().trim().min(2).max(100).required(),
        pincode: Joi.string().trim().pattern(/^[0-9]{6}$/).required()
            .messages({
                'string.pattern.base': 'Pincode must be exactly 6 digits'
            })
    }).required()
});

const updateOrderStatusSchema = Joi.object({
    status: Joi.string().valid('confirmed', 'shipped', 'delivered', 'cancelled').required()
        .messages({
            'any.only': 'Status must be one of: confirmed, shipped, delivered, cancelled',
            'any.required': 'Status is required'
        })
});

module.exports = { createOrderSchema, updateOrderStatusSchema };