const request = require('supertest');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vendor = require('../../src/models/Vendor');
const Product = require('../../src/models/Product');
const Order = require('../../src/models/Order');

describe('Review Integration Tests', () => {
    let customerToken;
    let customerId;
    let vendorProfileId;
    let productId;

    beforeEach(async () => {
        const customerPassword = await bcrypt.hash('CustomerPass123', 10);
        const customer = new User({
            name: 'Reviewer',
            email: 'reviewer@example.com',
            password: customerPassword,
            isVerified: true
        });
        await customer.save();
        customerId = customer._id;

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ email: 'reviewer@example.com', password: 'CustomerPass123' });
        customerToken = loginResponse.body.token;

        const vendorPassword = await bcrypt.hash('VendorPass123', 10);
        const vendorUser = new User({
            name: 'Review Test Vendor',
            email: 'reviewvendor@example.com',
            password: vendorPassword,
            isVerified: true,
            role: 'vendor'
        });
        await vendorUser.save();

        const vendorProfile = new Vendor({ user: vendorUser._id, storeName: 'Review Test Store' });
        await vendorProfile.save();
        vendorProfileId = vendorProfile._id;

        const product = new Product({
            vendor: vendorProfile._id,
            name: 'Reviewable Product',
            price: 300,
            category: 'books',
            stock: 10,
            images: [{ url: 'http://example.com/img.jpg', publicId: 'test-id' }]
        });
        await product.save();
        productId = product._id;
    });

    describe('POST /reviews', () => {
        it('should reject a review with no delivered order for the product', async () => {
            const response = await request(app)
                .post('/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ product: productId, rating: 5, comment: 'Great!' });

            expect(response.status).toBe(403);
        });

        it('should allow a review after a delivered order and update product rating', async () => {
            const order = new Order({
                customer: customerId,
                items: [{
                    product: productId,
                    vendor: vendorProfileId,
                    name: 'Reviewable Product',
                    quantity: 1,
                    priceAtOrder: 300
                }],
                totalAmount: 300,
                status: 'delivered',
                shippingAddress: { street: 'A', city: 'B', state: 'C', pincode: '110001' }
            });
            await order.save();

            const response = await request(app)
                .post('/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ product: productId, rating: 4, comment: 'Pretty good' });

            expect(response.status).toBe(201);

            const updatedProduct = await Product.findById(productId);
            expect(updatedProduct.rating.average).toBe(4);
            expect(updatedProduct.rating.count).toBe(1);
        });

        it('should reject a duplicate review for the same product', async () => {
            const order = new Order({
                customer: customerId,
                items: [{
                    product: productId,
                    vendor: vendorProfileId,
                    name: 'Reviewable Product',
                    quantity: 1,
                    priceAtOrder: 300
                }],
                totalAmount: 300,
                status: 'delivered',
                shippingAddress: { street: 'A', city: 'B', state: 'C', pincode: '110001' }
            });
            await order.save();

            await request(app)
                .post('/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ product: productId, rating: 4 });

            const response = await request(app)
                .post('/reviews')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ product: productId, rating: 2 });

            expect(response.status).toBe(409);
        });

        it('should reject a vendor reviewing their own product', async () => {
            const vendorLogin = await request(app)
                .post('/auth/login')
                .send({ email: 'reviewvendor@example.com', password: 'VendorPass123' });

            const order = new Order({
                customer: customerId,
                items: [{
                    product: productId,
                    vendor: vendorProfileId,
                    name: 'Reviewable Product',
                    quantity: 1,
                    priceAtOrder: 300
                }],
                totalAmount: 300,
                status: 'delivered',
                shippingAddress: { street: 'A', city: 'B', state: 'C', pincode: '110001' }
            });
            await order.save();

            const vendorOwnOrder = new Order({
                customer: (await User.findOne({ email: 'reviewvendor@example.com' }))._id,
                items: [{
                    product: productId,
                    vendor: vendorProfileId,
                    name: 'Reviewable Product',
                    quantity: 1,
                    priceAtOrder: 300
                }],
                totalAmount: 300,
                status: 'delivered',
                shippingAddress: { street: 'A', city: 'B', state: 'C', pincode: '110001' }
            });
            await vendorOwnOrder.save();

            const response = await request(app)
                .post('/reviews')
                .set('Authorization', `Bearer ${vendorLogin.body.token}`)
                .send({ product: productId, rating: 5, comment: 'My own great product!' });

            expect(response.status).toBe(403);
        });
    });
});