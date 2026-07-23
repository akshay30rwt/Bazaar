const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const { generateToken, hashToken } = require('../utils/generateToken');
const logger = require('../utils/logger');

const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if(existingUser) {
            throw new AppError('An account with this email already exists', 409);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const plainVerificationToken = generateToken();
        const hashedVerificationToken = hashToken(plainVerificationToken);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'customer',
            verificationToken: hashedVerificationToken,
            verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000
        });
        await user.save();

        const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/verify-email/${plainVerificationToken}`;

        try {
            await sendEmail({
                to: email,
                subject: 'Verify your Bazaar Account',
                html: `
                    <h2>Welcome to Bazaar, ${name}</h2>
                    <p>Click the link below to verify your email address:</p>
                    <a href="${verificationUrl}">Verify Email</a>
                    <p>This link expires in 24 hours.</p>
                `
            });
        }
        catch(emailError) {
            logger.error(`Verification email failed for ${email}, but account was created`);
        }

        res.status(201).json({
            message: 'Registration successful. Please check your email to verify your account.',
            userId: user._id
        });
    }
    catch(error) {
        next(error);
    }
};

module.exports = { register };