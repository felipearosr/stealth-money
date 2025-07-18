// src/middleware/validation.middleware.ts
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Handle validation errors
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? error.value : undefined
      }))
    });
  }
  next();
};

// Transfer creation validation
export const validateTransferCreation = [
  body('amount')
    .isFloat({ min: 0.01, max: 50000 })
    .withMessage('Amount must be between 0.01 and 50,000'),
  
  body('sourceCurrency')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage('Source currency must be a valid 3-letter currency code'),
  
  body('destCurrency')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage('Destination currency must be a valid 3-letter currency code'),
  
  body('recipientName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Recipient name must contain only letters, spaces, hyphens, apostrophes, and periods'),
  
  body('recipientEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('recipientPhone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Must be a valid phone number'),
  
  body('payoutMethod')
    .optional()
    .isIn(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card'])
    .withMessage('Invalid payout method'),
  
  handleValidationErrors
];

// Recipient information validation
export const validateRecipientUpdate = [
  param('id')
    .isLength({ min: 1 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid transaction ID format'),
  
  body('recipientName')
    .isLength({ min: 2, max: 100 })
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Recipient name must contain only letters, spaces, hyphens, apostrophes, and periods'),
  
  body('recipientEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  
  body('recipientPhone')
    .isMobilePhone('any')
    .withMessage('Must be a valid phone number'),
  
  body('payoutMethod')
    .isIn(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card'])
    .withMessage('Invalid payout method'),
  
  body('payoutDetails')
    .optional()
    .isObject()
    .withMessage('Payout details must be an object'),
  
  handleValidationErrors
];

// Transaction ID validation
export const validateTransactionId = [
  param('id')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid transaction ID format'),
  
  handleValidationErrors
];

// Exchange rate validation
export const validateExchangeRate = [
  param('from')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage('From currency must be a valid 3-letter currency code'),
  
  param('to')
    .isLength({ min: 3, max: 3 })
    .isAlpha()
    .toUpperCase()
    .withMessage('To currency must be a valid 3-letter currency code'),
  
  handleValidationErrors
];

// Webhook validation
export const validateWebhookSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['stripe-signature'];
  
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid webhook signature',
      message: 'Stripe signature header is required'
    });
  }
  
  // Additional signature format validation
  if (!signature.includes('t=') || !signature.includes('v1=')) {
    return res.status(400).json({
      error: 'Invalid webhook signature format',
      message: 'Stripe signature format is invalid'
    });
  }
  
  next();
};

// Zod schema validation middleware factory
export const validateWithZod = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const transferCreationSchema = z.object({
  amount: z.number().min(0.01).max(50000),
  sourceCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  destCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  recipientName: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-'\.]+$/).optional(),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().min(10).max(20).optional(),
  payoutMethod: z.enum(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card']).optional(),
  payoutDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    walletProvider: z.string().optional(),
    walletNumber: z.string().optional(),
    pickupLocation: z.string().optional(),
  }).optional(),
});

export const recipientUpdateSchema = z.object({
  recipientName: z.string().min(2).max(100).regex(/^[a-zA-Z\s\-'\.]+$/),
  recipientEmail: z.string().email(),
  recipientPhone: z.string().min(10).max(20),
  payoutMethod: z.enum(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card']),
  payoutDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    walletProvider: z.string().optional(),
    walletNumber: z.string().optional(),
    pickupLocation: z.string().optional(),
  }).optional(),
});