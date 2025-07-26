import { TransferMethod, TransferStatus } from './transfer.service';

/**
 * Interface for transfer metrics
 */
export interface TransferMetrics {
  method: TransferMethod;
  totalTransfers: number;
  successfulTransfers: number;
  failedTransfers: number;
  successRate: number;
  averageAmount: number;
  totalVolume: number;
  averageCompletionTime: number; // in minutes
  averageCost: number;
  totalCostSavings?: number; // compared to alternative method
}

/**
 * Interface for cost savings tracking
 */
export interface CostSavingsData {
  transferId: string;
  userId: string;
  method: TransferMethod;
  alternativeMethod: TransferMethod;
  actualCost: number;
  alternativeCost: number;
  savings: number;
  savingsPercentage: number;
  amount: number;
  currency: string;
  timestamp: Date;
}

/**
 * Interface for user preference analytics
 */
export interface UserPreferenceData {
  userId: string;
  preferredMethod: TransferMethod;
  methodSelectionHistory: {
    method: TransferMethod;
    timestamp: Date;
    amount: number;
    reason: string;
  }[];
  totalTransfers: number;
  circleTransfers: number;
  mantleTransfers: number;
  averageTransferAmount: number;
  totalSavings: number;
}

/**
 * Interface for real-time performance data
 */
export interface PerformanceData {
  timestamp: Date;
  circle: {
    activeTransfers: number;
    averageProcessingTime: number;
    successRate: number;
    networkStatus: 'healthy' | 'degraded' | 'down';
  };
  mantle: {
    activeTransfers: number;
    averageProcessingTime: number;
    successRate: number;
    networkStatus: 'healthy' | 'degraded' | 'down';
    gasPrice: string;
    networkCongestion: 'low' | 'medium' | 'high';
  };
}

/**
 * Interface for transfer completion statistics
 */
export interface CompletionStatistics {
  method: TransferMethod;
  period: 'hour' | 'day' | 'week' | 'month';
  completedTransfers: number;
  averageCompletionTime: number;
  fastestCompletion: number;
  slowestCompletion: number;
  timeDistribution: {
    under1Min: number;
    under5Min: number;
    under30Min: number;
    under1Hour: number;
    over1Hour: number;
  };
}

/**
 * Transfer Analytics Service
 * Handles metrics collection, cost savings tracking, and performance analytics
 * for both Circle and Mantle transfer methods
 */
export class TransferAnalyticsService {
  private metrics: Map<TransferMethod, TransferMetrics> = new Map();
  private costSavingsData: CostSavingsData[] = [];
  private userPreferences: Map<string, UserPreferenceData> = new Map();
  private performanceHistory: PerformanceData[] = [];
  private completionStats: Map<string, CompletionStatistics> = new Map();

