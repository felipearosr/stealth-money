"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/webhooks.controller.ts
const express_1 = require("express");
const payment_service_1 = require("../services/payment.service");
const orchestrator_service_1 = require("../services/orchestrator.service");
const router = (0, express_1.Router)();
const paymentService = new payment_service_1.PaymentService();
const orchestratorService = new orchestrator_service_1.OrchestratorService();
/**
 * Critical Security Endpoint: Stripe Webhook Handler
 */
router.post('/stripe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🔔 Stripe webhook received');
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            console.error('❌ Missing stripe-signature header');
            return res.status(400).json({
                error: 'Missing stripe-signature header',
                received: false
            });
        }
        let event;
        try {
            event = paymentService.verifyWebhookSignature(req.body, signature);
            console.log('✅ Webhook signature verified successfully');
            console.log(`📋 Event type: ${event.type}`);
        }
        catch (error) {
            console.error('❌ Webhook signature verification failed:', error);
            return res.status(400).json({
                error: 'Invalid webhook signature',
                received: false
            });
        }
        switch (event.type) {
            case 'payment_intent.succeeded':
                yield handlePaymentIntentSucceeded(event);
                break;
            case 'payment_intent.payment_failed':
                yield handlePaymentIntentFailed(event);
                break;
            default:
                console.log(`ℹ️  Unhandled event type: ${event.type}`);
        }
        console.log('✅ Webhook processed successfully');
        res.status(200).json({ received: true, eventType: event.type });
    }
    catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
            error: 'Webhook processing failed',
            received: false
        });
    }
}));
function handlePaymentIntentSucceeded(event) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🎉 Payment succeeded! Processing transfer...');
        const paymentIntent = event.data.object;
        const internalTransactionId = paymentIntent.metadata.internalTransactionId;
        if (!internalTransactionId) {
            console.error('❌ Missing internalTransactionId in payment metadata');
            throw new Error('Missing internal transaction ID');
        }
        console.log(`💰 Processing successful payment for transaction: ${internalTransactionId}`);
        try {
            yield orchestratorService.handleSuccessfulPayment(internalTransactionId);
            console.log('✅ Payment processing completed successfully');
        }
        catch (error) {
            console.error('❌ Failed to process successful payment:', error);
            throw error;
        }
    });
}
function handlePaymentIntentFailed(event) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('❌ Payment failed');
        const paymentIntent = event.data.object;
        const internalTransactionId = paymentIntent.metadata.internalTransactionId;
        if (internalTransactionId) {
            console.log(`💔 Payment failed for transaction: ${internalTransactionId}`);
        }
    });
}
exports.default = router;
