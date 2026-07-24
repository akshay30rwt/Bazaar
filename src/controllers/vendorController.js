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

const uploadBanner = async (req, res, next) => {
    try {
        if(!req.file) {
            throw new AppError('Please upload a banner image', 400);
        }

        const vendor = await Vendor.findOne({ user: req.userId });
        if(!vendor) {
            throw new AppError('Vendor profile not found. Please create a storefront first', 404);
        }

        if(vendor.banner.publicId) {
            try {
                await cloudinary.uploader.destroy(vendor.banner.publicId);
            }
            catch(cloudinaryError) {
                logger.error(`Failed to delete old banner for vendor ${vendor._id}: ${cloudinaryError.message}`);
            }
        }

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'bazaar/banners', transformation: [{ width: 1200, height: 400, crop: 'fill'}] },
                (error, result) => {
                    if(error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        vendor.banner.url = result.secure_url;
        vendor.banner.publicId = result.public_id;
        await vendor.save();

        res.status(200).json({
            message: 'Banner uploaded successfully',
            banner: vendor.banner
        });
    }
    catch(error) {
        next(error);
    }
};

const getVendorProfile = async (req, res, next) => {
    try {
        const vendor = await Vendor.findById(req.params.id).populate('user', 'name, email, avatar');

        if(!vendor) {
            throw new AppError('Vendor not found', 404);
        }

        if(!vendor.isActive) {
            throw new AppError('This storefront is currently unavailable', 404);
        }

        res.status(200).json(vendor);
    }
    catch(error) {
        next(error);
    }
};

const updateVendor = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ user: req.userId });
        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const { storeName, storeDescription } = req.body;

        if(storeName && storeName !== vendor.storeName) {
            const existingStoreName = await Vendor.findOne({ storeName, _id: { $ne: vendor._id } });
            if(existingStoreName) {
                throw new AppError('This store name is already taken', 409);
            }
            vendor.storeName = storeName;
        }

        if(storeDescription !== undefined) {
            vendor.storeDescription = storeDescription;
        }

        await vendor.save();

        res.status(200).json({
            message: 'Vendor profile updated successfully',
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

module.exports = { createVendor, uploadBanner, getVendorProfile, updateVendor };