const AppError = require('../utils/AppError');

const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if(!req.userRole) {
            return next(new AppError('User role not found. Please login again', 401));
        }

        if(!allowedRoles.includes(req.userRole)) {
            return next(new AppError(`Access denied. This action requires one of these roles: ${allowedRoles.join(', ')}`, 403));
        }

        next();
    };
};

module.exports = restrictTo;