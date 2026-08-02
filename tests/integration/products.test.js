jest.mock('../../src/config/cloudinary', () => ({
    uploader: {
        upload_stream: jest.fn((options, callback) => {
            const mockWritable = {
                end: () => {
                    callback(null, {
                        secure_url: 'https://res.cloudinary.com/mock/image/upload/mock-id.jpg',
                        public_id: 'mock-public-id'
                    });
                }
            };
            return mockWritable;
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vendor = require('../../src/models/Vendor');
const Product = require('../../src/models/Product');

describe('Product Integration Tests', () => {
    let vendorToken;
    let vendorProfileId;
    let otherVendorToken;
    let productId;

    beforeEach(async () => {
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

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ email: 'vendor@example.com', password: 'VendorPass123' });
        vendorToken = loginResponse.body.token;

        const otherVendorPassword = await bcrypt.hash('OtherPass123', 10);
        const otherVendorUser = new User({
            name: 'Other Vendor',
            email: 'othervendor@example.com',
            password: otherVendorPassword,
            isVerified: true,
            role: 'vendor'
        });
        await otherVendorUser.save();

        const otherVendorProfile = new Vendor({
            user: otherVendorUser._id,
            storeName: 'Other Store'
        });
        await otherVendorProfile.save();

        const otherLoginResponse = await request(app)
            .post('/auth/login')
            .send({ email: 'othervendor@example.com', password: 'OtherPass123' });
        otherVendorToken = otherLoginResponse.body.token;

        const product = new Product({
            vendor: vendorProfile._id,
            name: 'Original Product',
            price: 1000,
            category: 'electronics',
            stock: 20,
            images: [{ url: 'http://example.com/img.jpg', publicId: 'test-id' }]
        });
        await product.save();
        productId = product._id;
    });

    describe('POST /products', () => {
        it('should create a product successfully with an image', async () => {
            const response = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${vendorToken}`)
                .field('name', 'New Product')
                .field('description', 'A test product')
                .field('price', 750)
                .field('category', 'books')
                .field('stock', 15)
                .attach('images', Buffer.from('fake image content'), 'test.jpg');

            expect(response.status).toBe(201);
            expect(response.body.product.name).toBe('New Product');
            expect(response.body.product.category).toBe('books');
        });

        it('should reject product creation without an image', async () => {
            const response = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${vendorToken}`)
                .field('name', 'No Image Product')
                .field('price', 500)
                .field('category', 'toys')
                .field('stock', 5);

            expect(response.status).toBe(400);
        });

        it('should reject product creation from a non-vendor account', async () => {
            const customerPassword = await bcrypt.hash('CustomerPass123', 10);
            const customer = new User({
                name: 'Plain Customer',
                email: 'plaincustomer@example.com',
                password: customerPassword,
                isVerified: true
            });
            await customer.save();

            const loginResponse = await request(app)
                .post('/auth/login')
                .send({ email: 'plaincustomer@example.com', password: 'CustomerPass123' });

            const response = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${loginResponse.body.token}`)
                .field('name', 'Unauthorized Product')
                .field('price', 100)
                .field('category', 'misc')
                .field('stock', 1)
                .attach('images', Buffer.from('fake image'), 'test.jpg');

            expect(response.status).toBe(403);
        });
    });
});