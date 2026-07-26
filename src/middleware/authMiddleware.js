const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const User = require('../models/User');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.split(' ')[1];

        if(!token) {
            throw new AppError('No token provided', 401);
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        }
        catch(error) {
            if(error.name === 'TokenExpiredError') {
                throw new AppError('Session expired, please login again', 401)
            }
            throw new AppError('Invalid token', 401);
        }

        const user = await User.findById(decoded.userId).select('-password');

        if(!user) {
            throw new AppError('User belonging to this token no longer exists.', 401);
        }

        req.userId = user._id;
        req.userRole = user.role;
        req.userEmail = user.email;
        next();
    }
    catch(error) {
        next(error);
    }
};

module.exports = protect;