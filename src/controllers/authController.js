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

const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        const hashedToken = hashToken(token);

        const user = await User.findOne({
            verificationToken: hashedToken,
            verificationTokenExpiry: { $gt: Date.now() }
        }).select('+verificationToken +verificationTokenExpiry');

        if(!user) {
            throw new AppError('Verification link is invalid or has expired', 400);
        }

        if(user.isVerified) {
            return res.status(200).json({ message: 'Email already verified. You can login' });
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiry = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully. You can now login'})
    }
    catch(error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if(!user) {
            throw new AppError('Invalid email or password', 401);
        }

        if(!user.isVerified) {
            throw new AppError('Please verify your email before logging in', 403);
        }

        const isMatch = await bcrypt.compare(password, hashedPassword);
        if(!isMatch) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = jwt.sign(
            { userId = user._id }, 
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        user.isOnline = true; 
        await user.save();

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });
    }
    catch(error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if(!user) {
            return res.status(200).json({
                message: 'If an account with that email exists, a reset link has been sent.'
            });
        }

        const plainResetToken = generateToken();
        const hashedResetToken = hashToken(plainResetToken);

        user.resetPasswordToken = hashedResetToken;
        user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000;
        await user.save();

        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/forgot-email/${plainResetToken}`;

        try {
            await sendEmail({
                to: email,
                subject: 'Password Reset Request - Bazaar',
                html: `
                    <h2>Password Reset</h2>
                    <p>You requested a password reset. Click below:</p>
                    <a href="${resetUrl}">Reset Password</a>
                    <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                `
            });
        }
        catch(emailError) {
            logger.error(`Password reset email failed for ${email}`);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpiry = undefined;
            await user.save();
            throw new AppError('Could not send reset email, please try again later', 500);
        }

        res.status(200).json({
            message: 'If an account with that email exists, a reset link has been sent.'
        });
    }
    catch(error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const hashedToken = hashToken(token);

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: Date.now() }
        });

        if(!user) {
            throw new AppError('Reset link is invalid or has expired', 400);
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successful. You can now login.' });
    }
    catch(error) {
        next(error);
    }
};

const uploadAvatar = async (req, res, next) => {
    try {
        if(!req.file) {
            throw new AppError('Please upload an image', 400);
        }

        const cloudinary = require('../config/cloudinary');

        const user = await User.findById(req.userId);
        if(!user) {
            throw new AppError('User not found', 404);
        }

        if(user.avatar.publicId) {
            try {
                await cloudinary.uploader.destroy(user.avatar.publicId);
            }
            catch(cloudinaryError) {
                logger.error(`Failed to delete old avatar for user ${user._id}: ${cloudinaryError.message}`);
            }
        }

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'bazaar/avatars', transformation: [{ width: 300, height: 300, crop: 'fill'}] },
                (error, result) => {
                    if(error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        user.avatar.url = result.secure_url;
        user.avatar.publicId = result.public_id;
        await user.save();

        res.status(200).json({
            message: 'Avatar uploaded successfully',
            avatar: user.avatar
        });
    }
    catch(error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);

        if(!user) {
            throw new AppError('User not found', 404);
        }

        res.status(200).json(user);
    }
    catch(error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.userId, { isOnline: false });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch(error) {
        next(error);
    }
};

module.exports = {
    register, 
    verifyEmail, 
    login, 
    forgotPassword, 
    resetPassword, 
    uploadAvatar, 
    getProfile, 
    logout
};