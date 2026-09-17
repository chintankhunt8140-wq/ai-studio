import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  endpointName: string;
}

class InMemoryRateLimiter {
  private userBuckets: Map<string, RateLimitRecord> = new Map();
  private ipBuckets: Map<string, RateLimitRecord> = new Map();
  private windowMs: number;
  private maxRequests: number;
  private endpointName: string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.endpointName = options.endpointName;

    // Periodic cleanup of stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.userBuckets.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);
      if (record.timestamps.length === 0) {
        this.userBuckets.delete(key);
      }
    }
    for (const [key, record] of this.ipBuckets.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);
      if (record.timestamps.length === 0) {
        this.ipBuckets.delete(key);
      }
    }
  }

  private checkLimit(bucket: Map<string, RateLimitRecord>, identifier: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let record = bucket.get(identifier);
    if (!record) {
      record = { timestamps: [] };
      bucket.set(identifier, record);
    }

    // Keep only timestamps within window
    record.timestamps = record.timestamps.filter((t) => now - t < this.windowMs);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, this.windowMs - (now - oldest));
      return { allowed: false, remaining: 0, resetMs };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - record.timestamps.length,
      resetMs: this.windowMs,
    };
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Exclude admin from strict generation rate limits for administrative operations
      const headerUser = req.headers['x-user-id'] as string;
      if (headerUser === 'user_admin_root') {
        return next();
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userId = headerUser || 'anonymous';

      // Check both user ID limit and IP limit
      const userCheck = this.checkLimit(this.userBuckets, `${this.endpointName}:user:${userId}`);
      const ipCheck = this.checkLimit(this.ipBuckets, `${this.endpointName}:ip:${clientIp}`);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.min(userCheck.remaining, ipCheck.remaining));

      if (!userCheck.allowed || !ipCheck.allowed) {
        const retryAfterSeconds = Math.ceil(Math.max(userCheck.resetMs, ipCheck.resetMs) / 1000);
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          error: `Rate limit exceeded for ${this.endpointName}. Too many requests. Please retry in ${retryAfterSeconds}s.`,
          retryAfterSeconds,
          endpoint: this.endpointName,
        });
      }

      next();
    };
  }
}

// Rate Limiter instances:
// 1. Brain Enhancement: 30 requests per minute per user/IP
export const brainEnhanceLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  endpointName: 'AI Brain Enhance',
}).middleware();

// 2. Job Creation (Image / Video): 15 creation dispatches per minute per user/IP
export const jobCreateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  endpointName: 'Job Generation Dispatch',
}).middleware();
