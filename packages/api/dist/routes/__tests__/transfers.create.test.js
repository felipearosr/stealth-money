"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/__tests__/transfers.create.test.ts
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
// Mock rate limiting middleware before importing routes
jest.mock('../../middleware/security.middleware', () => ({
    transferCreationRateLimit: (req, res, next) => next(),
    generalRateLimit: (req, res, next) => next(),
    strictRateLimit: (req, res, next) => next(),
    apiKeyAuth: (req, res, next) => next(),
    helmetConfig: (req, res, next) => next(),
    speedLimiter: (req, res, next) => next(),
    corsConfig: {},
    requestId: (req, res, next) => next(),
    sanitizeInput: (req, res, next) => next()
}));
const transfers_controller_1 = __importDefault(require("../transfers.controller"));
// Mock the services
jest.mock('../../services/fx.service', () => ({
    FXService: jest.fn().mockImplementation(() => ({
        getLockedRate: jest.fn().mockResolvedValue(null),
        calculateTransfer: jest.fn().mockResolvedValue({
            sendAmount: 100,
            receiveAmount: 79.36,
            exchangeRate: 0.85,
            fees: {
                cardProcessing: 3.20,
                transfer: 0.50,
                payout: 2.50,
                total: 6.20
            },
            rateId: 'rate-test-123',
            rateValidUntil: new Date(Date.now() + 10 * 60 * 1000),
            estimatedArrival: {
                min: 2,
                max: 5,
                unit: 'minutes'
            },
            breakdown: {
                sendAmountUSD: 100,
                cardProcessingFee: 3.20,
                netAmountUSD: 96.80,
                exchangeRate: 0.85,
                grossAmountEUR: 82.28,
                transferFee: 0.43,
                payoutFee: 2.50,
                finalAmountEUR: 79.36
            }
        })
    }))
}));
jest.mock('../../services/transfer.service', () => ({
    TransferService: jest.fn().mockImplementation(() => ({
        createTransfer: jest.fn().mockResolvedValue({
            id: 'transfer-service-123',
            status: 'INITIATED',
            estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000),
            timeline: []
        })
    }))
}));
jest.mock('../../services/database-simple.service', () => {
    const mockCreateTransaction = jest.fn().mockResolvedValue({
        id: 'transfer-test-123',
        createdAt: new Date().toISOString()
    });
    return {
        SimpleDatabaseService: jest.fn().mockImplementation(() => ({
            createTransaction: mockCreateTransaction
        })),
        // Export the mock so we can control it in tests
        __mockCreateTransaction: mockCreateTransaction
    };
});
describe('POST /api/transfers/create', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api', transfers_controller_1.default);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Valid requests', () => {
        const validRequestBody = {
            sendAmount: 100,
            cardDetails: {
                number: '4111111111111111',
                expiryMonth: 12,
                expiryYear: 2025,
                cvv: '123'
            },
            recipientInfo: {
                name: 'John Doe',
                email: 'john.doe@example.com',
                bankAccount: {
                    iban: 'DE89370400440532013000',
                    bic: 'COBADEFFXXX',
                    bankName: 'Commerzbank',
                    accountHolderName: 'John Doe',
                    country: 'DE'
                }
            }
        };
        it('should create transfer successfully with valid input', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(201);
            expect(response.body).toMatchObject({
                transferId: 'transfer-test-123',
                status: 'PROCESSING',
                sendAmount: 100,
                receiveAmount: 79.36,
                exchangeRate: 0.85,
                fees: {
                    cardProcessing: 3.20,
                    transfer: 0.50,
                    payout: 2.50,
                    total: 6.20
                }
            });
            expect(response.body.estimatedCompletion).toBeDefined();
            expect(response.body.timeline).toHaveLength(1);
            expect(response.body.timeline[0]).toMatchObject({
                type: 'transfer_created',
                status: 'success',
                message: 'Transfer created successfully'
            });
        });
        it('should create transfer with locked rate when rateId provided', async () => {
            // Mock locked rate
            const mockFXService = require('../../services/fx.service');
            mockFXService.FXService.mockImplementationOnce(() => ({
                getLockedRate: jest.fn().mockResolvedValue({
                    rateId: 'locked-rate-123',
                    rate: 0.86,
                    amount: 100,
                    convertedAmount: 80.50,
                    fees: {
                        cardProcessing: 3.20,
                        transfer: 0.50,
                        payout: 2.50,
                        total: 6.20
                    }
                })
            }));
            const requestWithRateId = {
                ...validRequestBody,
                rateId: 'locked-rate-123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestWithRateId)
                .expect(201);
            expect(response.body).toMatchObject({
                sendAmount: 100,
                receiveAmount: 80.50,
                exchangeRate: 0.86
            });
        });
        it('should handle minimum amount correctly', async () => {
            const requestBody = {
                ...validRequestBody,
                sendAmount: 0.01
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(201);
            expect(response.body.sendAmount).toBe(0.01);
        });
        it('should handle maximum amount correctly', async () => {
            const requestBody = {
                ...validRequestBody,
                sendAmount: 50000
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(201);
            expect(response.body.sendAmount).toBe(50000);
        });
    });
    describe('Input validation', () => {
        const validRequestBody = {
            sendAmount: 100,
            cardDetails: {
                number: '4111111111111111',
                expiryMonth: 12,
                expiryYear: 2025,
                cvv: '123'
            },
            recipientInfo: {
                name: 'John Doe',
                email: 'john.doe@example.com',
                bankAccount: {
                    iban: 'DE89370400440532013000',
                    bic: 'COBADEFFXXX',
                    bankName: 'Commerzbank',
                    accountHolderName: 'John Doe',
                    country: 'DE'
                }
            }
        };
        it('should reject request with missing sendAmount', async () => {
            const requestBody = { ...validRequestBody };
            delete requestBody.sendAmount;
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.error).toBe('VALIDATION_FAILED');
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'sendAmount',
                    message: 'Required'
                })
            ]));
        });
        it('should reject request with invalid sendAmount (too low)', async () => {
            const requestBody = {
                ...validRequestBody,
                sendAmount: 0.001
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'sendAmount',
                    message: 'Number must be greater than or equal to 0.01'
                })
            ]));
        });
        it('should reject request with invalid sendAmount (too high)', async () => {
            const requestBody = {
                ...validRequestBody,
                sendAmount: 50001
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'sendAmount',
                    message: 'Number must be less than or equal to 50000'
                })
            ]));
        });
        it('should reject request with missing cardDetails', async () => {
            const requestBody = { ...validRequestBody };
            delete requestBody.cardDetails;
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'cardDetails',
                    message: 'Required'
                })
            ]));
        });
        it('should reject request with invalid card number', async () => {
            const requestBody = {
                ...validRequestBody,
                cardDetails: {
                    ...validRequestBody.cardDetails,
                    number: '123' // Too short
                }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'cardDetails.number',
                    message: 'String must contain at least 13 character(s)'
                })
            ]));
        });
        it('should reject request with invalid expiry month', async () => {
            const requestBody = {
                ...validRequestBody,
                cardDetails: {
                    ...validRequestBody.cardDetails,
                    expiryMonth: 13 // Invalid month
                }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'cardDetails.expiryMonth',
                    message: 'Number must be less than or equal to 12'
                })
            ]));
        });
        it('should reject request with past expiry year', async () => {
            const requestBody = {
                ...validRequestBody,
                cardDetails: {
                    ...validRequestBody.cardDetails,
                    expiryYear: 2020 // Past year
                }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'cardDetails.expiryYear'
                })
            ]));
        });
        it('should reject request with missing recipientInfo', async () => {
            const requestBody = { ...validRequestBody };
            delete requestBody.recipientInfo;
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'recipientInfo',
                    message: 'Required'
                })
            ]));
        });
        it('should reject request with invalid recipient email', async () => {
            const requestBody = {
                ...validRequestBody,
                recipientInfo: {
                    ...validRequestBody.recipientInfo,
                    email: 'invalid-email'
                }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'recipientInfo.email',
                    message: 'Invalid email'
                })
            ]));
        });
        it('should reject request with invalid IBAN', async () => {
            const requestBody = {
                ...validRequestBody,
                recipientInfo: {
                    ...validRequestBody.recipientInfo,
                    bankAccount: {
                        ...validRequestBody.recipientInfo.bankAccount,
                        iban: 'INVALID' // Too short
                    }
                }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'recipientInfo.bankAccount.iban',
                    message: 'String must contain at least 15 character(s)'
                })
            ]));
        });
        it('should reject request with non-German bank account', async () => {
            const requestBody = {
                ...validRequestBody,
                recipientInfo: {
                    ...validRequestBody.recipientInfo,
                    bankAccount: {
                        ...validRequestBody.recipientInfo.bankAccount,
                        country: 'FR' // Only DE is allowed
                    }
                }
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestBody)
                .expect(400);
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'recipientInfo.bankAccount.country',
                    message: 'Invalid literal value, expected "DE"'
                })
            ]));
        });
    });
    describe('Rate handling', () => {
        const validRequestBody = {
            sendAmount: 100,
            cardDetails: {
                number: '4111111111111111',
                expiryMonth: 12,
                expiryYear: 2025,
                cvv: '123'
            },
            recipientInfo: {
                name: 'John Doe',
                email: 'john.doe@example.com',
                bankAccount: {
                    iban: 'DE89370400440532013000',
                    bic: 'COBADEFFXXX',
                    bankName: 'Commerzbank',
                    accountHolderName: 'John Doe',
                    country: 'DE'
                }
            }
        };
        it('should reject request with expired rate ID', async () => {
            // Mock expired rate
            const mockFXService = require('../../services/fx.service');
            mockFXService.FXService.mockImplementationOnce(() => ({
                getLockedRate: jest.fn().mockResolvedValue(null) // Expired rate returns null
            }));
            const requestWithExpiredRate = {
                ...validRequestBody,
                rateId: 'expired-rate-123'
            };
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(requestWithExpiredRate)
                .expect(400);
            expect(response.body).toMatchObject({
                error: 'RATE_EXPIRED',
                message: 'The locked exchange rate has expired',
                retryable: false
            });
        });
    });
    describe('Error handling', () => {
        const validRequestBody = {
            sendAmount: 100,
            cardDetails: {
                number: '4111111111111111',
                expiryMonth: 12,
                expiryYear: 2025,
                cvv: '123'
            },
            recipientInfo: {
                name: 'John Doe',
                email: 'john.doe@example.com',
                bankAccount: {
                    iban: 'DE89370400440532013000',
                    bic: 'COBADEFFXXX',
                    bankName: 'Commerzbank',
                    accountHolderName: 'John Doe',
                    country: 'DE'
                }
            }
        };
        it('should handle FXService calculation errors', async () => {
            // Mock FXService to throw an error
            const mockFXService = require('../../services/fx.service');
            mockFXService.FXService.mockImplementationOnce(() => ({
                getLockedRate: jest.fn().mockResolvedValue(null),
                calculateTransfer: jest.fn().mockRejectedValue(new Error('Rate service unavailable'))
            }));
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'TRANSFER_CREATION_FAILED',
                message: 'Failed to create transfer',
                details: 'Rate service unavailable',
                retryable: true
            });
        });
        it('should handle database errors', async () => {
            // Mock the database service to throw an error for this test
            const mockDbService = require('../../services/database-simple.service');
            mockDbService.__mockCreateTransaction.mockRejectedValueOnce(new Error('Database connection failed'));
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'TRANSFER_CREATION_FAILED',
                message: 'Failed to create transfer',
                details: 'Database connection failed',
                retryable: true
            });
        });
        it('should handle transfer service errors', async () => {
            // Mock transfer service to throw an error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                createTransfer: jest.fn().mockRejectedValue(new Error('Payment processing failed'))
            }));
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'TRANSFER_CREATION_FAILED',
                message: 'Failed to create transfer',
                details: 'Payment processing failed',
                retryable: true
            });
        });
        it('should handle unexpected errors gracefully', async () => {
            // Mock service to throw an unexpected error
            const mockFXService = require('../../services/fx.service');
            mockFXService.FXService.mockImplementationOnce(() => ({
                getLockedRate: jest.fn().mockResolvedValue(null),
                calculateTransfer: jest.fn().mockRejectedValue('Unexpected error')
            }));
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'TRANSFER_CREATION_FAILED',
                message: 'Failed to create transfer',
                details: 'Unknown error',
                retryable: true
            });
        });
    });
    describe('Response format', () => {
        const validRequestBody = {
            sendAmount: 100,
            cardDetails: {
                number: '4111111111111111',
                expiryMonth: 12,
                expiryYear: 2025,
                cvv: '123'
            },
            recipientInfo: {
                name: 'John Doe',
                email: 'john.doe@example.com',
                bankAccount: {
                    iban: 'DE89370400440532013000',
                    bic: 'COBADEFFXXX',
                    bankName: 'Commerzbank',
                    accountHolderName: 'John Doe',
                    country: 'DE'
                }
            }
        };
        it('should return response in correct format matching design document', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(201);
            // Verify all required fields are present
            expect(response.body).toHaveProperty('transferId');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('estimatedCompletion');
            expect(response.body).toHaveProperty('sendAmount');
            expect(response.body).toHaveProperty('receiveAmount');
            expect(response.body).toHaveProperty('exchangeRate');
            expect(response.body).toHaveProperty('fees');
            expect(response.body).toHaveProperty('timeline');
            // Verify fees structure
            expect(response.body.fees).toHaveProperty('cardProcessing');
            expect(response.body.fees).toHaveProperty('transfer');
            expect(response.body.fees).toHaveProperty('payout');
            expect(response.body.fees).toHaveProperty('total');
            // Verify timeline structure
            expect(response.body.timeline).toBeInstanceOf(Array);
            expect(response.body.timeline).toHaveLength(1);
            expect(response.body.timeline[0]).toHaveProperty('type');
            expect(response.body.timeline[0]).toHaveProperty('status');
            expect(response.body.timeline[0]).toHaveProperty('message');
            expect(response.body.timeline[0]).toHaveProperty('timestamp');
        });
        it('should return ISO string for estimatedCompletion', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(201);
            expect(response.body.estimatedCompletion).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
        it('should return ISO string for timeline timestamps', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/transfers/create')
                .send(validRequestBody)
                .expect(201);
            expect(response.body.timeline[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
    });
});
