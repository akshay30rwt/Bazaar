const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');

const getPlatformOverview = async (req, res, next) => {
    try {
        const [
            totalUsers,
            totalVendors,
            totalProducts,
            totalOrders,
            revenueResult
        ] = await Promise.all([
            User.countDocuments(),
            Vendor.countDocuments({ isActive: true }),
            Product.countDocuments({ isActive: true }),
            Order.countDocuments({ status: { $ne: 'cancelled' } }),
            Order.aggregate([
                { $match: { status: { $ne: 'cancelled' } } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $multiply: ['$items.priceAtOrder', '$items.quantity'] } }
                    }
                }
            ])
        ]);

        res.status(200).json({
            totalUsers,
            totalActiveVendors: totalVendors,
            totalActiveProducts: totalProducts,
            totalOrders,
            platformRevenue: revenueResult[0]?.totalRevenue || 0
        });
    } 
    catch(error) {
        next(error);
    }
};

const getMostActiveVendors = async (req, res, next) => {
    try {
        const topVendors = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.vendor',
                    revenue: { $sum: { $multiply: ['$items.priceAtOrder', '$items.quantity'] } },
                    itemsSold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { revenue: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'vendors',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'vendorInfo'
                }
            },
            { $unwind: '$vendorInfo' },
            {
                $project: {
                    _id: 0,
                    vendorId: '$_id',
                    storeName: '$vendorInfo.storeName',
                    revenue: 1,
                    itemsSold: 1
                }
            }
        ]);

        res.status(200).json({ topVendors });
    } 
    catch(error) {
        next(error);
    }
};

const getCategorySales = async (req, res, next) => {
    try {
        const categorySales = await Order.aggregate([
            { $match: { status: { $ne: 'cancelled' } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.category',
                    revenue: { $sum: { $multiply: ['$items.priceAtOrder', '$items.quantity'] } },
                    itemsSold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { revenue: -1 } },
            {
                $project: {
                    _id: 0,
                    category: '$_id',
                    revenue: 1,
                    itemsSold: 1
                }
            }
        ]);

        res.status(200).json({ categorySales });
    } 
    catch(error) {
        next(error);
    }
};

const getMostReviewedProducts = async (req, res, next) => {
    try {
        const topReviewed = await Review.aggregate([
            {
                $group: {
                    _id: '$product',
                    reviewCount: { $sum: 1 },
                    averageRating: { $avg: '$rating' }
                }
            },
            { $sort: { reviewCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    name: '$productInfo.name',
                    reviewCount: 1,
                    averageRating: { $round: ['$averageRating', 1] }
                }
            }
        ]);

        res.status(200).json({ topReviewed });
    } 
    catch(error) {
        next(error);
    }
};

module.exports = {
    getPlatformOverview,
    getMostActiveVendors,
    getCategorySales,
    getMostReviewedProducts
};