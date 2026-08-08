const mongoose = require('mongoose');
const orderRepository = require('../repositories/orderRepository');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const logger = require('../utils/logger');
const Vendor = require('../models/Vendor');

const placeOrder = async ({ customerId, customerEmail, items, shippingAddress }) => {
    const session = await mongoose.startSession();

    try {
        const productIds = items.map(item => item.product);
        const uniqueProductIds = new Set(productIds);
        if (uniqueProductIds.size !== productIds.length) {
            throw new AppError('Duplicate products in order. Please combine quantities into a single entry per product', 400);
        }

        session.startTransaction();

        const orderItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const product = await orderRepository.findProductById(item.product, session);

            if (!product) {
                throw new AppError(`Product not found: ${item.product}`, 404);
            }

            if (!product.isActive || !product.vendor.isActive) {
                throw new AppError(`Product "${product.name}" is currently unavailable`, 400);
            }

            const updatedProduct = await orderRepository.decrementStockAtomically(item.product, item.quantity, session);

            if (!updatedProduct) {
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

        const order = await orderRepository.createOrderDocument(
            { customer: customerId, items: orderItems, totalAmount, shippingAddress },
            session
        );

        await session.commitTransaction();

        try {
            await sendEmail({
                to: customerEmail,
                subject: 'Order Confirmation - Bazaar',
                html: `<h2>Order Confirmed</h2><p>Your order of ${orderItems.length} item(s) totaling ₹${totalAmount} has been placed successfully.</p><p>Order ID: ${order._id}</p>`
            });
        } catch (emailError) {
            logger.error(`Order confirmation email failed for order ${order._id}: ${emailError.message}`);
        }

        return order;

    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
};

const { isVendorOnOrder, filterOrderItemsForVendor } = require('../utils/orderHelpers');

const getCustomerOrders = async ({ customerId, page, limit }) => {
    const skip = (page - 1) * limit;
    const [orders, total] = await orderRepository.findOrdersByCustomer(customerId, skip, limit);
    return { orders, total };
};

const getVendorOrders = async ({ userId, page, limit }) => {
    const vendor = await Vendor.findOne({ user: userId });

    if (!vendor) {
        throw new AppError('Vendor profile not found', 404);
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await orderRepository.findOrdersByVendorItems(vendor._id, skip, limit);
    const scopedOrders = orders.map(order => filterOrderItemsForVendor(order, vendor._id));

    return { orders: scopedOrders, total };
};

const getOrderById = async ({ orderId, userId, userRole }) => {
    const order = await orderRepository.findOrderById(orderId);

    if (!order) {
        throw new AppError('Order not found', 404);
    }

    const isOwner = order.customer._id.toString() === userId.toString();
    const vendor = await Vendor.findOne({ user: userId });
    const isVendorOnThisOrder = vendor ? isVendorOnOrder(order, vendor._id) : false;

    if (!isOwner && !isVendorOnThisOrder && userRole !== 'admin') {
        throw new AppError('You do not have permission to view this order', 403);
    }

    const isVendorViewer = isVendorOnThisOrder && !isOwner && userRole !== 'admin';
    return isVendorViewer ? filterOrderItemsForVendor(order, vendor._id) : order.toObject();
};

const VALID_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: []
};

const updateOrderStatus = async ({ orderId, userId, newStatus }) => {
    const session = await mongoose.startSession();

    try {
        const vendor = await Vendor.findOne({ user: userId });

        if (!vendor) {
            throw new AppError('Vendor profile not found', 404);
        }

        const order = await orderRepository.findOrderById(orderId);

        if (!order) {
            throw new AppError('Order not found', 404);
        }

        if (!isVendorOnOrder(order, vendor._id)) {
            throw new AppError('You do not have permission to update this order', 403);
        }

        const currentStatus = order.status;
        const allowedNextStatuses = VALID_TRANSITIONS[currentStatus];

        if (!allowedNextStatuses.includes(newStatus)) {
            throw new AppError(
                `Cannot change order status from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none (final status)'}`,
                400
            );
        }

        if (newStatus === 'cancelled') {
            session.startTransaction();

            for (const item of order.items) {
                await orderRepository.incrementStockAtomically(item.product, item.quantity, session);
            }

            order.status = newStatus;
            await orderRepository.saveOrder(order, session);
            await session.commitTransaction();
        } else {
            order.status = newStatus;
            await orderRepository.saveOrder(order);
        }

        return order;

    } catch (err) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw err;
    } finally {
        session.endSession();
    }
};

module.exports = { placeOrder, getCustomerOrders, getVendorOrders, getOrderById, updateOrderStatus };