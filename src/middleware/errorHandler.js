const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    if(isOperational) {
        logger.warn(`${err.message} - ${req.method} ${req.originalUrl}`);
    } else {
        logger.error(`UNEXPECTED ERROR: ${err.message} - ${req.method} ${req.originalUrl}\n${err.stack}`);
    }

    const message = isOperational
        ? err.message
        : (process.env.NODE_ENV === 'production'
            ? 'Something went wrong. Please try again later.'
            : err.message
        );

    res.status(statusCode).json({
        error: {
            message,
            statusCode
        }
    });
};

module.exports = errorHandler;