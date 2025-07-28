// src/routes/__tests__/payment-requests.controller.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the PaymentRequestService
vi.mock('../../services/payment-request.service', () => ({
  PaymentRequestService: vi.fn().mockImplementation(() => ({
    createPaymentRequest: vi.fn(),
    getRequestStatus: vi.fn(),
    generateQRCode: vi.fn(),
    generateShareableLink: vi.fn(),
    processPaymentRequest: vi.fn(),
    cancelPaymentRequest: vi.fn(),
    getUserPaymentRequests: vi.fn(),
    validateShareableToken: vi.fn(),
  })),
}));

// Mock the PaymentProcessorService
vi.mock('../../services/payment-processor.service', () => ({
  PaymentProcessorService: vi.fn().mockImplementation(() => ({
    analyzeUserLocation: vi.fn(),
    processPaymentWithFallback: vi.fn(),
    processPayment: vi.fn(),
  })),
}));

import paymentRequestRoutes from '../payment-requests.controller';
import { PaymentRequestService } from '../../services/payment-request.service';
import { PaymentProcessorService } from '../../services/payment-processor.service';

const app = express();
app.use(express.json());
app.use('/api/payment-requests', paymentRequestRoutes);

describe('Payment Request Controller', () => {
  let mockService: any;
  let mockProcessorService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked service instances
    mockService = new PaymentRequestService();
    mockProcessorService = new PaymentProcessorService();
  });

  describe('POST /api/payment-requests', () => {
    it('should create a payment request successfully', async () => {
      const mockPaymentRequest = {
        id: 'req_123',
        requesterId: 'user_123',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        requester: {
          id: 'user_123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      };

      mockService.createPaymentRequest.mockResolvedValue(mockPaymentRequest);

      const response = await request(app)
        .post('/api/payment-requests')
        .send({
          requesterId: 'user_123',
          amount: 100,
          currency: 'USD',
          description: 'Test payment',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPaymentRequest);
      expect(response.body.message).toBe('Payment request created successfully');
    });

    it('should return 400 for invalid input data', async () => {
      const response = await request(app)
        .post('/api/payment-requests')
        .send({
          requesterId: '',
          amount: -100,
          currency: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid input data');
      expect(response.body.errors).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockService.createPaymentRequest.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/payment-requests')
        .send({
          requesterId: 'user_123',
          amount: 100,
          currency: 'USD',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to create payment request');
    });
  });

  describe('GET /api/payment-requests/:id', () => {
    it('should get payment request details successfully', async () => {
      const mockPaymentRequest = {
        id: 'req_123',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
        description: 'Test payment',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockService.getRequestStatus.mockResolvedValue(mockPaymentRequest);

      const response = await request(app)
        .get('/api/payment-requests/req_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPaymentRequest);
    });

    it('should return 404 for non-existent payment request', async () => {
      mockService.getRequestStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/payment-requests/non_existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment request not found');
    });
  });

  describe('GET /api/payment-requests/:id/qr-code', () => {
    it('should generate QR code successfully', async () => {
      const mockQRData = {
        qrCodeDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        shareableLink: 'https://example.com/pay/token123',
      };

      mockService.generateQRCode.mockResolvedValue(mockQRData);

      const response = await request(app)
        .get('/api/payment-requests/req_123/qr-code');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQRData);
      expect(response.body.message).toBe('QR code generated successfully');
    });

    it('should return 404 for non-existent payment request', async () => {
      mockService.generateQRCode.mockRejectedValue(
        new Error('Payment request not found')
      );

      const response = await request(app)
        .get('/api/payment-requests/non_existent/qr-code');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment request not found');
    });

    it('should return 400 for expired payment request', async () => {
      mockService.generateQRCode.mockRejectedValue(
        new Error('Payment request has expired')
      );

      const response = await request(app)
        .get('/api/payment-requests/req_123/qr-code');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment request has expired');
    });
  });

  describe('GET /api/payment-requests/:id/shareable-link', () => {
    it('should generate shareable link successfully', async () => {
      const mockShareableLink = 'https://example.com/pay/secure/jwt_token_here';

      mockService.generateShareableLink.mockResolvedValue(mockShareableLink);

      const response = await request(app)
        .get('/api/payment-requests/req_123/shareable-link');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shareableLink).toBe(mockShareableLink);
      expect(response.body.message).toBe('Shareable link generated successfully');
    });

    it('should return 400 for non-pending payment request', async () => {
      mockService.generateShareableLink.mockRejectedValue(
        new Error('Payment request is not in pending status')
      );

      const response = await request(app)
        .get('/api/payment-requests/req_123/shareable-link');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment request is not in pending status');
    });
  });

  describe('POST /api/payment-requests/:id/pay', () => {
    const mockPaymentRequest = {
      id: 'req_123',
      requesterId: 'user_123',
      amount: 100,
      currency: 'USD',
      status: 'PENDING',
      description: 'Test payment',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      mockService.getRequestStatus.mockResolvedValue(mockPaymentRequest);
    });

    it('should process payment successfully with legacy flow', async () => {
      const mockPaymentResult = {
        success: true,
        paymentId: 'pay_123',
      };

      mockService.processPaymentRequest.mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456',
          processorId: 'stripe',
          settlementMethod: 'circle',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('pay_123');
      expect(response.body.message).toBe('Payment processed successfully');
    });

    it('should process payment with intelligent processor selection', async () => {
      const mockLocation = {
        country: 'US',
        region: 'North America',
        currency: 'USD',
        timezone: 'America/New_York'
      };

      const mockProcessorResult = {
        success: true,
        transactionId: 'txn_123',
        clientSecret: 'pi_test_client_secret',
        paymentIntentId: 'pi_test_123',
        processorResponse: {
          processorId: 'stripe',
          actualProcessor: 'stripe',
          fallbackUsed: false
        }
      };

      const mockPaymentResult = {
        success: true,
        paymentId: 'pay_123'
      };

      mockProcessorService.analyzeUserLocation.mockResolvedValue(mockLocation);
      mockProcessorService.processPaymentWithFallback.mockResolvedValue(mockProcessorResult);
      mockService.processPaymentRequest.mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('pay_123');
      expect(response.body.data.processorId).toBe('stripe');
      expect(response.body.data.clientSecret).toBe('pi_test_client_secret');
      expect(response.body.data.fallbackUsed).toBe(false);

      expect(mockProcessorService.analyzeUserLocation).toHaveBeenCalledWith('user_456');
      expect(mockProcessorService.processPaymentWithFallback).toHaveBeenCalledWith(
        mockLocation,
        expect.objectContaining({
          amount: 100,
          currency: 'USD',
          description: 'Test payment',
          metadata: expect.objectContaining({
            paymentRequestId: 'req_123',
            senderId: 'user_456',
            requesterId: 'user_123'
          })
        }),
        expect.objectContaining({
          prioritizeCost: false,
          prioritizeSpeed: true,
          prioritizeReliability: true
        })
      );
    });

    it('should process payment with specified processor', async () => {
      const mockProcessorResult = {
        success: true,
        transactionId: 'txn_123',
        clientSecret: 'pi_test_client_secret',
        paymentIntentId: 'pi_test_123'
      };

      const mockPaymentResult = {
        success: true,
        paymentId: 'pay_123'
      };

      mockProcessorService.processPayment.mockResolvedValue(mockProcessorResult);
      mockService.processPaymentRequest.mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456',
          processorId: 'stripe'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('pay_123');
      expect(response.body.data.processorId).toBe('stripe');

      expect(mockProcessorService.processPayment).toHaveBeenCalledWith(
        'stripe',
        expect.objectContaining({
          amount: 100,
          currency: 'USD',
          description: 'Test payment'
        })
      );
    });

    it('should handle processor selection failure with fallback', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      const mockFallbackResult = {
        success: true,
        paymentId: 'pay_123'
      };

      mockProcessorService.analyzeUserLocation.mockResolvedValue(mockLocation);
      mockProcessorService.processPaymentWithFallback.mockRejectedValue(
        new Error('All processors failed')
      );
      mockService.processPaymentRequest.mockResolvedValue(mockFallbackResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentId).toBe('pay_123');
      expect(response.body.data.processorId).toBe('stripe');
      expect(response.body.data.fallbackUsed).toBe(true);
      expect(response.body.data.fallbackReason).toBe('Processor selection failed');
    });

    it('should handle complete payment failure', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      mockProcessorService.analyzeUserLocation.mockResolvedValue(mockLocation);
      mockProcessorService.processPaymentWithFallback.mockRejectedValue(
        new Error('All processors failed')
      );
      mockService.processPaymentRequest.mockRejectedValue(
        new Error('Payment service also failed')
      );

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All payment processors failed');
    });

    it('should handle payment request not found', async () => {
      mockService.getRequestStatus.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/payment-requests/non_existent/pay')
        .send({
          senderId: 'user_456'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment request not found');
    });

    it('should handle processor result failure', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      const mockProcessorResult = {
        success: false,
        error: 'Insufficient funds'
      };

      mockProcessorService.analyzeUserLocation.mockResolvedValue(mockLocation);
      mockProcessorService.processPaymentWithFallback.mockResolvedValue(mockProcessorResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('All payment processors failed');
    });

    it('should handle processor selection with fallback used', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      const mockProcessorResult = {
        success: true,
        transactionId: 'txn_123',
        clientSecret: 'pi_test_client_secret',
        paymentIntentId: 'pi_test_123',
        processorResponse: {
          processorId: 'circle',
          actualProcessor: 'stripe',
          originalProcessor: 'circle',
          fallbackUsed: true
        }
      };

      const mockPaymentResult = {
        success: true,
        paymentId: 'pay_123'
      };

      mockProcessorService.analyzeUserLocation.mockResolvedValue(mockLocation);
      mockProcessorService.processPaymentWithFallback.mockResolvedValue(mockProcessorResult);
      mockService.processPaymentRequest.mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.fallbackUsed).toBe(true);
      expect(response.body.data.processorInfo).toEqual({
        originalProcessor: 'circle',
        actualProcessor: 'stripe'
      });
    });

    it('should return 400 for payment processing failure', async () => {
      const mockPaymentResult = {
        success: false,
        error: 'Insufficient funds',
      };

      mockService.processPaymentRequest.mockResolvedValue(mockPaymentResult);

      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: 'user_456',
          processorId: 'stripe'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient funds');
    });

    it('should return 400 for invalid payment data', async () => {
      const response = await request(app)
        .post('/api/payment-requests/req_123/pay')
        .send({
          senderId: '',
          settlementMethod: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid payment data');
    });
  });

  describe('PUT /api/payment-requests/:id/cancel', () => {
    it('should cancel payment request successfully', async () => {
      mockService.cancelPaymentRequest.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/payment-requests/req_123/cancel')
        .send({
          requesterId: 'user_123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment request cancelled successfully');
    });

    it('should return 400 for missing requester ID', async () => {
      const response = await request(app)
        .put('/api/payment-requests/req_123/cancel')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Requester ID is required');
    });

    it('should return 400 for unauthorized cancellation', async () => {
      mockService.cancelPaymentRequest.mockRejectedValue(
        new Error('Unauthorized to cancel this payment request')
      );

      const response = await request(app)
        .put('/api/payment-requests/req_123/cancel')
        .send({
          requesterId: 'user_456',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unauthorized to cancel this payment request');
    });
  });

  describe('GET /api/payment-requests/user/:userId', () => {
    it('should get user payment requests successfully', async () => {
      const mockPaymentRequests = [
        {
          id: 'req_123',
          amount: 100,
          currency: 'USD',
          status: 'PENDING',
          createdAt: new Date(),
        },
        {
          id: 'req_124',
          amount: 200,
          currency: 'EUR',
          status: 'PAID',
          createdAt: new Date(),
        },
      ];

      mockService.getUserPaymentRequests.mockResolvedValue(mockPaymentRequests);

      const response = await request(app)
        .get('/api/payment-requests/user/user_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPaymentRequests);
      expect(response.body.count).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const mockPaymentRequests = [
        {
          id: 'req_123',
          amount: 100,
          currency: 'USD',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      mockService.getUserPaymentRequests.mockResolvedValue(mockPaymentRequests);

      const response = await request(app)
        .get('/api/payment-requests/user/user_123?status=PENDING');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPaymentRequests);
      expect(mockService.getUserPaymentRequests).toHaveBeenCalledWith('user_123', 'PENDING');
    });
  });

  describe('GET /api/payment-requests/validate-token/:token', () => {
    it('should validate token successfully', async () => {
      const mockValidationResult = {
        requestId: 'req_123',
        amount: 100,
        currency: 'USD',
        expiresAt: new Date().toISOString(),
        paymentRequest: {
          id: 'req_123',
          status: 'PENDING',
        },
      };

      mockService.validateShareableToken.mockResolvedValue(mockValidationResult);

      const response = await request(app)
        .get('/api/payment-requests/validate-token/jwt_token_here');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockValidationResult);
      expect(response.body.message).toBe('Token validated successfully');
    });

    it('should return 401 for invalid token', async () => {
      mockService.validateShareableToken.mockRejectedValue(
        new Error('Invalid or expired token')
      );

      const response = await request(app)
        .get('/api/payment-requests/validate-token/invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/payment-requests/onboard-user', () => {
    it('should onboard user successfully', async () => {
      const response = await request(app)
        .post('/api/payment-requests/onboard-user')
        .send({
          email: 'newuser@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1234567890',
          country: 'US',
          currency: 'USD',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.lastName).toBe('Smith');
      expect(response.body.message).toBe('User onboarded successfully');
      expect(response.body.nextSteps).toHaveLength(4);
    });

    it('should return 400 for invalid user data', async () => {
      const response = await request(app)
        .post('/api/payment-requests/onboard-user')
        .send({
          email: 'invalid-email',
          firstName: '',
          country: 'X',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid user data');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/payment-requests/:id/history', () => {
    it('should get payment request history for pending request', async () => {
      const mockPaymentRequest = {
        id: 'req_123',
        status: 'PENDING',
        amount: 100,
        currency: 'USD',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        expiresAt: new Date('2024-01-02T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
      };

      mockService.getRequestStatus.mockResolvedValue(mockPaymentRequest);

      const response = await request(app)
        .get('/api/payment-requests/req_123/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentRequest).toEqual(mockPaymentRequest);
      expect(response.body.data.timeline).toHaveLength(2);
      expect(response.body.data.timeline[0].event).toBe('Payment Request Created');
      expect(response.body.data.timeline[1].event).toBe('Awaiting Payment');
    });

    it('should get payment request history for paid request', async () => {
      const mockPaymentRequest = {
        id: 'req_123',
        status: 'PAID',
        amount: 100,
        currency: 'USD',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        expiresAt: new Date('2024-01-02T10:00:00Z'),
        paidAt: new Date('2024-01-01T15:00:00Z'),
        updatedAt: new Date('2024-01-01T15:00:00Z'),
      };

      mockService.getRequestStatus.mockResolvedValue(mockPaymentRequest);

      const response = await request(app)
        .get('/api/payment-requests/req_123/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeline).toHaveLength(2);
      expect(response.body.data.timeline[0].event).toBe('Payment Request Created');
      expect(response.body.data.timeline[1].event).toBe('Payment Completed');
      expect(response.body.data.timeline[1].status).toBe('completed');
    });

    it('should get payment request history for expired request', async () => {
      const mockPaymentRequest = {
        id: 'req_123',
        status: 'EXPIRED',
        amount: 100,
        currency: 'USD',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        expiresAt: new Date('2024-01-02T10:00:00Z'),
        updatedAt: new Date('2024-01-02T10:00:00Z'),
      };

      mockService.getRequestStatus.mockResolvedValue(mockPaymentRequest);

      const response = await request(app)
        .get('/api/payment-requests/req_123/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeline).toHaveLength(2);
      expect(response.body.data.timeline[1].event).toBe('Payment Request Expired');
      expect(response.body.data.timeline[1].status).toBe('failed');
    });

    it('should return 404 for non-existent payment request', async () => {
      mockService.getRequestStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/payment-requests/non_existent/history');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Payment request not found');
    });
  });
});