import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TransferService, UnregisteredUserData, TransferRequest, PaymentRequestTransferData } from '../transfer.service';
import { PaymentRequestService } from '../payment-request.service';
import { PaymentProcessorService } from '../payment-processor.service';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

// Mock PaymentRequestService
vi.mock('../payment-request.service', () => ({
  PaymentRequestService: vi.fn(() => ({
    getRequestStatus: vi.fn(),
    processPaymentRequest: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Mock PaymentProcessorService
vi.mock('../payment-processor.service', () => ({
  PaymentProcessorService: vi.fn(() => ({
    analyzeUserLocation: vi.fn(),
    getAvailableProcessors: vi.fn(),
    selectOptimalProcessor: vi.fn(),
  })),
}));

describe('TransferService', () => {
  let transferService: TransferService;
  let mockPrisma: any;
  let mockPaymentRequestService: any;
  let mockPaymentProcessorService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    country: 'US',
    currency: 'USD',
    kycStatus: 'PENDING',
  };

  const mockRecipient = {
    id: 'recipient-456',
    email: 'recipient@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    country: 'US',
    currency: 'USD',
    kycStatus: 'VERIFIED',
  };

  const mockPaymentRequest = {
    id: 'request-789',
    status: 'PENDING',
    amount: 100,
    currency: 'USD',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    requesterId: mockRecipient.id,
  };

  const mockProcessorSelection = {
    selectedProcessor: {
      id: 'stripe',
      name: 'Stripe',
      supportedCountries: ['US'],
      supportedCurrencies: ['USD'],
      fees: { fixedFee: 0.30, percentageFee: 2.9, currency: 'USD' },
      processingTime: '1-3 business days',
      userExperienceScore: 9.0,
      reliability: 99.9,
      isAvailable: true,
    },
    reason: 'Selected Stripe for excellent user experience',
    alternatives: [],
    estimatedFees: 3.20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    mockPaymentRequestService = {
      getRequestStatus: vi.fn(),
      processPaymentRequest: vi.fn(),
      disconnect: vi.fn(),
    };

    mockPaymentProcessorService = {
      analyzeUserLocation: vi.fn(),
      getAvailableProcessors: vi.fn(),
      selectOptimalProcessor: vi.fn(),
    };

    // Mock constructors
    (PrismaClient as Mock).mockImplementation(() => mockPrisma);
    (PaymentRequestService as Mock).mockImplementation(() => mockPaymentRequestService);
    (PaymentProcessorService as Mock).mockImplementation(() => mockPaymentProcessorService);

    transferService = new TransferService();
  });

  afterEach(async () => {
    await transferService.disconnect();
  });

  describe('createUserToUserTransfer', () => {
    it('should create a successful user-to-user transfer', async () => {
      const transferRequest: TransferRequest = {
        senderId: mockUser.id,
        recipientId: mockRecipient.id,
        amount: 100,
        currency: 'USD',
        description: 'Test transfer',
      };

      const mockPayment = {
        id: 'payment-123',
        senderId: mockUser.id,
        recipientId: mockRecipient.id,
        amount: 100,
        currency: 'USD',
        processorId: 'stripe',
        settlementMethod: 'circle',
        status: 'PENDING',
      };

      // Setup mocks
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // sender
        .mockResolvedValueOnce(mockRecipient); // recipient
      
      mockPaymentProcessorService.analyzeUserLocation.mockResolvedValue({
        country: 'US',
        currency: 'USD',
      });
      
      mockPaymentProcessorService.getAvailableProcessors.mockResolvedValue([
        mockProcessorSelection.selectedProcessor,
      ]);
      
      mockPaymentProcessorService.selectOptimalProcessor.mockResolvedValue(mockProcessorSelection);
      
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await transferService.createUserToUserTransfer(transferRequest);

      expect(result.success).toBe(true);
      expect(result.transferId).toBe(mockPayment.id);
      expect(result.paymentId).toBe(mockPayment.id);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          senderId: mockUser.id,
          recipientId: mockRecipient.id,
          amount: 100,
          currency: 'USD',
          processorId: 'stripe',
          settlementMethod: 'circle',
          status: 'PENDING',
          metadata: {},
        },
      });
    });

    it('should fail when sender ID is missing', async () => {
      const transferRequest: TransferRequest = {
        recipientId: mockRecipient.id,
        amount: 100,
        currency: 'USD',
      };

      const result = await transferService.createUserToUserTransfer(transferRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sender ID is required for user-to-user transfers');
    });

    it('should fail when sender is not found', async () => {
      const transferRequest: TransferRequest = {
        senderId: 'non-existent-user',
        recipientId: mockRecipient.id,
        amount: 100,
        currency: 'USD',
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // sender not found
        .mockResolvedValueOnce(mockRecipient); // recipient

      const result = await transferService.createUserToUserTransfer(transferRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sender not found');
    });

    it('should fail when recipient is not found', async () => {
      const transferRequest: TransferRequest = {
        senderId: mockUser.id,
        recipientId: 'non-existent-recipient',
        amount: 100,
        currency: 'USD',
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // sender
        .mockResolvedValueOnce(null); // recipient not found

      const result = await transferService.createUserToUserTransfer(transferRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Recipient not found');
    });
  });

  describe('handleUnregisteredUserAccess', () => {
    const unregisteredUserData: UnregisteredUserData = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      country: 'US',
      currency: 'USD',
    };

    it('should create onboarding token for new unregistered user', async () => {
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(mockPaymentRequest);
      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist

      const result = await transferService.handleUnregisteredUserAccess(
        mockPaymentRequest.id,
        unregisteredUserData
      );

      expect(result.success).toBe(true);
      expect(result.requiresOnboarding).toBe(true);
      expect(result.onboardingToken).toBeDefined();
      expect(typeof result.onboardingToken).toBe('string');
    });

    it('should process payment for existing user', async () => {
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(mockPaymentRequest);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser); // User exists
      
      // Mock processor selection
      mockPaymentProcessorService.analyzeUserLocation.mockResolvedValue({
        country: 'US',
        currency: 'USD',
      });
      mockPaymentProcessorService.getAvailableProcessors.mockResolvedValue([
        mockProcessorSelection.selectedProcessor,
      ]);
      mockPaymentProcessorService.selectOptimalProcessor.mockResolvedValue(mockProcessorSelection);
      
      mockPaymentRequestService.processPaymentRequest.mockResolvedValue({
        success: true,
        paymentId: 'payment-123',
      });

      const result = await transferService.handleUnregisteredUserAccess(
        mockPaymentRequest.id,
        unregisteredUserData
      );

      expect(result.success).toBe(true);
      expect(result.requiresOnboarding).toBeUndefined();
      expect(result.transferId).toBe('payment-123');
    });

    it('should fail when payment request is not found', async () => {
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(null);

      const result = await transferService.handleUnregisteredUserAccess(
        'non-existent-request',
        unregisteredUserData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment request not found');
    });

    it('should fail when payment request is not pending', async () => {
      const expiredRequest = { ...mockPaymentRequest, status: 'EXPIRED' };
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(expiredRequest);

      const result = await transferService.handleUnregisteredUserAccess(
        mockPaymentRequest.id,
        unregisteredUserData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment request is not available for payment');
    });

    it('should fail when payment request has expired', async () => {
      const expiredRequest = {
        ...mockPaymentRequest,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(expiredRequest);

      const result = await transferService.handleUnregisteredUserAccess(
        mockPaymentRequest.id,
        unregisteredUserData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment request has expired');
    });
  });

  describe('completeOnboardingAndProcessPayment', () => {
    const unregisteredUserData: UnregisteredUserData = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
      country: 'US',
      currency: 'USD',
    };

    it('should complete onboarding and process payment successfully', async () => {
      // First, create an onboarding token
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(mockPaymentRequest);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const accessResult = await transferService.handleUnregisteredUserAccess(
        mockPaymentRequest.id,
        unregisteredUserData
      );

      expect(accessResult.success).toBe(true);
      expect(accessResult.onboardingToken).toBeDefined();

      // Now complete the onboarding
      const newUser = { ...mockUser, id: 'new-user-123', email: unregisteredUserData.email };
      mockPrisma.user.create.mockResolvedValue(newUser);
      
      // Mock processor selection
      mockPaymentProcessorService.analyzeUserLocation.mockResolvedValue({
        country: 'US',
        currency: 'USD',
      });
      mockPaymentProcessorService.getAvailableProcessors.mockResolvedValue([
        mockProcessorSelection.selectedProcessor,
      ]);
      mockPaymentProcessorService.selectOptimalProcessor.mockResolvedValue(mockProcessorSelection);
      
      mockPaymentRequestService.processPaymentRequest.mockResolvedValue({
        success: true,
        paymentId: 'payment-123',
      });

      const result = await transferService.completeOnboardingAndProcessPayment(
        accessResult.onboardingToken!
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(newUser.id);
      expect(result.transferId).toBe('payment-123');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: unregisteredUserData.email,
          firstName: unregisteredUserData.firstName,
          lastName: unregisteredUserData.lastName,
          phone: unregisteredUserData.phone,
          country: unregisteredUserData.country,
          currency: unregisteredUserData.currency,
          kycStatus: 'PENDING',
        },
      });
    });

    it('should fail with invalid onboarding token', async () => {
      const result = await transferService.completeOnboardingAndProcessPayment('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired onboarding token');
    });
  });

  describe('fulfillPaymentRequest', () => {
    const transferData: PaymentRequestTransferData = {
      paymentRequestId: mockPaymentRequest.id,
      senderData: {
        email: 'sender@example.com',
        firstName: 'Sender',
        lastName: 'User',
        country: 'US',
        currency: 'USD',
      },
    };

    it('should fulfill payment request with existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Mock processor selection
      mockPaymentProcessorService.analyzeUserLocation.mockResolvedValue({
        country: 'US',
        currency: 'USD',
      });
      mockPaymentProcessorService.getAvailableProcessors.mockResolvedValue([
        mockProcessorSelection.selectedProcessor,
      ]);
      mockPaymentProcessorService.selectOptimalProcessor.mockResolvedValue(mockProcessorSelection);
      
      mockPaymentRequestService.processPaymentRequest.mockResolvedValue({
        success: true,
        paymentId: 'payment-123',
      });

      const result = await transferService.fulfillPaymentRequest(transferData);

      expect(result.success).toBe(true);
      expect(result.transferId).toBe('payment-123');
      expect(result.userId).toBeUndefined(); // User already existed
    });

    it('should fulfill payment request with new user creation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      
      const newUser = { ...mockUser, id: 'new-user-456', email: transferData.senderData.email };
      mockPrisma.user.create.mockResolvedValue(newUser);
      
      // Mock processor selection
      mockPaymentProcessorService.analyzeUserLocation.mockResolvedValue({
        country: 'US',
        currency: 'USD',
      });
      mockPaymentProcessorService.getAvailableProcessors.mockResolvedValue([
        mockProcessorSelection.selectedProcessor,
      ]);
      mockPaymentProcessorService.selectOptimalProcessor.mockResolvedValue(mockProcessorSelection);
      
      mockPaymentRequestService.processPaymentRequest.mockResolvedValue({
        success: true,
        paymentId: 'payment-123',
      });

      const result = await transferService.fulfillPaymentRequest(transferData);

      expect(result.success).toBe(true);
      expect(result.transferId).toBe('payment-123');
      expect(result.userId).toBe(newUser.id);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: transferData.senderData.email,
          firstName: transferData.senderData.firstName,
          lastName: transferData.senderData.lastName,
          phone: transferData.senderData.phone,
          country: transferData.senderData.country,
          currency: transferData.senderData.currency,
          kycStatus: 'PENDING',
        },
      });
    });

    it('should use specified processor and settlement method', async () => {
      const transferDataWithProcessor: PaymentRequestTransferData = {
        ...transferData,
        processorId: 'plaid',
        settlementMethod: 'mantle',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPaymentRequestService.processPaymentRequest.mockResolvedValue({
        success: true,
        paymentId: 'payment-123',
      });

      const result = await transferService.fulfillPaymentRequest(transferDataWithProcessor);

      expect(result.success).toBe(true);
      expect(mockPaymentRequestService.processPaymentRequest).toHaveBeenCalledWith(
        transferData.paymentRequestId,
        {
          senderId: mockUser.id,
          processorId: 'plaid',
          settlementMethod: 'mantle',
          metadata: {},
        }
      );
    });
  });

  describe('validatePaymentRequestAccess', () => {
    it('should validate accessible payment request', async () => {
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(mockPaymentRequest);

      const result = await transferService.validatePaymentRequestAccess(mockPaymentRequest.id);

      expect(result.valid).toBe(true);
      expect(result.paymentRequest).toEqual(mockPaymentRequest);
      expect(result.error).toBeUndefined();
    });

    it('should invalidate non-existent payment request', async () => {
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(null);

      const result = await transferService.validatePaymentRequestAccess('non-existent');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Payment request not found');
    });

    it('should invalidate non-pending payment request', async () => {
      const paidRequest = { ...mockPaymentRequest, status: 'PAID' };
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(paidRequest);

      const result = await transferService.validatePaymentRequestAccess(mockPaymentRequest.id);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Payment request is not available for payment');
    });

    it('should invalidate expired payment request', async () => {
      const expiredRequest = {
        ...mockPaymentRequest,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      };
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(expiredRequest);

      const result = await transferService.validatePaymentRequestAccess(mockPaymentRequest.id);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Payment request has expired');
    });
  });

  describe('getUserTransferHistory', () => {
    it('should return combined transfer history', async () => {
      const sentPayments = [
        {
          id: 'payment-1',
          senderId: mockUser.id,
          recipientId: mockRecipient.id,
          amount: 100,
          currency: 'USD',
          status: 'COMPLETED',
          createdAt: new Date('2024-01-01'),
          recipient: {
            id: mockRecipient.id,
            firstName: mockRecipient.firstName,
            lastName: mockRecipient.lastName,
            email: mockRecipient.email,
          },
          paymentRequest: null,
        },
      ];

      const receivedPayments = [
        {
          id: 'payment-2',
          senderId: mockRecipient.id,
          recipientId: mockUser.id,
          amount: 50,
          currency: 'USD',
          status: 'COMPLETED',
          createdAt: new Date('2024-01-02'),
          sender: {
            id: mockRecipient.id,
            firstName: mockRecipient.firstName,
            lastName: mockRecipient.lastName,
            email: mockRecipient.email,
          },
          paymentRequest: null,
        },
      ];

      mockPrisma.payment.findMany
        .mockResolvedValueOnce(sentPayments)
        .mockResolvedValueOnce(receivedPayments);

      const result = await transferService.getUserTransferHistory(mockUser.id);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ...receivedPayments[0], type: 'received' });
      expect(result[1]).toEqual({ ...sentPayments[0], type: 'sent' });
    });
  });

  describe('getOnboardingFlowData', () => {
    it('should return onboarding data for valid token', async () => {
      const unregisteredUserData: UnregisteredUserData = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        country: 'US',
        currency: 'USD',
      };

      // Create onboarding token first
      mockPaymentRequestService.getRequestStatus.mockResolvedValue(mockPaymentRequest);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const accessResult = await transferService.handleUnregisteredUserAccess(
        mockPaymentRequest.id,
        unregisteredUserData
      );

      const onboardingData = await transferService.getOnboardingFlowData(
        accessResult.onboardingToken!
      );

      expect(onboardingData).toBeDefined();
      expect(onboardingData!.paymentRequestId).toBe(mockPaymentRequest.id);
      expect(onboardingData!.userData).toEqual(unregisteredUserData);
    });

    it('should return null for invalid token', async () => {
      const result = await transferService.getOnboardingFlowData('invalid-token');
      expect(result).toBeNull();
    });
  });
});