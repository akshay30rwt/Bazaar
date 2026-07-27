const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');

const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const { items, shippingAddress } = req.body;

        const productIds = items.map(item => item.product);
        const uniqueProductIds = new Set(productIds);

        if(uniqueProductIds.size !== productIds.length) {
            throw new AppError('Duplicate products in order. Please combine quantities into a single entry per product', 400);
        }

        session.startTransaction();

        const orderItems = [];
        let totalAmount = 0;

        for(const item of items) {
            const product = await Product.findById(item.product).populate('vendor', 'isActive').session(session);

            if(!product) {
                throw new AppError(`Product not found: ${item.product}`, 404);
            }

            if(!product.isActive || !product.vendor.isActive) {
                throw new AppError(`Product "${product.name}" is currently unavailable`, 400);
            }

            const updatedProduct = await Product.findOneAndUpdate(
                { _id: item.product, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { new: true, session }
            );

            if(!updatedProduct) {
                throw new AppError(`Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`, 400);
            }

            orderItems.push({
                product: product._id,
                vendor: product.vendor._id,
                name: product.name,
                quantity: item.quantity,
                priceAtOrder: product.price
            });

            totalAmount += product.price * item.quantity;
        }

        const order = new Order({
            customer: req.userId,
            items: orderItems,
            totalAmount,
            shippingAddress
        });

        await order.save({ session });

        await session.commitTransaction();

        try {
            await sendEmail({
                to: req.userEmail,
                subject: 'Order Confirmation - Bazaar',
                html: `
                    <h2>Order Confirmed</h2>
                    <p>Your order of ${orderItems.length} item(s) totaling ₹${totalAmount} has been placed successfully.</p>
                    <p>Order ID: ${order._id}</p>
                `
            });
        }
        catch(emailError) {
            logger.error(`Order confirmation email failed for order ${order._id}: ${emailError.message}`);
        }

        res.status(201).json({
            message: 'Order placed successfully',
            order
        });
    }
    catch(error) {
        await session.abortTransaction();
        next(error);
    }
    finally {
        session.endSession();
    }
};

const getCustomerOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter = { customer: req.userId };

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter)
        ]);

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: orders
        });
    }
    catch(error) {
        next(error);
    }
};

const getVendorOrders = async (req, res, next) => {
    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const filter = { 'items.vendor': vendor._id };

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .populate('customer', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Order.countDocuments(filter)
        ]);

        const scopedOrders = orders.map(order => {
            const orderObj = order.toObject();
            orderObj.items = orderObj.items.filter(
                item => item.vendor.toString() === vendor._id.toString()
            );
            return orderObj;
        });

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: scopedOrders
        });
    }
    catch(error) {
        next(error);
    }
};

const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('customer', 'name email');

        if(!order) {
            throw new AppError('Order not found', 404);
        }

        const isOwner = order.customer._id.toString() === req.userId.toString();

        const vendor = await Vendor.findOne({ user: req.userId });
        const isVendorOnOrder = vendor && order.items.some(
            item => item.vendor.toString() === vendor._id.toString()
        );

        if(!isOwner && !isVendorOnOrder && req.userRole !== 'admin') {
            throw new AppError('You do not have permission to view this order', 403);
        }

        const orderObj = order.toObject();

        if(isVendorOnOrder && !isOwner && req.userRole !== 'admin') {
            orderObj.items = orderObj.items.filter(
                item => item.vendor.toString() === vendor._id.toString()
            );
        }

        res.status(200).json(orderObj);
    } 
    catch(error) {
        if (error.name === 'CastError') {
            return next(new AppError('Invalid order ID format', 400));
        }
        next(error);
    }
};

const updateOrderStatus = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        const vendor = await Vendor.findOne({ user: req.userId });

        if(!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const order = await Order.findById(req.params.id);

        if(!order) {
            throw new AppError('Order not found', 404);
        }

        const isVendorOnOrder = order.items.some(
            item => item.vendor.toString() === vendor._id.toString()
        );

        if(!isVendorOnOrder) {
            throw new AppError('You do not have permission to update this order', 403);
        }

        const { status: newStatus } = req.body;
        const currentStatus = order.status;

        const allowedNextStatuses = VALID_TRANSITIONS[currentStatus];

        if(!allowedNextStatuses.includes(newStatus)) {
            throw new AppError(
                `Cannot change order status from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none (final status)'}`,
                400
            );
        }

        if(newStatus === 'cancelled') {
            session.startTransaction();

            for(const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { stock: item.quantity } },
                    { session }
                );
            }

            order.status = newStatus;
            await order.save({ session });

            await session.commitTransaction();
        } else {
            order.status = newStatus;
            await order.save();
        }

        res.status(200).json({
            message: `Order status updated to "${newStatus}"`,
            order
        });
    } 
    catch(error) {
        if(session.inTransaction()) {
            await session.abortTransaction();
        }
        if(error.name === 'CastError') {
            return next(new AppError('Invalid order ID format', 400));
        }
        next(error);
    } finally {
        session.endSession();
    }
};

module.exports = { createOrder, getCustomerOrders, getVendorOrders, getOrderById, updateOrderStatus };