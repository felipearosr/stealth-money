"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CirclePaymentService = void 0;
const circle_service_1 = require("./circle.service");
/**
 * Circle Payment Service for handling card payments and converting to USDC
 * Implements requirement 2.1: Secure payment processing with PCI compliance
 *
 * This is the foundation service class - actual payment methods will be implemented
 * in subsequent tasks when the full Circle API integration is built out.
 */
class CirclePaymentService extends circle_service_1.CircleService {
    /**
     * Placeholder method for creating payments
     * Will be implemented in task 2.1 with full Circle Payments API integration
     */
    async createPayment(paymentRequest) {
        // Foundation placeholder - actual implementation in task 2.1
        throw new Error('Payment creation will be implemented in task 2.1');
    }
    /**
     * Placeholder method for getting payment status
     * Will be implemented in task 2.1 with full Circle Payments API integration
     */
    async getPaymentStatus(paymentId) {
        // Foundation placeholder - actual implementation in task 2.1
        throw new Error('Payment status checking will be implemented in task 2.1');
    }
    /**
     * Test method to verify the service is properly configured
     */
    async testConnection() {
        try {
            const healthCheck = await this.healthCheck();
            return healthCheck.status === 'healthy';
        }
        catch (error) {
            console.error('Circle Payment Service connection test failed:', error);
            return false;
        }
    }
}
exports.CirclePaymentService = CirclePaymentService;
