const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

const requiredKeys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingKeys = requiredKeys.filter(key => !process.env[key]);

if(missingKeys.length > 0) {
    logger.error(`Missing cloudinary environment variables: ${missingKeys.join(', ')}`);
    process.exit(1);
}

module.exports = cloudinary;