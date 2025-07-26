"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = exports.corsConfig = exports.ipWhitelist = exports.requestId = exports.apiKeyAuth = exports.helmetConfig = exports.speedLimiter = exports.transferCreationRateLimit = exports.strictRateLimit = exports.generalRateLimit = void 0;
// src/middleware/security.middleware.ts
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_slow_down_1 = __importDefault(require("express-slow-down"));
const helmet_1 = __importDefault(require("helmet"));
const crypto_1 = __importDefault(require("crypto"));
// Rate limiting configurations
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.strictRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for sensitive endpoints
    message: {
        error: 'Too many requests for this sensitive endpoint',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.transferCreationRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 3, // Limit each IP to 3 transfer creations per minute
    message: {
        error: 'Too many transfer creation attempts',
        retryAfter: '1 minute'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Slow down middleware for additional protection
exports.speedLimiter = (0, express_slow_down_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per windowMs without delay
    delayMs: () => 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
});
// Helmet configuration for security headers
exports.helmetConfig = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com", "https://api.exchangerate-api.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
});
// API Key authentication middleware
const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;
    // Skip API key check in development or if no API key is configured
    if (process.env.NODE_ENV === 'development' || !validApiKey) {
        return next();
    }
    if (!apiKey) {
        return res.status(401).json({
            error: 'API key required',
            message: 'Please provide a valid API key in the x-api-key header'
        });
    }
    if (!secureCompare(apiKey, validApiKey)) {
        return res.status(401).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
        });
    }
    next();
};
exports.apiKeyAuth = apiKeyAuth;
// Secure string comparison to prevent timing attacks
function secureCompare(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
// Request ID middleware for tracking
const requestId = (req, res, next) => {
    const id = crypto_1.default.randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
};
exports.requestId = requestId;
// IP whitelist middleware for sensitive endpoints
const ipWhitelist = (allowedIPs) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        // Skip in development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }
        if (!allowedIPs.includes(clientIP)) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Your IP address is not authorized to access this endpoint'
            });
        }
        next();
    };
};
exports.ipWhitelist = ipWhitelist;
// CORS configuration for production
exports.corsConfig = {
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        // Temporarily allow all origins for debugging (remove in production)
        if (process.env.CORS_DEBUG === 'true') {
            console.log('🔧 CORS DEBUG: Allowing origin:', origin);
            return callback(null, true);
        }
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-request-id', 'stripe-signature'],
};
// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
    // Recursively sanitize object properties
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remove potentially dangerous characters
            return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '')
                .trim();
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    sanitized[key] = sanitize(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    };
    // Sanitize body if it exists
    if (req.body && Object.keys(req.body).length > 0) {
        // Create a new sanitized body object
        const sanitizedBody = sanitize(req.body);
        // Clear the original body and set the sanitized version
        Object.keys(req.body).forEach(key => delete req.body[key]);
        Object.assign(req.body, sanitizedBody);
    }
    // Sanitize query parameters if they exist
    if (req.query && Object.keys(req.query).length > 0) {
        const sanitizedQuery = sanitize(req.query);
        // Store sanitized query in a custom property for access in route handlers
        req.sanitizedQuery = sanitizedQuery;
    }
    // Sanitize params if they exist
    if (req.params && Object.keys(req.params).length > 0) {
        const sanitizedParams = sanitize(req.params);
        // Store sanitized params in a custom property for access in route handlers
        req.sanitizedParams = sanitizedParams;
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
