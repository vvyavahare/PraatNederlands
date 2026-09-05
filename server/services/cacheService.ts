import { metricsService } from './metricsService.ts';
import { logger } from './logger.ts';

interface CacheItem<T> {
  value: T;
  expiresAt: number | null;
  createdAt: number;
}

export class CacheService {
  private inMemoryStore: Map<string, CacheItem<unknown>> = new Map();
  private maxItems = 10000;

  constructor() {
    // Run periodic cleanup every 60 seconds
    setInterval(() => this.cleanupExpired(), 60000);
  }

  public async get<T>(key: string): Promise<T | null> {
    const item = this.inMemoryStore.get(key);
    if (!item) {
      metricsService.recordCacheMiss();
      return null;
    }

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      metricsService.recordCacheMiss();
      return null;
    }

    metricsService.recordCacheHit();
    return item.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.inMemoryStore.size >= this.maxItems) {
      // LRU eviction approximation: delete first inserted key
      const oldestKey = this.inMemoryStore.keys().next().value;
      if (oldestKey) this.inMemoryStore.delete(oldestKey);
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.inMemoryStore.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  public async delete(key: string): Promise<boolean> {
    return this.inMemoryStore.delete(key);
  }

  public async deletePrefix(prefix: string): Promise<number> {
    let count = 0;
    for (const key of this.inMemoryStore.keys()) {
      if (key.startsWith(prefix)) {
        this.inMemoryStore.delete(key);
        count++;
      }
    }
    return count;
  }

  public async checkRateLimit(identifier: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const key = `nl:ratelimit:${identifier}`;
    const current = (await this.get<number>(key)) || 0;

    if (current >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    const nextVal = current + 1;
    await this.set(key, nextVal, windowSeconds);
    return { allowed: true, remaining: maxRequests - nextVal };
  }

  public async getCacheStats() {
    return {
      size: this.inMemoryStore.size,
      maxItems: this.maxItems,
      keys: Array.from(this.inMemoryStore.keys()).slice(0, 30),
    };
  }

  private cleanupExpired() {
    const now = Date.now();
    let expiredCount = 0;
    for (const [key, item] of this.inMemoryStore.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.inMemoryStore.delete(key);
        expiredCount++;
      }
    }
    if (expiredCount > 0) {
      logger.debug('Cleaned up expired cache entries', { expiredCount });
    }
  }
}

export const cacheService = new CacheService();
