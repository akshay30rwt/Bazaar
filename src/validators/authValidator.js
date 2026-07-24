const Joi = require('joi');

const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
        .messages({
            'string.empty': 'Name cannot be empty',
            'string.min': 'Name must be at least 2 characters',
            'any.required': 'Name is required'
        }),
    email: Joi.string().trim().lowercase().email().required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    password: Joi.string().min(6).max(128).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .messages({
            'string.min': 'Password must be at least 6 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'Password is required'
        })
});

const loginSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string().trim().lowercase().email().required()
});

const resetPasswordSchema = Joi.object({
    password: Joi.string().min(6).max(128).required()
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        })
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};