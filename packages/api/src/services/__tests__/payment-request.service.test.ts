import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PaymentRequestService, PaymentRequestData } from '../payment-request.service';
import * as jwt from 'jsonwebtoken';

// Mock the PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    paymentRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

// Mock QRCode
vi.mock('qrcode', () => ({
  toDataURL: vi.fn(),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

describe('PaymentRequestService', () => {
  let service: PaymentRequestService;
  let mockPrisma: any;
  let mockQRCode: any;

  beforeAll(() => {
    // Set environment variables for testing
    process.env.JWT_SECRET = 'test-secret';
    process.env.BASE_URL = 'http://localhost:3000';
  });

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Import and mock QRCode
    mockQRCode = await import('qrcode');
    vi.mocked(mockQRCode.toDataURL).mockResolvedValue('data:image/png;base64,mock-qr-code');
    
    // Create service instance
    service = new PaymentRequestService();
    mockPrisma = (service as any).prisma;
  });

  afterEach(async () => {
    await service.disconnect();
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.JWT_SECRET;
    delete process.env.BASE_URL;
  });

  describe('createPaymentRequest', () => {
    it('should create a payment request successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        requesterId: 'user-123',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        status: 'PENDING',
        shareableLink: 'http://localhost:3000/pay/mock-uuid-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        requester: {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      };

      mockPrisma.paymentRequest.create.mockResolvedValue(mockPaymentRequest);

      const requestData: PaymentRequestData = {
        requesterId: 'user-123',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
      };

      const result = await service.createPaymentRequest(requestData);

      expect(mockPrisma.paymentRequest.create).toHaveBeenCalledWith({
        data: {
          requesterId: 'user-123',
          amount: 100,
          currency: 'USD',
          description: 'Test payment',
          expiresAt: expect.any(Date),
          shareableLink: 'http://localhost:3000/pay/mock-uuid-123',
          metadata: {},
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      expect(result).toEqual(mockPaymentRequest);
    });

    it('should use custom expiration date when provided', async () => {
      const customExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const mockPaymentRequest = {
        id: 'req-123',
        requesterId: 'user-123',
        amount: 100,
        currency: 'USD',
        expiresAt: customExpiresAt,
      };

      mockPrisma.paymentRequest.create.mockResolvedValue(mockPaymentRequest);

      const requestData: PaymentRequestData = {
        requesterId: 'user-123',
        amount: 100,
        currency: 'USD',
        expiresAt: customExpiresAt,
      };

      await service.createPaymentRequest(requestData);

      expect(mockPrisma.paymentRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: customExpiresAt,
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      mockPrisma.paymentRequest.create.mockRejectedValue(new Error('Database error'));

      const requestData: PaymentRequestData = {
        requesterId: 'user-123',
        amount: 100,
        currency: 'USD',
      };

      await expect(service.createPaymentRequest(requestData)).rejects.toThrow('Failed to create payment request');
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PENDING',
        shareableLink: 'http://localhost:3000/pay/mock-uuid-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);
      mockPrisma.paymentRequest.update.mockResolvedValue({});

      const result = await service.generateQRCode('req-123');

      expect(mockPrisma.paymentRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-123' },
      });

      expect(mockQRCode.toDataURL).toHaveBeenCalledWith(
        'http://localhost:3000/pay/mock-uuid-123',
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          type: 'image/png',
          margin: 1,
          width: 256,
        })
      );

      expect(mockPrisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: { qrCode: 'data:image/png;base64,mock-qr-code' },
      });

      expect(result).toEqual({
        qrCodeDataUrl: 'data:image/png;base64,mock-qr-code',
        shareableLink: 'http://localhost:3000/pay/mock-uuid-123',
      });
    });

    it('should throw error if payment request not found', async () => {
      mockPrisma.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(service.generateQRCode('req-123')).rejects.toThrow('Payment request not found');
    });

    it('should throw error if payment request is not pending', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PAID',
        shareableLink: 'http://localhost:3000/pay/mock-uuid-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      await expect(service.generateQRCode('req-123')).rejects.toThrow('Payment request is not in pending status');
    });

    it('should throw error if payment request has expired', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PENDING',
        shareableLink: 'http://localhost:3000/pay/mock-uuid-123',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      await expect(service.generateQRCode('req-123')).rejects.toThrow('Payment request has expired');
    });
  });

  describe('generateShareableLink', () => {
    it('should generate secure shareable link successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      const result = await service.generateShareableLink('req-123');

      expect(mockPrisma.paymentRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-123' },
      });

      expect(result).toMatch(/^http:\/\/localhost:3000\/pay\/secure\/.+/);
    });

    it('should throw error if payment request not found', async () => {
      mockPrisma.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(service.generateShareableLink('req-123')).rejects.toThrow('Payment request not found');
    });

    it('should throw error if payment request is not pending', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PAID',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      await expect(service.generateShareableLink('req-123')).rejects.toThrow('Payment request is not in pending status');
    });
  });

  describe('processPaymentRequest', () => {
    it('should process payment request successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        requesterId: 'user-456',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const mockPayment = {
        id: 'payment-123',
        senderId: 'user-789',
        recipientId: 'user-456',
        amount: 100,
        currency: 'USD',
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentRequest.update.mockResolvedValue({});

      const paymentData = {
        senderId: 'user-789',
        processorId: 'stripe',
        settlementMethod: 'circle',
      };

      const result = await service.processPaymentRequest('req-123', paymentData);

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          senderId: 'user-789',
          recipientId: 'user-456',
          amount: 100,
          currency: 'USD',
          processorId: 'stripe',
          settlementMethod: 'circle',
          status: 'PROCESSING',
          metadata: {},
        },
      });

      expect(mockPrisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
          paymentId: 'payment-123',
        },
      });

      expect(result).toEqual({
        success: true,
        paymentId: 'payment-123',
      });
    });

    it('should return error if payment request not found', async () => {
      mockPrisma.paymentRequest.findUnique.mockResolvedValue(null);

      const result = await service.processPaymentRequest('req-123', {});

      expect(result).toEqual({
        success: false,
        error: 'Payment request not found',
      });
    });

    it('should return error if payment request is not pending', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PAID',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      const result = await service.processPaymentRequest('req-123', {});

      expect(result).toEqual({
        success: false,
        error: 'Payment request is not in pending status',
      });
    });

    it('should return error if payment request has expired', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      const result = await service.processPaymentRequest('req-123', {});

      expect(result).toEqual({
        success: false,
        error: 'Payment request has expired',
      });
    });
  });

  describe('getRequestStatus', () => {
    it('should return payment request status successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        createdAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-02'),
        paidAt: null,
        paymentId: null,
        payment: null,
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      const result = await service.getRequestStatus('req-123');

      expect(mockPrisma.paymentRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        include: { payment: true },
      });

      expect(result).toEqual({
        id: 'req-123',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        createdAt: new Date('2024-01-01'),
        expiresAt: new Date('2024-01-02'),
        paidAt: undefined,
        paymentId: undefined,
      });
    });

    it('should return null if payment request not found', async () => {
      mockPrisma.paymentRequest.findUnique.mockResolvedValue(null);

      const result = await service.getRequestStatus('req-123');

      expect(result).toBeNull();
    });
  });

  describe('validateShareableToken', () => {
    it('should validate token successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const token = jwt.sign(
        {
          requestId: 'req-123',
          amount: 100,
          currency: 'USD',
          expiresAt: mockPaymentRequest.expiresAt.toISOString(),
        },
        'test-secret',
        { expiresIn: '24h' }
      );

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      const result = await service.validateShareableToken(token);

      expect(result).toEqual({
        requestId: 'req-123',
        amount: 100,
        currency: 'USD',
        expiresAt: mockPaymentRequest.expiresAt.toISOString(),
        paymentRequest: mockPaymentRequest,
      });
    });

    it('should throw error for invalid token', async () => {
      await expect(service.validateShareableToken('invalid-token')).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error if payment request not found', async () => {
      const token = jwt.sign(
        { requestId: 'req-123', amount: 100, currency: 'USD' },
        'test-secret',
        { expiresIn: '24h' }
      );

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(service.validateShareableToken(token)).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('cancelPaymentRequest', () => {
    it('should cancel payment request successfully', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        requesterId: 'user-123',
        status: 'PENDING',
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);
      mockPrisma.paymentRequest.update.mockResolvedValue({});

      const result = await service.cancelPaymentRequest('req-123', 'user-123');

      expect(mockPrisma.paymentRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-123' },
        data: { status: 'CANCELLED' },
      });

      expect(result).toBe(true);
    });

    it('should throw error if payment request not found', async () => {
      mockPrisma.paymentRequest.findUnique.mockResolvedValue(null);

      await expect(service.cancelPaymentRequest('req-123', 'user-123')).rejects.toThrow('Payment request not found');
    });

    it('should throw error if user is not authorized', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        requesterId: 'user-456',
        status: 'PENDING',
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      await expect(service.cancelPaymentRequest('req-123', 'user-123')).rejects.toThrow('Unauthorized to cancel this payment request');
    });

    it('should throw error if payment request is not pending', async () => {
      const mockPaymentRequest = {
        id: 'req-123',
        requesterId: 'user-123',
        status: 'PAID',
      };

      mockPrisma.paymentRequest.findUnique.mockResolvedValue(mockPaymentRequest);

      await expect(service.cancelPaymentRequest('req-123', 'user-123')).rejects.toThrow('Can only cancel pending payment requests');
    });
  });

  describe('getUserPaymentRequests', () => {
    it('should get user payment requests successfully', async () => {
      const mockPaymentRequests = [
        {
          id: 'req-123',
          requesterId: 'user-123',
          amount: 100,
          currency: 'USD',
          status: 'PENDING',
          payment: null,
        },
        {
          id: 'req-456',
          requesterId: 'user-123',
          amount: 200,
          currency: 'EUR',
          status: 'PAID',
          payment: {
            id: 'payment-123',
            sender: {
              id: 'user-789',
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'jane@example.com',
            },
          },
        },
      ];

      mockPrisma.paymentRequest.findMany.mockResolvedValue(mockPaymentRequests);

      const result = await service.getUserPaymentRequests('user-123');

      expect(mockPrisma.paymentRequest.findMany).toHaveBeenCalledWith({
        where: { requesterId: 'user-123' },
        include: {
          payment: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(mockPaymentRequests);
    });

    it('should filter by status when provided', async () => {
      mockPrisma.paymentRequest.findMany.mockResolvedValue([]);

      await service.getUserPaymentRequests('user-123', 'PENDING');

      expect(mockPrisma.paymentRequest.findMany).toHaveBeenCalledWith({
        where: { requesterId: 'user-123', status: 'PENDING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});