import request from 'supertest';
import express from 'express';
import analyticsRoutes from '../analytics.routes';
import { TransferMethod } from '../../services/transfer.service';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);

describe('Analytics Routes', () => {
  describe('GET /api/analytics/summary', () => {
    it('should return analytics summary', async () => {
      const response = await request(app)
        .get('/api/analytics/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.methodComparison).toBeDefined();
      expect(response.body.data.userPreferences).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/analytics/methods/:method', () => {
    it('should return metrics for Circle method', async () => {
      const response = await request(app)
        .get('/api/analytics/methods/circle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.method).toBe(TransferMethod.CIRCLE);
      expect(response.body.data.totalTransfers).toBeDefined();
      expect(response.body.data.successRate).toBeDefined();
    });

    it('should return metrics for Mantle method', async () => {
      const response = await request(app)
        .get('/api/analytics/methods/mantle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.method).toBe(TransferMethod.MANTLE);
      expect(response.body.data.totalTransfers).toBeDefined();
      expect(response.body.data.successRate).toBeDefined();
    });

    it('should return 400 for invalid method', async () => {
      const response = await request(app)
        .get('/api/analytics/methods/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transfer method');
      expect(response.body.validMethods).toEqual(Object.values(TransferMethod));
    });
  });

  describe('GET /api/analytics/comparison', () => {
    it('should return comparative metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/comparison')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.circle).toBeDefined();
      expect(response.body.data.mantle).toBeDefined();
      expect(response.body.data.comparison).toBeDefined();
      expect(response.body.data.comparison.volumeDifference).toBeDefined();
      expect(response.body.data.comparison.successRateDifference).toBeDefined();
      expect(response.body.data.comparison.costDifference).toBeDefined();
      expect(response.body.data.comparison.speedDifference).toBeDefined();
      expect(response.body.data.comparison.totalSavings).toBeDefined();
    });
  });

  describe('GET /api/analytics/performance/current', () => {
    it('should return current performance data or 404 if none available', async () => {
      const response = await request(app)
        .get('/api/analytics/performance/current');

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.timestamp).toBeDefined();
        expect(response.body.data.circle).toBeDefined();
        expect(response.body.data.mantle).toBeDefined();
      } else {
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('No current performance data available');
      }
    });
  });

  describe('GET /api/analytics/performance/history', () => {
    it('should return performance history with default hours', async () => {
      const response = await request(app)
        .get('/api/analytics/performance/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.history).toBeDefined();
      expect(response.body.data.period).toBe('24 hours');
      expect(response.body.data.dataPoints).toBeDefined();
      expect(Array.isArray(response.body.data.history)).toBe(true);
    });

    it('should return performance history with custom hours', async () => {
      const response = await request(app)
        .get('/api/analytics/performance/history?hours=6')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('6 hours');
    });

    it('should return 400 for invalid hours parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/performance/history?hours=200')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Hours parameter must be between 1 and 168 (1 week)');
    });
  });

  describe('GET /api/analytics/savings', () => {
    it('should return cost savings data', async () => {
      const response = await request(app)
        .get('/api/analytics/savings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.savings).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.totalRecords).toBeDefined();
      expect(response.body.data.summary.totalSavings).toBeDefined();
      expect(response.body.data.summary.averageSavings).toBeDefined();
      expect(response.body.data.summary.userId).toBe('all_users');
      expect(Array.isArray(response.body.data.savings)).toBe(true);
    });

    it('should return cost savings data for specific user', async () => {
      const response = await request(app)
        .get('/api/analytics/savings?userId=user123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.userId).toBe('user123');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/savings?limit=2000')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Limit parameter must be between 1 and 1000');
    });
  });

  describe('GET /api/analytics/preferences', () => {
    it('should return aggregated user preferences by default', async () => {
      const response = await request(app)
        .get('/api/analytics/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.aggregated).toBeDefined();
      expect(response.body.data.type).toBe('aggregated');
      expect(response.body.data.aggregated.totalUsers).toBeDefined();
      expect(response.body.data.aggregated.circlePreferred).toBeDefined();
      expect(response.body.data.aggregated.mantlePreferred).toBeDefined();
    });

    it('should return individual user preferences when userId provided', async () => {
      const response = await request(app)
        .get('/api/analytics/preferences?userId=nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No preference data found for user: nonexistent');
    });
  });

  describe('GET /api/analytics/completion/:method', () => {
    it('should return completion statistics for Circle', async () => {
      const response = await request(app)
        .get('/api/analytics/completion/circle')
        .expect(404); // Initially no data

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No completion statistics found for circle (day)');
    });

    it('should return completion statistics for Mantle', async () => {
      const response = await request(app)
        .get('/api/analytics/completion/mantle')
        .expect(404); // Initially no data

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No completion statistics found for mantle (day)');
    });

    it('should return 400 for invalid method', async () => {
      const response = await request(app)
        .get('/api/analytics/completion/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transfer method');
    });

    it('should return 400 for invalid period', async () => {
      const response = await request(app)
        .get('/api/analytics/completion/circle?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid period');
      expect(response.body.validPeriods).toEqual(['day', 'week', 'month']);
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.methodComparison).toBeDefined();
      expect(response.body.data.performanceHistory).toBeDefined();
      expect(response.body.data.topSavings).toBeDefined();
      expect(response.body.data.userPreferences).toBeDefined();
      expect(response.body.data.lastUpdated).toBeDefined();
    });
  });

  describe('POST /api/analytics/log/selection', () => {
    it('should log transfer method selection successfully', async () => {
      const selectionData = {
        userId: 'user123',
        selectedMethod: TransferMethod.MANTLE,
        availableMethods: [TransferMethod.CIRCLE, TransferMethod.MANTLE],
        selectionReason: 'Lower fees and faster settlement',
        amount: 1000,
        estimatedCosts: {
          [TransferMethod.CIRCLE]: 25.00,
          [TransferMethod.MANTLE]: 5.00
        }
      };

      const response = await request(app)
        .post('/api/analytics/log/selection')
        .send(selectionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Transfer method selection logged successfully');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        userId: 'user123',
        selectedMethod: TransferMethod.MANTLE
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/analytics/log/selection')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.required).toEqual([
        'userId', 'selectedMethod', 'availableMethods', 'selectionReason', 'amount'
      ]);
    });

    it('should return 400 for invalid selected method', async () => {
      const invalidData = {
        userId: 'user123',
        selectedMethod: 'invalid',
        availableMethods: [TransferMethod.CIRCLE],
        selectionReason: 'Test',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/analytics/log/selection')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid selected method');
      expect(response.body.validMethods).toEqual(Object.values(TransferMethod));
    });

    it('should return 400 for invalid available methods', async () => {
      const invalidData = {
        userId: 'user123',
        selectedMethod: TransferMethod.CIRCLE,
        availableMethods: ['invalid'],
        selectionReason: 'Test',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/analytics/log/selection')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid available methods');
    });
  });

  describe('GET /api/analytics/health', () => {
    it('should return analytics service health status', async () => {
      const response = await request(app)
        .get('/api/analytics/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalTransfers).toBeDefined();
      expect(response.body.data.totalVolume).toBeDefined();
      expect(response.body.data.averageSuccessRate).toBeDefined();
      expect(response.body.data.servicesMonitored).toEqual(['circle', 'mantle']);
      expect(response.body.timestamp).toBeDefined();
    });
  });
});