import { Router, Request, Response } from 'express';
import { TransferAnalyticsService } from '../services/transfer-analytics.service';
import { TransferMethod } from '../services/transfer.service';

const router = Router();
const analyticsService = new TransferAnalyticsService();

/**
 * Get overall analytics summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summary = analyticsService.generateAnalyticsSummary();
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get analytics summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get metrics for a specific transfer method
 */
router.get('/methods/:method', async (req: Request, res: Response) => {
  try {
    const method = req.params.method as TransferMethod;
    
    if (!Object.values(TransferMethod).includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transfer method',
        validMethods: Object.values(TransferMethod)
      });
    }

    const metrics = analyticsService.getMethodMetrics(method);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: `No metrics found for method: ${method}`
      });
    }

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get method metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve method metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get comparative metrics between Circle and Mantle
 */
router.get('/comparison', async (req: Request, res: Response) => {
  try {
    const comparison = analyticsService.getComparativeMetrics();
    
    res.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get comparative metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve comparative metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get real-time performance data
 */
router.get('/performance/current', async (req: Request, res: Response) => {
  try {
    const currentPerformance = analyticsService.getCurrentPerformance();
    
    if (!currentPerformance) {
      return res.status(404).json({
        success: false,
        error: 'No current performance data available'
      });
    }

    res.json({
      success: true,
      data: currentPerformance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get current performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve current performance data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get performance history
 */
router.get('/performance/history', async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    
    if (hours < 1 || hours > 168) { // Max 1 week
      return res.status(400).json({
        success: false,
        error: 'Hours parameter must be between 1 and 168 (1 week)'
      });
    }

    const history = analyticsService.getPerformanceHistory(hours);
    
    res.json({
      success: true,
      data: {
        history,
        period: `${hours} hours`,
        dataPoints: history.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get performance history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cost savings data
 */
router.get('/savings', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (limit < 1 || limit > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Limit parameter must be between 1 and 1000'
      });
    }

    const savingsData = analyticsService.getCostSavingsData(userId, limit);
    const totalSavings = savingsData.reduce((sum, record) => sum + record.savings, 0);
    const averageSavings = savingsData.length > 0 ? totalSavings / savingsData.length : 0;
    
    res.json({
      success: true,
      data: {
        savings: savingsData,
        summary: {
          totalRecords: savingsData.length,
          totalSavings,
          averageSavings,
          userId: userId || 'all_users'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get cost savings data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cost savings data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get user preference analytics
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    
    if (userId) {
      // Get specific user preferences
      const userPreferences = analyticsService.getUserPreferenceAnalytics(userId);
      
      if (userPreferences.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No preference data found for user: ${userId}`
        });
      }

      res.json({
        success: true,
        data: {
          user: userPreferences[0],
          type: 'individual'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Get aggregated preferences
      const aggregatedPreferences = analyticsService.getAggregatedUserPreferences();
      
      res.json({
        success: true,
        data: {
          aggregated: aggregatedPreferences,
          type: 'aggregated'
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Failed to get user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user preferences',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get completion statistics for a transfer method
 */
router.get('/completion/:method', async (req: Request, res: Response) => {
  try {
    const method = req.params.method as TransferMethod;
    const period = (req.query.period as 'day' | 'week' | 'month') || 'day';
    
    if (!Object.values(TransferMethod).includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transfer method',
        validMethods: Object.values(TransferMethod)
      });
    }

    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period',
        validPeriods: ['day', 'week', 'month']
      });
    }

    const completionStats = analyticsService.getCompletionStatistics(method, period);
    
    if (!completionStats) {
      return res.status(404).json({
        success: false,
        error: `No completion statistics found for ${method} (${period})`
      });
    }

    res.json({
      success: true,
      data: completionStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get completion statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve completion statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get dashboard data (combined endpoint for dashboard UI)
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [
      summary,
      currentPerformance,
      recentHistory,
      topSavings,
      userPreferences
    ] = await Promise.all([
      analyticsService.generateAnalyticsSummary(),
      analyticsService.getCurrentPerformance(),
      analyticsService.getPerformanceHistory(6), // Last 6 hours
      analyticsService.getCostSavingsData(undefined, 5), // Top 5 savings
      analyticsService.getAggregatedUserPreferences()
    ]);

    const dashboardData = {
      summary: summary.overview,
      methodComparison: summary.methodComparison,
      currentPerformance,
      performanceHistory: recentHistory,
      topSavings,
      userPreferences,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Record transfer method selection (for logging purposes)
 */
router.post('/log/selection', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      selectedMethod,
      availableMethods,
      selectionReason,
      amount,
      estimatedCosts
    } = req.body;

    // Validate required fields
    if (!userId || !selectedMethod || !availableMethods || !selectionReason || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['userId', 'selectedMethod', 'availableMethods', 'selectionReason', 'amount']
      });
    }

    // Validate transfer method
    if (!Object.values(TransferMethod).includes(selectedMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid selected method',
        validMethods: Object.values(TransferMethod)
      });
    }

    // Validate available methods
    if (!Array.isArray(availableMethods) || 
        !availableMethods.every(method => Object.values(TransferMethod).includes(method))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid available methods',
        validMethods: Object.values(TransferMethod)
      });
    }

    analyticsService.logTransferMethodSelection(
      userId,
      selectedMethod,
      availableMethods,
      selectionReason,
      amount,
      estimatedCosts || {}
    );

    res.json({
      success: true,
      message: 'Transfer method selection logged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to log transfer method selection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log transfer method selection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint for analytics service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const summary = analyticsService.generateAnalyticsSummary();
    const currentPerformance = analyticsService.getCurrentPerformance();
    
    res.json({
      success: true,
      status: 'healthy',
      data: {
        totalTransfers: summary.overview.totalTransfers,
        totalVolume: summary.overview.totalVolume,
        averageSuccessRate: summary.overview.averageSuccessRate,
        lastPerformanceUpdate: currentPerformance?.timestamp,
        servicesMonitored: ['circle', 'mantle']
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Analytics health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Analytics service health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;