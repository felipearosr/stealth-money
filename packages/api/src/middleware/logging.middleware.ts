// src/middleware/logging.middleware.ts
import winston from 'winston';
import expressWinston from 'express-winston';
import { Request, Response } from 'express';

// Create Winston logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'stealth-money-api' },
  transports: [
    // Write all logs with importance level of 'error' or less to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
export const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}}",
  expressFormat: true,
  colorize: false,
  ignoreRoute: (req: Request, res: Response) => {
    // Don't log health checks and static assets
    return req.url === '/health' || req.url === '/favicon.ico';
  },
  requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
  responseWhitelist: ['statusCode'],
  dynamicMeta: (req: Request, res: Response) => {
    return {
      requestId: req.headers['x-request-id'],
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };
  }
});

// Error logging middleware
export const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  meta: true,
  msg: "HTTP {{req.method}} {{req.url}} - {{err.message}}",
  requestWhitelist: ['url', 'method', 'httpVersion', 'originalUrl', 'query'],
  dynamicMeta: (req: Request, res: Response, err: Error) => {
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
export const logSecurityEvent = (event: string, details: any, req?: Request) => {
  logger.warn('Security Event', {
    event,
    details,
    requestId: req?.headers['x-request-id'],
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
};

// Transaction event logger
export const logTransactionEvent = (transactionId: string, event: string, details: any) => {
  logger.info('Transaction Event', {
    transactionId,
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Blockchain event logger
export const logBlockchainEvent = (event: string, details: any) => {
  logger.info('Blockchain Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
  });
};