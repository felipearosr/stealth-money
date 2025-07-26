import { TransferAnalyticsService } from '../transfer-analytics.service';
import { TransferMethod, TransferStatus } from '../transfer.service';

describe('TransferAnalyticsService', () => {
  let analyticsService: TransferAnalyticsService;

  beforeEach(() => {
    analyticsService = new TransferAnalyticsService();
  });

  describe('Transfer Initiation Recording', () => {
    it('should record Circle transfer initiation correctly', () => {
      analyticsService.recordTransferInitiation(
        TransferMethod.CIRCLE,
        'user123',
        1000,
        'USD',
        25.50
      );

      const metrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
      expect(metrics).toBeDefined();
      expect(metrics!.totalTransfers).toBe(1);
      expect(metrics!.totalVolume).toBe(1000);
      expect(metrics!.averageAmount).toBe(1000);
      expect(metrics!.averageCost).toBe(25.50);
    });

    it('should record Mantle transfer initiation correctly', () => {
      analyticsService.recordTransferInitiation(
        TransferMethod.MANTLE,
        'user456',
        500,
        'USD',
        2.75
      );

      const metrics = analyticsService.getMethodMetrics(TransferMethod.MANTLE);
      expect(metrics).toBeDefined();
      expect(metrics!.totalTransfers).toBe(1);
      expect(metrics!.totalVolume).toBe(500);
      expect(metrics!.averageAmount).toBe(500);
      expect(metrics!.averageCost).toBe(2.75);
    });

    it('should record cost savings when alternative method is more expensive', () => {
      analyticsService.recordTransferInitiation(
        TransferMethod.MANTLE,
        'user789',
        1000,
        'USD',
        5.00,
        TransferMethod.CIRCLE,
        25.00
      );

      const costSavings = analyticsService.getCostSavingsData('user789');
      expect(costSavings).toHaveLength(1);
      expect(costSavings[0].savings).toBe(20.00);
      expect(costSavings[0].savingsPercentage).toBe(80);
      expect(costSavings[0].method).toBe(TransferMethod.MANTLE);
      expect(costSavings[0].alternativeMethod).toBe(TransferMethod.CIRCLE);
    });

    it('should update metrics correctly for multiple transfers', () => {
      // Record multiple transfers
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25);
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user2', 2000, 'USD', 50);
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user3', 500, 'USD', 12.5);

      const metrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
      expect(metrics!.totalTransfers).toBe(3);
      expect(metrics!.totalVolume).toBe(3500);
      expect(metrics!.averageAmount).toBe(3500 / 3);
      expect(metrics!.averageCost).toBe((25 + 50 + 12.5) / 3);
    });
  });

  describe('Transfer Completion Recording', () => {
    beforeEach(() => {
      // Set up initial transfers
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 5);
    });

    it('should record successful transfer completion', () => {
      analyticsService.recordTransferCompletion(
        TransferMethod.CIRCLE,
        'user1',
        TransferStatus.COMPLETED,
        5.5, // 5.5 minutes
        25.00
      );

      const metrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
      expect(metrics!.successfulTransfers).toBe(1);
      expect(metrics!.failedTransfers).toBe(0);
      expect(metrics!.successRate).toBe(100);
      expect(metrics!.averageCompletionTime).toBe(5.5);
    });

    it('should record failed transfer completion', () => {
      analyticsService.recordTransferCompletion(
        TransferMethod.MANTLE,
        'user2',
        TransferStatus.FAILED,
        2.0
      );

      const metrics = analyticsService.getMethodMetrics(TransferMethod.MANTLE);
      expect(metrics!.successfulTransfers).toBe(0);
      expect(metrics!.failedTransfers).toBe(1);
      expect(metrics!.successRate).toBe(0);
      expect(metrics!.averageCompletionTime).toBe(0); // No successful completions
    });

    it('should calculate success rate correctly with mixed results', () => {
      // Record multiple completions
      analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user1', TransferStatus.COMPLETED, 5);
      analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user2', TransferStatus.COMPLETED, 7);
      analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user3', TransferStatus.FAILED, 0);

      // Add more initiations to match completions
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user2', 800, 'USD', 20);
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user3', 1200, 'USD', 30);

      const metrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
      expect(metrics!.totalTransfers).toBe(3);
      expect(metrics!.successfulTransfers).toBe(2);
      expect(metrics!.failedTransfers).toBe(1);
      expect(metrics!.successRate).toBe((2 / 3) * 100);
      expect(metrics!.averageCompletionTime).toBe(6); // (5 + 7) / 2
    });
  });

  describe('Comparative Metrics', () => {
    beforeEach(() => {
      // Set up data for both methods
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25, TransferMethod.MANTLE, 5);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 3, TransferMethod.CIRCLE, 20);
      
      analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user1', TransferStatus.COMPLETED, 300); // 5 hours
      analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user2', TransferStatus.COMPLETED, 2); // 2 minutes
    });

    it('should provide comparative metrics between methods', () => {
      const comparison = analyticsService.getComparativeMetrics();
      
      expect(comparison.circle).toBeDefined();
      expect(comparison.mantle).toBeDefined();
      expect(comparison.comparison).toBeDefined();
      
      // Check volume difference (Mantle: 500, Circle: 1000)
      expect(comparison.comparison.volumeDifference).toBe(-500);
      
      // Check cost difference (Circle: 25, Mantle: 3)
      expect(comparison.comparison.costDifference).toBe(22);
      
      // Check speed difference (Circle: 300min, Mantle: 2min)
      expect(comparison.comparison.speedDifference).toBe(298);
      
      // Check total savings
      expect(comparison.comparison.totalSavings).toBe(37); // (25-5) + (20-3)
    });
  });

  describe('User Preference Analytics', () => {
    it('should track user preferences correctly', () => {
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user1', 500, 'USD', 5);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user1', 750, 'USD', 7);

      const userPrefs = analyticsService.getUserPreferenceAnalytics('user1');
      expect(userPrefs).toHaveLength(1);
      
      const prefs = userPrefs[0];
      expect(prefs.userId).toBe('user1');
      expect(prefs.totalTransfers).toBe(3);
      expect(prefs.circleTransfers).toBe(1);
      expect(prefs.mantleTransfers).toBe(2);
      expect(prefs.preferredMethod).toBe(TransferMethod.MANTLE); // More recent usage
      expect(prefs.averageTransferAmount).toBe((1000 + 500 + 750) / 3);
    });

    it('should provide aggregated user preferences', () => {
      // Create multiple users with different preferences
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25);
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 800, 'USD', 20);
      
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 5);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 600, 'USD', 6);
      
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user3', 1200, 'USD', 30);

      const aggregated = analyticsService.getAggregatedUserPreferences();
      expect(aggregated.totalUsers).toBe(3);
      expect(aggregated.circlePreferred).toBe(2); // user1 and user3
      expect(aggregated.mantlePreferred).toBe(1); // user2
      expect(aggregated.averageTransfersPerUser).toBe(5 / 3); // 5 total transfers, 3 users
    });
  });

  describe('Cost Savings Tracking', () => {
    it('should track cost savings data correctly', () => {
      analyticsService.recordTransferInitiation(
        TransferMethod.MANTLE,
        'user1',
        1000,
        'USD',
        5.00,
        TransferMethod.CIRCLE,
        25.00
      );

      const savings = analyticsService.getCostSavingsData();
      expect(savings).toHaveLength(1);
      
      const record = savings[0];
      expect(record.userId).toBe('user1');
      expect(record.method).toBe(TransferMethod.MANTLE);
      expect(record.alternativeMethod).toBe(TransferMethod.CIRCLE);
      expect(record.actualCost).toBe(5.00);
      expect(record.alternativeCost).toBe(25.00);
      expect(record.savings).toBe(20.00);
      expect(record.savingsPercentage).toBe(80);
      expect(record.amount).toBe(1000);
      expect(record.currency).toBe('USD');
    });

    it('should filter cost savings by user', () => {
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user1', 1000, 'USD', 5, TransferMethod.CIRCLE, 25);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 3, TransferMethod.CIRCLE, 15);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user1', 800, 'USD', 4, TransferMethod.CIRCLE, 20);

      const user1Savings = analyticsService.getCostSavingsData('user1');
      expect(user1Savings).toHaveLength(2);
      expect(user1Savings.every(record => record.userId === 'user1')).toBe(true);

      const user2Savings = analyticsService.getCostSavingsData('user2');
      expect(user2Savings).toHaveLength(1);
      expect(user2Savings[0].userId).toBe('user2');
    });

    it('should limit cost savings results', () => {
      // Create multiple savings records
      for (let i = 0; i < 15; i++) {
        analyticsService.recordTransferInitiation(
          TransferMethod.MANTLE,
          `user${i}`,
          1000,
          'USD',
          5,
          TransferMethod.CIRCLE,
          25
        );
      }

      const limitedSavings = analyticsService.getCostSavingsData(undefined, 10);
      expect(limitedSavings).toHaveLength(10);
    });
  });

  describe('Transfer Method Selection Logging', () => {
    it('should log transfer method selection correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      analyticsService.logTransferMethodSelection(
        'user1',
        TransferMethod.MANTLE,
        [TransferMethod.CIRCLE, TransferMethod.MANTLE],
        'Lower fees and faster settlement',
        1000,
        { [TransferMethod.CIRCLE]: 25, [TransferMethod.MANTLE]: 5 }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        '📝 Transfer method selection logged:',
        expect.objectContaining({
          userId: 'user1',
          selectedMethod: TransferMethod.MANTLE,
          availableMethods: [TransferMethod.CIRCLE, TransferMethod.MANTLE],
          selectionReason: 'Lower fees and faster settlement',
          amount: 1000,
          estimatedCosts: { [TransferMethod.CIRCLE]: 25, [TransferMethod.MANTLE]: 5 }
        })
      );

      // Should also record the transfer initiation with savings
      const savings = analyticsService.getCostSavingsData('user1');
      expect(savings).toHaveLength(1);
      expect(savings[0].savings).toBe(20); // 25 - 5

      consoleSpy.mockRestore();
    });
  });

  describe('Analytics Summary Generation', () => {
    beforeEach(() => {
      // Set up comprehensive test data
      analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25, TransferMethod.MANTLE, 5);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 3, TransferMethod.CIRCLE, 20);
      
      analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user1', TransferStatus.COMPLETED, 300, 25);
      analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user2', TransferStatus.COMPLETED, 2, 3);
    });

    it('should generate comprehensive analytics summary', () => {
      const summary = analyticsService.generateAnalyticsSummary();
      
      expect(summary.overview).toBeDefined();
      expect(summary.overview.totalTransfers).toBe(2);
      expect(summary.overview.totalVolume).toBe(1500);
      expect(summary.overview.totalSavings).toBe(37); // (25-5) + (20-3)
      expect(summary.overview.averageSuccessRate).toBe(100); // Both completed successfully
      
      expect(summary.methodComparison).toBeDefined();
      expect(summary.userPreferences).toBeDefined();
      expect(summary.topSavings).toBeDefined();
      expect(summary.topSavings).toHaveLength(2);
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect and store performance data', async () => {
      // Wait a bit for initial performance collection
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentPerformance = analyticsService.getCurrentPerformance();
      expect(currentPerformance).toBeDefined();
      
      if (currentPerformance) {
        expect(currentPerformance.timestamp).toBeInstanceOf(Date);
        expect(currentPerformance.circle).toBeDefined();
        expect(currentPerformance.mantle).toBeDefined();
        expect(typeof currentPerformance.circle.activeTransfers).toBe('number');
        expect(typeof currentPerformance.mantle.activeTransfers).toBe('number');
      }
    });

    it('should provide performance history', async () => {
      // Wait for some performance data to be collected
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const history = analyticsService.getPerformanceHistory(1); // Last 1 hour
      expect(Array.isArray(history)).toBe(true);
      
      if (history.length > 0) {
        const latest = history[history.length - 1];
        expect(latest.timestamp).toBeInstanceOf(Date);
        expect(latest.circle).toBeDefined();
        expect(latest.mantle).toBeDefined();
      }
    });
  });

  describe('Completion Statistics', () => {
    it('should track completion time distribution', () => {
      // Record transfers with different completion times
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user1', 1000, 'USD', 5);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 3);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user3', 800, 'USD', 4);
      analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user4', 600, 'USD', 3.5);

      // Record completions with different times
      analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user1', TransferStatus.COMPLETED, 0.5); // 30 seconds
      analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user2', TransferStatus.COMPLETED, 3); // 3 minutes
      analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user3', TransferStatus.COMPLETED, 15); // 15 minutes
      analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user4', TransferStatus.COMPLETED, 90); // 1.5 hours

      const stats = analyticsService.getCompletionStatistics(TransferMethod.MANTLE, 'day');
      expect(stats).toBeDefined();
      
      if (stats) {
        expect(stats.completedTransfers).toBe(4);
        expect(stats.timeDistribution.under1Min).toBe(1);
        expect(stats.timeDistribution.under5Min).toBe(1);
        expect(stats.timeDistribution.under30Min).toBe(1);
        expect(stats.timeDistribution.over1Hour).toBe(1);
        expect(stats.fastestCompletion).toBe(0.5);
        expect(stats.slowestCompletion).toBe(90);
      }
    });
  });
});