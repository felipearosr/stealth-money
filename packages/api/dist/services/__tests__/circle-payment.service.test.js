"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const circle_payment_service_1 = require("../circle-payment.service");
const circle_error_handler_1 = require("../../utils/circle-error-handler");
// Mock the Circle SDK
jest.mock('@circle-fin/circle-sdk', () => ({
    Circle: jest.fn().mockImplementation(() => ({
        payments: {
            createPayment: jest.fn(),
            getPayment: jest.fn(),
            listPayments: jest.fn(),
            cancelPayment: jest.fn()
        }
    })),
    CircleEnvironments: {
        sandbox: 'sandbox',
        production: 'production'
    }
}));
// Mock the circle config
jest.mock('../../config/circle.config', () => ({
    circleConfig: {
        getConfig: jest.fn().mockReturnValue({
            apiKey: 'test-api-key',
            environment: 'sandbox'
        })
    }
}));
describe('CirclePaymentService', () => {
    let paymentService;
    const mockCardDetails = {
        number: '4007400000000007',
        cvv: '123',
        expiry: {
            month: '12',
            year: '2025'
        },
        billingDetails: {
            name: 'John Doe',
            city: 'New York',
            country: 'US',
            line1: '123 Main St',
            postalCode: '10001'
        }
    };
    const mockPaymentRequest = {
        amount: 100,
        currency: 'USD',
        cardDetails: mockCardDetails,
        description: 'Test payment'
    };
    beforeEach(() => {
        paymentService = new circle_payment_service_1.CirclePaymentService();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('createPayment', () => {
        it('should create a payment successfully', async () => {
            const result = await paymentService.createPayment(mockPaymentRequest);
            expect(result).toMatchObject({
                status: 'pending',
                amount: 100,
                currency: 'USD',
                description: 'Test payment'
            });
            expect(result.id).toMatch(/^payment-/);
            expect(result.createDate).toBeDefined();
            expect(result.updateDate).toBeDefined();
        });
        it('should validate card details before processing and throw CircleError', async () => {
            const invalidRequest = {
                ...mockPaymentRequest,
                cardDetails: { ...mockCardDetails, number: '123' }
            };
            await expect(paymentService.createPayment(invalidRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            try {
                await paymentService.createPayment(invalidRequest);
            }
            catch (error) {
                expect(error).toBeInstanceOf(circle_error_handler_1.CircleError);
                const circleError = error;
                expect(circleError.code).toBe(circle_error_handler_1.CircleErrorCode.VALIDATION_ERROR);
                expect(circleError.retryable).toBe(false);
            }
        });
        it('should retry on network errors', async () => {
            // Mock the service to simulate network error on first call, success on second
            const mockCreatePayment = jest.spyOn(paymentService, 'mockCreatePayment')
                .mockRejectedValueOnce({ code: 'ECONNREFUSED', message: 'Connection refused' })
                .mockResolvedValueOnce({
                data: {
                    id: 'payment-123',
                    status: 'pending',
                    amount: { amount: '100', currency: 'USD' },
                    createDate: new Date().toISOString(),
                    updateDate: new Date().toISOString()
                }
            });
            const result = await paymentService.createPayment(mockPaymentRequest);
            expect(result).toBeDefined();
            expect(result.id).toBe('payment-123');
            expect(mockCreatePayment).toHaveBeenCalledTimes(2);
            mockCreatePayment.mockRestore();
        });
        it('should not retry on card declined errors', async () => {
            const mockCreatePayment = jest.spyOn(paymentService, 'mockCreatePayment')
                .mockRejectedValue({
                response: {
                    data: {
                        code: 'payment_declined',
                        message: 'Card declined by issuer'
                    }
                }
            });
            await expect(paymentService.createPayment(mockPaymentRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            // The mock should only be called once since card declined errors are not retryable
            expect(mockCreatePayment).toHaveBeenCalledTimes(1);
            mockCreatePayment.mockRestore();
        });
        it('should handle insufficient funds error', async () => {
            const mockCreatePayment = jest.spyOn(paymentService, 'mockCreatePayment')
                .mockRejectedValue({
                response: {
                    data: {
                        code: 'insufficient_funds',
                        message: 'Insufficient funds on card'
                    }
                }
            });
            await expect(paymentService.createPayment(mockPaymentRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            try {
                await paymentService.createPayment(mockPaymentRequest);
            }
            catch (error) {
                expect(error).toBeInstanceOf(circle_error_handler_1.CircleError);
                const circleError = error;
                expect(circleError.code).toBe(circle_error_handler_1.CircleErrorCode.INSUFFICIENT_FUNDS);
                expect(circleError.retryable).toBe(false);
                expect(circleError.userMessage).toContain('insufficient funds');
            }
            mockCreatePayment.mockRestore();
        });
        it('should handle 3D Secure authentication failures', async () => {
            const mockCreatePayment = jest.spyOn(paymentService, 'mockCreatePayment')
                .mockRejectedValue({
                response: {
                    data: {
                        code: 'three_d_secure_failed',
                        message: '3D Secure authentication failed'
                    }
                }
            });
            await expect(paymentService.createPayment(mockPaymentRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            // Since 3D Secure failures are retryable, it should retry up to 3 times
            expect(mockCreatePayment).toHaveBeenCalledTimes(3);
            mockCreatePayment.mockRestore();
        }, 10000); // 10 second timeout for retry test
    });
    describe('getPaymentStatus', () => {
        it('should get payment status successfully', async () => {
            const result = await paymentService.getPaymentStatus('payment-123');
            expect(result).toMatchObject({
                id: 'payment-123',
                status: 'confirmed',
                amount: 100,
                currency: 'USD'
            });
            expect(result.createDate).toBeDefined();
            expect(result.updateDate).toBeDefined();
        });
    });
    describe('isPaymentConfirmed', () => {
        it('should return true for confirmed payment', async () => {
            const result = await paymentService.isPaymentConfirmed('payment-123');
            expect(result).toBe(true);
        });
    });
    describe('validateCardDetails', () => {
        it('should validate valid card details', () => {
            expect(() => paymentService.validateCardDetails(mockCardDetails)).not.toThrow();
        });
        it('should throw error for invalid card number', () => {
            const invalidCard = { ...mockCardDetails, number: '123' };
            expect(() => paymentService.validateCardDetails(invalidCard))
                .toThrow('Invalid card number');
        });
        it('should throw error for invalid CVV', () => {
            const invalidCard = { ...mockCardDetails, cvv: '12' };
            expect(() => paymentService.validateCardDetails(invalidCard))
                .toThrow('Invalid CVV');
        });
        it('should throw error for invalid expiry month', () => {
            const invalidCard = {
                ...mockCardDetails,
                expiry: { ...mockCardDetails.expiry, month: '13' }
            };
            expect(() => paymentService.validateCardDetails(invalidCard))
                .toThrow('Invalid expiry month');
        });
        it('should throw error for expired card', () => {
            const invalidCard = {
                ...mockCardDetails,
                expiry: { ...mockCardDetails.expiry, year: '2020' }
            };
            expect(() => paymentService.validateCardDetails(invalidCard))
                .toThrow('Card has expired');
        });
        it('should throw error for missing billing name', () => {
            const invalidCard = {
                ...mockCardDetails,
                billingDetails: { ...mockCardDetails.billingDetails, name: '' }
            };
            expect(() => paymentService.validateCardDetails(invalidCard))
                .toThrow('Billing name is required');
        });
        it('should throw error for missing billing country', () => {
            const invalidCard = {
                ...mockCardDetails,
                billingDetails: { ...mockCardDetails.billingDetails, country: '' }
            };
            expect(() => paymentService.validateCardDetails(invalidCard))
                .toThrow('Billing country is required');
        });
    });
});
