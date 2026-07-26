const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
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

module.exports = { createOrder };