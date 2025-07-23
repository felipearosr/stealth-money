"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logBlockchainEvent = exports.logTransactionEvent = exports.logSecurityEvent = exports.errorLogger = exports.requestLogger = exports.logger = void 0;
// src/middleware/logging.middleware.ts
const winston_1 = __importDefault(require("winston"));
const express_winston_1 = __importDefault(require("express-winston"));
// Create Winston logger instance
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: { service: 'stealth-money-api' },
    transports: [
        // Write all logs with importance level of 'error' or less to error.log
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs to combined.log
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }));
}
// Request logging middleware
exports.requestLogger = express_winston_1.default.logger({
    winstonInstance: exports.logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
    ignoreRoute: (req, res) => {
        // Don't log health checks and static assets
        return req.url === '/health' || req.url === '/favicon.ico';
    },
    requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
    responseWhitelist: ['statusCode'],
    dynamicMeta: (req, res) => {
        return {
            requestId: req.headers['x-request-id'],
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            timestamp: new Date().toISOString(),
        };
    }
});
// Error logging middleware
exports.errorLogger = express_winston_1.default.errorLogger({
    winstonInstance: exports.logger,
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}} - {{err.message}}",
    requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
    dynamicMeta: (req, res, err) => {
        return {
            requestId: req.headers['x-request-id'],
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack,
            },
            timestamp: new Date().toISOString(),
        };
    }
});
// Security event logger
const logSecurityEvent = (event, details, req) => {
    exports.logger.warn('Security Event', {
        event,
        details,
        requestId: req?.headers['x-request-id'],
        ip: req?.ip,
        userAgent: req?.get('User-Agent'),
        timestamp: new Date().toISOString(),
    });
};
exports.logSecurityEvent = logSecurityEvent;
// Transaction event logger
const logTransactionEvent = (transactionId, event, details) => {
    exports.logger.info('Transaction Event', {
        transactionId,
        event,
        details,
        timestamp: new Date().toISOString(),
    });
};
exports.logTransactionEvent = logTransactionEvent;
// Blockchain event logger
const logBlockchainEvent = (event, details) => {
    exports.logger.info('Blockchain Event', {
        event,
        details,
        timestamp: new Date().toISOString(),
    });
};
exports.logBlockchainEvent = logBlockchainEvent;
