"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CirclePaymentService = void 0;
const circle_service_1 = require("./circle.service");
const circle_error_handler_1 = require("../utils/circle-error-handler");
/**
 * Circle Payment Service for handling card payments and USDC conversion
 * Implements secure payment processing using Circle's Payments API
 */
class CirclePaymentService extends circle_service_1.CircleService {
    /**
     * Create a payment from card to USDC
     * Converts USD from card to USDC in merchant wallet
     */
    async createPayment(request) {
        return circle_error_handler_1.CircleRetryHandler.withRetry(async () => {
            try {
                this.validateCardDetails(request.cardDetails);
                const idempotencyKey = this.generateIdempotencyKey('payment');
                // Simplified API call structure for testing
                const paymentRequest = {
                    idempotencyKey,
                    amount: {
                        amount: request.amount.toString(),
                        currency: request.currency
                    },
                    source: {
                        type: 'card',
                        card: {
                            number: request.cardDetails.number,
                            cvv: request.cardDetails.cvv,
                            expMonth: parseInt(request.cardDetails.expiry.month),
                            expYear: parseInt(request.cardDetails.expiry.year)
                        },
                        billingDetails: request.cardDetails.billingDetails
                    },
                    verification: 'cvv',
                    description: request.description || 'International transfer payment',
                    metadata: request.metadata || {}
                };
                // Mock API call - in real implementation this would call Circle API
                const response = await this.mockCreatePayment(paymentRequest);
                if (!response.data) {
                    throw new Error('No payment data received from Circle API');
                }
                return this.formatPaymentResponse(response.data);
            }
            catch (error) {
                this.handleCircleError(error, 'payment creation');
            }
        }, 'payment creation', 3, // max retries
        1000, // base delay 1s
        10000 // max delay 10s
        );
    }
    /**
     * Get payment status by payment ID
     */
    async getPaymentStatus(paymentId) {
        try {
            // Mock API call - in real implementation this would call Circle API
            const response = await this.mockGetPayment(paymentId);
            if (!response.data) {
                throw new Error(`Payment ${paymentId} not found`);
            }
            return this.formatPaymentResponse(response.data);
        }
        catch (error) {
            this.handleCircleError(error, 'payment status retrieval');
        }
    }
    /**
     * Check if a payment is confirmed and ready for transfer
     */
    async isPaymentConfirmed(paymentId) {
        const payment = await this.getPaymentStatus(paymentId);
        return payment.status === 'confirmed';
    }
    /**
     * Wait for payment confirmation with timeout
     * Polls payment status until confirmed or timeout
     */
    async waitForPaymentConfirmation(paymentId, timeoutMs = 300000, // 5 minutes default
    pollIntervalMs = 5000 // 5 seconds default
    ) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const payment = await this.getPaymentStatus(paymentId);
            if (payment.status === 'confirmed') {
                return payment;
            }
            if (payment.status === 'failed') {
                throw new Error(`Payment ${paymentId} failed`);
            }
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }
        throw new Error(`Payment ${paymentId} confirmation timeout after ${timeoutMs}ms`);
    }
    /**
     * Validate card details before processing
     */
    validateCardDetails(cardDetails) {
        if (!cardDetails.number || cardDetails.number.length < 13) {
            throw new Error('Invalid card number');
        }
        if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
            throw new Error('Invalid CVV');
        }
        const month = parseInt(cardDetails.expiry.month);
        const year = parseInt(cardDetails.expiry.year);
        if (month < 1 || month > 12) {
            throw new Error('Invalid expiry month');
        }
        if (year < new Date().getFullYear()) {
            throw new Error('Card has expired');
        }
        if (!cardDetails.billingDetails.name) {
            throw new Error('Billing name is required');
        }
        if (!cardDetails.billingDetails.country) {
            throw new Error('Billing country is required');
        }
    }
    /**
     * Mock Circle API payment creation for testing
     * In production, this would be replaced with actual Circle SDK calls
     */
    async mockCreatePayment(request) {
        // Simulate API call
        return {
            data: {
                id: `payment-${Date.now()}`,
                status: 'pending',
                amount: request.amount,
                description: request.description,
                createDate: new Date().toISOString(),
                updateDate: new Date().toISOString(),
                metadata: request.metadata
            }
        };
    }
    /**
     * Mock Circle API payment retrieval for testing
     * In production, this would be replaced with actual Circle SDK calls
     */
    async mockGetPayment(paymentId) {
        // Simulate API call
        return {
            data: {
                id: paymentId,
                status: 'confirmed',
                amount: { amount: '100', currency: 'USD' },
                createDate: new Date().toISOString(),
                updateDate: new Date().toISOString()
            }
        };
    }
    /**
     * Format Circle API payment response to our interface
     */
    formatPaymentResponse(circlePayment) {
        return {
            id: circlePayment.id,
            status: this.mapCirclePaymentStatus(circlePayment.status),
            amount: parseFloat(circlePayment.amount?.amount || circlePayment.amount || '0'),
            currency: circlePayment.amount?.currency || 'USD',
            description: circlePayment.description,
            fees: circlePayment.fees ? parseFloat(circlePayment.fees.amount) : undefined,
            createDate: circlePayment.createDate,
            updateDate: circlePayment.updateDate,
            merchantId: circlePayment.merchantId,
            merchantWalletId: circlePayment.merchantWalletId,
            source: circlePayment.source ? {
                id: circlePayment.source.id,
                type: circlePayment.source.type
            } : undefined,
            metadata: circlePayment.metadata
        };
    }
    /**
     * Map Circle payment status to our standardized status
     */
    mapCirclePaymentStatus(circleStatus) {
        switch (circleStatus?.toLowerCase()) {
            case 'confirmed':
                return 'confirmed';
            case 'failed':
            case 'canceled':
                return 'failed';
            case 'pending':
            default:
                return 'pending';
        }
    }
}
exports.CirclePaymentService = CirclePaymentService;
