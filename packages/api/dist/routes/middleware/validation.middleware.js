"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipientUpdateSchema = exports.transferCreationSchema = exports.validateWithZod = exports.validateWebhookSignature = exports.validateExchangeRate = exports.validateTransactionId = exports.validateRecipientUpdate = exports.validateTransferCreation = exports.handleValidationErrors = void 0;
// src/middleware/validation.middleware.ts
const express_validator_1 = require("express-validator");
const zod_1 = require("zod");
// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
exports.handleValidationErrors = handleValidationErrors;
// Transfer creation validation
exports.validateTransferCreation = [
    (0, express_validator_1.body)('amount')
        .isFloat({ min: 0.01, max: 50000 })
        .withMessage('Amount must be between 0.01 and 50,000'),
    (0, express_validator_1.body)('sourceCurrency')
        .isLength({ min: 3, max: 3 })
        .isAlpha()
        .toUpperCase()
        .withMessage('Source currency must be a valid 3-letter currency code'),
    (0, express_validator_1.body)('destCurrency')
        .isLength({ min: 3, max: 3 })
        .isAlpha()
        .toUpperCase()
        .withMessage('Destination currency must be a valid 3-letter currency code'),
    (0, express_validator_1.body)('recipientName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .matches(/^[a-zA-Z\s\-'\.]+$/)
        .withMessage('Recipient name must contain only letters, spaces, hyphens, apostrophes, and periods'),
    (0, express_validator_1.body)('recipientEmail')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    (0, express_validator_1.body)('recipientPhone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Must be a valid phone number'),
    (0, express_validator_1.body)('payoutMethod')
        .optional()
        .isIn(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card'])
        .withMessage('Invalid payout method'),
    exports.handleValidationErrors
];
// Recipient information validation
exports.validateRecipientUpdate = [
    (0, express_validator_1.param)('id')
        .isLength({ min: 1 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid transaction ID format'),
    (0, express_validator_1.body)('recipientName')
        .isLength({ min: 2, max: 100 })
        .matches(/^[a-zA-Z\s\-'\.]+$/)
        .withMessage('Recipient name must contain only letters, spaces, hyphens, apostrophes, and periods'),
    (0, express_validator_1.body)('recipientEmail')
        .isEmail()
        .normalizeEmail()
        .withMessage('Must be a valid email address'),
    (0, express_validator_1.body)('recipientPhone')
        .isMobilePhone('any')
        .withMessage('Must be a valid phone number'),
    (0, express_validator_1.body)('payoutMethod')
        .isIn(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card'])
        .withMessage('Invalid payout method'),
    (0, express_validator_1.body)('payoutDetails')
        .optional()
        .isObject()
        .withMessage('Payout details must be an object'),
    exports.handleValidationErrors
];
// Transaction ID validation
exports.validateTransactionId = [
    (0, express_validator_1.param)('id')
        .isLength({ min: 1, max: 50 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Invalid transaction ID format'),
    exports.handleValidationErrors
];
// Exchange rate validation
exports.validateExchangeRate = [
    (0, express_validator_1.param)('from')
        .isLength({ min: 3, max: 3 })
        .isAlpha()
        .toUpperCase()
        .withMessage('From currency must be a valid 3-letter currency code'),
    (0, express_validator_1.param)('to')
        .isLength({ min: 3, max: 3 })
        .isAlpha()
        .toUpperCase()
        .withMessage('To currency must be a valid 3-letter currency code'),
    exports.handleValidationErrors
];
// Webhook validation
const validateWebhookSignature = (req, res, next) => {
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
exports.validateWebhookSignature = validateWebhookSignature;
// Zod schema validation middleware factory
const validateWithZod = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
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
exports.validateWithZod = validateWithZod;
// Common validation schemas
exports.transferCreationSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0.01).max(50000),
    sourceCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
    destCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
    recipientName: zod_1.z.string().min(2).max(100).regex(/^[a-zA-Z\s\-'\.]+$/).optional(),
    recipientEmail: zod_1.z.string().email().optional(),
    recipientPhone: zod_1.z.string().min(10).max(20).optional(),
    payoutMethod: zod_1.z.enum(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card']).optional(),
    payoutDetails: zod_1.z.object({
        bankName: zod_1.z.string().optional(),
        accountNumber: zod_1.z.string().optional(),
        routingNumber: zod_1.z.string().optional(),
        walletProvider: zod_1.z.string().optional(),
        walletNumber: zod_1.z.string().optional(),
        pickupLocation: zod_1.z.string().optional(),
    }).optional(),
});
exports.recipientUpdateSchema = zod_1.z.object({
    recipientName: zod_1.z.string().min(2).max(100).regex(/^[a-zA-Z\s\-'\.]+$/),
    recipientEmail: zod_1.z.string().email(),
    recipientPhone: zod_1.z.string().min(10).max(20),
    payoutMethod: zod_1.z.enum(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card']),
    payoutDetails: zod_1.z.object({
        bankName: zod_1.z.string().optional(),
        accountNumber: zod_1.z.string().optional(),
        routingNumber: zod_1.z.string().optional(),
        walletProvider: zod_1.z.string().optional(),
        walletNumber: zod_1.z.string().optional(),
        pickupLocation: zod_1.z.string().optional(),
    }).optional(),
});
