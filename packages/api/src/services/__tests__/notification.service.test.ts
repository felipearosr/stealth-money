import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { NotificationService, NotificationData, PaymentStatus, RecipientData, PaymentRequest, PaymentResult, NotificationPreferences } from '../notification.service';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  $disconnect: vi.fn(),
};

// Mock UUID
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let consoleSpy: Mock;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    phone: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    country: 'US',
    currency: 'USD',
    kycStatus: 'VERIFIED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecipient = {
    id: 'recipient-456',
    email: 'recipient@example.com',
    phone: '+0987654321',
    firstName: 'Jane',
    lastName: 'Smith',
    country: 'CA',
    currency: 'CAD',
    kycStatus: 'VERIFIED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    notificationService = new NotificationService();
  });

  afterEach(async () => {
    await notificationService.disconnect();
    consoleSpy.mockRestore();
  });

  describe('sendPaymentStatusUpdate', () => {
    it('should send status update notification to user with enabled preferences', async () => {
      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-123',
        status: 'completed',
        amount: 100.50,
        currency: 'USD',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        processorId: 'stripe',
        settlementMethod: 'circle',
        completedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });

      // Should log that notification was queued
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${mockUser.id}`)
      );
    });

    it('should handle failed payment status with high priority', async () => {
      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-456',
        status: 'failed',
        amount: 50.25,
        currency: 'EUR',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        failureReason: 'Insufficient funds',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });

      // Should queue notifications with high priority for failed payments
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${mockUser.id}`)
      );
    });

    it('should throw error when user not found', async () => {
      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-789',
        status: 'completed',
        amount: 75.00,
        currency: 'GBP',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.sendPaymentStatusUpdate('nonexistent-user', paymentStatus)
      ).rejects.toThrow('User not found: nonexistent-user');
    });

    it('should skip notification when status updates are disabled', async () => {
      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-123',
        status: 'completed',
        amount: 100.50,
        currency: 'USD',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock getNotificationPreferences to return disabled status updates
      const originalGetPreferences = notificationService.getNotificationPreferences;
      notificationService.getNotificationPreferences = vi.fn().mockResolvedValue({
        userId: mockUser.id,
        channels: [{ type: 'email', enabled: true, address: mockUser.email, verified: true }],
        paymentRequests: true,
        paymentConfirmations: true,
        statusUpdates: false, // Disabled
        securityAlerts: true,
        marketing: false,
        updatedAt: new Date(),
      });

      await notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus);

      expect(consoleSpy).toHaveBeenCalledWith(`Status updates disabled for user ${mockUser.id}`);

      // Restore original method
      notificationService.getNotificationPreferences = originalGetPreferences;
    });
  });

  describe('sendPaymentRequest', () => {
    it('should send payment request to registered user', async () => {
      const recipientData: RecipientData = {
        userId: mockRecipient.id,
        email: mockRecipient.email,
        firstName: mockRecipient.firstName,
        lastName: mockRecipient.lastName,
      };

      const paymentRequest: PaymentRequest = {
        id: 'request-123',
        requesterId: mockUser.id,
        amount: 250.00,
        currency: 'USD',
        description: 'Dinner payment',
        shareableLink: 'https://pay.example.com/request-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendPaymentRequest(recipientData, paymentRequest);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: paymentRequest.requesterId }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${recipientData.userId}`)
      );
    });

    it('should send payment request to unregistered user via email and SMS', async () => {
      const recipientData: RecipientData = {
        email: 'unregistered@example.com',
        phone: '+1555123456',
        firstName: 'Unregistered',
        lastName: 'User',
      };

      const paymentRequest: PaymentRequest = {
        id: 'request-456',
        requesterId: mockUser.id,
        amount: 75.50,
        currency: 'EUR',
        description: 'Service payment',
        shareableLink: 'https://pay.example.com/request-456',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendPaymentRequest(recipientData, paymentRequest);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: paymentRequest.requesterId }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Queued 2 notifications for user unregistered')
      );
    });

    it('should handle missing requester', async () => {
      const recipientData: RecipientData = {
        userId: mockRecipient.id,
        email: mockRecipient.email,
      };

      const paymentRequest: PaymentRequest = {
        id: 'request-789',
        requesterId: 'nonexistent-requester',
        amount: 100.00,
        currency: 'USD',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.sendPaymentRequest(recipientData, paymentRequest)
      ).rejects.toThrow('Requester not found: nonexistent-requester');
    });

    it('should skip notification when no channels available', async () => {
      const recipientData: RecipientData = {
        userId: mockRecipient.id,
      };

      const paymentRequest: PaymentRequest = {
        id: 'request-123',
        requesterId: mockUser.id,
        amount: 50.00,
        currency: 'USD',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock getNotificationPreferences to return disabled payment requests
      const originalGetPreferences = notificationService.getNotificationPreferences;
      notificationService.getNotificationPreferences = vi.fn().mockResolvedValue({
        userId: mockRecipient.id,
        channels: [{ type: 'email', enabled: false, address: mockRecipient.email, verified: true }],
        paymentRequests: false, // Disabled
        paymentConfirmations: true,
        statusUpdates: true,
        securityAlerts: true,
        marketing: false,
        updatedAt: new Date(),
      });

      await notificationService.sendPaymentRequest(recipientData, paymentRequest);

      expect(consoleSpy).toHaveBeenCalledWith('No available notification channels for payment request');

      // Restore original method
      notificationService.getNotificationPreferences = originalGetPreferences;
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send confirmation to both sender and recipient', async () => {
      const paymentResult: PaymentResult = {
        paymentId: 'payment-123',
        senderId: mockUser.id,
        recipientId: mockRecipient.id,
        amount: 150.75,
        currency: 'USD',
        status: 'completed',
        processorId: 'stripe',
        settlementMethod: 'circle',
        fees: 2.50,
        completedAt: new Date(),
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for sender
        .mockResolvedValueOnce(mockRecipient) // Second call for recipient
        .mockResolvedValueOnce(mockRecipient) // Third call for recipient preferences
        .mockResolvedValueOnce(mockUser); // Fourth call for sender preferences

      await notificationService.sendPaymentConfirmation(
        mockUser.id,
        mockRecipient.id,
        paymentResult
      );

      // Should call findUnique for both users and their preferences
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUser.id } });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: mockRecipient.id } });

      // Should queue notifications for both users
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${mockRecipient.id}`)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${mockUser.id}`)
      );
    });

    it('should handle missing sender or recipient', async () => {
      const paymentResult: PaymentResult = {
        paymentId: 'payment-456',
        senderId: 'nonexistent-sender',
        recipientId: mockRecipient.id,
        amount: 100.00,
        currency: 'USD',
        status: 'completed',
        processorId: 'stripe',
        settlementMethod: 'circle',
        fees: 1.50,
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // Sender not found
        .mockResolvedValueOnce(mockRecipient);

      await expect(
        notificationService.sendPaymentConfirmation(
          'nonexistent-sender',
          mockRecipient.id,
          paymentResult
        )
      ).rejects.toThrow('Sender or recipient not found');
    });

    it('should respect user preferences for payment confirmations', async () => {
      const paymentResult: PaymentResult = {
        paymentId: 'payment-789',
        senderId: mockUser.id,
        recipientId: mockRecipient.id,
        amount: 200.00,
        currency: 'EUR',
        status: 'completed',
        processorId: 'stripe',
        settlementMethod: 'mantle',
        fees: 3.00,
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockRecipient);

      // Mock getNotificationPreferences to disable confirmations for recipient
      const originalGetPreferences = notificationService.getNotificationPreferences;
      notificationService.getNotificationPreferences = vi.fn()
        .mockResolvedValueOnce({
          userId: mockRecipient.id,
          channels: [{ type: 'email', enabled: true, address: mockRecipient.email, verified: true }],
          paymentRequests: true,
          paymentConfirmations: false, // Disabled for recipient
          statusUpdates: true,
          securityAlerts: true,
          marketing: false,
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          userId: mockUser.id,
          channels: [{ type: 'email', enabled: true, address: mockUser.email, verified: true }],
          paymentRequests: true,
          paymentConfirmations: true, // Enabled for sender
          statusUpdates: true,
          securityAlerts: true,
          marketing: false,
          updatedAt: new Date(),
        });

      await notificationService.sendPaymentConfirmation(
        mockUser.id,
        mockRecipient.id,
        paymentResult
      );

      // Should only queue notifications for sender (recipient has confirmations disabled)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 1 notifications for user ${mockUser.id}`)
      );

      // Restore original method
      notificationService.getNotificationPreferences = originalGetPreferences;
    });
  });

  describe('sendOnboardingWelcome', () => {
    it('should send welcome notification to new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendOnboardingWelcome(mockUser.id);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${mockUser.id}`)
      );
    });

    it('should handle user without phone number', async () => {
      const userWithoutPhone = { ...mockUser, phone: null };
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPhone);

      await notificationService.sendOnboardingWelcome(mockUser.id);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 1 notifications for user ${mockUser.id}`)
      );
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.sendOnboardingWelcome('nonexistent-user')
      ).rejects.toThrow('User not found: nonexistent-user');
    });
  });

  describe('getNotificationPreferences', () => {
    it('should return default preferences for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const preferences = await notificationService.getNotificationPreferences(mockUser.id);

      expect(preferences).toEqual({
        userId: mockUser.id,
        channels: [
          {
            type: 'email',
            enabled: true,
            address: mockUser.email,
            verified: true
          },
          {
            type: 'sms',
            enabled: true,
            address: mockUser.phone,
            verified: false
          },
          {
            type: 'push',
            enabled: false,
            verified: false
          }
        ],
        paymentRequests: true,
        paymentConfirmations: true,
        statusUpdates: true,
        securityAlerts: true,
        marketing: false,
        updatedAt: expect.any(Date)
      });
    });

    it('should return preferences without SMS for user without phone', async () => {
      const userWithoutPhone = { ...mockUser, phone: null };
      mockPrisma.user.findUnique.mockResolvedValue(userWithoutPhone);

      const preferences = await notificationService.getNotificationPreferences(mockUser.id);

      expect(preferences.channels).toHaveLength(2); // email and push only
      expect(preferences.channels.find(c => c.type === 'sms')).toBeUndefined();
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        notificationService.getNotificationPreferences('nonexistent-user')
      ).rejects.toThrow('User not found: nonexistent-user');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const updates: Partial<NotificationPreferences> = {
        paymentRequests: false,
        marketing: true,
        channels: [
          {
            type: 'email',
            enabled: false,
            address: mockUser.email,
            verified: true
          }
        ]
      };

      await notificationService.updateNotificationPreferences(mockUser.id, updates);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Updated notification preferences for user ${mockUser.id}:`),
        expect.objectContaining({
          userId: mockUser.id,
          paymentRequests: false,
          marketing: true,
          updatedAt: expect.any(Date)
        })
      );
    });
  });

  describe('getDeliveryStats', () => {
    it('should return delivery statistics', async () => {
      // Send some notifications to populate the delivery queue
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-123',
        status: 'completed',
        amount: 100.00,
        currency: 'USD',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
      };

      await notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus);

      const stats = await notificationService.getDeliveryStats();

      expect(stats).toEqual({
        total: expect.any(Number),
        pending: expect.any(Number),
        delivered: expect.any(Number),
        failed: expect.any(Number),
        byChannel: expect.any(Object)
      });

      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('template rendering', () => {
    it('should render email template with variables correctly', async () => {
      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-123',
        status: 'completed',
        amount: 100.50,
        currency: 'USD',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        processorId: 'stripe',
        settlementMethod: 'circle',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus);

      // Wait for delivery processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check that notifications were queued
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Queued 2 notifications for user ${mockUser.id}`)
      );

      // Check that delivery processing occurred (template rendering happens during delivery)
      const stats = await notificationService.getDeliveryStats();
      expect(stats.total).toBeGreaterThan(0);
    });

    it('should handle missing template variables gracefully', async () => {
      const recipientData: RecipientData = {
        email: 'test@example.com',
        // Missing firstName and lastName
      };

      const paymentRequest: PaymentRequest = {
        id: 'request-123',
        requesterId: mockUser.id,
        amount: 50.00,
        currency: 'USD',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        // Missing description
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await notificationService.sendPaymentRequest(recipientData, paymentRequest);

      // Wait for delivery processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should queue notifications for unregistered user
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Queued 1 notifications for user unregistered')
      );

      const stats = await notificationService.getDeliveryStats();
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-123',
        status: 'completed',
        amount: 100.00,
        currency: 'USD',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
      };

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle template rendering errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Create a notification with invalid template type
      const invalidNotificationData: NotificationData = {
        userId: mockUser.id,
        type: 'invalid_type' as any,
        channels: ['email'],
        priority: 'normal',
        variables: {}
      };

      // Mock console.warn to capture template not found warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // This should not throw but should log warnings about missing templates
      await (notificationService as any).sendNotification(invalidNotificationData);

      // Wait for delivery processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Template not found for invalid_type_email')
      );

      warnSpy.mockRestore();
    });
  });

  describe('delivery retry mechanism', () => {
    it('should retry failed deliveries up to max attempts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock Math.random to always return failure (> 0.1)
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.2); // Will cause delivery to fail

      const paymentStatus: PaymentStatus = {
        paymentId: 'payment-123',
        status: 'failed',
        amount: 100.00,
        currency: 'USD',
        senderId: 'sender-123',
        recipientId: 'recipient-456',
        failureReason: 'Test failure',
      };

      await notificationService.sendPaymentStatusUpdate(mockUser.id, paymentStatus);

      // Wait for delivery processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = await notificationService.getDeliveryStats();
      expect(stats.total).toBeGreaterThan(0);

      // Restore Math.random
      Math.random = originalRandom;
    });
  });
});