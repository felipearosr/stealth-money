// src/services/__tests__/circle-webhook.service.test.ts
import { CircleWebhookService, CircleWebhookEvent, TransferStatus } from '../circle-webhook.service';
import { SimpleDatabaseService } from '../database-simple.service';
import { NotificationService } from '../notification.service';

// Mock the dependencies
jest.mock('../database-simple.service');
jest.mock('../notification.service');
jest.mock('../../middleware/logging.middleware', () => ({
    logTransactionEvent: jest.fn()
}));

describe('CircleWebhookService', () => {
    let service: CircleWebhookService;
    let mockDbService: jest.Mocked<SimpleDatabaseService>;
    let mockNotificationService: jest.Mocked<NotificationService>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create service instance
        service = new CircleWebhookService();
        
        // Get mocked instances
        mockDbService = (service as any).dbService;
        mockNotificationService = (service as any).notificationService;
    });

    describe('processWebhookEvent', () => {
        it('should process payment webhook event successfully', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PENDING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                recipientEmail: 'recipient@example.com',
                recipientName: 'John Doe',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const mockUpdatedTransaction = {
                ...mockTransaction,
                status: 'PAYMENT_CONFIRMED'
            };

            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue(mockUpdatedTransaction);
            mockNotificationService.notifyTransferEvent.mockResolvedValue([
                { id: 'notif-1', status: 'sent', channel: 'email' as any }
            ]);

            const event: CircleWebhookEvent = {
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

            const result = await service.processWebhookEvent(event);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe('tx-123');
            expect(result.oldStatus).toBe('PENDING');
            expect(result.newStatus).toBe('PAYMENT_CONFIRMED');
            expect(result.notificationsSent).toBe(1);

            expect(mockDbService.getTransactionByCirclePaymentId).toHaveBeenCalledWith('payment-456');
            expect(mockDbService.updateTransactionStatus).toHaveBeenCalledWith(
                'tx-123',
                'PAYMENT_CONFIRMED',
                { circlePaymentId: 'payment-456' }
            );
        });

        it('should process transfer webhook event successfully', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PAYMENT_CONFIRMED',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                recipientEmail: 'recipient@example.com',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCircleTransferId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'TRANSFERRING'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'transfers',
                Id: 'event-456',
                Data: {
                    id: 'transfer-789',
                    status: 'complete'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe('tx-123');
            expect(result.oldStatus).toBe('PAYMENT_CONFIRMED');
            expect(result.newStatus).toBe('TRANSFERRING');

            expect(mockDbService.getTransactionByCircleTransferId).toHaveBeenCalledWith('transfer-789');
        });

        it('should process payout webhook event successfully', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'TRANSFERRING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                recipientEmail: 'recipient@example.com',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePayoutId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'COMPLETED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payouts',
                Id: 'event-789',
                Data: {
                    id: 'payout-012',
                    status: 'complete'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe('tx-123');
            expect(result.oldStatus).toBe('TRANSFERRING');
            expect(result.newStatus).toBe('COMPLETED');

            expect(mockDbService.getTransactionByCirclePayoutId).toHaveBeenCalledWith('payout-012');
        });

        it('should handle transaction not found error', async () => {
            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(null);

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'confirmed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Transaction not found for Circle payment ID: payment-456');
        });

        it('should handle unrecognized event types', async () => {
            const event: CircleWebhookEvent = {
                Type: 'unknown_event',
                Id: 'event-123',
                Data: {
                    id: 'unknown-456',
                    status: 'some_status'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unhandled event type: unknown_event');
        });

        it('should handle database errors gracefully', async () => {
            mockDbService.getTransactionByCirclePaymentId.mockRejectedValue(new Error('Database error'));

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'confirmed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
        });
    });

    describe('Payment Event Handling', () => {
        it('should map confirmed payment status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PENDING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'PAYMENT_CONFIRMED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'confirmed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('PAYMENT_CONFIRMED');
        });

        it('should map failed payment status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PENDING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'FAILED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'failed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('FAILED');
        });

        it('should map canceled payment status to failed', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PENDING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'FAILED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'canceled'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('FAILED');
        });
    });

    describe('Transfer Event Handling', () => {
        it('should map complete transfer status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PAYMENT_CONFIRMED',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCircleTransferId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'TRANSFERRING'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'transfers',
                Id: 'event-456',
                Data: {
                    id: 'transfer-789',
                    status: 'complete'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('TRANSFERRING');
        });

        it('should map failed transfer status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PAYMENT_CONFIRMED',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCircleTransferId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'FAILED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'transfers',
                Id: 'event-456',
                Data: {
                    id: 'transfer-789',
                    status: 'failed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('FAILED');
        });
    });

    describe('Payout Event Handling', () => {
        it('should map complete payout status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'TRANSFERRING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePayoutId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'COMPLETED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payouts',
                Id: 'event-789',
                Data: {
                    id: 'payout-012',
                    status: 'complete'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('COMPLETED');
        });

        it('should map pending payout status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'TRANSFERRING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePayoutId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'PAYING_OUT'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payouts',
                Id: 'event-789',
                Data: {
                    id: 'payout-012',
                    status: 'pending'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('PAYING_OUT');
        });

        it('should map failed payout status correctly', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'TRANSFERRING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePayoutId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'FAILED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([]);

            const event: CircleWebhookEvent = {
                Type: 'payouts',
                Id: 'event-789',
                Data: {
                    id: 'payout-012',
                    status: 'failed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.newStatus).toBe('FAILED');
        });
    });

    describe('Notification Handling', () => {
        it('should send notifications for status updates', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PENDING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                recipientEmail: 'recipient@example.com',
                recipientName: 'John Doe',
                userId: 'user-456',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'PAYMENT_CONFIRMED'
            });
            mockNotificationService.notifyTransferEvent.mockResolvedValue([
                { id: 'notif-1', status: 'sent', channel: 'email' as any },
                { id: 'notif-2', status: 'sent', channel: 'browser' as any }
            ]);

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'confirmed'
                }
            };

            const result = await service.processWebhookEvent(event);

            expect(result.notificationsSent).toBe(2);
            expect(mockNotificationService.notifyTransferEvent).toHaveBeenCalledWith(
                expect.any(String), // NotificationType
                expect.objectContaining({
                    transferId: 'tx-123',
                    sendAmount: 100,
                    sendCurrency: 'USD',
                    receiveAmount: 85,
                    receiveCurrency: 'EUR'
                }),
                expect.arrayContaining([
                    expect.objectContaining({
                        email: 'recipient@example.com',
                        name: 'John Doe'
                    })
                ]),
                expect.arrayContaining(['email', 'browser'])
            );
        });

        it('should handle notification failures gracefully', async () => {
            const mockTransaction = {
                id: 'tx-123',
                status: 'PENDING',
                amount: 100,
                sourceCurrency: 'USD',
                recipientAmount: 85,
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                recipientEmail: 'recipient@example.com',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDbService.getTransactionByCirclePaymentId.mockResolvedValue(mockTransaction);
            mockDbService.updateTransactionStatus.mockResolvedValue({
                ...mockTransaction,
                status: 'PAYMENT_CONFIRMED'
            });
            mockNotificationService.notifyTransferEvent.mockRejectedValue(new Error('Notification failed'));

            const event: CircleWebhookEvent = {
                Type: 'payments',
                Id: 'event-123',
                Data: {
                    id: 'payment-456',
                    status: 'confirmed'
                }
            };

            const result = await service.processWebhookEvent(event);

            // Should still succeed even if notifications fail
            expect(result.success).toBe(true);
            expect(result.notificationsSent).toBe(0);
        });
    });

    describe('Status Mapping Utilities', () => {
        it('should map Circle payment statuses to internal statuses', () => {
            expect(service.mapCircleStatusToInternal('confirmed', 'payments')).toBe(TransferStatus.PAYMENT_CONFIRMED);
            expect(service.mapCircleStatusToInternal('failed', 'payments')).toBe(TransferStatus.FAILED);
            expect(service.mapCircleStatusToInternal('canceled', 'payments')).toBe(TransferStatus.FAILED);
            expect(service.mapCircleStatusToInternal('pending', 'payments')).toBe(TransferStatus.PAYMENT_PROCESSING);
        });

        it('should map Circle transfer statuses to internal statuses', () => {
            expect(service.mapCircleStatusToInternal('complete', 'transfers')).toBe(TransferStatus.TRANSFERRING);
            expect(service.mapCircleStatusToInternal('failed', 'transfers')).toBe(TransferStatus.FAILED);
            expect(service.mapCircleStatusToInternal('pending', 'transfers')).toBe(TransferStatus.TRANSFERRING);
        });

        it('should map Circle payout statuses to internal statuses', () => {
            expect(service.mapCircleStatusToInternal('complete', 'payouts')).toBe(TransferStatus.COMPLETED);
            expect(service.mapCircleStatusToInternal('failed', 'payouts')).toBe(TransferStatus.FAILED);
            expect(service.mapCircleStatusToInternal('pending', 'payouts')).toBe(TransferStatus.PAYING_OUT);
        });

        it('should handle unknown event types', () => {
            expect(service.mapCircleStatusToInternal('any_status', 'unknown')).toBe(TransferStatus.PENDING);
        });
    });
});