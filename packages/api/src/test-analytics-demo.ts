import { TransferAnalyticsService } from './services/transfer-analytics.service';
import { TransferMethod, TransferStatus } from './services/transfer.service';

/**
 * Demonstration script for Transfer Analytics Service
 * Shows all the implemented functionality for task 11
 */
async function demonstrateAnalytics() {
  console.log('🚀 Starting Transfer Analytics Service Demonstration\n');

  const analyticsService = new TransferAnalyticsService();

  // 1. Demonstrate metrics collection for Mantle vs Circle transfer success rates
  console.log('📊 1. Recording Transfer Initiations and Success Rates');
  console.log('=' .repeat(60));

  // Record Circle transfers
  analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user1', 1000, 'USD', 25.50, TransferMethod.MANTLE, 5.00);
  analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user2', 2000, 'USD', 50.00, TransferMethod.MANTLE, 8.00);
  analyticsService.recordTransferInitiation(TransferMethod.CIRCLE, 'user3', 500, 'USD', 12.50, TransferMethod.MANTLE, 3.00);

  // Record Mantle transfers
  analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user4', 800, 'USD', 4.00, TransferMethod.CIRCLE, 20.00);
  analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user5', 1200, 'USD', 6.00, TransferMethod.CIRCLE, 30.00);
  analyticsService.recordTransferInitiation(TransferMethod.MANTLE, 'user6', 600, 'USD', 3.50, TransferMethod.CIRCLE, 15.00);

  // Record completions with different success rates
  analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user1', TransferStatus.COMPLETED, 300, 25.50); // 5 hours
  analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user2', TransferStatus.COMPLETED, 240, 50.00); // 4 hours
  analyticsService.recordTransferCompletion(TransferMethod.CIRCLE, 'user3', TransferStatus.FAILED, 180); // Failed after 3 hours

  analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user4', TransferStatus.COMPLETED, 2, 4.00); // 2 minutes
  analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user5', TransferStatus.COMPLETED, 1.5, 6.00); // 1.5 minutes
  analyticsService.recordTransferCompletion(TransferMethod.MANTLE, 'user6', TransferStatus.COMPLETED, 3, 3.50); // 3 minutes

  const circleMetrics = analyticsService.getMethodMetrics(TransferMethod.CIRCLE);
  const mantleMetrics = analyticsService.getMethodMetrics(TransferMethod.MANTLE);

  console.log('Circle Metrics:');
  console.log(`  Total Transfers: ${circleMetrics!.totalTransfers}`);
  console.log(`  Success Rate: ${circleMetrics!.successRate.toFixed(1)}%`);
  console.log(`  Average Completion Time: ${circleMetrics!.averageCompletionTime.toFixed(1)} minutes`);
  console.log(`  Average Cost: $${circleMetrics!.averageCost.toFixed(2)}`);

  console.log('\nMantle Metrics:');
  console.log(`  Total Transfers: ${mantleMetrics!.totalTransfers}`);
  console.log(`  Success Rate: ${mantleMetrics!.successRate.toFixed(1)}%`);
  console.log(`  Average Completion Time: ${mantleMetrics!.averageCompletionTime.toFixed(1)} minutes`);
  console.log(`  Average Cost: $${mantleMetrics!.averageCost.toFixed(2)}`);

  // 2. Demonstrate cost savings tracking
  console.log('\n💰 2. Cost Savings Tracking');
  console.log('=' .repeat(60));

  const costSavings = analyticsService.getCostSavingsData();
  let totalSavings = 0;

  console.log('Cost Savings Records:');
  costSavings.forEach((record, index) => {
    console.log(`  ${index + 1}. User ${record.userId}: Saved $${record.savings.toFixed(2)} (${record.savingsPercentage.toFixed(1)}%) by choosing ${record.method} over ${record.alternativeMethod}`);
    totalSavings += record.savings;
  });

  console.log(`\nTotal Cost Savings Achieved: $${totalSavings.toFixed(2)}`);

  // 3. Demonstrate user preference analytics
  console.log('\n👥 3. User Preference Analytics');
  console.log('=' .repeat(60));

  const userPreferences = analyticsService.getAggregatedUserPreferences();
  console.log('Aggregated User Preferences:');
  console.log(`  Total Users: ${userPreferences.totalUsers}`);
  console.log(`  Circle Preferred: ${userPreferences.circlePreferred} users`);
  console.log(`  Mantle Preferred: ${userPreferences.mantlePreferred} users`);
  console.log(`  Average Transfers per User: ${userPreferences.averageTransfersPerUser.toFixed(1)}`);
  console.log(`  Circle Adoption Rate: ${userPreferences.methodAdoptionRate.circle.toFixed(1)}%`);
  console.log(`  Mantle Adoption Rate: ${userPreferences.methodAdoptionRate.mantle.toFixed(1)}%`);

  // 4. Demonstrate real-time transfer method performance
  console.log('\n⚡ 4. Real-time Transfer Method Performance');
  console.log('=' .repeat(60));

  const comparison = analyticsService.getComparativeMetrics();
  console.log('Method Comparison:');
  console.log(`  Volume Difference (Mantle - Circle): $${comparison.comparison.volumeDifference.toFixed(2)}`);
  console.log(`  Success Rate Difference (Mantle - Circle): ${comparison.comparison.successRateDifference.toFixed(1)}%`);
  console.log(`  Cost Difference (Circle - Mantle): $${comparison.comparison.costDifference.toFixed(2)}`);
  console.log(`  Speed Difference (Circle - Mantle): ${comparison.comparison.speedDifference.toFixed(1)} minutes`);
  console.log(`  Total Savings from Method Selection: $${comparison.comparison.totalSavings.toFixed(2)}`);

  // Wait for performance data to be collected
  await new Promise(resolve => setTimeout(resolve, 200));

  const currentPerformance = analyticsService.getCurrentPerformance();
  if (currentPerformance) {
    console.log('\nCurrent Performance Data:');
    console.log(`  Circle Active Transfers: ${currentPerformance.circle.activeTransfers}`);
    console.log(`  Circle Network Status: ${currentPerformance.circle.networkStatus}`);
    console.log(`  Mantle Active Transfers: ${currentPerformance.mantle.activeTransfers}`);
    console.log(`  Mantle Network Status: ${currentPerformance.mantle.networkStatus}`);
    console.log(`  Mantle Network Congestion: ${currentPerformance.mantle.networkCongestion}`);
  }

  // 5. Demonstrate logging for transfer method selection and completion statistics
  console.log('\n📝 5. Transfer Method Selection Logging');
  console.log('=' .repeat(60));

  // Log some method selections
  analyticsService.logTransferMethodSelection(
    'user7',
    TransferMethod.MANTLE,
    [TransferMethod.CIRCLE, TransferMethod.MANTLE],
    'Lower fees and faster settlement',
    1500,
    { [TransferMethod.CIRCLE]: 37.50, [TransferMethod.MANTLE]: 7.50 }
  );

  analyticsService.logTransferMethodSelection(
    'user8',
    TransferMethod.CIRCLE,
    [TransferMethod.CIRCLE, TransferMethod.MANTLE],
    'Prefer traditional banking reliability',
    5000,
    { [TransferMethod.CIRCLE]: 125.00, [TransferMethod.MANTLE]: 25.00 }
  );

  // 6. Demonstrate comprehensive analytics summary
  console.log('\n📈 6. Comprehensive Analytics Summary');
  console.log('=' .repeat(60));

  const summary = analyticsService.generateAnalyticsSummary();
  console.log('Analytics Summary:');
  console.log(`  Total Transfers: ${summary.overview.totalTransfers}`);
  console.log(`  Total Volume: $${summary.overview.totalVolume.toFixed(2)}`);
  console.log(`  Total Savings: $${summary.overview.totalSavings.toFixed(2)}`);
  console.log(`  Average Success Rate: ${summary.overview.averageSuccessRate.toFixed(1)}%`);

  console.log('\nTop Savings Records:');
  summary.topSavings.slice(0, 3).forEach((record, index) => {
    console.log(`  ${index + 1}. $${record.savings.toFixed(2)} saved by user ${record.userId} using ${record.method}`);
  });

  // 7. Demonstrate completion statistics
  console.log('\n⏱️  7. Completion Statistics');
  console.log('=' .repeat(60));

  const mantleCompletionStats = analyticsService.getCompletionStatistics(TransferMethod.MANTLE, 'day');
  if (mantleCompletionStats) {
    console.log('Mantle Completion Statistics (Daily):');
    console.log(`  Completed Transfers: ${mantleCompletionStats.completedTransfers}`);
    console.log(`  Average Completion Time: ${mantleCompletionStats.averageCompletionTime.toFixed(1)} minutes`);
    console.log(`  Fastest Completion: ${mantleCompletionStats.fastestCompletion.toFixed(1)} minutes`);
    console.log(`  Slowest Completion: ${mantleCompletionStats.slowestCompletion.toFixed(1)} minutes`);
    console.log('  Time Distribution:');
    console.log(`    Under 1 minute: ${mantleCompletionStats.timeDistribution.under1Min}`);
    console.log(`    Under 5 minutes: ${mantleCompletionStats.timeDistribution.under5Min}`);
    console.log(`    Under 30 minutes: ${mantleCompletionStats.timeDistribution.under30Min}`);
    console.log(`    Under 1 hour: ${mantleCompletionStats.timeDistribution.under1Hour}`);
    console.log(`    Over 1 hour: ${mantleCompletionStats.timeDistribution.over1Hour}`);
  }

  console.log('\n✅ Analytics Service Demonstration Complete!');
  console.log('\nKey Features Implemented:');
  console.log('  ✓ Metrics collection for Mantle vs Circle transfer success rates');
  console.log('  ✓ Cost savings tracking and user preference analytics');
  console.log('  ✓ Dashboard endpoints for real-time transfer method performance');
  console.log('  ✓ Logging for transfer method selection and completion statistics');
  console.log('  ✓ Performance monitoring and historical data tracking');
  console.log('  ✓ Comprehensive analytics summary generation');
  console.log('  ✓ RESTful API endpoints for all analytics data');
}

// Run the demonstration
demonstrateAnalytics().catch(console.error);