  constructor() {
    this.initializeMetrics();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize default metrics for both transfer methods
   */
  private initializeMetrics(): void {
    const defaultMetrics: Omit<TransferMetrics, 'method'> = {
      totalTransfers: 0,
      successfulTransfers: 0,
      failedTransfers: 0,
      successRate: 0,
      averageAmount: 0,
      totalVolume: 0,
      averageCompletionTime: 0,
      averageCost: 0
    };

    this.metrics.set(TransferMethod.CIRCLE, {
      method: TransferMethod.CIRCLE,
      ...defaultMetrics
    });

    this.metrics.set(TransferMethod.MANTLE, {
      method: TransferMethod.MANTLE,
      ...defaultMetrics
    });

    console.log('📊 Transfer analytics service initialized');
  }

  /**
   * Record a transfer initiation
   */
  public recordTransferInitiation(
    method: TransferMethod,
    userId: string,
    amount: number,
    currency: string,
    estimatedCost: number,
    alternativeMethod?: TransferMethod,
    alternativeCost?: number
  ): void {
    const metrics = this.metrics.get(method);
    if (!metrics) return;

    // Update basic metrics
    metrics.totalTransfers++;
    metrics.totalVolume += amount;
    metrics.averageAmount = metrics.totalVolume / metrics.totalTransfers;
    
    // Update average cost
    const totalCost = (metrics.averageCost * (metrics.totalTransfers - 1)) + estimatedCost;
    metrics.averageCost = totalCost / metrics.totalTransfers;

    // Record cost savings if alternative method provided
    if (alternativeMethod && alternativeCost && alternativeCost > estimatedCost) {
      const savings = alternativeCost - estimatedCost;
      const savingsPercentage = (savings / alternativeCost) * 100;

      const costSavingsRecord: CostSavingsData = {
        transferId: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        method,
        alternativeMethod,
        actualCost: estimatedCost,
        alternativeCost,
        savings,
        savingsPercentage,
        amount,
        currency,
        timestamp: new Date()
      };

      this.costSavingsData.push(costSavingsRecord);
      
      // Update total cost savings in metrics
      if (!metrics.totalCostSavings) metrics.totalCostSavings = 0;
      metrics.totalCostSavings += savings;
    }

    // Update user preferences
    this.updateUserPreferences(userId, method, amount, 'user_selected');

    console.log(`📈 Recorded ${method} transfer initiation: $${amount} ${currency}`);
  }

  /**
   * Record a transfer completion
   */
  public recordTransferCompletion(
    method: TransferMethod,
    userId: string,
    status: TransferStatus,
    completionTimeMinutes: number,
    actualCost?: number
  ): void {
    const metrics = this.metrics.get(method);
    if (!metrics) return;

    // Update success/failure counts
    if (status === TransferStatus.COMPLETED) {
      metrics.successfulTransfers++;
      
      // Update average completion time
      const totalTime = (metrics.averageCompletionTime * (metrics.successfulTransfers - 1)) + completionTimeMinutes;
      metrics.averageCompletionTime = totalTime / metrics.successfulTransfers;
      
      // Record completion statistics
      this.recordCompletionStatistics(method, completionTimeMinutes);
    } else if (status === TransferStatus.FAILED) {
      metrics.failedTransfers++;
    }

    // Update success rate
    metrics.successRate = (metrics.successfulTransfers / metrics.totalTransfers) * 100;

    // Update actual cost if provided
    if (actualCost && status === TransferStatus.COMPLETED) {
      const totalActualCost = (metrics.averageCost * (metrics.successfulTransfers - 1)) + actualCost;
      metrics.averageCost = totalActualCost / metrics.successfulTransfers;
    }

    console.log(`📊 Recorded ${method} transfer completion: ${status} in ${completionTimeMinutes}min`);
  }

  /**
   * Record completion statistics for time distribution analysis
   */
  private recordCompletionStatistics(method: TransferMethod, completionTimeMinutes: number): void {
    const key = `${method}_day`; // For daily statistics
    let stats = this.completionStats.get(key);

    if (!stats) {
      stats = {
        method,
        period: 'day',
        completedTransfers: 0,
        averageCompletionTime: 0,
        fastestCompletion: completionTimeMinutes,
        slowestCompletion: completionTimeMinutes,
        timeDistribution: {
          under1Min: 0,
          under5Min: 0,
          under30Min: 0,
          under1Hour: 0,
          over1Hour: 0
        }
      };
    }

    // Update basic stats
    stats.completedTransfers++;
    const totalTime = (stats.averageCompletionTime * (stats.completedTransfers - 1)) + completionTimeMinutes;
    stats.averageCompletionTime = totalTime / stats.completedTransfers;
    
    // Update fastest/slowest
    stats.fastestCompletion = Math.min(stats.fastestCompletion, completionTimeMinutes);
    stats.slowestCompletion = Math.max(stats.slowestCompletion, completionTimeMinutes);

    // Update time distribution
    if (completionTimeMinutes < 1) {
      stats.timeDistribution.under1Min++;
    } else if (completionTimeMinutes < 5) {
      stats.timeDistribution.under5Min++;
    } else if (completionTimeMinutes < 30) {
      stats.timeDistribution.under30Min++;
    } else if (completionTimeMinutes < 60) {
      stats.timeDistribution.under1Hour++;
    } else {
      stats.timeDistribution.over1Hour++;
    }

    this.completionStats.set(key, stats);
  }

  /**
   * Update user preference data
   */
  private updateUserPreferences(
    userId: string,
    method: TransferMethod,
    amount: number,
    reason: string
  ): void {
    let userPrefs = this.userPreferences.get(userId);

    if (!userPrefs) {
      userPrefs = {
        userId,
        preferredMethod: method,
        methodSelectionHistory: [],
        totalTransfers: 0,
        circleTransfers: 0,
        mantleTransfers: 0,
        averageTransferAmount: 0,
        totalSavings: 0
      };
    }

    // Add to selection history
    userPrefs.methodSelectionHistory.push({
      method,
      timestamp: new Date(),
      amount,
      reason
    });

    // Update counters
    userPrefs.totalTransfers++;
    if (method === TransferMethod.CIRCLE) {
      userPrefs.circleTransfers++;
    } else {
      userPrefs.mantleTransfers++;
    }

    // Update average amount
    const totalAmount = (userPrefs.averageTransferAmount * (userPrefs.totalTransfers - 1)) + amount;
    userPrefs.averageTransferAmount = totalAmount / userPrefs.totalTransfers;

    // Determine preferred method based on recent usage
    const recentSelections = userPrefs.methodSelectionHistory.slice(-10); // Last 10 transfers
    const mantleCount = recentSelections.filter(s => s.method === TransferMethod.MANTLE).length;
    userPrefs.preferredMethod = mantleCount > recentSelections.length / 2 
      ? TransferMethod.MANTLE 
      : TransferMethod.CIRCLE;

    this.userPreferences.set(userId, userPrefs);
  }

  /**
   * Get current metrics for a specific transfer method
   */
  public getMethodMetrics(method: TransferMethod): TransferMetrics | undefined {
    return this.metrics.get(method);
  }

  /**
   * Get comparative metrics for both methods
   */
  public getComparativeMetrics(): {
    circle: TransferMetrics;
    mantle: TransferMetrics;
    comparison: {
      volumeDifference: number;
      successRateDifference: number;
      costDifference: number;
      speedDifference: number;
      totalSavings: number;
    };
  } {
    const circleMetrics = this.metrics.get(TransferMethod.CIRCLE)!;
    const mantleMetrics = this.metrics.get(TransferMethod.MANTLE)!;

    const totalSavings = this.costSavingsData.reduce((sum, record) => sum + record.savings, 0);

    return {
      circle: circleMetrics,
      mantle: mantleMetrics,
      comparison: {
        volumeDifference: mantleMetrics.totalVolume - circleMetrics.totalVolume,
        successRateDifference: mantleMetrics.successRate - circleMetrics.successRate,
        costDifference: circleMetrics.averageCost - mantleMetrics.averageCost,
        speedDifference: circleMetrics.averageCompletionTime - mantleMetrics.averageCompletionTime,
        totalSavings
      }
    };
  }

  /**
   * Get cost savings data for a specific user or all users
   */
  public getCostSavingsData(userId?: string, limit: number = 100): CostSavingsData[] {
    let data = this.costSavingsData;
    
    if (userId) {
      data = data.filter(record => record.userId === userId);
    }

    return data
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get user preference analytics
   */
  public getUserPreferenceAnalytics(userId?: string): UserPreferenceData[] {
    if (userId) {
      const userPrefs = this.userPreferences.get(userId);
      return userPrefs ? [userPrefs] : [];
    }

    return Array.from(this.userPreferences.values())
      .sort((a, b) => b.totalTransfers - a.totalTransfers);
  }

  /**
   * Get aggregated user preference statistics
   */
  public getAggregatedUserPreferences(): {
    totalUsers: number;
    circlePreferred: number;
    mantlePreferred: number;
    averageTransfersPerUser: number;
    methodAdoptionRate: {
      circle: number;
      mantle: number;
    };
  } {
    const users = Array.from(this.userPreferences.values());
    const totalUsers = users.length;
    
    if (totalUsers === 0) {
      return {
        totalUsers: 0,
        circlePreferred: 0,
        mantlePreferred: 0,
        averageTransfersPerUser: 0,
        methodAdoptionRate: { circle: 0, mantle: 0 }
      };
    }

    const circlePreferred = users.filter(u => u.preferredMethod === TransferMethod.CIRCLE).length;
    const mantlePreferred = users.filter(u => u.preferredMethod === TransferMethod.MANTLE).length;
    const totalTransfers = users.reduce((sum, u) => sum + u.totalTransfers, 0);
    const totalCircleTransfers = users.reduce((sum, u) => sum + u.circleTransfers, 0);
    const totalMantleTransfers = users.reduce((sum, u) => sum + u.mantleTransfers, 0);

    return {
      totalUsers,
      circlePreferred,
      mantlePreferred,
      averageTransfersPerUser: totalTransfers / totalUsers,
      methodAdoptionRate: {
        circle: totalTransfers > 0 ? (totalCircleTransfers / totalTransfers) * 100 : 0,
        mantle: totalTransfers > 0 ? (totalMantleTransfers / totalTransfers) * 100 : 0
      }
    };
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor performance every 5 minutes
    setInterval(() => {
      this.collectPerformanceData();
    }, 5 * 60 * 1000);

    // Initial collection
    this.collectPerformanceData();
  }

  /**
   * Collect current performance data
   */
  private async collectPerformanceData(): Promise<void> {
    try {
      const circleMetrics = this.metrics.get(TransferMethod.CIRCLE)!;
      const mantleMetrics = this.metrics.get(TransferMethod.MANTLE)!;

      // Simulate active transfers (in production, query from database)
      const circleActiveTransfers = Math.floor(Math.random() * 50);
      const mantleActiveTransfers = Math.floor(Math.random() * 30);

      // Simulate network status (in production, check actual service health)
      const circleNetworkStatus = circleMetrics.successRate > 95 ? 'healthy' : 
                                 circleMetrics.successRate > 85 ? 'degraded' : 'down';
      const mantleNetworkStatus = mantleMetrics.successRate > 95 ? 'healthy' : 
                                 mantleMetrics.successRate > 85 ? 'degraded' : 'down';

      const performanceData: PerformanceData = {
        timestamp: new Date(),
        circle: {
          activeTransfers: circleActiveTransfers,
          averageProcessingTime: circleMetrics.averageCompletionTime,
          successRate: circleMetrics.successRate,
          networkStatus: circleNetworkStatus
        },
        mantle: {
          activeTransfers: mantleActiveTransfers,
          averageProcessingTime: mantleMetrics.averageCompletionTime,
          successRate: mantleMetrics.successRate,
          networkStatus: mantleNetworkStatus,
          gasPrice: '0.001', // Simulated gas price in gwei
          networkCongestion: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
        }
      };

      this.performanceHistory.push(performanceData);

      // Keep only last 24 hours of data (288 data points at 5-minute intervals)
      if (this.performanceHistory.length > 288) {
        this.performanceHistory = this.performanceHistory.slice(-288);
      }

      console.log('📊 Performance data collected');
    } catch (error) {
      console.error('❌ Failed to collect performance data:', error);
    }
  }

  /**
   * Get current performance data
   */
  public getCurrentPerformance(): PerformanceData | undefined {
    return this.performanceHistory[this.performanceHistory.length - 1];
  }

  /**
   * Get performance history for a specific time range
   */
  public getPerformanceHistory(hours: number = 24): PerformanceData[] {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.performanceHistory.filter(data => data.timestamp >= cutoffTime);
  }

  /**
   * Get completion statistics for a method and period
   */
  public getCompletionStatistics(method: TransferMethod, period: 'day' | 'week' | 'month' = 'day'): CompletionStatistics | undefined {
    return this.completionStats.get(`${method}_${period}`);
  }

  /**
   * Generate analytics summary report
   */
  public generateAnalyticsSummary(): {
    overview: {
      totalTransfers: number;
      totalVolume: number;
      totalSavings: number;
      averageSuccessRate: number;
    };
    methodComparison: {
      circle: TransferMetrics;
      mantle: TransferMetrics;
      comparison: {
        volumeDifference: number;
        successRateDifference: number;
        costDifference: number;
        speedDifference: number;
        totalSavings: number;
      };
    };
    userPreferences: {
      totalUsers: number;
      circlePreferred: number;
      mantlePreferred: number;
      averageTransfersPerUser: number;
      methodAdoptionRate: {
        circle: number;
        mantle: number;
      };
    };
    recentPerformance: PerformanceData | undefined;
    topSavings: CostSavingsData[];
  } {
    const circleMetrics = this.metrics.get(TransferMethod.CIRCLE)!;
    const mantleMetrics = this.metrics.get(TransferMethod.MANTLE)!;
    const methodComparison = this.getComparativeMetrics();

    return {
      overview: {
        totalTransfers: circleMetrics.totalTransfers + mantleMetrics.totalTransfers,
        totalVolume: circleMetrics.totalVolume + mantleMetrics.totalVolume,
        totalSavings: methodComparison.comparison.totalSavings,
        averageSuccessRate: (circleMetrics.successRate + mantleMetrics.successRate) / 2
      },
      methodComparison,
      userPreferences: this.getAggregatedUserPreferences(),
      recentPerformance: this.getCurrentPerformance(),
      topSavings: this.getCostSavingsData(undefined, 10)
    };
  }

  /**
   * Log transfer method selection for analytics
   */
  public logTransferMethodSelection(
    userId: string,
    selectedMethod: TransferMethod,
    availableMethods: TransferMethod[],
    selectionReason: string,
    amount: number,
    estimatedCosts: { [key in TransferMethod]?: number }
  ): void {
    console.log(`📝 Transfer method selection logged:`, {
      userId,
      selectedMethod,
      availableMethods,
      selectionReason,
      amount,
      estimatedCosts,
      timestamp: new Date().toISOString()
    });

    // Update user preferences with selection reason
    this.updateUserPreferences(userId, selectedMethod, amount, selectionReason);

    // Record potential savings if user chose the cheaper option
    const alternativeMethods = availableMethods.filter(m => m !== selectedMethod);
    for (const altMethod of alternativeMethods) {
      const selectedCost = estimatedCosts[selectedMethod];
      const altCost = estimatedCosts[altMethod];
      
      if (selectedCost && altCost && altCost > selectedCost) {
        // User chose the cheaper option, record the savings
        this.recordTransferInitiation(
          selectedMethod,
          userId,
          amount,
          'USD', // Assuming USD for now
          selectedCost,
          altMethod,
          altCost
        );
        break;
      }
    }
  }
}