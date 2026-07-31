const { generateToken, hashToken } = require('../../src/utils/generateToken');

describe('generateToken', () => {
    it('should generate a 64-character hex string', () => {
        const token = generateToken();

        expect(token).toHaveLength(64);
        expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate a different token on each call', () => {
        const token1 = generateToken();
        const token2 = generateToken();

        expect(token1).not.toBe(token2);
    });
});

describe('hashToken', () => {
    it('should produce a consistent hash for the same input', () => {
        const token = 'my-test-token';

        const hash1 = hashToken(token);
        const hash2 = hashToken(token);

        expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
        const hash1 = hashToken('token-one');
        const hash2 = hashToken('token-two');

        expect(hash1).not.toBe(hash2);
    });

    it('should produce a 64-character hex string (SHA-256 output)', () => {
        const hash = hashToken('any-token');

        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]+$/);
    });
});