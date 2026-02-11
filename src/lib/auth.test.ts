import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, generateToken, verifyToken, isValidEmail, isValidPassword } from './auth';

// Mock environment variable
vi.stubEnv('JWT_SECRET', 'test-secret-key-that-is-long-enough');

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const password = 'testpassword123';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testpassword123';
    const wrongPassword = 'wrongpassword';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password (due to salt)', async () => {
    const password = 'testpassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
    // Both should still verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});

describe('JWT Token', () => {
  const testUser = { id: 'test-uuid-123', email: 'test@example.com' };

  it('should generate a valid token', () => {
    const token = generateToken(testUser);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should verify and decode token correctly', () => {
    const token = generateToken(testUser);
    const payload = verifyToken(token);

    expect(payload.sub).toBe(testUser.id);
    expect(payload.email).toBe(testUser.email);
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('should reject invalid token', () => {
    const invalidToken = 'invalid.token.here';

    expect(() => verifyToken(invalidToken)).toThrow();
  });

  it('should reject tampered token', () => {
    const token = generateToken(testUser);
    const [header, payload, signature] = token.split('.');
    const tamperedToken = `${header}.${payload}.tampered`;

    expect(() => verifyToken(tamperedToken)).toThrow();
  });
});

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('user.name@example.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@example')).toBe(false);
    expect(isValidEmail('user example@test.com')).toBe(false);
  });
});

describe('Password Validation', () => {
  it('should accept passwords with 8+ characters', () => {
    expect(isValidPassword('12345678')).toBe(true);
    expect(isValidPassword('averylongpassword')).toBe(true);
    expect(isValidPassword('exactly8')).toBe(true);
  });

  it('should reject passwords with fewer than 8 characters', () => {
    expect(isValidPassword('')).toBe(false);
    expect(isValidPassword('1234567')).toBe(false);
    expect(isValidPassword('short')).toBe(false);
  });
});
