import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  timingSafeCompare,
  signSession,
  verifySession,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  _clearRateLimits,
} from './auth';

describe('Auth logic', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'super-secret-random-key-at-least-32-chars-long';
    _clearRateLimits();
  });

  describe('timingSafeCompare', () => {
    it('returns true for matching strings', () => {
      expect(timingSafeCompare('anurag', 'anurag')).toBe(true);
      expect(timingSafeCompare('secret123', 'secret123')).toBe(true);
    });

    it('returns false for mismatched strings', () => {
      expect(timingSafeCompare('anurag', 'admin')).toBe(false);
      expect(timingSafeCompare('pass1', 'pass2')).toBe(false);
    });
  });

  describe('signSession and verifySession', () => {
    it('signs and verifies a valid session token', () => {
      const token = signSession();
      expect(verifySession(token)).toBe(true);
    });

    it('rejects null, undefined, or empty token', () => {
      expect(verifySession(null)).toBe(false);
      expect(verifySession(undefined)).toBe(false);
      expect(verifySession('')).toBe(false);
    });

    it('rejects tampered payload', () => {
      const token = signSession();
      const parts = token.split('.');
      // Tamper role from owner to visitor
      const tampered = `visitor.${parts[1]}.${parts[2]}`;
      expect(verifySession(tampered)).toBe(false);
    });

    it('rejects tampered signature', () => {
      const token = signSession();
      const parts = token.split('.');
      const firstChar = parts[2][0];
      const replacementChar = firstChar === 'a' ? 'b' : 'a';
      const tamperedSig = replacementChar + parts[2].slice(1);
      const tampered = `${parts[0]}.${parts[1]}.${tamperedSig}`;
      expect(verifySession(tampered)).toBe(false);
    });

    it('rejects expired token', () => {
      const secret = process.env.AUTH_SECRET!;
      const pastExpiry = Date.now() - 1000;
      const payload = `owner.${pastExpiry}`;
      const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const expiredToken = `${payload}.${hmac}`;
      expect(verifySession(expiredToken)).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('allows up to 5 failed attempts, then blocks on the 6th', () => {
      const ip = '192.168.1.100';

      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(ip).allowed).toBe(true);
        recordFailedAttempt(ip);
      }

      const check = checkRateLimit(ip);
      expect(check.allowed).toBe(false);
      expect(check.retryAfterMs).toBeGreaterThan(0);
    });

    it('resets rate limit on success', () => {
      const ip = '192.168.1.100';
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(ip);
      }
      expect(checkRateLimit(ip).allowed).toBe(false);

      resetRateLimit(ip);
      expect(checkRateLimit(ip).allowed).toBe(true);
    });
  });
});
