import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generator
}

export interface RateLimitInfo {
  totalHits: number;
  totalHitsPerWindow: number;
  resetTime: Date;
  remainingRequests: number;
}

export interface RateLimitStore {
  key: string;
  count: number;
  resetTime: number;
  windowStart: number;
}

export class RateLimitingService {
  private stores: Map<string, RateLimitStore>;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.stores = new Map();
    
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Create rate limiting middleware for payment request generation
   */
  createPaymentRequestLimiter(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
    const defaultConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 payment requests per 15 minutes
      message: 'Too many payment requests created. Please try again later.',
      keyGenerator: (req) => this.generateUserKey(req),
    };

    const finalConfig = { ...defaultConfig, ...config };

    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRateLimit(req, res, next, finalConfig, 'payment_request');
    };
  }

  /**
   * Create rate limiting middleware for transfer requests
   */
  createTransferLimiter(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
    const defaultConfig: RateLimitConfig = {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 5, // 5 transfers per 5 minutes
      message: 'Too many transfer requests. Please try again later.',
      keyGenerator: (req) => this.generateUserKey(req),
    };

    const finalConfig = { ...defaultConfig, ...config };

    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRateLimit(req, res, next, finalConfig, 'transfer');
    };
  }

  /**
   * Create rate limiting middleware for API endpoints
   */
  createAPILimiter(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
    const defaultConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 API calls per 15 minutes
      message: 'Too many API requests. Please try again later.',
      keyGenerator: (req) => this.generateIPKey(req),
    };

    const finalConfig = { ...defaultConfig, ...config };

    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRateLimit(req, res, next, finalConfig, 'api');
    };
  }

  /**
   * Create rate limiting middleware for authentication attempts
   */
  createAuthLimiter(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
    const defaultConfig: RateLimitConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 auth attempts per 15 minutes
      message: 'Too many authentication attempts. Please try again later.',
      keyGenerator: (req) => this.generateIPKey(req),
      skipSuccessfulRequests: true, // Only count failed attempts
    };

    const finalConfig = { ...defaultConfig, ...config };

    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRateLimit(req, res, next, finalConfig, 'auth');
    };
  }

  /**
   * Create rate limiting middleware for QR code generation
   */
  createQRCodeLimiter(config: Partial<RateLimitConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
    const defaultConfig: RateLimitConfig = {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 20, // 20 QR codes per 5 minutes
      message: 'Too many QR code generation requests. Please try again later.',
      keyGenerator: (req) => this.generateUserKey(req),
    };

    const finalConfig = { ...defaultConfig, ...config };

    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRateLimit(req, res, next, finalConfig, 'qr_code');
    };
  }

  /**
   * Handle rate limiting logic
   */
  private handleRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    config: RateLimitConfig,
    limitType: string
  ): void {
    try {
      const key = config.keyGenerator ? config.keyGenerator(req) : this.generateIPKey(req);
      const fullKey = `${limitType}:${key}`;
      
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      let store = this.stores.get(fullKey);
      
      // Initialize or reset if window has passed
      if (!store || store.windowStart < windowStart) {
        store = {
          key: fullKey,
          count: 0,
          resetTime: now + config.windowMs,
          windowStart: now,
        };
        this.stores.set(fullKey, store);
      }

      // Check if request should be counted
      const shouldCount = this.shouldCountRequest(req, res, config);
      
      if (shouldCount) {
        store.count++;
      }

      // Calculate remaining requests
      const remainingRequests = Math.max(0, config.maxRequests - store.count);
      
      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': new Date(store.resetTime).toISOString(),
        'X-RateLimit-Window': config.windowMs.toString(),
      });

      // Check if limit exceeded
      if (store.count > config.maxRequests) {
        console.log(`🚫 Rate limit exceeded for ${limitType}: ${key} (${store.count}/${config.maxRequests})`);
        
        // Log rate limit violation
        this.logRateLimitViolation(req, limitType, store);
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: config.message || 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((store.resetTime - now) / 1000),
          limit: config.maxRequests,
          remaining: 0,
          resetTime: new Date(store.resetTime).toISOString(),
        });
        return;
      }

      // Continue to next middleware
      next();
    } catch (error) {
      console.error('Error in rate limiting:', error);
      // In case of error, allow the request to proceed
      next();
    }
  }

  /**
   * Determine if request should be counted based on configuration
   */
  private shouldCountRequest(req: Request, res: Response, config: RateLimitConfig): boolean {
    // For now, always count the request
    // In a real implementation, you might check response status after the request completes
    return true;
  }

  /**
   * Generate user-based key for rate limiting
   */
  private generateUserKey(req: Request): string {
    // Try to get user ID from various sources
    const userId = req.body?.userId || 
                  req.params?.userId || 
                  req.query?.userId ||
                  req.headers?.['x-user-id'] ||
                  this.extractUserFromAuth(req);
    
    if (userId) {
      return `user:${userId}`;
    }
    
    // Fallback to IP if no user ID available
    return this.generateIPKey(req);
  }

  /**
   * Generate IP-based key for rate limiting
   */
  private generateIPKey(req: Request): string {
    const ip = this.getClientIP(req);
    return `ip:${ip}`;
  }

  /**
   * Extract user ID from authentication headers
   */
  private extractUserFromAuth(req: Request): string | null {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return null;

      // This is a simplified example - in production, properly decode JWT
      const token = authHeader.replace('Bearer ', '');
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return decoded.userId;
      
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    ).split(',')[0].trim();
  }

  /**
   * Check if a specific key is rate limited
   */
  isRateLimited(key: string, limitType: string, maxRequests: number, windowMs: number): boolean {
    const fullKey = `${limitType}:${key}`;
    const store = this.stores.get(fullKey);
    
    if (!store) return false;
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Check if window has expired
    if (store.windowStart < windowStart) {
      this.stores.delete(fullKey);
      return false;
    }
    
    return store.count >= maxRequests;
  }

  /**
   * Get rate limit info for a key
   */
  getRateLimitInfo(key: string, limitType: string, maxRequests: number, windowMs: number): RateLimitInfo {
    const fullKey = `${limitType}:${key}`;
    const store = this.stores.get(fullKey);
    
    if (!store) {
      return {
        totalHits: 0,
        totalHitsPerWindow: 0,
        resetTime: new Date(Date.now() + windowMs),
        remainingRequests: maxRequests,
      };
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Check if window has expired
    if (store.windowStart < windowStart) {
      this.stores.delete(fullKey);
      return {
        totalHits: 0,
        totalHitsPerWindow: 0,
        resetTime: new Date(Date.now() + windowMs),
        remainingRequests: maxRequests,
      };
    }
    
    return {
      totalHits: store.count,
      totalHitsPerWindow: store.count,
      resetTime: new Date(store.resetTime),
      remainingRequests: Math.max(0, maxRequests - store.count),
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  resetRateLimit(key: string, limitType: string): boolean {
    const fullKey = `${limitType}:${key}`;
    const deleted = this.stores.delete(fullKey);
    
    if (deleted) {
      console.log(`🔄 Reset rate limit for ${fullKey}`);
    }
    
    return deleted;
  }

  /**
   * Manually increment rate limit counter (for testing or special cases)
   */
  incrementRateLimit(key: string, limitType: string, windowMs: number): void {
    const fullKey = `${limitType}:${key}`;
    const now = Date.now();
    
    let store = this.stores.get(fullKey);
    
    if (!store) {
      store = {
        key: fullKey,
        count: 0,
        resetTime: now + windowMs,
        windowStart: now,
      };
      this.stores.set(fullKey, store);
    }
    
    store.count++;
    console.log(`📈 Incremented rate limit for ${fullKey}: ${store.count}`);
  }

  /**
   * Get all active rate limits
   */
  getActiveRateLimits(): Array<{
    key: string;
    count: number;
    resetTime: Date;
    windowStart: Date;
  }> {
    const now = Date.now();
    const active: Array<{
      key: string;
      count: number;
      resetTime: Date;
      windowStart: Date;
    }> = [];
    
    for (const [key, store] of this.stores.entries()) {
      if (store.resetTime > now) {
        active.push({
          key,
          count: store.count,
          resetTime: new Date(store.resetTime),
          windowStart: new Date(store.windowStart),
        });
      }
    }
    
    return active;
  }

  /**
   * Get rate limiting statistics
   */
  getStats(): {
    totalActiveKeys: number;
    totalRequests: number;
    rateLimitViolations: number;
    topLimitedKeys: Array<{ key: string; count: number }>;
  } {
    const now = Date.now();
    let totalRequests = 0;
    let rateLimitViolations = 0;
    const keyCounts: Array<{ key: string; count: number }> = [];
    
    for (const [key, store] of this.stores.entries()) {
      if (store.resetTime > now) {
        totalRequests += store.count;
        keyCounts.push({ key, count: store.count });
        
        // This is a simplified check - in production, track violations separately
        if (store.count > 10) { // Assume 10 is a common limit
          rateLimitViolations++;
        }
      }
    }
    
    // Sort by count and take top 10
    const topLimitedKeys = keyCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalActiveKeys: this.stores.size,
      totalRequests,
      rateLimitViolations,
      topLimitedKeys,
    };
  }

  /**
   * Log rate limit violation for audit purposes
   */
  private logRateLimitViolation(req: Request, limitType: string, store: RateLimitStore): void {
    const logData = {
      timestamp: new Date().toISOString(),
      limitType,
      key: store.key,
      count: store.count,
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
    };
    
    console.log('🚨 Rate Limit Violation:', logData);
    
    // In production, store in database or send to monitoring system
    // await this.prisma.rateLimitViolation.create({ data: logData });
  }

  /**
   * Cleanup expired rate limit entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, store] of this.stores.entries()) {
      if (store.resetTime <= now) {
        this.stores.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  /**
   * Create a custom rate limiter with specific configuration
   */
  createCustomLimiter(
    limitType: string,
    config: RateLimitConfig
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      this.handleRateLimit(req, res, next, config, limitType);
    };
  }

  /**
   * Cleanup resources
   */
  disconnect(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.stores.clear();
    console.log('🔌 Rate limiting service disconnected');
  }
}