const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    storeName: {
        type: String,
        required: [true, 'Store name is required'],
        trim: true,
        minlength: 2,
        maxlength: 100,
        unique: true
    },
    storeDescription: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    banner: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' }
    },
    rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 }
    },
    totalSales: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const Vendor = mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;