import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuditService } from '../services/audit.service';

export interface SecurityConfig {
  enableCSRF: boolean;
  enableSecurityHeaders: boolean;
  enableContentSecurityPolicy: boolean;
  enableRateLimiting: boolean;
  trustedOrigins: string[];
  csrfTokenExpiry: number; // in milliseconds
}

export interface CSRFToken {
  token: string;
  expires: number;
  userId?: string;
  sessionId?: string;
}

export class SecurityMiddleware {
  private auditService: AuditService;
  private csrfTokens: Map<string, CSRFToken>;
  private config: SecurityConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.auditService = new AuditService();
    this.csrfTokens = new Map();
    
    this.config = {
      enableCSRF: true,
      enableSecurityHeaders: true,
      enableContentSecurityPolicy: true,
      enableRateLimiting: true,
      trustedOrigins: ['http://localhost:3000', 'https://localhost:3000'],
      csrfTokenExpiry: 60 * 60 * 1000, // 1 hour
      ...config,
    };

    // Cleanup expired CSRF tokens every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 15 * 60 * 1000);
  }

  /**
   * Apply security headers to all responses
   */
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableSecurityHeaders) {
        return next();
      }

      try {
        // Prevent clickjacking
        res.setHeader('X-Frame-Options', 'DENY');
        
        // Prevent MIME type sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Enable XSS protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Enforce HTTPS
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        
        // Prevent referrer leakage
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions policy
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        // Remove server information
        res.removeHeader('X-Powered-By');
        res.setHeader('Server', 'SecureAPI');

        next();
      } catch (error) {
        console.error('Error applying security headers:', error);
        next();
      }
    };
  }

  /**
   * Content Security Policy middleware
   */
  contentSecurityPolicy() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableContentSecurityPolicy) {
        return next();
      }

      try {
        const cspDirectives = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust based on needs
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' https:",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ];

        res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
        next();
      } catch (error) {
        console.error('Error applying CSP:', error);
        next();
      }
    };
  }

  /**
   * CORS middleware with security considerations
   */
  corsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const origin = req.headers.origin;
        
        // Check if origin is in trusted list
        if (origin && this.config.trustedOrigins.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        } else if (!origin) {
          // Allow same-origin requests
          res.setHeader('Access-Control-Allow-Origin', '*');
        } else {
          // Log suspicious origin
          this.auditService.logSecurityEvent(
            'UNTRUSTED_ORIGIN_ACCESS',
            'MEDIUM',
            { origin, path: req.path, method: req.method },
            undefined,
            req
          );
        }

        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.status(200).end();
          return;
        }

        next();
      } catch (error) {
        console.error('Error in CORS middleware:', error);
        next();
      }
    };
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(userId?: string, sessionId?: string): string {
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = Date.now() + this.config.csrfTokenExpiry;

      this.csrfTokens.set(token, {
        token,
        expires,
        userId,
        sessionId,
      });

      console.log(`🔐 Generated CSRF token for user ${userId || 'anonymous'}`);
      return token;
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      throw new Error('Failed to generate CSRF token');
    }
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableCSRF) {
        return next();
      }

      try {
        // Skip CSRF for GET, HEAD, OPTIONS requests
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        const token = req.headers['x-csrf-token'] as string || req.body._csrf;
        
        if (!token) {
          this.auditService.logSecurityEvent(
            'CSRF_TOKEN_MISSING',
            'HIGH',
            { path: req.path, method: req.method },
            undefined,
            req
          );

          return res.status(403).json({
            error: 'CSRF token missing',
            message: 'CSRF token is required for this request',
          });
        }

        const csrfData = this.csrfTokens.get(token);
        
        if (!csrfData) {
          this.auditService.logSecurityEvent(
            'CSRF_TOKEN_INVALID',
            'HIGH',
            { token: token.substring(0, 8) + '...', path: req.path, method: req.method },
            undefined,
            req
          );

          return res.status(403).json({
            error: 'Invalid CSRF token',
            message: 'CSRF token is invalid or expired',
          });
        }

        if (Date.now() > csrfData.expires) {
          this.csrfTokens.delete(token);
          
          this.auditService.logSecurityEvent(
            'CSRF_TOKEN_EXPIRED',
            'MEDIUM',
            { token: token.substring(0, 8) + '...', path: req.path, method: req.method },
            undefined,
            req
          );

          return res.status(403).json({
            error: 'CSRF token expired',
            message: 'CSRF token has expired, please refresh and try again',
          });
        }

        // Token is valid, continue
        next();
      } catch (error) {
        console.error('Error in CSRF protection:', error);
        
        this.auditService.logSecurityEvent(
          'CSRF_PROTECTION_ERROR',
          'HIGH',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          undefined,
          req
        );

        res.status(500).json({
          error: 'Security check failed',
          message: 'An error occurred during security validation',
        });
      }
    };
  }

  /**
   * Input validation and sanitization middleware
   */
  inputValidation() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
          req.body = this.sanitizeObject(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
          req.query = this.sanitizeObject(req.query);
        }

        // Check for suspicious patterns
        const suspiciousPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
          /javascript:/gi, // JavaScript protocol
          /on\w+\s*=/gi, // Event handlers
          /expression\s*\(/gi, // CSS expressions
          /vbscript:/gi, // VBScript protocol
        ];

        const requestString = JSON.stringify({ body: req.body, query: req.query });
        
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(requestString)) {
            this.auditService.logSecurityEvent(
              'SUSPICIOUS_INPUT_DETECTED',
              'HIGH',
              { 
                pattern: pattern.toString(),
                path: req.path,
                method: req.method,
                suspiciousContent: requestString.substring(0, 200),
              },
              undefined,
              req
            );

            return res.status(400).json({
              error: 'Invalid input',
              message: 'Request contains potentially malicious content',
            });
          }
        }

        next();
      } catch (error) {
        console.error('Error in input validation:', error);
        next();
      }
    };
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    return str
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Request logging middleware for security monitoring
   */
  requestLogging() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const startTime = Date.now();
        const originalSend = res.send;
        
        res.send = function(data) {
          const duration = Date.now() - startTime;
          
          // Log suspicious requests
          if (res.statusCode >= 400 || duration > 10000) { // Errors or slow requests
            console.log('🔍 Security Log:', {
              timestamp: new Date().toISOString(),
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              contentLength: req.headers['content-length'],
            });
          }

          return originalSend.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Error in request logging:', error);
        next();
      }
    };
  }

  /**
   * IP-based security checks
   */
  ipSecurityCheck() {
    const suspiciousIPs = new Set<string>();
    const ipRequestCounts = new Map<string, { count: number; lastReset: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const clientIP = this.getClientIP(req);

        // Check if IP is in suspicious list
        if (suspiciousIPs.has(clientIP)) {
          this.auditService.logSecurityEvent(
            'SUSPICIOUS_IP_ACCESS',
            'HIGH',
            { ip: clientIP, path: req.path, method: req.method },
            undefined,
            req
          );

          return res.status(403).json({
            error: 'Access denied',
            message: 'Access from this IP address is restricted',
          });
        }

        // Track request frequency per IP
        const now = Date.now();
        const ipData = ipRequestCounts.get(clientIP) || { count: 0, lastReset: now };

        // Reset counter every minute
        if (now - ipData.lastReset > 60000) {
          ipData.count = 0;
          ipData.lastReset = now;
        }

        ipData.count++;
        ipRequestCounts.set(clientIP, ipData);

        // Flag IPs with excessive requests
        if (ipData.count > 100) { // More than 100 requests per minute
          suspiciousIPs.add(clientIP);
          
          this.auditService.logSecurityEvent(
            'IP_RATE_LIMIT_EXCEEDED',
            'HIGH',
            { ip: clientIP, requestCount: ipData.count },
            undefined,
            req
          );

          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP address',
          });
        }

        next();
      } catch (error) {
        console.error('Error in IP security check:', error);
        next();
      }
    };
  }

  /**
   * Get CSRF token endpoint
   */
  getCSRFTokenEndpoint() {
    return (req: Request, res: Response) => {
      try {
        const userId = req.body?.userId || req.query?.userId;
        const sessionId = req.sessionID || crypto.randomUUID();
        
        const token = this.generateCSRFToken(userId as string, sessionId);
        
        res.json({
          csrfToken: token,
          expires: Date.now() + this.config.csrfTokenExpiry,
        });
      } catch (error) {
        console.error('Error generating CSRF token:', error);
        res.status(500).json({
          error: 'Failed to generate CSRF token',
          message: 'An error occurred while generating security token',
        });
      }
    };
  }

  /**
   * Validate CSRF token endpoint
   */
  validateCSRFTokenEndpoint() {
    return (req: Request, res: Response) => {
      try {
        const { token } = req.body;
        
        if (!token) {
          return res.status(400).json({
            error: 'Token required',
            message: 'CSRF token is required',
          });
        }

        const csrfData = this.csrfTokens.get(token);
        
        if (!csrfData) {
          return res.json({ valid: false, reason: 'Token not found' });
        }

        if (Date.now() > csrfData.expires) {
          this.csrfTokens.delete(token);
          return res.json({ valid: false, reason: 'Token expired' });
        }

        res.json({ 
          valid: true,
          expires: csrfData.expires,
          userId: csrfData.userId,
        });
      } catch (error) {
        console.error('Error validating CSRF token:', error);
        res.status(500).json({
          error: 'Validation failed',
          message: 'An error occurred during token validation',
        });
      }
    };
  }

  /**
   * Get client IP address
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
   * Cleanup expired CSRF tokens
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [token, data] of this.csrfTokens.entries()) {
      if (now > data.expires) {
        this.csrfTokens.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired CSRF tokens`);
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    activeCSRFTokens: number;
    expiredTokensCleanedUp: number;
    securityEventsLogged: number;
  } {
    return {
      activeCSRFTokens: this.csrfTokens.size,
      expiredTokensCleanedUp: 0, // Would track this in production
      securityEventsLogged: 0, // Would track this in production
    };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated security configuration:', newConfig);
  }

  /**
   * Cleanup resources
   */
  disconnect(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.csrfTokens.clear();
    console.log('🔌 Security middleware disconnected');
  }
}