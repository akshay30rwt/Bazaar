const AppError = require('../../src/utils/AppError');

describe('AppError', () => {
    it('should create an error with the correct message and status code', () => {
        const error = new AppError('Something went wrong', 404);

        expect(error.message).toBe('Something went wrong');
        expect(error.statusCode).toBe(404);
    });

    it('should mark the error as operational', () => {
        const error = new AppError('Test error', 400);

        expect(error.isOperational).toBe(true);
    });

    it('should be an instance of the built-in Error class', () => {
        const error = new AppError('Test error', 500);

        expect(error).toBeInstanceOf(Error);
    });
});