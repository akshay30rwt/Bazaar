const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
        required: true
    },
    relatedProduct: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    unreadCountBuyer: {
        type: Number,
        default: 0,
        min: 0
    },
    unreadCountVendor: {
        type: Number,
        default: 0,
        min: 0
    }
}, { timestamps: true });

conversationSchema.index({ buyer: 1, vendor: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ vendor: 1, lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;