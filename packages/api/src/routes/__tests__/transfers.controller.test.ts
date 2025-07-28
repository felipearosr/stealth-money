// src/routes/__tests__/transfers.controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the services
vi.mock('../../services/payment-processor.service', () => ({
  PaymentProcessorService: vi.fn().mockImplementation(() => ({
    analyzeUserLocation: vi.fn(),
    getAvailableProcessors: vi.fn(),
    selectOptimalProcessor: vi.fn(),
    processPayment: vi.fn(),
    processPaymentWithFallback: vi.fn(),
    adapters: new Map(),
  })),
}));

vi.mock('../../services/fx.service', () => ({
  FxService: vi.fn().mockImplementation(() => ({
    getRate: vi.fn(),
  })),
}));

vi.mock('../../services/database-simple.service', () => ({
  SimpleDatabaseService: vi.fn().mockImplementation(() => ({
    createTransaction: vi.fn(),
    updateTransactionStatus: vi.fn(),
  })),
}));

vi.mock('../../services/payment.service', () => ({
  PaymentService: vi.fn().mockImplementation(() => ({
    createPaymentIntent: vi.fn(),
  })),
}));

import transferRoutes from '../transfers.controller';
import { PaymentProcessorService } from '../../services/payment-processor.service';
import { FxService } from '../../services/fx.service';
import { SimpleDatabaseService } from '../../services/database-simple.service';
import { PaymentService } from '../../services/payment.service';

const app = express();
app.use(express.json());
app.use('/api', transferRoutes);

