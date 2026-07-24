const Joi = require('joi');

const createProductSchema = Joi.object({
    name: Joi.string().trim().min(2).max(150).required()
        .messages({
            'string.min': 'Product name must be at least 2 characters',
            'any.required': 'Product name is required'
        }),
    description: Joi.string().trim().max(2000).allow('').optional(),
    price: Joi.number().min(0).required()
        .messages({
            'number.min': 'Price cannot be negative',
            'any.required': 'Price is required'
        }),
    category: Joi.string().trim().min(2).max(50).required()
        .messages({
            'any.required': 'Category is required'
        }),
    stock: Joi.number().integer().min(0).required()
        .messages({
            'number.min': 'Stock cannot be negative',
            'number.integer': 'Stock must be a whole number',
            'any.required': 'Stock quantity is required'
        })
});

const updateProductSchema = Joi.object({
    name: Joi.string().trim().min(2).max(150),
    description: Joi.string().trim().max(2000).allow(''),
    price: Joi.number().min(0),
    category: Joi.string().trim().min(2).max(50),
    stock: Joi.number().integer().min(0),
    isActive: Joi.boolean()
}).min(1).messages({
    'object.min': 'At least one field must be provided to update'
});

module.exports = { createProductSchema, updateProductSchema };