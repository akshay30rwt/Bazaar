const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const AppError = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const createProduct = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ user: req.userId});
        if(!vendor) {
            throw new AppError('You must have a vendor storefront to create product', 403);
        }

        if(!vendor.isActive) {
            throw new AppError('Your storefront is currently suspended', 403);
        }

        if(!req.files || req.files.length === 0) {
            throw new AppError('At least one product image is required', 400);
        }

        const { name, description, price, category, stock } = req.body;

        const uploadedImages = [];

        try {
            for(const file of req.files) {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'bazaar/products', transformation: [{ width: 800, height: 800, crop: 'limit'}] },
                        (error, result) => {
                            if(error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(file.buffer);
                });

                uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
            }
        }
        catch(uploadError) {
            for(const img of uploadedImages) {
                try {
                    await cloudinary.uploader.destroy(img.publicId);
                }
                catch(cleanupError) {
                    logger.error(`Failed to cleanup orphaned image ${img.publicId}: ${cleanupError.message}`);
                }
            }
            throw new AppError('Failed to upload product images. Please try again', 500)
        }

        const product = new Product({
            vendor: vendor._id,
            name,
            description: description || '',
            price,
            category,
            stock,
            images: uploadedImages
        });
        await product.save();

        res.status(201).json({
            message: 'Product created successfully',
            product
        });
    }
    catch(error) {
        next(error);
    }
};

module.exports = { createProduct };