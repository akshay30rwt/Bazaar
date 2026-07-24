const Joi = require('joi');

const createVendorSchema = Joi.object({
    storeName: Joi.string().trim().min(2).max(100).required()
        .messages({
            'string.min': 'Store name must be at least 2 characters',
            'any.required': 'Store name is required'
        }),
    storeDescription: Joi.string().trim().max(500).allow('').optional()
});

const updateVendorSchema = Joi.object({
    storeName: Joi.string().trim().min(2).max(100),
    storeDescription: Joi.string().trim().max(500).allow('')
}).min(1).messages({
    'object.min': 'At least one field must be provided to update'
});

module.exports = { createVendorSchema, updateVendorSchema };