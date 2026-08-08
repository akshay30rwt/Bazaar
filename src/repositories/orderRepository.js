const Product = require('../models/Product');
const Order = require('../models/Order');

const findProductById = (productId, session) => {
    return Product.findById(productId).populate('vendor', 'isActive').session(session);
};

const decrementStockAtomically = (productId, quantity, session) => {
    return Product.findOneAndUpdate(
        { _id: productId, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { returnDocument: 'after', session }
    );
};

const incrementStockAtomically = (productId, quantity, session) => {
    return Product.findByIdAndUpdate(
        productId,
        { $inc: { stock: quantity } },
        { session }
    );
};

const createOrderDocument = (orderData, session) => {
    const order = new Order(orderData);
    return order.save({ session });
};

const findOrderById = (orderId) => {
    return Order.findById(orderId).populate('customer', 'name email');
};

const findOrdersByCustomer = (customerId, skip, limit) => {
    return Promise.all([
        Order.find({ customer: customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments({ customer: customerId })
    ]);
};

const findOrdersByVendorItems = (vendorId, skip, limit) => {
    const filter = { 'items.vendor': vendorId };
    return Promise.all([
        Order.find(filter).populate('customer', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
        Order.countDocuments(filter)
    ]);
};

const saveOrder = (order, session) => {
    return order.save(session ? { session } : undefined);
};

module.exports = {
    findProductById,
    decrementStockAtomically,
    incrementStockAtomically,
    createOrderDocument,
    findOrderById,
    findOrdersByCustomer,
    findOrdersByVendorItems,
    saveOrder
};