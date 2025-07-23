"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/__tests__/transfers.status.test.ts
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
// Mock the services
jest.mock('../../services/transfer.service', () => ({
    TransferService: jest.fn().mockImplementation(() => ({
        getTransferStatus: jest.fn().mockImplementation((transferId) => {
            // Return dynamic response based on transfer ID
            return Promise.resolve({
                id: transferId,
                status: 'COMPLETED',
                sendAmount: 100,
                receiveAmount: 79.36,
                exchangeRate: 0.85,
                fees: 6.20,
                timeline: [
                    {
                        id: 'event-1',
                        transferId: transferId,
                        type: 'transfer_created',
                        status: 'success',
                        message: 'Transfer created successfully',
                        timestamp: new Date('2025-01-21T10:00:00.000Z'),
                        metadata: {}
                    },
                    {
                        id: 'event-2',
                        transferId: transferId,
                        type: 'payment_confirmed',
                        status: 'success',
                        message: 'Payment confirmed',
                        timestamp: new Date('2025-01-21T10:01:00.000Z'),
                        metadata: {}
                    },
                    {
                        id: 'event-3',
                        transferId: transferId,
                        type: 'payout_completed',
                        status: 'success',
                        message: 'EUR received in recipient bank account',
                        timestamp: new Date('2025-01-21T10:05:00.000Z'),
                        metadata: {}
                    }
                ],
                estimatedCompletion: new Date('2025-01-21T10:05:00.000Z'),
                completedAt: new Date('2025-01-21T10:05:00.000Z')
            });
        })
    }))
}));
// Create a mock that can be controlled per test
const mockGetTransaction = jest.fn();
jest.mock('../../services/database-simple.service', () => ({
    SimpleDatabaseService: jest.fn().mockImplementation(() => ({
        getTransaction: mockGetTransaction
    }))
}));
const transfers_controller_1 = __importDefault(require("../transfers.controller"));
describe('GET /api/transfers/:id/status', () => {
    let app;
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the mock to default behavior
        mockGetTransaction.mockResolvedValue({
            id: 'db-transfer-123',
            status: 'PENDING',
            amount: 100,
            recipientAmount: 79.36,
            exchangeRate: 0.85,
            createdAt: '2025-01-21T10:00:00.000Z',
            updatedAt: '2025-01-21T10:01:00.000Z'
        });
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api', transfers_controller_1.default);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Valid requests', () => {
        it('should return transfer status successfully from TransferService', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/transfer-test-123/status')
                .expect(200);
            expect(response.body).toMatchObject({
                transferId: 'transfer-test-123',
                status: 'COMPLETED',
                sendAmount: 100,
                receiveAmount: 79.36,
                exchangeRate: 0.85,
                fees: 6.20,
                estimatedCompletion: '2025-01-21T10:05:00.000Z',
                completedAt: '2025-01-21T10:05:00.000Z'
            });
            expect(response.body.timeline).toHaveLength(3);
            expect(response.body.timeline[0]).toMatchObject({
                type: 'transfer_created',
                status: 'success',
                message: 'Transfer created successfully',
                timestamp: '2025-01-21T10:00:00.000Z'
            });
            expect(response.body.lastUpdated).toBeDefined();
            expect(response.body.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });
        it('should return transfer status from database when TransferService fails', async () => {
            // Mock TransferService to throw an error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockRejectedValue(new Error('Transfer not found in service'))
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/db-transfer-123/status')
                .expect(200);
            expect(response.body).toMatchObject({
                transferId: 'db-transfer-123',
                status: 'PENDING',
                sendAmount: 100,
                receiveAmount: 79.36,
                exchangeRate: 0.85,
                fees: 0
            });
            expect(response.body.timeline).toHaveLength(1);
            expect(response.body.timeline[0]).toMatchObject({
                type: 'transfer_created',
                status: 'success',
                message: 'Transfer created'
            });
            expect(response.body.estimatedCompletion).toBeDefined();
            expect(response.body.lastUpdated).toBeDefined();
        });
        it('should handle completed transfer from database', async () => {
            // Mock TransferService to throw an error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockRejectedValue(new Error('Transfer not found in service'))
            }));
            // Mock database to return completed transfer
            mockGetTransaction.mockResolvedValueOnce({
                id: 'completed-transfer-123',
                status: 'COMPLETED',
                amount: 200,
                recipientAmount: 158.72,
                exchangeRate: 0.85,
                createdAt: '2025-01-21T09:00:00.000Z',
                updatedAt: '2025-01-21T09:05:00.000Z'
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/completed-transfer-123/status')
                .expect(200);
            expect(response.body).toMatchObject({
                transferId: 'completed-transfer-123',
                status: 'COMPLETED',
                sendAmount: 200,
                receiveAmount: 158.72,
                exchangeRate: 0.85
            });
            expect(response.body.completedAt).toBe('2025-01-21T09:05:00.000Z');
        });
    });
    describe('Input validation', () => {
        it('should reject request with invalid transfer ID (too short)', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers//status')
                .expect(404); // Express will return 404 for empty param
            // This test verifies that empty IDs are handled by Express routing
        });
        it('should reject request with invalid transfer ID (too long)', async () => {
            const longId = 'a'.repeat(51); // 51 characters, exceeds max of 50
            const response = await (0, supertest_1.default)(app)
                .get(`/api/transfers/${longId}/status`)
                .expect(400);
            expect(response.body.error).toBe('INVALID_TRANSFER_ID');
            expect(response.body.message).toBe('Invalid transfer ID format');
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'id',
                    message: 'String must contain at most 50 character(s)'
                })
            ]));
        });
        it('should reject request with invalid transfer ID (invalid characters)', async () => {
            const invalidId = 'transfer@123!'; // Contains invalid characters
            const response = await (0, supertest_1.default)(app)
                .get(`/api/transfers/${invalidId}/status`)
                .expect(400);
            expect(response.body.error).toBe('INVALID_TRANSFER_ID');
            expect(response.body.details).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    field: 'id',
                    message: 'Invalid'
                })
            ]));
        });
        it('should accept valid transfer ID formats', async () => {
            const validIds = [
                'transfer-123',
                'transfer_456',
                'abc123DEF',
                'a1b2c3',
                'transfer-2025-01-21-123456'
            ];
            for (const id of validIds) {
                const response = await (0, supertest_1.default)(app)
                    .get(`/api/transfers/${id}/status`)
                    .expect(200);
                expect(response.body.transferId).toBe(id);
            }
        });
    });
    describe('Error handling', () => {
        it('should return 404 when transfer not found in both service and database', async () => {
            // Mock TransferService to throw an error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockRejectedValue(new Error('Transfer not found'))
            }));
            // Mock database to return null
            mockGetTransaction.mockResolvedValueOnce(null);
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/nonexistent-123/status')
                .expect(404);
            expect(response.body).toMatchObject({
                error: 'TRANSFER_NOT_FOUND',
                message: 'Transfer not found',
                transferId: 'nonexistent-123'
            });
        });
        it('should handle database errors gracefully', async () => {
            // Mock TransferService to throw an error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockRejectedValue(new Error('Transfer not found'))
            }));
            // Mock database to throw an error
            mockGetTransaction.mockRejectedValueOnce(new Error('Database connection failed'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/error-transfer-123/status')
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'STATUS_FETCH_FAILED',
                message: 'Failed to fetch transfer status',
                details: 'Database connection failed',
                retryable: true
            });
        });
        it('should handle TransferService errors when database also fails', async () => {
            // Mock TransferService to throw an error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockRejectedValue(new Error('Service unavailable'))
            }));
            // Mock database to throw an error
            mockGetTransaction.mockRejectedValueOnce(new Error('Database timeout'));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/service-error-123/status')
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'STATUS_FETCH_FAILED',
                message: 'Failed to fetch transfer status',
                retryable: true
            });
        });
        it('should handle unexpected errors gracefully', async () => {
            // Mock TransferService to throw an unexpected error
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockRejectedValue('Unexpected error')
            }));
            // Mock database to throw an unexpected error
            mockGetTransaction.mockRejectedValueOnce('Database error');
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/unexpected-error-123/status')
                .expect(500);
            expect(response.body).toMatchObject({
                error: 'STATUS_FETCH_FAILED',
                message: 'Failed to fetch transfer status',
                details: 'Unknown error',
                retryable: true
            });
        });
    });
    describe('Response format', () => {
        it('should return response in correct format matching design document', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/transfer-test-123/status')
                .expect(200);
            // Verify all required fields are present
            expect(response.body).toHaveProperty('transferId');
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timeline');
            expect(response.body).toHaveProperty('sendAmount');
            expect(response.body).toHaveProperty('receiveAmount');
            expect(response.body).toHaveProperty('exchangeRate');
            expect(response.body).toHaveProperty('fees');
            expect(response.body).toHaveProperty('estimatedCompletion');
            expect(response.body).toHaveProperty('completedAt');
            expect(response.body).toHaveProperty('lastUpdated');
            // Verify timeline structure
            expect(response.body.timeline).toBeInstanceOf(Array);
            expect(response.body.timeline.length).toBeGreaterThan(0);
            response.body.timeline.forEach((event) => {
                expect(event).toHaveProperty('type');
                expect(event).toHaveProperty('status');
                expect(event).toHaveProperty('message');
                expect(event).toHaveProperty('timestamp');
                expect(event).toHaveProperty('metadata');
            });
        });
        it('should return ISO strings for all timestamp fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/transfer-test-123/status')
                .expect(200);
            // Check timestamp formats
            expect(response.body.estimatedCompletion).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(response.body.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(response.body.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            // Check timeline timestamps
            response.body.timeline.forEach((event) => {
                expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            });
        });
        it('should handle null/undefined timestamp fields gracefully', async () => {
            // Mock TransferService to return transfer without completion times
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockResolvedValue({
                    id: 'pending-transfer-123',
                    status: 'PROCESSING',
                    sendAmount: 100,
                    receiveAmount: 79.36,
                    exchangeRate: 0.85,
                    fees: 6.20,
                    timeline: [{
                            id: 'event-1',
                            transferId: 'pending-transfer-123',
                            type: 'transfer_created',
                            status: 'success',
                            message: 'Transfer created',
                            timestamp: new Date('2025-01-21T10:00:00.000Z'),
                            metadata: {}
                        }],
                    estimatedCompletion: null,
                    completedAt: undefined
                })
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/pending-transfer-123/status')
                .expect(200);
            expect(response.body.estimatedCompletion).toBeNull();
            expect(response.body.completedAt).toBeUndefined();
            expect(response.body.lastUpdated).toBeDefined();
        });
        it('should include metadata in timeline events', async () => {
            // Mock TransferService to return transfer with metadata
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockResolvedValue({
                    id: 'metadata-transfer-123',
                    status: 'COMPLETED',
                    sendAmount: 100,
                    receiveAmount: 79.36,
                    exchangeRate: 0.85,
                    fees: 6.20,
                    timeline: [{
                            id: 'event-1',
                            transferId: 'metadata-transfer-123',
                            type: 'payment_confirmed',
                            status: 'success',
                            message: 'Payment confirmed',
                            timestamp: new Date('2025-01-21T10:01:00.000Z'),
                            metadata: {
                                paymentId: 'pay_123',
                                amount: 100,
                                currency: 'USD'
                            }
                        }],
                    estimatedCompletion: new Date('2025-01-21T10:05:00.000Z'),
                    completedAt: new Date('2025-01-21T10:05:00.000Z')
                })
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/metadata-transfer-123/status')
                .expect(200);
            expect(response.body.timeline[0].metadata).toEqual({
                paymentId: 'pay_123',
                amount: 100,
                currency: 'USD'
            });
        });
    });
    describe('Real-time status updates', () => {
        it('should return current status for active transfers', async () => {
            // Mock TransferService to return processing transfer
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockResolvedValue({
                    id: 'active-transfer-123',
                    status: 'TRANSFERRING',
                    sendAmount: 100,
                    receiveAmount: 79.36,
                    exchangeRate: 0.85,
                    fees: 6.20,
                    timeline: [
                        {
                            id: 'event-1',
                            transferId: 'active-transfer-123',
                            type: 'transfer_created',
                            status: 'success',
                            message: 'Transfer created',
                            timestamp: new Date('2025-01-21T10:00:00.000Z'),
                            metadata: {}
                        },
                        {
                            id: 'event-2',
                            transferId: 'active-transfer-123',
                            type: 'payment_confirmed',
                            status: 'success',
                            message: 'Payment confirmed',
                            timestamp: new Date('2025-01-21T10:01:00.000Z'),
                            metadata: {}
                        },
                        {
                            id: 'event-3',
                            transferId: 'active-transfer-123',
                            type: 'transfer_initiated',
                            status: 'pending',
                            message: 'Transferring funds to recipient wallet',
                            timestamp: new Date('2025-01-21T10:02:00.000Z'),
                            metadata: {}
                        }
                    ],
                    estimatedCompletion: new Date('2025-01-21T10:05:00.000Z'),
                    completedAt: undefined
                })
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/active-transfer-123/status')
                .expect(200);
            expect(response.body.status).toBe('TRANSFERRING');
            expect(response.body.timeline).toHaveLength(3);
            expect(response.body.timeline[2]).toMatchObject({
                type: 'transfer_initiated',
                status: 'pending',
                message: 'Transferring funds to recipient wallet'
            });
            expect(response.body.completedAt).toBeUndefined();
        });
        it('should show failed transfers with error information', async () => {
            // Mock TransferService to return failed transfer
            const mockTransferService = require('../../services/transfer.service');
            mockTransferService.TransferService.mockImplementationOnce(() => ({
                getTransferStatus: jest.fn().mockResolvedValue({
                    id: 'failed-transfer-123',
                    status: 'FAILED',
                    sendAmount: 100,
                    receiveAmount: 79.36,
                    exchangeRate: 0.85,
                    fees: 6.20,
                    timeline: [
                        {
                            id: 'event-1',
                            transferId: 'failed-transfer-123',
                            type: 'transfer_created',
                            status: 'success',
                            message: 'Transfer created',
                            timestamp: new Date('2025-01-21T10:00:00.000Z'),
                            metadata: {}
                        },
                        {
                            id: 'event-2',
                            transferId: 'failed-transfer-123',
                            type: 'payment_created',
                            status: 'failed',
                            message: 'Payment failed: Card declined',
                            timestamp: new Date('2025-01-21T10:01:00.000Z'),
                            metadata: { errorCode: 'card_declined' }
                        }
                    ],
                    estimatedCompletion: undefined,
                    completedAt: undefined,
                    errorMessage: 'Payment failed: Card declined'
                })
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/transfers/failed-transfer-123/status')
                .expect(200);
            expect(response.body.status).toBe('FAILED');
            expect(response.body.timeline).toHaveLength(2);
            expect(response.body.timeline[1]).toMatchObject({
                type: 'payment_created',
                status: 'failed',
                message: 'Payment failed: Card declined'
            });
            expect(response.body.timeline[1].metadata).toEqual({ errorCode: 'card_declined' });
        });
    });
});
