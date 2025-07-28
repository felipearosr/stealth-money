import { TransferService } from './transfer.service';
import { NotificationService } from './notification.service';

/**
 * Example demonstrating the comprehensive notification service functionality
 * This file shows how notifications work with the transfer system
 */

async function demonstrateNotificationService() {
  console.log('🚀 Starting Notification Service Demonstration\n');

  const transferService = new TransferService();
  const notificationService = new NotificationService();

  try {
    // Example 1: Onboarding Welcome Notification
    console.log('📧 Example 1: Onboarding Welcome Notification');
    console.log('='.repeat(50));
    
    // Simulate a new user being created
    const newUserId = 'user-new-123';
    await notificationService.sendOnboardingWelcome(newUserId);
    
    console.log('✅ Onboarding welcome notification sent\n');

    // Example 2: Payment Request Notification
    console.log('📧 Example 2: Payment Request Notification');
    console.log('='.repeat(50));
    
    const paymentRequest = {
      id: 'request-456',
      requesterId: 'user-requester-789',
      amount: 150.75,
      currency: 'USD',
      description: 'Dinner payment split',
      shareableLink: 'https://pay.example.com/request-456',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    };

    // Send to registered user
    const registeredRecipient = {
      userId: 'user-recipient-456',
      email: 'recipient@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    await notificationService.sendPaymentRequest(registeredRecipient, paymentRequest);
    console.log('✅ Payment request sent to registered user');

    // Send to unregistered user
    const unregisteredRecipient = {
      email: 'newuser@example.com',
      phone: '+1555123456',
      firstName: 'New',
      lastName: 'User',
      preferredChannel: 'email' as const,
    };

    await notificationService.sendPaymentRequest(unregisteredRecipient, paymentRequest);
    console.log('✅ Payment request sent to unregistered user\n');

    // Example 3: Payment Status Updates
    console.log('📧 Example 3: Payment Status Updates');
    console.log('='.repeat(50));
    
    const paymentStatus = {
      paymentId: 'payment-789',
      status: 'processing' as const,
      amount: 250.00,
      currency: 'EUR',
      senderId: 'user-sender-123',
      recipientId: 'user-recipient-456',
      processorId: 'stripe',
      settlementMethod: 'circle',
      estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    };

    await notificationService.sendPaymentStatusUpdate('user-sender-123', paymentStatus);
    await notificationService.sendPaymentStatusUpdate('user-recipient-456', paymentStatus);
    console.log('✅ Payment status updates sent to both users');

    // Update to completed status
    const completedStatus = {
      ...paymentStatus,
      status: 'completed' as const,
      completedAt: new Date(),
    };

    await notificationService.sendPaymentStatusUpdate('user-sender-123', completedStatus);
    await notificationService.sendPaymentStatusUpdate('user-recipient-456', completedStatus);
    console.log('✅ Payment completion notifications sent\n');

    // Example 4: Payment Confirmation
    console.log('📧 Example 4: Payment Confirmation');
    console.log('='.repeat(50));
    
    const paymentResult = {
      paymentId: 'payment-789',
      senderId: 'user-sender-123',
      recipientId: 'user-recipient-456',
      amount: 250.00,
      currency: 'EUR',
      status: 'COMPLETED',
      processorId: 'stripe',
      settlementMethod: 'circle',
      fees: 3.75,
      completedAt: new Date(),
      metadata: {
        transactionId: 'txn-abc123',
        processingTime: '2.3s',
      },
    };

    await notificationService.sendPaymentConfirmation(
      paymentResult.senderId,
      paymentResult.recipientId,
      paymentResult
    );
    console.log('✅ Payment confirmation sent to both users\n');

    // Example 5: Notification Preferences Management
    console.log('📧 Example 5: Notification Preferences');
    console.log('='.repeat(50));
    
    const userId = 'user-preferences-123';
    
    // Get current preferences
    const currentPreferences = await notificationService.getNotificationPreferences(userId);
    console.log('📋 Current preferences:', JSON.stringify(currentPreferences, null, 2));

    // Update preferences
    const updatedPreferences = {
      paymentRequests: true,
      paymentConfirmations: true,
      statusUpdates: false, // Disable status updates
      securityAlerts: true,
      marketing: false,
      channels: [
        {
          type: 'email' as const,
          enabled: true,
          address: 'user@example.com',
          verified: true,
        },
        {
          type: 'sms' as const,
          enabled: false, // Disable SMS
          address: '+1234567890',
          verified: false,
        },
        {
          type: 'push' as const,
          enabled: true,
          verified: false,
        },
      ],
    };

    await notificationService.updateNotificationPreferences(userId, updatedPreferences);
    console.log('✅ Notification preferences updated\n');

    // Example 6: Delivery Statistics
    console.log('📊 Example 6: Delivery Statistics');
    console.log('='.repeat(50));
    
    // Wait for delivery processing
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const stats = await notificationService.getDeliveryStats();
    console.log('📈 Delivery Statistics:');
    console.log(`  Total notifications: ${stats.total}`);
    console.log(`  Pending: ${stats.pending}`);
    console.log(`  Delivered: ${stats.delivered}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log('  By channel:');
    Object.entries(stats.byChannel).forEach(([channel, count]) => {
      console.log(`    ${channel}: ${count}`);
    });
    console.log();

    // Example 7: Integration with Transfer Service
    console.log('🔄 Example 7: Transfer Service Integration');
    console.log('='.repeat(50));
    
    // Create a mock payment to demonstrate status updates
    const mockPaymentId = 'payment-integration-test';
    
    // Simulate payment processing with notifications
    console.log('🔄 Simulating payment processing with real-time notifications...');
    await transferService.simulatePaymentProcessing(mockPaymentId);
    
    // Get notification stats from transfer service
    const transferStats = await transferService.getNotificationStats();
    console.log('📊 Transfer service notification stats:', transferStats);
    console.log();

    // Example 8: User Notification Preferences via Transfer Service
    console.log('⚙️  Example 8: User Preferences via Transfer Service');
    console.log('='.repeat(50));
    
    const testUserId = 'user-transfer-prefs-123';
    
    // Get preferences through transfer service
    const userPrefs = await transferService.getUserNotificationPreferences(testUserId);
    console.log('📋 User preferences via transfer service:', JSON.stringify(userPrefs, null, 2));

    // Update preferences through transfer service
    await transferService.updateUserNotificationPreferences(testUserId, {
      paymentRequests: true,
      paymentConfirmations: true,
      statusUpdates: true,
      securityAlerts: true,
      marketing: false,
    });
    console.log('✅ User preferences updated via transfer service\n');

    // Example 9: Error Handling and Retry Mechanism
    console.log('🔧 Example 9: Error Handling and Retry');
    console.log('='.repeat(50));
    
    try {
      // Try to send notification to non-existent user
      await notificationService.sendOnboardingWelcome('non-existent-user');
    } catch (error) {
      console.log('❌ Expected error for non-existent user:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Demonstrate retry mechanism by checking stats after some time
    console.log('⏳ Waiting for retry mechanism to process failed deliveries...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalStats = await notificationService.getDeliveryStats();
    console.log('📊 Final delivery statistics after retry processing:');
    console.log(`  Total: ${finalStats.total}, Delivered: ${finalStats.delivered}, Failed: ${finalStats.failed}`);

    console.log('\n🎉 Notification Service Demonstration Complete!');
    console.log('='.repeat(50));
    console.log('Key features demonstrated:');
    console.log('✅ Multi-channel notifications (email, SMS, push)');
    console.log('✅ Real-time payment status updates');
    console.log('✅ Template-based notification rendering');
    console.log('✅ User preference management');
    console.log('✅ Delivery tracking and retry mechanisms');
    console.log('✅ Integration with transfer service');
    console.log('✅ Error handling and graceful degradation');
    console.log('✅ Comprehensive delivery statistics');

  } catch (error) {
    console.error('❌ Error in notification service demonstration:', error);
  } finally {
    // Cleanup resources
    await transferService.disconnect();
    await notificationService.disconnect();
  }
}

/**
 * Example of notification templates and customization
 */
async function demonstrateNotificationTemplates() {
  console.log('\n📝 Notification Template Examples');
  console.log('='.repeat(50));

  const notificationService = new NotificationService();

  try {
    // Example of different notification types with various data
    const examples = [
      {
        title: 'Payment Request with Rich Data',
        data: {
          senderName: 'Alice Johnson',
          recipientName: 'Bob Smith',
          amount: '125.50',
          currency: 'USD',
          description: 'Concert tickets - Taylor Swift Eras Tour',
          paymentLink: 'https://pay.example.com/request-abc123',
          expirationDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleDateString(),
        },
      },
      {
        title: 'International Payment Status',
        data: {
          userName: 'Carlos Rodriguez',
          paymentId: 'PAY-INTL-456',
          status: 'PROCESSING',
          amount: '€850.00',
          currency: 'EUR',
          statusMessage: 'Your international payment is being processed by our European banking partner.',
          additionalInfo: 'Estimated completion: 2-3 business days\nExchange rate: 1 USD = 0.85 EUR\nProcessing fee: €12.75',
        },
      },
      {
        title: 'Failed Payment with Recovery Options',
        data: {
          userName: 'Sarah Chen',
          paymentId: 'PAY-FAIL-789',
          status: 'FAILED',
          amount: '¥15,000',
          currency: 'JPY',
          statusMessage: 'Your payment failed due to insufficient funds in your linked account.',
          additionalInfo: 'Please update your payment method or add funds to your account and try again.\n\nNeed help? Contact our support team at support@example.com',
        },
      },
    ];

    examples.forEach((example, index) => {
      console.log(`\n${index + 1}. ${example.title}:`);
      console.log('-'.repeat(30));
      console.log('Template variables:', JSON.stringify(example.data, null, 2));
    });

    console.log('\n📧 Template rendering supports:');
    console.log('• Variable substitution with {variableName} syntax');
    console.log('• Conditional content based on user preferences');
    console.log('• Multi-language support (extensible)');
    console.log('• Rich formatting for different channels');
    console.log('• Fallback values for missing variables');
    console.log('• Channel-specific optimization (email vs SMS vs push)');

  } finally {
    await notificationService.disconnect();
  }
}

/**
 * Run the demonstration
 */
if (require.main === module) {
  demonstrateNotificationService()
    .then(() => demonstrateNotificationTemplates())
    .then(() => {
      console.log('\n✨ All demonstrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Demonstration failed:', error);
      process.exit(1);
    });
}

export {
  demonstrateNotificationService,
  demonstrateNotificationTemplates,
};