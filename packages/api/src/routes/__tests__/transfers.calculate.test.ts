// src/routes/__tests__/transfers.calculate.test.ts
import request from 'supertest';
import express from 'express';
import transferRoutes from '../transfers.controller';

// Mock the FXService
jest.mock('../../services/fx.service', () => ({
  FXService: jest.fn().mockImplementation(() => ({
    calculateTransfer: jest.fn().mockImplementation((request) => {
      const sendAmount = request.sendAmount;
      const exchangeRate = 0.85;
      const cardProcessingFee = Math.round((sendAmount * 0.029 + 0.30) * 100) / 100;
      const transferFee = Math.round((sendAmount * 0.005) * 100) / 100;
      const payoutFee = 2.50;
      const totalFees = cardProcessingFee + transferFee + payoutFee;
      const netAmountUSD = sendAmount - cardProcessingFee;
      const grossAmountEUR = netAmountUSD * exchangeRate;
      const finalAmountEUR = grossAmountEUR - (transferFee * exchangeRate) - payoutFee;

      return Promise.resolve({
        sendAmount,
        receiveAmount: Math.round(finalAmountEUR * 100) / 100,
        exchangeRate,
        fees: {
          cardProcessing: cardProcessingFee,
          transfer: transferFee,
          payout: payoutFee,
          total: Math.round(totalFees * 100) / 100
        },
        rateId: 'rate-test-123',
        rateValidUntil: new Date(Date.now() + 10 * 60 * 1000),
        estimatedArrival: {
          min: 2,
          max: 5,
          unit: 'minutes' as const
        },
        breakdown: {
          sendAmountUSD: sendAmount,
          cardProcessingFee,
          netAmountUSD: Math.round(netAmountUSD * 100) / 100,
          exchangeRate,
          grossAmountEUR: Math.round(grossAmountEUR * 100) / 100,
          transferFee: Math.round((transferFee * exchangeRate) * 100) / 100,
          payoutFee,
          finalAmountEUR: Math.round(finalAmountEUR * 100) / 100
        }
      });
    })
  }))
}));

describe('POST /api/transfers/calculate', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', transferRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid requests', () => {
    it('should calculate transfer successfully with valid input', async () => {
      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        sendAmount: 100,
        receiveAmount: 79.36,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        exchangeRate: 0.85,
        fees: 6.20,
        breakdown: {
          sendAmountUSD: 100,
          fees: {
            cardProcessing: 3.20,
            transfer: 0.50,
            payout: 2.50,
            total: 6.20
          },
          netAmountUSD: 96.80,
          exchangeRate: 0.85,
          receiveAmount: 79.36
        },
        estimatedArrival: {
          min: 2,
          max: 5,
          unit: 'minutes'
        }
      });

      expect(response.body.rateValidUntil).toBeDefined();
      expect(response.body.rateId).toBeDefined();
    });

    it('should handle minimum amount correctly', async () => {
      const requestBody = {
        sendAmount: 0.01,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(200);

      expect(response.body.sendAmount).toBe(0.01);
    });

    it('should handle maximum amount correctly', async () => {
      const requestBody = {
        sendAmount: 50000,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(200);

      expect(response.body.sendAmount).toBe(50000);
    });
  });

  describe('Input validation', () => {
    it('should reject request with missing sendAmount', async () => {
      const requestBody = {
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
      expect(response.body.message).toBe('Request validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sendAmount',
            message: 'Required'
          })
        ])
      );
    });

    it('should reject request with invalid sendAmount (too low)', async () => {
      const requestBody = {
        sendAmount: 0.001,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sendAmount',
            message: 'Number must be greater than or equal to 0.01'
          })
        ])
      );
    });

    it('should reject request with invalid sendAmount (too high)', async () => {
      const requestBody = {
        sendAmount: 50001,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sendAmount',
            message: 'Number must be less than or equal to 50000'
          })
        ])
      );
    });

    it('should reject request with invalid sendCurrency', async () => {
      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'GBP',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sendCurrency',
            message: "Invalid enum value. Expected 'USD', received 'GBP'"
          })
        ])
      );
    });

    it('should reject request with invalid receiveCurrency', async () => {
      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'JPY' // Use a currency that's definitely not supported
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'receiveCurrency',
            message: expect.stringContaining('Invalid enum value')
          })
        ])
      );
    });

    it('should reject request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/transfers/calculate')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Invalid request');
      expect(response.body.details).toHaveLength(3);
    });

    it('should reject request with non-numeric sendAmount', async () => {
      const requestBody = {
        sendAmount: 'invalid',
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'sendAmount',
            message: 'Expected number, received string'
          })
        ])
      );
    });
  });

  describe('Error handling', () => {
    it('should handle FXService calculation errors', async () => {
      // Mock FXService to throw an error for this test only
      const mockFXService = require('../../services/fx.service');
      const originalImplementation = mockFXService.FXService;
      
      mockFXService.FXService.mockImplementationOnce(() => ({
        calculateTransfer: jest.fn().mockRejectedValue(new Error('Rate service unavailable'))
      }));

      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'CALCULATION_FAILED',
        message: 'Failed to calculate transfer',
        details: 'Rate service unavailable',
        retryable: true
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock FXService to throw an unexpected error for this test only
      const mockFXService = require('../../services/fx.service');
      
      mockFXService.FXService.mockImplementationOnce(() => ({
        calculateTransfer: jest.fn().mockRejectedValue('Unexpected error')
      }));

      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'CALCULATION_FAILED',
        message: 'Failed to calculate transfer',
        details: 'Unknown error',
        retryable: true
      });
    });
  });

  describe('Response format', () => {
    it('should return response in correct format matching design document', async () => {
      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody);

      if (response.status !== 200) {
        console.log('Error response status:', response.status);
        console.log('Error response body:', response.body);
        console.log('Error response text:', response.text);
      }

      expect(response.status).toBe(200);

      // Verify all required fields are present
      expect(response.body).toHaveProperty('sendAmount');
      expect(response.body).toHaveProperty('receiveAmount');
      expect(response.body).toHaveProperty('exchangeRate');
      expect(response.body).toHaveProperty('fees');
      expect(response.body).toHaveProperty('rateValidUntil');
      expect(response.body).toHaveProperty('breakdown');
      expect(response.body).toHaveProperty('estimatedArrival');
      expect(response.body).toHaveProperty('rateId');

      // Verify breakdown structure
      expect(response.body.breakdown).toHaveProperty('sendAmountUSD');
      expect(response.body.breakdown).toHaveProperty('fees');
      expect(response.body.breakdown.fees).toHaveProperty('cardProcessing');
      expect(response.body.breakdown.fees).toHaveProperty('transfer');
      expect(response.body.breakdown.fees).toHaveProperty('payout');
      expect(response.body.breakdown.fees).toHaveProperty('total');
      expect(response.body.breakdown).toHaveProperty('netAmountUSD');
      expect(response.body.breakdown).toHaveProperty('exchangeRate');
      expect(response.body.breakdown).toHaveProperty('receiveAmount');

      // Verify estimatedArrival structure
      expect(response.body.estimatedArrival).toHaveProperty('min');
      expect(response.body.estimatedArrival).toHaveProperty('max');
      expect(response.body.estimatedArrival).toHaveProperty('unit');
    });

    it('should return ISO string for rateValidUntil', async () => {
      const requestBody = {
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transfers/calculate')
        .send(requestBody)
        .expect(200);

      expect(response.body.rateValidUntil).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});