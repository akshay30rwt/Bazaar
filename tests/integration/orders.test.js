const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vendor = require('../../src/models/Vendor');
const Product = require('../../src/models/Product');

describe('Order Integration Tests', () => {
    let customerToken;
    let customerId;
    let vendorProfileId;
    let productId;

    beforeEach(async () => {
        const customerPassword = await bcrypt.hash('CustomerPass123', 10);
        const customer = new User({
            name: 'Test Customer',
            email: 'customer@example.com',
            password: customerPassword,
            isVerified: true
        });
        await customer.save();
        customerId = customer._id;

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ email: 'customer@example.com', password: 'CustomerPass123' });
        customerToken = loginResponse.body.token;

        const vendorPassword = await bcrypt.hash('VendorPass123', 10);
        const vendorUser = new User({
            name: 'Test Vendor',
            email: 'vendor@example.com',
            password: vendorPassword,
            isVerified: true,
            role: 'vendor'
        });
        await vendorUser.save();

        const vendorProfile = new Vendor({
            user: vendorUser._id,
            storeName: 'Test Store'
        });
        await vendorProfile.save();
        vendorProfileId = vendorProfile._id;

        const product = new Product({
            vendor: vendorProfile._id,
            name: 'Test Product',
            price: 500,
            category: 'electronics',
            stock: 10,
            images: [{ url: 'http://example.com/img.jpg', publicId: 'test-public-id' }]
        });
        await product.save();
        productId = product._id;
    });

    describe('POST /orders', () => {
        it('should successfully create an order and deduct stock atomically', async () => {
            const response = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    items: [{ product: productId, quantity: 3 }],
                    shippingAddress: {
                        street: '123 Test Street',
                        city: 'Test City',
                        state: 'Test State',
                        pincode: '110001'
                    }
                });

            expect(response.status).toBe(201);
            expect(response.body.order.totalAmount).toBe(1500);

            const updatedProduct = await Product.findById(productId);
            expect(updatedProduct.stock).toBe(7);
        });

        it('should reject an order when requested quantity exceeds available stock', async () => {
            const response = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    items: [{ product: productId, quantity: 999 }],
                    shippingAddress: {
                        street: '123 Test Street',
                        city: 'Test City',
                        state: 'Test State',
                        pincode: '110001'
                    }
                });

            expect(response.status).toBe(400);

            const unchangedProduct = await Product.findById(productId);
            expect(unchangedProduct.stock).toBe(10);
        });

        it('should reject an order without authentication', async () => {
            const response = await request(app)
                .post('/orders')
                .send({
                    items: [{ product: productId, quantity: 1 }],
                    shippingAddress: {
                        street: '123 Test Street',
                        city: 'Test City',
                        state: 'Test State',
                        pincode: '110001'
                    }
                });

            expect(response.status).toBe(401);
        });
    });
});