const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const AppError = require('../utils/AppError');
const { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } = require('../config/constants');

const createReview = async (req, res, next) => {
    try {
        const { product: productId, rating, comment } = req.body;

        const product = await Product.findById(productId);

        if(!product) {
            throw new AppError('Product not found', 404);
        }

        const vendorProfile = await Vendor.findOne({ user: req.userId });
        if(vendorProfile && product.vendor.toString() === vendorProfile._id.toString()) {
            throw new AppError('You cannot review your own product', 403);
        }

        const deliveredOrder = await Order.findOne({
            customer: req.userId,
            status: 'delivered',
            'items.product': productId
        });

        if(!deliveredOrder) {
            throw new AppError('You can only review products from orders that have been delivered to you', 403);
        }

        const existingReview = await Review.findOne({ product: productId, customer: req.userId });
        if(existingReview) {
            throw new AppError('You have already reviewed this product', 409);
        }

        const review = new Review({
            product: productId,
            customer: req.userId,
            order: deliveredOrder._id,
            rating,
            comment: comment || ''
        });

        try {
            await review.save();
        } 
        catch(saveError) {
            if(saveError.code === 11000) {
                throw new AppError('You have already reviewed this product', 409);
            }
            throw saveError;
        }

        const stats = await Review.aggregate([
            { $match: { product: product._id } },
            {
                $group: {
                    _id: '$product',
                    averageRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);

        product.rating.average = Math.round(stats[0].averageRating * 10) / 10;
        product.rating.count = stats[0].count;
        await product.save();

        res.status(201).json({
            message: 'Review submitted successfully',
            review
        });
    }
    catch(error) {
        next(error);
    }
};

const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId);
        if(!product) {
            throw new AppError('Product not found', 404);
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE));
        const skip = (page - 1) * limit;

        const filter = { product: productId };

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate('customer', 'name avatar')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Review.countDocuments(filter)
        ]);

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: reviews
        });

    } 
    catch(error) {
        if(error.name === 'CastError') {
            return next(new AppError('Invalid product ID format', 400));
        }
        next(error);
    }
};

module.exports = { createReview, getProductReviews };