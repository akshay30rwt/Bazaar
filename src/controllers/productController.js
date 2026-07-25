const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const AppError = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const createProduct = async (req, res, next) => {
    let uploadedImages = [];

    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('You must have a vendor storefront to create products', 403);
        }

        if(!vendor.isActive) {
            throw new AppError('Your storefront is currently suspended', 403);
        }

        if(!req.files || req.files.length === 0) {
            throw new AppError('At least one product image is required', 400);
        }

        const { name, description, price, category, stock } = req.body;

        try {
            for(const file of req.files) {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'bazaar/products', transformation: [{ width: 800, height: 800, crop: 'limit' }] },
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
        catch (uploadError) {
            logger.error(`Product image upload failed: ${uploadError.message}`);
            throw new AppError('Failed to upload product images. Please try again', 500);
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

        try {
            await product.save();
        } 
        catch(saveError) {
            logger.error(`Product save failed after successful image upload: ${saveError.message}`);
            throw new AppError('Failed to save product. Please try again', 500);
        }

        res.status(201).json({
            message: 'Product created successfully',
            product
        });

    } 
    catch(error) {
        if(uploadedImages.length > 0) {
            for(const img of uploadedImages) {
                try {
                    await cloudinary.uploader.destroy(img.publicId);
                } 
                catch(cleanupError) {
                    logger.error(`Failed to clean up orphaned image ${img.publicId}: ${cleanupError.message}`);
                }
            }
        }
        next(error);
    }
};

const getAllProducts = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter = { isActive: true };

        if(req.query.category) {
            filter.category = req.query.category;
        }

        if(req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if(req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
            if(req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
        }

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('vendor', 'storeName rating isActive')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter)
        ]);

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: products
        });
    }
    catch(error) {
        next(error);
    }
};

const searchProducts = async (req, res, next) => {
    try {
        const { q } = req.query;

        if(!q || q.trim().length === 0) {
            throw new AppError('Search query cannot be empty', 400);
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter = {
            isActive: true,
            $text: { $search: q }
        };

        const [products, total] = await Promise.all([
            Product.find(filter, { score: { $meta: 'textScore' } })
                .populate('vendor', 'storeName rating')
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter)
        ]);

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: products
        });
    }
    catch(error) {
        next(error);
    }
};

const getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate('vendor', 'storeName rating isActive');

        if(!product) {
            throw new AppError('Product not found', 404);
        }

        if(!product.isActive || !product.vendor.isActive) {
            throw new AppError('Product not found', 404);
        }

        res.status(200).json(product);
    } 
    catch(error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid product ID format', 400));
        }
        next(error);
    }
};

const updateProduct = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const product = await Product.findById(req.params.id);

        if(!product) {
            throw new AppError('Product not found', 404);
        }

        if(product.vendor.toString() !== vendor._id.toString()) {
            throw new AppError('You do not have permission to modify this product', 403);
        }

        const { name, description, price, category, stock, isActive } = req.body;

        if(name !== undefined) product.name = name;
        if(description !== undefined) product.description = description;
        if(price !== undefined) product.price = price;
        if(category !== undefined) product.category = category;
        if(stock !== undefined) product.stock = stock;
        if(isActive !== undefined) product.isActive = isActive;

        await product.save();

        res.status(200).json({
            message: 'Product updated successfully',
            product
        });
    } 
    catch(error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid product ID format', 400));
        }
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const product = await Product.findById(req.params.id);

        if(!product) {
            throw new AppError('Product not found', 404);
        }

        if(product.vendor.toString() !== vendor._id.toString()) {
            throw new AppError('You do not have permission to delete this product', 403);
        }

        const deletedImages = [...product.images];

        await Product.findByIdAndDelete(req.params.id);

        for(const img of deletedImages) {
            try {
                await cloudinary.uploader.destroy(img.publicId);
            } 
            catch(cleanupError) {
                logger.error(`Failed to delete image ${img.publicId} for deleted product ${req.params.id}: ${cleanupError.message}`);
            }
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } 
    catch(error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid product ID format', 400));
        }
        next(error);
    }
};

const addProductImages = async (req, res, next) => {
    let uploadedImages = [];

    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const product = await Product.findById(req.params.id);

        if(!product) {
            throw new AppError('Product not found', 404);
        }

        if(product.vendor.toString() !== vendor._id.toString()) {
            throw new AppError('You do not have permission to modify this product', 403);
        }

        if(!req.files || req.files.length === 0) {
            throw new AppError('At least one image is required', 400);
        }

        const MAX_IMAGES_PER_PRODUCT = 5;
        if(product.images.length + req.files.length > MAX_IMAGES_PER_PRODUCT) {
            throw new AppError(`A product cannot have more than ${MAX_IMAGES_PER_PRODUCT} images. Currently has ${product.images.length}`, 400);
        }

        try {
            for(const file of req.files) {
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'bazaar/products', transformation: [{ width: 800, height: 800, crop: 'limit' }] },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    uploadStream.end(file.buffer);
                });
                uploadedImages.push({ url: result.secure_url, publicId: result.public_id });
            }
        } 
        catch(uploadError) {
            logger.error(`Image upload failed for product ${product._id}: ${uploadError.message}`);
            throw new AppError('Failed to upload images. Please try again', 500);
        }

        product.images.push(...uploadedImages);

        try {
            await product.save();
        } 
        catch(saveError) {
            logger.error(`Failed to save product ${product._id} after image upload: ${saveError.message}`);
            throw new AppError('Failed to save new images. Please try again', 500);
        }

        res.status(200).json({
            message: 'Images added successfully',
            images: product.images
        });
    } 
    catch(error) {
        if(uploadedImages.length > 0) {
            for(const img of uploadedImages) {
                try {
                    await cloudinary.uploader.destroy(img.publicId);
                } 
                catch(cleanupError) {
                    logger.error(`Failed to clean up orphaned image ${img.publicId}: ${cleanupError.message}`);
                }
            }
        }
        if(error.name === 'CastError') {
            return next(new AppError('Invalid product ID format', 400));
        }
        next(error);
    }
};

const removeProductImage = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const product = await Product.findById(req.params.id);

        if(!product) {
            throw new AppError('Product not found', 404);
        }

        if(product.vendor.toString() !== vendor._id.toString()) {
            throw new AppError('You do not have permission to modify this product', 403);
        }

        const imageIndex = product.images.findIndex(
            img => img._id.toString() === req.params.imageId
        );

        if(imageIndex === -1) {
            throw new AppError('Image not found on this product', 404);
        }

        if(product.images.length === 1) {
            throw new AppError('Cannot remove the last image. A product must have at least one image', 400);
        }

        const [removedImage] = product.images.splice(imageIndex, 1);
        await product.save();

        try {
            await cloudinary.uploader.destroy(removedImage.publicId);
        } 
        catch(cleanupError) {
            logger.error(`Failed to delete Cloudinary image ${removedImage.publicId}: ${cleanupError.message}`);
        }

        res.status(200).json({
            message: 'Image removed successfully',
            images: product.images
        });
    } 
    catch (error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid ID format', 400));
        }
        next(error);
    }
};

module.exports = { 
    createProduct, 
    getAllProducts, 
    searchProducts, 
    getProductById, 
    updateProduct, 
    deleteProduct, 
    addProductImages, 
    removeProductImage 
};