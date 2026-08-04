jest.mock('../../src/config/cloudinary', () => ({
    uploader: {
        upload_stream: jest.fn((options, callback) => ({
            end: () => callback(null, {
                secure_url: 'https://res.cloudinary.com/mock/banner.jpg',
                public_id: 'mock-banner-id'
            })
        })),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Vendor = require('../../src/models/Vendor');

describe('Vendor Integration Tests', () => {
    let customerToken;

    beforeEach(async () => {
        const password = await bcrypt.hash('CustomerPass123', 10);
        const user = new User({
            name: 'Future Vendor',
            email: 'futurevendor@example.com',
            password,
            isVerified: true
        });
        await user.save();

        const loginResponse = await request(app)
            .post('/auth/login')
            .send({ email: 'futurevendor@example.com', password: 'CustomerPass123' });
        customerToken = loginResponse.body.token;
    });

    describe('POST /vendors', () => {
        it('should create a vendor storefront and upgrade user role', async () => {
            const response = await request(app)
                .post('/vendors')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ storeName: 'My New Store', storeDescription: 'Selling things' });

            expect(response.status).toBe(201);

            const updatedUser = await User.findOne({ email: 'futurevendor@example.com' });
            expect(updatedUser.role).toBe('vendor');
        });

        it('should reject creating a second storefront for the same user', async () => {
            await request(app)
                .post('/vendors')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ storeName: 'First Store' });

            const response = await request(app)
                .post('/vendors')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ storeName: 'Second Store' });

            expect(response.status).toBe(409);
        });

        it('should reject a duplicate store name from a different user', async () => {
            await request(app)
                .post('/vendors')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ storeName: 'Taken Name' });

            const otherPassword = await bcrypt.hash('OtherPass123', 10);
            const otherUser = new User({
                name: 'Other User',
                email: 'otheruser@example.com',
                password: otherPassword,
                isVerified: true
            });
            await otherUser.save();

            const otherLogin = await request(app)
                .post('/auth/login')
                .send({ email: 'otheruser@example.com', password: 'OtherPass123' });

            const response = await request(app)
                .post('/vendors')
                .set('Authorization', `Bearer ${otherLogin.body.token}`)
                .send({ storeName: 'Taken Name' });

            expect(response.status).toBe(409);
        });
    });

    describe('GET /vendors/:id', () => {
        it('should return 404 for a suspended vendor storefront', async () => {
            const vendorResponse = await request(app)
                .post('/vendors')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ storeName: 'Suspendable Store' });

            await Vendor.findByIdAndUpdate(vendorResponse.body.vendor._id, { isActive: false });

            const response = await request(app)
                .get(`/vendors/${vendorResponse.body.vendor._id}`);

            expect(response.status).toBe(404);
        });
    });
});