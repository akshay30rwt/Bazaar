jest.mock('../../src/utils/sendEmail', () => require('../mocks/sendEmail'));

const sendEmail = require('../../src/utils/sendEmail');
const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const bcrypt = require('bcryptjs');

describe('Auth Integration Tests', () => {
    describe('POST /auth/register', () => {
        it('should attempt to send a verification email on successful registration', async () => {
            await request(app)
                .post('/auth/register')
                .send({
                    name: 'Email Test User',
                    email: 'emailtest@example.com',
                    password: 'Password123'
                });

            expect(sendEmail).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'emailtest@example.com',
                    subject: expect.stringContaining('Verify')
                })
            );
        });

        it('should register a new user successfully', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Test User',
                    email: 'testuser@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(201);
            expect(response.body.message).toContain('Registration successful');
        });

        it('should reject registration with a duplicate email', async () => {
            await request(app)
                .post('/auth/register')
                .send({
                    name: 'First User',
                    email: 'duplicate@example.com',
                    password: 'Password123'
                });

            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Second User',
                    email: 'duplicate@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(409);
        });

        it('should reject registration with an invalid email format', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Test User',
                    email: 'not-an-email',
                    password: 'Password123'
                });

            expect(response.status).toBe(400);
        });

        it('should reject registration with a weak password', async () => {
            const response = await request(app)
                .post('/auth/register')
                .send({
                    name: 'Test User',
                    email: 'weakpass@example.com',
                    password: '123456'
                });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            const user = new User({
                name: 'Login Test User',
                email: 'logintest@example.com',
                password: '$2a$10$abcdefghijklmnopqrstuv',
                isVerified: true
            });
            await user.save();
        });

        it('should successfully login with correct credentials', async () => {
            const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);

            const user = new User({
                name: 'Real Login User',
                email: 'reallogin@example.com',
                password: hashedPassword,
                isVerified: true
            });
            await user.save();

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'reallogin@example.com',
                    password: 'CorrectPassword123'
                });

            expect(response.status).toBe(200);
            expect(response.body.token).toBeDefined();
            expect(response.body.user.email).toBe('reallogin@example.com');
        });

        it('should reject login for a non-existent email', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'nobody@example.com',
                    password: 'Password123'
                });

            expect(response.status).toBe(401);
        });

        it('should reject login for an unverified account', async () => {
            const unverifiedUser = new User({
                name: 'Unverified User',
                email: 'unverified@example.com',
                password: '$2a$10$abcdefghijklmnopqrstuv',
                isVerified: false
            });
            await unverifiedUser.save();

            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'unverified@example.com',
                    password: 'anypassword'
                });

            expect(response.status).toBe(403);
        });
    });
});