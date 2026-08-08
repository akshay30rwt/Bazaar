const AppError = require('../utils/AppError');
const orderService = require('../services/orderService');

const createOrder = async (req, res, next) => {
    try {
        const order = await orderService.placeOrder({
            customerId: req.userId,
            customerEmail: req.userEmail,
            items: req.body.items,
            shippingAddress: req.body.shippingAddress
        });

        res.status(201).json({
            message: 'Order placed successfully',
            order
        });

    } catch (err) {
        next(err);
    }
};

const getCustomerOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const { orders, total } = await orderService.getCustomerOrders({
            customerId: req.userId,
            page,
            limit
        });

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: orders
        });
    } catch (err) {
        next(err);
    }
};

const getVendorOrders = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const { orders, total } = await orderService.getVendorOrders({
            userId: req.userId,
            page,
            limit
        });

        res.status(200).json({
            total,
            page,
            totalPages: Math.ceil(total / limit),
            data: orders
        });
    } catch (err) {
        next(err);
    }
};

const getOrderById = async (req, res, next) => {
    try {
        const order = await orderService.getOrderById({
            orderId: req.params.id,
            userId: req.userId,
            userRole: req.userRole
        });

        res.status(200).json(order);
    } catch (err) {
        if (err.name === 'CastError') {
            return next(new AppError('Invalid order ID format', 400));
        }
        next(err);
    }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const order = await orderService.updateOrderStatus({
            orderId: req.params.id,
            userId: req.userId,
            newStatus: req.body.status
        });

        res.status(200).json({ message: `Order status updated to "${req.body.status}"`, order });
    } catch (err) {
        if (err.name === 'CastError') {
            return next(new AppError('Invalid order ID format', 400));
        }
        next(err);
    }
};

module.exports = { createOrder, getCustomerOrders, getVendorOrders, getOrderById, updateOrderStatus };