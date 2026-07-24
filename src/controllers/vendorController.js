const Vendor = require('../models/Vendor');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const cloudinary = require('../config/cloudinary');
const logger = require('../utils/logger');

const createVendor = async (req, res, next) => {
    try {
        const { storeName, storeDescription } = req.body;

        const existingVendorProfile = await Vendor.findOne({ user: req.userId });
        if(existingVendorProfile) {
            throw new AppError('You already have a vendor storefront', 409);
        }

        const existingStoreName = await Vendor.findOne({ storeName });
        if(existingStoreName) {
            throw new AppError('This store name is already taken', 409);
        }

        const vendor = new Vendor({
            user: req.userId,
            storeName,
            storeDescription: storeDescription || ''
        });
        await vendor.save();

        await User.findByIdAndUpdate(req.userId, { role: 'vendor' });

        res.status(201).json({
            message:'Vendor storefront created successfully',
            vendor
        });
    }
    catch(error) {
        if(error.code === 11000) {
            return next(new AppError('This store name is already taken', 409));
        }
        next(error);
    }
};