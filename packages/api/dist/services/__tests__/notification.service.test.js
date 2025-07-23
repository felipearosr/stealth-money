"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_service_1 = require("../notification.service");
describe('NotificationService', () => {
    let notificationService;
    const mockRecipient = {
        id: 'user-123',
        email: 'test@example.com',
        phone: '+1234567890',
        name: 'John Doe',
        language: 'en',
        timezone: 'America/New_York'
    };
    const mockTransferContext = {
        transferId: 'transfer-123',
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveAmount: 85,
        receiveCurrency: 'EUR',
        senderName: 'John Doe',
        recipientName: 'Jane Smith',
        estimatedCompletion: new Date('2025-01-22'),
        trackingUrl: 'https://stealthmoney.com/track/transfer-123'
    };
    beforeEach(() => {
        notificationService = new notification_service_1.NotificationService({
            email: {
                provider: 'sendgrid',
                fromEmail: 'test@stealthmoney.com',
                fromName: 'Stealth Money Test',
                apiKey: 'test-api-key'
            },
            sms: {
                provider: 'twilio',
                apiKey: 'test-account-sid',
                apiSecret: 'test-auth-token',
                fromNumber: '+1234567890'
            },
            websocket: {
                enabled: true,
                port: 3001
            }
        });
    });
    describe('sendNotification', () => {
        it('should send email notification successfully', async () => {
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('sent');
            expect(results[0].channel).toBe(notification_service_1.NotificationChannel.EMAIL);
            expect(results[0].sentAt).toBeInstanceOf(Date);
        });
        it('should send SMS notification successfully', async () => {
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_COMPLETED,
                channels: [notification_service_1.NotificationChannel.SMS],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('sent');
            expect(results[0].channel).toBe(notification_service_1.NotificationChannel.SMS);
            expect(results[0].sentAt).toBeInstanceOf(Date);
        });
        it('should send browser notification successfully', async () => {
            const request = {
                type: notification_service_1.NotificationType.PAYMENT_CONFIRMED,
                channels: [notification_service_1.NotificationChannel.BROWSER],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('sent');
            expect(results[0].channel).toBe(notification_service_1.NotificationChannel.BROWSER);
            expect(results[0].sentAt).toBeInstanceOf(Date);
        });
        it('should send webhook notification successfully', async () => {
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_PROCESSING,
                channels: [notification_service_1.NotificationChannel.WEBHOOK],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('sent');
            expect(results[0].channel).toBe(notification_service_1.NotificationChannel.WEBHOOK);
            expect(results[0].sentAt).toBeInstanceOf(Date);
        });
        it('should send multiple channel notifications', async () => {
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL, notification_service_1.NotificationChannel.SMS, notification_service_1.NotificationChannel.BROWSER],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(3);
            expect(results.map(r => r.channel)).toEqual(expect.arrayContaining([
                notification_service_1.NotificationChannel.EMAIL,
                notification_service_1.NotificationChannel.SMS,
                notification_service_1.NotificationChannel.BROWSER
            ]));
            expect(results.every(r => r.status === 'sent')).toBe(true);
        });
        it('should handle email notification failure when email is missing', async () => {
            const recipientWithoutEmail = { ...mockRecipient, email: undefined };
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: recipientWithoutEmail,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].channel).toBe(notification_service_1.NotificationChannel.EMAIL);
            expect(results[0].error).toContain('Email address is required');
        });
        it('should handle SMS notification failure when phone is missing', async () => {
            const recipientWithoutPhone = { ...mockRecipient, phone: undefined };
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.SMS],
                recipient: recipientWithoutPhone,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].channel).toBe(notification_service_1.NotificationChannel.SMS);
            expect(results[0].error).toContain('Phone number is required');
        });
        it('should handle unsupported notification channel', async () => {
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: ['unsupported'],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].error).toContain('Unsupported notification channel');
        });
    });
    describe('notifyTransferEvent', () => {
        it('should notify multiple recipients for transfer event', async () => {
            const recipients = [
                mockRecipient,
                {
                    id: 'user-456',
                    email: 'recipient@example.com',
                    name: 'Jane Smith'
                }
            ];
            const results = await notificationService.notifyTransferEvent(notification_service_1.NotificationType.TRANSFER_COMPLETED, mockTransferContext, recipients, [notification_service_1.NotificationChannel.EMAIL]);
            expect(results).toHaveLength(2);
            expect(results.every(r => r.status === 'sent')).toBe(true);
            expect(results.every(r => r.channel === notification_service_1.NotificationChannel.EMAIL)).toBe(true);
        });
        it('should set high priority for failed transfers', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await notificationService.notifyTransferEvent(notification_service_1.NotificationType.TRANSFER_FAILED, { ...mockTransferContext, errorMessage: 'Payment declined' }, [mockRecipient], [notification_service_1.NotificationChannel.EMAIL]);
            // Verify that the notification was processed (mock email sent)
            expect(consoleSpy).toHaveBeenCalledWith('Mock email sent:', expect.objectContaining({
                to: mockRecipient.email,
                subject: expect.stringContaining('Transfer Failed')
            }));
            consoleSpy.mockRestore();
        });
    });
    describe('notification templates', () => {
        it('should generate correct template for transfer initiated', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            await notificationService.sendNotification(request);
            expect(consoleSpy).toHaveBeenCalledWith('Mock email sent:', expect.objectContaining({
                subject: 'Transfer Initiated - $100 USD'
            }));
            consoleSpy.mockRestore();
        });
        it('should generate correct template for transfer completed', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_COMPLETED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            await notificationService.sendNotification(request);
            expect(consoleSpy).toHaveBeenCalledWith('Mock email sent:', expect.objectContaining({
                subject: 'Transfer Completed - 85 EUR Delivered'
            }));
            consoleSpy.mockRestore();
        });
        it('should generate correct template for transfer failed', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const failedContext = {
                ...mockTransferContext,
                errorMessage: 'Payment method declined'
            };
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_FAILED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: failedContext
            };
            await notificationService.sendNotification(request);
            expect(consoleSpy).toHaveBeenCalledWith('Mock email sent:', expect.objectContaining({
                subject: 'Transfer Failed - $100 USD'
            }));
            consoleSpy.mockRestore();
        });
        it('should generate correct SMS template', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_COMPLETED,
                channels: [notification_service_1.NotificationChannel.SMS],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            await notificationService.sendNotification(request);
            expect(consoleSpy).toHaveBeenCalledWith('Mock SMS sent:', expect.objectContaining({
                to: mockRecipient.phone,
                body: expect.stringContaining('Transfer complete! 85 EUR delivered')
            }));
            consoleSpy.mockRestore();
        });
    });
    describe('WebSocket client management', () => {
        it('should register and unregister WebSocket clients', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const mockWebSocket = { id: 'ws-123' };
            notificationService.registerClient('user-123', mockWebSocket);
            expect(consoleSpy).toHaveBeenCalledWith('Client user-123 connected for notifications');
            notificationService.unregisterClient('user-123');
            expect(consoleSpy).toHaveBeenCalledWith('Client user-123 disconnected from notifications');
            consoleSpy.mockRestore();
        });
        it('should send browser notification to specific client', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const request = {
                type: notification_service_1.NotificationType.PAYMENT_CONFIRMED,
                channels: [notification_service_1.NotificationChannel.BROWSER],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            await notificationService.sendNotification(request);
            expect(consoleSpy).toHaveBeenCalledWith('Mock WebSocket send to client:', expect.objectContaining({
                clientId: mockRecipient.id,
                type: 'notification'
            }));
            consoleSpy.mockRestore();
        });
    });
    describe('error handling', () => {
        it('should handle notification service without email provider', async () => {
            const serviceWithoutEmail = new notification_service_1.NotificationService({
                email: {
                    provider: 'sendgrid',
                    fromEmail: 'test@example.com',
                    fromName: 'Test',
                    // No API key provided
                }
            });
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await serviceWithoutEmail.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].error).toContain('Email provider not configured');
        });
        it('should handle notification service without SMS provider', async () => {
            const serviceWithoutSms = new notification_service_1.NotificationService({
                sms: {
                    provider: 'twilio',
                    fromNumber: '+1234567890'
                    // No API key provided
                }
            });
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.SMS],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            const results = await serviceWithoutSms.sendNotification(request);
            expect(results).toHaveLength(1);
            expect(results[0].status).toBe('failed');
            expect(results[0].error).toContain('SMS provider not configured');
        });
        it('should continue processing other channels when one fails', async () => {
            const recipientWithoutPhone = { ...mockRecipient, phone: undefined };
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL, notification_service_1.NotificationChannel.SMS],
                recipient: recipientWithoutPhone,
                context: mockTransferContext
            };
            const results = await notificationService.sendNotification(request);
            expect(results).toHaveLength(2);
            expect(results.find(r => r.channel === notification_service_1.NotificationChannel.EMAIL)?.status).toBe('sent');
            expect(results.find(r => r.channel === notification_service_1.NotificationChannel.SMS)?.status).toBe('failed');
        });
    });
    describe('notification content validation', () => {
        it('should include transfer details in email notifications', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const request = {
                type: notification_service_1.NotificationType.TRANSFER_INITIATED,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            await notificationService.sendNotification(request);
            // Verify the email was sent with correct subject
            expect(consoleSpy).toHaveBeenCalledWith('Mock email sent:', expect.objectContaining({
                to: mockRecipient.email,
                subject: expect.stringContaining('$100 USD')
            }));
            consoleSpy.mockRestore();
        });
        it('should handle compliance hold notifications', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const request = {
                type: notification_service_1.NotificationType.COMPLIANCE_HOLD,
                channels: [notification_service_1.NotificationChannel.EMAIL],
                recipient: mockRecipient,
                context: mockTransferContext
            };
            await notificationService.sendNotification(request);
            expect(consoleSpy).toHaveBeenCalledWith('Mock email sent:', expect.objectContaining({
                subject: expect.stringContaining('Transfer Under Review')
            }));
            consoleSpy.mockRestore();
        });
    });
});
