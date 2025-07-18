"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/webhooks.controller.ts
const express_1 = require("express");
const payment_service_1 = require("../services/payment.service");
const orchestrator_service_1 = require("../services/orchestrator.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const logging_middleware_1 = require("../middleware/logging.middleware");
const security_middleware_1 = require("../middleware/security.middleware");
const router = (0, express_1.Router)();
const paymentService = new payment_service_1.PaymentService();
const orchestratorService = new orchestrator_service_1.OrchestratorService();
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
exports.default = router;