describe('Enhanced Transfer Controller with Processor Selection', () => {
  let mockPaymentProcessorService: any;
  let mockFxService: any;
  let mockDbService: any;
  let mockPaymentService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mocks
    mockPaymentProcessorService = new PaymentProcessorService();
    mockFxService = new FxService();
    mockDbService = new SimpleDatabaseService();
    mockPaymentService = new PaymentService();
  });

  describe('GET /api/processors/available/:userId', () => {
    it('should return available processors for a user', async () => {
      const mockLocation = {
        country: 'US',
        region: 'North America',
        currency: 'USD',
        timezone: 'America/New_York'
      };

      const mockProcessors = [
        {
          id: 'stripe',
          name: 'Stripe',
          supportedCountries: ['US', 'CA', 'GB'],
          supportedCurrencies: ['USD', 'CAD', 'GBP'],
          fees: { fixedFee: 0.30, percentageFee: 2.9, currency: 'USD' },
          processingTime: '1-3 business days',
          userExperienceScore: 9.0,
          reliability: 99.9,
          isAvailable: true
        }
      ];

      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockResolvedValue(mockLocation);
      mockPaymentProcessorService.getAvailableProcessors = vi.fn().mockResolvedValue(mockProcessors);

      const response = await request(app)
        .get('/api/processors/available/user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toEqual(mockLocation);
      expect(response.body.data.processors).toEqual(mockProcessors);
      expect(response.body.data.count).toBe(1);
    });

    it('should handle errors when getting available processors', async () => {
      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockRejectedValue(new Error('Location analysis failed'));

      const response = await request(app)
        .get('/api/processors/available/user123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to get available processors');
    });
  });

  describe('POST /api/processors/select', () => {
    it('should select optimal processor based on criteria', async () => {
      const mockLocation = {
        country: 'US',
        region: 'North America',
        currency: 'USD',
        timezone: 'America/New_York'
      };

      const mockProcessors = [
        {
          id: 'stripe',
          name: 'Stripe',
          supportedCountries: ['US'],
          supportedCurrencies: ['USD'],
          fees: { fixedFee: 0.30, percentageFee: 2.9, currency: 'USD' },
          processingTime: '1-3 business days',
          userExperienceScore: 9.0,
          reliability: 99.9,
          isAvailable: true
        }
      ];

      const mockSelection = {
        selectedProcessor: mockProcessors[0],
        reason: 'Selected Stripe for excellent user experience (9/10)',
        alternatives: [],
        estimatedFees: 3.20
      };

      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockResolvedValue(mockLocation);
      mockPaymentProcessorService.getAvailableProcessors = vi.fn().mockResolvedValue(mockProcessors);
      mockPaymentProcessorService.selectOptimalProcessor = vi.fn().mockResolvedValue(mockSelection);

      const requestBody = {
        userId: 'user123',
        amount: 100,
        currency: 'USD',
        prioritizeCost: true,
        prioritizeSpeed: false,
        prioritizeReliability: true
      };

      const response = await request(app)
        .post('/api/processors/select')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selection).toEqual(mockSelection);
      expect(response.body.data.location).toEqual(mockLocation);
    });

    it('should handle no available processors', async () => {
      const mockLocation = {
        country: 'XX',
        region: 'Unknown',
        currency: 'XXX',
        timezone: 'UTC'
      };

      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockResolvedValue(mockLocation);
      mockPaymentProcessorService.getAvailableProcessors = vi.fn().mockResolvedValue([]);

      const requestBody = {
        userId: 'user123',
        prioritizeReliability: true
      };

      const response = await request(app)
        .post('/api/processors/select')
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No payment processors available for your location');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/processors/select')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid selection criteria');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/processors/capabilities', () => {
    it('should return processor capabilities', async () => {
      const response = await request(app)
        .get('/api/processors/capabilities')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processors).toBeDefined();
      expect(Array.isArray(response.body.data.processors)).toBe(true);
    });

    it('should filter capabilities by country and currency', async () => {
      const response = await request(app)
        .get('/api/processors/capabilities?country=US&currency=USD')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.filters.country).toBe('US');
      expect(response.body.data.filters.currency).toBe('USD');
    });
  });

  describe('GET /api/processors/health', () => {
    it('should return processor health status', async () => {
      const response = await request(app)
        .get('/api/processors/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overallHealth).toBeDefined();
      expect(response.body.data.processors).toBeDefined();
      expect(Array.isArray(response.body.data.processors)).toBe(true);
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('POST /api/transfers with processor selection', () => {
    beforeEach(() => {
      mockFxService.getRate = vi.fn().mockResolvedValue(1.2);
      mockDbService.createTransaction = vi.fn().mockResolvedValue({
        id: 'txn_123',
        createdAt: new Date()
      });
      mockDbService.updateTransactionStatus = vi.fn().mockResolvedValue(true);
    });

    it('should create transfer with intelligent processor selection', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      const mockPaymentResult = {
        success: true,
        transactionId: 'txn_123',
        clientSecret: 'pi_test_client_secret',
        paymentIntentId: 'pi_test_123',
        processorResponse: {
          processorId: 'stripe',
          actualProcessor: 'stripe'
        }
      };

      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockResolvedValue(mockLocation);
      mockPaymentProcessorService.processPaymentWithFallback = vi.fn().mockResolvedValue(mockPaymentResult);

      const requestBody = {
        amount: 100,
        sourceCurrency: 'USD',
        destCurrency: 'EUR',
        userId: 'user123'
      };

      const response = await request(app)
        .post('/api/transfers')
        .send(requestBody)
        .expect(201);

      expect(response.body.clientSecret).toBe('pi_test_client_secret');
      expect(response.body.processorId).toBe('stripe');
      expect(response.body.fallbackUsed).toBe(false);
      expect(mockPaymentProcessorService.processPaymentWithFallback).toHaveBeenCalled();
    });

    it('should create transfer with specified processor', async () => {
      const mockPaymentResult = {
        success: true,
        transactionId: 'txn_123',
        clientSecret: 'pi_test_client_secret',
        paymentIntentId: 'pi_test_123'
      };

      mockPaymentProcessorService.processPayment = vi.fn().mockResolvedValue(mockPaymentResult);

      const requestBody = {
        amount: 100,
        sourceCurrency: 'USD',
        destCurrency: 'EUR',
        processorId: 'stripe'
      };

      const response = await request(app)
        .post('/api/transfers')
        .send(requestBody)
        .expect(201);

      expect(response.body.clientSecret).toBe('pi_test_client_secret');
      expect(response.body.processorId).toBe('stripe');
      expect(mockPaymentProcessorService.processPayment).toHaveBeenCalledWith('stripe', expect.any(Object));
    });

    it('should fallback to Stripe when processor selection fails', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockResolvedValue(mockLocation);
      mockPaymentProcessorService.processPaymentWithFallback = vi.fn().mockRejectedValue(new Error('All processors failed'));
      
      mockPaymentService.createPaymentIntent = vi.fn().mockResolvedValue({
        clientSecret: 'pi_fallback_secret',
        paymentIntentId: 'pi_fallback_123'
      });

      const requestBody = {
        amount: 100,
        sourceCurrency: 'USD',
        destCurrency: 'EUR',
        userId: 'user123'
      };

      const response = await request(app)
        .post('/api/transfers')
        .send(requestBody)
        .expect(201);

      expect(response.body.clientSecret).toBe('pi_fallback_secret');
      expect(response.body.processorId).toBe('stripe');
      expect(response.body.fallbackUsed).toBe(true);
      expect(response.body.fallbackReason).toBe('Primary processor selection failed');
    });

    it('should handle complete processor failure', async () => {
      const mockLocation = {
        country: 'US',
        currency: 'USD'
      };

      mockPaymentProcessorService.analyzeUserLocation = vi.fn().mockResolvedValue(mockLocation);
      mockPaymentProcessorService.processPaymentWithFallback = vi.fn().mockRejectedValue(new Error('All processors failed'));
      mockPaymentService.createPaymentIntent = vi.fn().mockRejectedValue(new Error('Stripe also failed'));

      const requestBody = {
        amount: 100,
        sourceCurrency: 'USD',
        destCurrency: 'EUR',
        userId: 'user123'
      };

      const response = await request(app)
        .post('/api/transfers')
        .send(requestBody)
        .expect(500);

      expect(response.body.message).toBe('All payment processors failed');
      expect(mockDbService.updateTransactionStatus).toHaveBeenCalledWith(
        expect.any(String),
        'FAILED',
        { error: 'All payment processors failed' }
      );
    });

    it('should validate transfer request data', async () => {
      const response = await request(app)
        .post('/api/transfers')
        .send({
          amount: -100, // Invalid negative amount
          sourceCurrency: 'USD',
          destCurrency: 'EUR'
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid input');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      // Mock constructor to throw error
      jest.spyOn(PaymentProcessorService.prototype, 'analyzeUserLocation')
        .mockRejectedValue(new Error('Service initialization failed'));

      const response = await request(app)
        .get('/api/processors/available/user123')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service initialization failed');
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/api/processors/select')
        .send('invalid json')
        .expect(400);

      expect(response.body).toBeDefined();
    });
  });
});