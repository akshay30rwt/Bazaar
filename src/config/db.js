const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        mongoose.set('strictQuery', true);

        await mongoose.connect(process.env.MONGO_URI);

        logger.info('MongoDB connected successfully');

        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });
    }
    catch(error) {
        logger.error(`MongoDB initial connection failed: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;