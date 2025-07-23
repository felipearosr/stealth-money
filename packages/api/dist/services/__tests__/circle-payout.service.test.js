"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const circle_payout_service_1 = require("../circle-payout.service");
const circle_error_handler_1 = require("../../utils/circle-error-handler");
// Mock the Circle SDK
jest.mock('@circle-fin/circle-sdk', () => ({
    Circle: jest.fn().mockImplementation(() => ({
        payouts: {
            createPayout: jest.fn(),
            getPayout: jest.fn(),
            listPayouts: jest.fn(),
            cancelPayout: jest.fn()
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
describe('CirclePayoutService', () => {
    let payoutService;
    const mockBankAccount = {
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
        bankName: 'Commerzbank',
        accountHolderName: 'John Doe',
        country: 'DE',
        city: 'Berlin'
    };
    const mockPayoutRequest = {
        amount: '100',
        currency: 'EUR',
        sourceWalletId: 'wallet-123',
        bankAccount: mockBankAccount,
        description: 'Test payout'
    };
    beforeEach(() => {
        payoutService = new circle_payout_service_1.CirclePayoutService();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('createPayout', () => {
        it('should create a payout successfully', async () => {
            const result = await payoutService.createPayout(mockPayoutRequest);
            expect(result).toMatchObject({
                sourceWalletId: 'wallet-123',
                destination: {
                    type: 'wire',
                    iban: 'DE89370400440532013000',
                    accountHolderName: 'John Doe',
                    bankName: 'Commerzbank'
                },
                amount: { amount: '100', currency: 'EUR' },
                status: 'pending'
            });
            expect(result.id).toMatch(/^payout-/);
            expect(result.createDate).toBeDefined();
            expect(result.updateDate).toBeDefined();
        });
        it('should validate bank account before processing and throw CircleError', async () => {
            const invalidRequest = {
                ...mockPayoutRequest,
                bankAccount: { ...mockBankAccount, iban: 'INVALID' }
            };
            await expect(payoutService.createPayout(invalidRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            try {
                await payoutService.createPayout(invalidRequest);
            }
            catch (error) {
                expect(error).toBeInstanceOf(circle_error_handler_1.CircleError);
                const circleError = error;
                expect(circleError.code).toBe(circle_error_handler_1.CircleErrorCode.VALIDATION_ERROR);
                expect(circleError.retryable).toBe(false);
            }
        });
        it('should retry on network errors', async () => {
            const mockCreatePayout = jest.spyOn(payoutService, 'mockCreatePayout')
                .mockRejectedValueOnce({ code: 'ENOTFOUND', message: 'DNS lookup failed' })
                .mockResolvedValueOnce({
                data: {
                    id: 'payout-123',
                    status: 'pending',
                    sourceWalletId: 'wallet-123',
                    amount: { amount: '100', currency: 'EUR' },
                    createDate: new Date().toISOString(),
                    updateDate: new Date().toISOString()
                }
            });
            const result = await payoutService.createPayout(mockPayoutRequest);
            expect(result).toBeDefined();
            expect(result.id).toBe('payout-123');
            expect(mockCreatePayout).toHaveBeenCalledTimes(2);
            mockCreatePayout.mockRestore();
        });
        it('should handle invalid bank details error', async () => {
            const mockCreatePayout = jest.spyOn(payoutService, 'mockCreatePayout')
                .mockRejectedValue({
                response: {
                    data: {
                        code: 'invalid_iban',
                        message: 'IBAN format is invalid'
                    }
                }
            });
            await expect(payoutService.createPayout(mockPayoutRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            try {
                await payoutService.createPayout(mockPayoutRequest);
            }
            catch (error) {
                expect(error).toBeInstanceOf(circle_error_handler_1.CircleError);
                const circleError = error;
                expect(circleError.code).toBe(circle_error_handler_1.CircleErrorCode.INVALID_BANK_DETAILS);
                expect(circleError.retryable).toBe(false);
                expect(circleError.userMessage).toContain('bank account details are invalid');
            }
            mockCreatePayout.mockRestore();
        });
        it('should handle bank rejection error', async () => {
            const mockCreatePayout = jest.spyOn(payoutService, 'mockCreatePayout')
                .mockRejectedValue({
                response: {
                    data: {
                        code: 'bank_rejected',
                        message: 'Bank rejected the transfer'
                    }
                }
            });
            await expect(payoutService.createPayout(mockPayoutRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            // Since bank rejection errors are retryable, it should retry up to 3 times
            expect(mockCreatePayout).toHaveBeenCalledTimes(3);
            mockCreatePayout.mockRestore();
        }, 10000); // 10 second timeout for retry test
        it('should handle compliance hold error', async () => {
            const mockCreatePayout = jest.spyOn(payoutService, 'mockCreatePayout')
                .mockRejectedValue({
                response: {
                    data: {
                        code: 'compliance_hold',
                        message: 'Transfer under compliance review'
                    }
                }
            });
            await expect(payoutService.createPayout(mockPayoutRequest))
                .rejects.toThrow(circle_error_handler_1.CircleError);
            try {
                await payoutService.createPayout(mockPayoutRequest);
            }
            catch (error) {
                expect(error).toBeInstanceOf(circle_error_handler_1.CircleError);
                const circleError = error;
                expect(circleError.code).toBe(circle_error_handler_1.CircleErrorCode.COMPLIANCE_HOLD);
                expect(circleError.retryable).toBe(false);
                expect(circleError.userMessage).toContain('under review for compliance');
            }
            mockCreatePayout.mockRestore();
        });
    });
    describe('getPayoutStatus', () => {
        it('should get payout status successfully', async () => {
            const result = await payoutService.getPayoutStatus('payout-123');
            expect(result.id).toBe('payout-123');
            expect(result.status).toBe('complete');
            expect(result.createDate).toBeDefined();
            expect(result.updateDate).toBeDefined();
        });
    });
    describe('isPayoutComplete', () => {
        it('should return true for complete payout', async () => {
            const result = await payoutService.isPayoutComplete('payout-123');
            expect(result).toBe(true);
        });
    });
    describe('validateIBAN', () => {
        it('should validate correct German IBAN', () => {
            expect(payoutService.validateIBAN('DE89370400440532013000')).toBe(true);
        });
        it('should validate IBAN with spaces', () => {
            expect(payoutService.validateIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
        });
        it('should reject invalid IBAN format', () => {
            expect(payoutService.validateIBAN('INVALID')).toBe(false);
        });
        it('should reject IBAN with wrong length', () => {
            expect(payoutService.validateIBAN('DE8937040044053201300')).toBe(false); // Too short
        });
    });
    describe('validateBIC', () => {
        it('should validate correct BIC', () => {
            expect(payoutService.validateBIC('COBADEFFXXX')).toBe(true);
        });
        it('should validate BIC without branch code', () => {
            expect(payoutService.validateBIC('COBADEFF')).toBe(true);
        });
        it('should reject invalid BIC format', () => {
            expect(payoutService.validateBIC('INVALID')).toBe(false);
        });
        it('should reject BIC with wrong length', () => {
            expect(payoutService.validateBIC('COBA')).toBe(false);
        });
    });
    describe('getEstimatedPayoutTime', () => {
        it('should return correct estimated time for EUR transfers', () => {
            const estimate = payoutService.getEstimatedPayoutTime();
            expect(estimate).toEqual({
                min: 1,
                max: 2,
                unit: 'days'
            });
        });
    });
    describe('validation', () => {
        it('should throw error for missing source wallet', () => {
            const invalidRequest = { ...mockPayoutRequest, sourceWalletId: '' };
            expect(() => payoutService.validatePayoutRequest(invalidRequest))
                .toThrow('Source wallet ID is required');
        });
        it('should throw error for invalid amount', () => {
            const invalidRequest = { ...mockPayoutRequest, amount: '0' };
            expect(() => payoutService.validatePayoutRequest(invalidRequest))
                .toThrow('Payout amount must be a positive number');
        });
        it('should throw error for non-EUR currency', () => {
            const invalidRequest = { ...mockPayoutRequest, currency: 'USD' };
            expect(() => payoutService.validatePayoutRequest(invalidRequest))
                .toThrow('Only EUR payouts are currently supported');
        });
        it('should throw error for unsupported country', () => {
            const invalidRequest = {
                ...mockPayoutRequest,
                bankAccount: { ...mockBankAccount, country: 'US' }
            };
            expect(() => payoutService.validatePayoutRequest(invalidRequest))
                .toThrow('EUR payouts to US are not currently supported');
        });
    });
});
