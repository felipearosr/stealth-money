"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/__tests__/webhooks.controller.test.ts
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const webhooks_controller_1 = __importDefault(require("../webhooks.controller"));
const circle_config_1 = require("../../config/circle.config");
// Mock the config
jest.mock('../../config/circle.config', () => ({
    circleConfig: {
        getWebhookSecret: jest.fn(() => 'test-webhook-secret')
    }
}));
// Mock the services
jest.mock('../../services/payment.service');
jest.mock('../../services/orchestrator.service');
// Mock middleware
jest.mock('../../middleware/logging.middleware', () => ({
    logSecurityEvent: jest.fn(),
    logTransactionEvent: jest.fn()
}));
jest.mock('../../middleware/security.middleware', () => ({
    strictRateLimit: (req, res, next) => next()
}));
jest.mock('../../middleware/validation.middleware', () => ({
    validateWebhookSignature: (req, res, next) => next()
}));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/webhooks', webhooks_controller_1.default);
describe('Circle Webhook Endpoints', () => {
    const mockWebhookSecret = 'test-webhook-secret';
    beforeEach(() => {
        jest.clearAllMocks();
        circle_config_1.circleConfig.getWebhookSecret.mockReturnValue(mockWebhookSecret);
    });
    /**
     * Helper function to generate Circle webhook signature
     */
    function generateCircleSignature(payload, secret) {
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(payload, 'utf8')
            .digest('hex');
    }
    describe('POST /webhooks/circle/payments', () => {
        const mockPaymentEvent = {
            Type: 'payments',
            Id: 'event-123',
            Data: {
                id: 'payment-456',
                status: 'confirmed',
                amount: {
                    amount: '100.00',
                    currency: 'USD'
                }
            }
        };
        it('should successfully process valid payment webhook', async () => {
            const payload = JSON.stringify(mockPaymentEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', signature)
                .send(mockPaymentEvent)
                .expect(200);
            expect(response.body).toMatchObject({
                received: true,
                eventType: 'payments'
            });
            expect(response.body.processingTime).toBeDefined();
        });
        it('should reject webhook without signature', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .send(mockPaymentEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Missing Circle webhook signature',
                message: 'Circle-Signature header is required'
            });
        });
        it('should reject webhook with invalid signature', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', 'invalid-signature')
                .send(mockPaymentEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Invalid Circle webhook signature',
                message: 'Signature verification failed'
            });
        });
        it('should reject webhook with missing Type field', async () => {
            const invalidEvent = { ...mockPaymentEvent };
            delete invalidEvent.Type;
            const payload = JSON.stringify(invalidEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', signature)
                .send(invalidEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Invalid Circle webhook payload',
                message: 'Missing Type or Data fields'
            });
        });
        it('should reject webhook with missing Data field', async () => {
            const invalidEvent = { ...mockPaymentEvent };
            delete invalidEvent.Data;
            const payload = JSON.stringify(invalidEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', signature)
                .send(invalidEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Invalid Circle webhook payload',
                message: 'Missing Type or Data fields'
            });
        });
        it('should handle unrecognized event types gracefully', async () => {
            const unknownEvent = {
                Type: 'unknown_event_type',
                Id: 'event-123',
                Data: { id: 'test-123' }
            };
            const payload = JSON.stringify(unknownEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', signature)
                .send(unknownEvent)
                .expect(200);
            expect(response.body).toMatchObject({
                received: true,
                eventType: 'unknown_event_type'
            });
        });
    });
    describe('POST /webhooks/circle/transfers', () => {
        const mockTransferEvent = {
            Type: 'transfers',
            Id: 'event-456',
            Data: {
                id: 'transfer-789',
                status: 'complete',
                amount: {
                    amount: '100.00',
                    currency: 'USD'
                }
            }
        };
        it('should successfully process valid transfer webhook', async () => {
            const payload = JSON.stringify(mockTransferEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/transfers')
                .set('Circle-Signature', signature)
                .send(mockTransferEvent)
                .expect(200);
            expect(response.body).toMatchObject({
                received: true,
                eventType: 'transfers'
            });
            expect(response.body.processingTime).toBeDefined();
        });
        it('should reject webhook without signature', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/transfers')
                .send(mockTransferEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Missing Circle webhook signature',
                message: 'Circle-Signature header is required'
            });
        });
        it('should reject webhook with invalid signature', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/transfers')
                .set('Circle-Signature', 'invalid-signature')
                .send(mockTransferEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Invalid Circle webhook signature',
                message: 'Signature verification failed'
            });
        });
    });
    describe('POST /webhooks/circle/payouts', () => {
        const mockPayoutEvent = {
            Type: 'payouts',
            Id: 'event-789',
            Data: {
                id: 'payout-012',
                status: 'complete',
                amount: {
                    amount: '85.00',
                    currency: 'EUR'
                }
            }
        };
        it('should successfully process valid payout webhook', async () => {
            const payload = JSON.stringify(mockPayoutEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payouts')
                .set('Circle-Signature', signature)
                .send(mockPayoutEvent)
                .expect(200);
            expect(response.body).toMatchObject({
                received: true,
                eventType: 'payouts'
            });
            expect(response.body.processingTime).toBeDefined();
        });
        it('should reject webhook without signature', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payouts')
                .send(mockPayoutEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Missing Circle webhook signature',
                message: 'Circle-Signature header is required'
            });
        });
        it('should reject webhook with invalid signature', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payouts')
                .set('Circle-Signature', 'invalid-signature')
                .send(mockPayoutEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Invalid Circle webhook signature',
                message: 'Signature verification failed'
            });
        });
    });
    describe('Circle Webhook Signature Verification', () => {
        it('should handle missing webhook secret configuration', async () => {
            circle_config_1.circleConfig.getWebhookSecret.mockReturnValue(undefined);
            const mockEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: { id: 'payment-456' }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', 'any-signature')
                .send(mockEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Webhook signature verification failed',
                message: 'Circle webhook secret not configured'
            });
        });
        it('should handle signature verification errors', async () => {
            const mockEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: { id: 'payment-456' }
            };
            const payload = JSON.stringify(mockEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            // Test with invalid hex signature format
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', 'invalid-hex-signature!')
                .send(mockEvent)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'Invalid Circle webhook signature',
                message: 'Signature verification failed'
            });
        });
    });
    describe('Error Handling', () => {
        it('should handle processing errors gracefully', async () => {
            const mockEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'confirmed'
                }
            };
            const payload = JSON.stringify(mockEvent);
            const signature = generateCircleSignature(payload, mockWebhookSecret);
            const response = await (0, supertest_1.default)(app)
                .post('/webhooks/circle/payments')
                .set('Circle-Signature', signature)
                .send(mockEvent)
                .expect(200);
            // Should successfully process valid webhook
            expect(response.body).toMatchObject({
                received: true,
                eventType: 'payments'
            });
        });
    });
});
