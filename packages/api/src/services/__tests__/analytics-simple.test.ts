import { TransferAnalyticsService } from '../transfer-analytics.service';
import { TransferMethod, TransferStatus } from '../transfer.service';

describe('TransferAnalyticsService - Simple Tests', () => {
  let analyticsService: TransferAnalyticsService;

  beforeEach(() => {
    analyticsService = new TransferAnalyticsService();
  });

  it('should initialize with default metrics', () => {
    const circleMetrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
    const mantleMetrics = analyticsService.getMethodMetrics(TransferMethod.MANTLE);

    expect(circleMetrics).toBeDefined();
    expect(mantleMetrics).toBeDefined();
    expect(circleMetrics!.totalTransfers).toBe(0);
    expect(mantleMetrics!.totalTransfers).toBe(0);
  });

  it('should record transfer initiation', () => {
    analyticsService.recordTransferInitiation(
      TransferMethod.CIRCLE,
      'user123',
      1000,
      'USD',
      25.50
    );

    const metrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
    expect(metrics!.totalTransfers).toBe(1);
    expect(metrics!.totalVolume).toBe(1000);
    expect(metrics!.averageCost).toBe(25.50);
  });

  it('should record transfer completion', () => {
    // First record initiation
    analyticsService.recordTransferInitiation(
      TransferMethod.MANTLE,
      'user456',
      500,
      'USD',
      5.00
    );

    // Then record completion
    analyticsService.recordTransferCompletion(
      TransferMethod.MANTLE,
      'user456',
      TransferStatus.COMPLETED,
      2.5, // 2.5 minutes
      5.00
    );

    const metrics = analyticsService.getMethodMetrics(TransferMethod.MANTLE);
    expect(metrics!.successfulTransfers).toBe(1);
    expect(metrics!.successRate).toBe(100);
    expect(metrics!.averageCompletionTime).toBe(2.5);
  });

  it('should generate analytics summary', () => {
    // Add some test data
    analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25);
    analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user2', 500, 'USD', 5);

    const summary = analyticsService.generateAnalyticsSummary();
    
    expect(summary.overview.totalTransfers).toBe(2);
    expect(summary.overview.totalVolume).toBe(1500);
    expect(summary.methodComparison).toBeDefined();
    expect(summary.userPreferences).toBeDefined();
  });

  it('should log transfer method selection', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    analyticsService.logTransferMethodSelection(
      'user1',
      TransferMethod.MANTLE,
      [TransferMethod.CIRCLE, TransferMethod.MANTLE],
      'Lower fees',
      1000,
      { [TransferMethod.CIRCLE]: 25, [TransferMethod.MANTLE]: 5 }
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      '📝 Transfer method selection logged:',
      expect.objectContaining({
        userId: 'user1',
        selectedMethod: TransferMethod.MANTLE
      })
    );

    consoleSpy.mockRestore();
  });
});