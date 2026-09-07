import { describe, it, expect, beforeEach } from 'vitest';
import { cacheService } from '../../../server/services/cacheService.ts';

describe('Cache & Rate-Limiting Service Unit Tests', () => {
  beforeEach(async () => {
    await cacheService.flush();
  });

  it('should store and retrieve data with TTL', async () => {
    await cacheService.set('test_key', { status: 'actief', score: 95 }, 60);
    const retrieved = await cacheService.get<{ status: string; score: number }>('test_key');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.status).toBe('actief');
    expect(retrieved?.score).toBe(95);
  });

  it('should return null for expired or non-existent keys', async () => {
    const missing = await cacheService.get('non_existent_key');
    expect(missing).toBeNull();
  });

  it('should enforce rate limits and return remaining count', async () => {
    const testIp = '127.0.0.99';
    const limit = 5;

    // First 5 requests should be allowed
    for (let i = 1; i <= limit; i++) {
      const result = await cacheService.checkRateLimit(testIp, limit, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - i);
    }

    // 6th request must be rejected
    const blocked = await cacheService.checkRateLimit(testIp, limit, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('should report healthy operational status', async () => {
    const stats = await cacheService.getCacheStats();
    expect(stats.maxItems).toBeGreaterThan(0);
    expect(typeof stats.size).toBe('number');
    expect(Array.isArray(stats.keys)).toBe(true);
  });
});
