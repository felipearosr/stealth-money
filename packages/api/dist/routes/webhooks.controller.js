"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/webhooks.controller.ts
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const payment_service_1 = require("../services/payment.service");
const orchestrator_service_1 = require("../services/orchestrator.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const logging_middleware_1 = require("../middleware/logging.middleware");
const security_middleware_1 = require("../middleware/security.middleware");
const circle_config_1 = require("../config/circle.config");
const circle_webhook_service_1 = require("../services/circle-webhook.service");
const router = (0, express_1.Router)();
const paymentService = new payment_service_1.PaymentService();
const orchestratorService = new orchestrator_service_1.OrchestratorService();
const circleWebhookService = new circle_webhook_service_1.CircleWebhookService();
/**
 * Circle webhook signature verification
 * Verifies the webhook signature using Circle's webhook secret
 */
function verifyCircleWebhookSignature(payload, signature) {
    const webhookSecret = circle_config_1.circleConfig.getWebhookSecret();
    if (!webhookSecret) {
        throw new Error('Circle webhook secret not configured');
    }
    // Validate signature format (should be hex)
    if (!/^[a-fA-F0-9]+$/.test(signature)) {
        return false;
    }
    try {
        // Circle uses HMAC-SHA256 for webhook signatures
        const expectedSignature = crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(payload, 'utf8')
            .digest('hex');
        // Compare signatures using timing-safe comparison
        return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
    }
    catch (error) {
        // If there's any error in signature comparison, treat as invalid
        return false;
    }
}
/**
 * Circle webhook signature validation middleware
 */
const validateCircleWebhookSignature = (req, res, next) => {
    const signature = req.headers['circle-signature'];
    if (!signature) {
        return res.status(400).json({
            error: 'Missing Circle webhook signature',
            message: 'Circle-Signature header is required'
        });
    }
    try {
        const payload = JSON.stringify(req.body);
        const isValid = verifyCircleWebhookSignature(payload, signature);
        if (!isValid) {
            (0, logging_middleware_1.logSecurityEvent)('circle_webhook_signature_failed', {
                signatureProvided: !!signature,
                bodySize: payload.length
            }, req);
            return res.status(400).json({
                error: 'Invalid Circle webhook signature',
                message: 'Signature verification failed'
            });
        }
        next();
    }
    catch (error) {
        (0, logging_middleware_1.logSecurityEvent)('circle_webhook_signature_error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            signatureProvided: !!signature
        }, req);
        return res.status(400).json({
            error: 'Webhook signature verification failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
/**
 * Critical Security Endpoint: Stripe Webhook Handler
 */
router.post('/stripe', security_middleware_1.strictRateLimit, validation_middleware_1.validateWebhookSignature, async (req, res) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'];
    (0, logging_middleware_1.logSecurityEvent)('webhook_received', {
        type: 'stripe',
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, req);
    try {
        const signature = req.headers['stripe-signature'];
        let event;
        try {
            event = paymentService.verifyWebhookSignature(req.body, signature);
            (0, logging_middleware_1.logSecurityEvent)('webhook_signature_verified', {
                eventType: event.type,
                eventId: event.id,
                processingTime: Date.now() - startTime
            }, req);
        }
        catch (error) {
            (0, logging_middleware_1.logSecurityEvent)('webhook_signature_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                signatureProvided: !!signature,
                bodySize: req.body?.length || 0
            }, req);
            return res.status(400).json({
                error: 'Invalid webhook signature',
                received: false,
                requestId
            });
        }
        // Process the webhook event
        let processingResult;
        switch (event.type) {
            case 'payment_intent.succeeded':
                processingResult = await handlePaymentIntentSucceeded(event, req);
                break;
            case 'payment_intent.payment_failed':
                processingResult = await handlePaymentIntentFailed(event, req);
                break;
            default:
                (0, logging_middleware_1.logTransactionEvent)('unknown', 'webhook_unhandled_event', {
                    eventType: event.type,
                    eventId: event.id
                });
        }
        const totalProcessingTime = Date.now() - startTime;
        (0, logging_middleware_1.logTransactionEvent)('webhook', 'webhook_processed_successfully', {
            eventType: event.type,
            eventId: event.id,
            processingTime: totalProcessingTime,
            result: processingResult
        });
        res.status(200).json({
            received: true,
            eventType: event.type,
            requestId,
            processingTime: totalProcessingTime
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const processingTime = Date.now() - startTime;
        (0, logging_middleware_1.logSecurityEvent)('webhook_processing_error', {
            error: errorMessage,
            processingTime,
            stack: error instanceof Error ? error.stack : undefined
        }, req);
        res.status(500).json({
            error: 'Webhook processing failed',
            received: false,
            requestId,
            processingTime
        });
    }
});
async function handlePaymentIntentSucceeded(event, req) {
    const paymentIntent = event.data.object;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    if (!internalTransactionId) {
        (0, logging_middleware_1.logSecurityEvent)('webhook_missing_transaction_id', {
            eventId: event.id,
            paymentIntentId: paymentIntent.id
        }, req);
        throw new Error('Missing internal transaction ID');
    }
    (0, logging_middleware_1.logTransactionEvent)(internalTransactionId, 'payment_succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        eventId: event.id
    });
    try {
        await orchestratorService.handleSuccessfulPayment(internalTransactionId);
        (0, logging_middleware_1.logTransactionEvent)(internalTransactionId, 'orchestration_completed', {
            paymentIntentId: paymentIntent.id,
            eventId: event.id
        });
        return { success: true, transactionId: internalTransactionId };
    }
    catch (error) {
        (0, logging_middleware_1.logTransactionEvent)(internalTransactionId, 'orchestration_failed', {
            paymentIntentId: paymentIntent.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            eventId: event.id
        });
        throw error;
    }
}
async function handlePaymentIntentFailed(event, req) {
    const paymentIntent = event.data.object;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    (0, logging_middleware_1.logTransactionEvent)(internalTransactionId || 'unknown', 'payment_failed', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        lastPaymentError: paymentIntent.last_payment_error,
        eventId: event.id
    });
    return { success: false, transactionId: internalTransactionId };
}
/**
 * Circle Webhook Handler for Payment Events
 * Handles payment confirmations, failures, and status updates
 */
router.post('/circle/payments', security_middleware_1.strictRateLimit, validateCircleWebhookSignature, async (req, res) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'];
    (0, logging_middleware_1.logSecurityEvent)('webhook_received', {
        type: 'circle_payment',
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, req);
    try {
        const event = req.body;
        if (!event.Type || !event.Data) {
            return res.status(400).json({
                error: 'Invalid Circle webhook payload',
                message: 'Missing Type or Data fields',
                requestId
            });
        }
        (0, logging_middleware_1.logSecurityEvent)('circle_webhook_signature_verified', {
            eventType: event.Type,
            eventId: event.Id,
            processingTime: Date.now() - startTime
        }, req);
        let processingResult;
        switch (event.Type) {
            case 'payments':
                processingResult = await handleCirclePaymentEvent(event, req);
                break;
            default:
                (0, logging_middleware_1.logTransactionEvent)('unknown', 'circle_webhook_unhandled_event', {
                    eventType: event.Type,
                    eventId: event.Id
                });
                processingResult = { success: true, message: 'Event type not handled' };
        }
        const totalProcessingTime = Date.now() - startTime;
        (0, logging_middleware_1.logTransactionEvent)('webhook', 'circle_webhook_processed_successfully', {
            eventType: event.Type,
            eventId: event.Id,
            processingTime: totalProcessingTime,
            result: processingResult
        });
        res.status(200).json({
            received: true,
            eventType: event.Type,
            requestId,
            processingTime: totalProcessingTime
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const processingTime = Date.now() - startTime;
        (0, logging_middleware_1.logSecurityEvent)('circle_webhook_processing_error', {
            error: errorMessage,
            processingTime,
            stack: error instanceof Error ? error.stack : undefined
        }, req);
        res.status(500).json({
            error: 'Circle webhook processing failed',
            received: false,
            requestId,
            processingTime
        });
    }
});
/**
 * Circle Webhook Handler for Transfer Events
 * Handles wallet-to-wallet transfer confirmations and failures
 */
router.post('/circle/transfers', security_middleware_1.strictRateLimit, validateCircleWebhookSignature, async (req, res) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'];
    (0, logging_middleware_1.logSecurityEvent)('webhook_received', {
        type: 'circle_transfer',
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, req);
    try {
        const event = req.body;
        if (!event.Type || !event.Data) {
            return res.status(400).json({
                error: 'Invalid Circle webhook payload',
                message: 'Missing Type or Data fields',
                requestId
            });
        }
        let processingResult;
        switch (event.Type) {
            case 'transfers':
                processingResult = await handleCircleTransferEvent(event, req);
                break;
            default:
                (0, logging_middleware_1.logTransactionEvent)('unknown', 'circle_webhook_unhandled_event', {
                    eventType: event.Type,
                    eventId: event.Id
                });
                processingResult = { success: true, message: 'Event type not handled' };
        }
        const totalProcessingTime = Date.now() - startTime;
        (0, logging_middleware_1.logTransactionEvent)('webhook', 'circle_webhook_processed_successfully', {
            eventType: event.Type,
            eventId: event.Id,
            processingTime: totalProcessingTime,
            result: processingResult
        });
        res.status(200).json({
            received: true,
            eventType: event.Type,
            requestId,
            processingTime: totalProcessingTime
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const processingTime = Date.now() - startTime;
        (0, logging_middleware_1.logSecurityEvent)('circle_webhook_processing_error', {
            error: errorMessage,
            processingTime,
            stack: error instanceof Error ? error.stack : undefined
        }, req);
        res.status(500).json({
            error: 'Circle webhook processing failed',
            received: false,
            requestId,
            processingTime
        });
    }
});
/**
 * Circle Webhook Handler for Payout Events
 * Handles bank payout confirmations, failures, and status updates
 */
router.post('/circle/payouts', security_middleware_1.strictRateLimit, validateCircleWebhookSignature, async (req, res) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'];
    (0, logging_middleware_1.logSecurityEvent)('webhook_received', {
        type: 'circle_payout',
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, req);
    try {
        const event = req.body;
        if (!event.Type || !event.Data) {
            return res.status(400).json({
                error: 'Invalid Circle webhook payload',
                message: 'Missing Type or Data fields',
                requestId
            });
        }
        let processingResult;
        switch (event.Type) {
            case 'payouts':
                processingResult = await handleCirclePayoutEvent(event, req);
                break;
            default:
                (0, logging_middleware_1.logTransactionEvent)('unknown', 'circle_webhook_unhandled_event', {
                    eventType: event.Type,
                    eventId: event.Id
                });
                processingResult = { success: true, message: 'Event type not handled' };
        }
        const totalProcessingTime = Date.now() - startTime;
        (0, logging_middleware_1.logTransactionEvent)('webhook', 'circle_webhook_processed_successfully', {
            eventType: event.Type,
            eventId: event.Id,
            processingTime: totalProcessingTime,
            result: processingResult
        });
        res.status(200).json({
            received: true,
            eventType: event.Type,
            requestId,
            processingTime: totalProcessingTime
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const processingTime = Date.now() - startTime;
        (0, logging_middleware_1.logSecurityEvent)('circle_webhook_processing_error', {
            error: errorMessage,
            processingTime,
            stack: error instanceof Error ? error.stack : undefined
        }, req);
        res.status(500).json({
            error: 'Circle webhook processing failed',
            received: false,
            requestId,
            processingTime
        });
    }
});
/**
 * Handle Circle payment webhook events
 */
async function handleCirclePaymentEvent(event, req) {
    return await circleWebhookService.processWebhookEvent(event);
}
/**
 * Handle Circle transfer webhook events
 */
async function handleCircleTransferEvent(event, req) {
    return await circleWebhookService.processWebhookEvent(event);
}
/**
 * Handle Circle payout webhook events
 */
async function handleCirclePayoutEvent(event, req) {
    return await circleWebhookService.processWebhookEvent(event);
}
exports.default = router;
