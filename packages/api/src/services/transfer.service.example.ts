/**
 * Example usage of the TransferService for handling unregistered user payment flows
 * This demonstrates the complete workflow from payment request access to completion
 */

import { TransferService, UnregisteredUserData } from './transfer.service';

async function demonstrateUnregisteredUserFlow() {
  const transferService = new TransferService();

  try {
    // Scenario 1: Unregistered user accesses a payment request link
    console.log('=== Scenario 1: Unregistered User Accesses Payment Request ===');
    
    const paymentRequestId = 'request-123';
    const unregisteredUserData: UnregisteredUserData = {
      email: 'newuser@example.com',
      firstName: 'John',
      lastName: 'Doe',
      country: 'US',
      currency: 'USD',
      phone: '+1234567890',
    };

    // Step 1: Handle unregistered user access
    const accessResult = await transferService.handleUnregisteredUserAccess(
      paymentRequestId,
      unregisteredUserData
    );

    if (accessResult.success && accessResult.requiresOnboarding) {
      console.log('✅ Onboarding required for unregistered user');
      console.log('Onboarding token:', accessResult.onboardingToken);

      // Step 2: Complete onboarding and process payment
      const onboardingResult = await transferService.completeOnboardingAndProcessPayment(
        accessResult.onboardingToken!,
        { phone: '+1234567890' } // Additional user data if needed
      );

      if (onboardingResult.success) {
        console.log('✅ User onboarded and payment processed successfully');
        console.log('New user ID:', onboardingResult.userId);
        console.log('Payment ID:', onboardingResult.paymentId);
      } else {
        console.log('❌ Onboarding failed:', onboardingResult.error);
      }
    } else if (accessResult.success && !accessResult.requiresOnboarding) {
      console.log('✅ Existing user, payment processed directly');
      console.log('Payment ID:', accessResult.transferId);
    } else {
      console.log('❌ Access failed:', accessResult.error);
    }

    // Scenario 2: Direct payment request fulfillment
    console.log('\n=== Scenario 2: Direct Payment Request Fulfillment ===');
    
    const fulfillmentResult = await transferService.fulfillPaymentRequest({
      paymentRequestId: 'request-456',
      senderData: {
        email: 'sender@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        country: 'CA',
        currency: 'CAD',
      },
      processorId: 'stripe',
      settlementMethod: 'circle',
    });

    if (fulfillmentResult.success) {
      console.log('✅ Payment request fulfilled successfully');
      console.log('Transfer ID:', fulfillmentResult.transferId);
      if (fulfillmentResult.userId) {
        console.log('New user created:', fulfillmentResult.userId);
      }
    } else {
      console.log('❌ Fulfillment failed:', fulfillmentResult.error);
    }

    // Scenario 3: Standard user-to-user transfer
    console.log('\n=== Scenario 3: Standard User-to-User Transfer ===');
    
    const userTransferResult = await transferService.createUserToUserTransfer({
      senderId: 'user-123',
      recipientId: 'user-456',
      amount: 250.00,
      currency: 'USD',
      description: 'Dinner payment',
    });

    if (userTransferResult.success) {
      console.log('✅ User-to-user transfer created successfully');
      console.log('Transfer ID:', userTransferResult.transferId);
    } else {
      console.log('❌ Transfer failed:', userTransferResult.error);
    }

    // Scenario 4: Validate payment request access
    console.log('\n=== Scenario 4: Validate Payment Request Access ===');
    
    const validationResult = await transferService.validatePaymentRequestAccess('request-789');
    
    if (validationResult.valid) {
      console.log('✅ Payment request is valid and accessible');
      console.log('Amount:', validationResult.paymentRequest?.amount);
      console.log('Currency:', validationResult.paymentRequest?.currency);
    } else {
      console.log('❌ Payment request validation failed:', validationResult.error);
    }

    // Scenario 5: Get user transfer history
    console.log('\n=== Scenario 5: Get User Transfer History ===');
    
    const transferHistory = await transferService.getUserTransferHistory('user-123');
    console.log(`✅ Found ${transferHistory.length} transfers in history`);
    
    transferHistory.slice(0, 3).forEach((transfer, index) => {
      console.log(`${index + 1}. ${transfer.type.toUpperCase()} - $${transfer.amount} ${transfer.currency} - ${transfer.status}`);
    });

  } catch (error) {
    console.error('❌ Error in demonstration:', error);
  } finally {
    await transferService.disconnect();
  }
}

// Example of how to handle onboarding flow data retrieval
async function demonstrateOnboardingFlowRetrieval() {
  const transferService = new TransferService();

  try {
    console.log('\n=== Onboarding Flow Data Retrieval ===');
    
    const onboardingToken = 'sample-token-123';
    const onboardingData = await transferService.getOnboardingFlowData(onboardingToken);

    if (onboardingData) {
      console.log('✅ Onboarding data retrieved successfully');
      console.log('Payment Request ID:', onboardingData.paymentRequestId);
      console.log('User Email:', onboardingData.userData.email);
      console.log('Expires At:', onboardingData.expiresAt);
    } else {
      console.log('❌ Invalid or expired onboarding token');
    }
  } catch (error) {
    console.error('❌ Error retrieving onboarding data:', error);
  } finally {
    await transferService.disconnect();
  }
}

// Example error handling patterns
async function demonstrateErrorHandling() {
  const transferService = new TransferService();

  try {
    console.log('\n=== Error Handling Examples ===');

    // Example 1: Invalid payment request
    const invalidResult = await transferService.handleUnregisteredUserAccess(
      'invalid-request-id',
      {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        country: 'US',
        currency: 'USD',
      }
    );

    console.log('Invalid request result:', {
      success: invalidResult.success,
      error: invalidResult.error,
    });

    // Example 2: Expired onboarding token
    const expiredResult = await transferService.completeOnboardingAndProcessPayment(
      'expired-token-123'
    );

    console.log('Expired token result:', {
      success: expiredResult.success,
      error: expiredResult.error,
    });

    // Example 3: Missing sender ID for user-to-user transfer
    const missingSenderResult = await transferService.createUserToUserTransfer({
      recipientId: 'user-456',
      amount: 100,
      currency: 'USD',
    });

    console.log('Missing sender result:', {
      success: missingSenderResult.success,
      error: missingSenderResult.error,
    });

  } catch (error) {
    console.error('❌ Error in error handling demonstration:', error);
  } finally {
    await transferService.disconnect();
  }
}

// Export functions for potential use in other examples or tests
export {
  demonstrateUnregisteredUserFlow,
  demonstrateOnboardingFlowRetrieval,
  demonstrateErrorHandling,
};

// Run demonstrations if this file is executed directly
if (require.main === module) {
  (async () => {
    await demonstrateUnregisteredUserFlow();
    await demonstrateOnboardingFlowRetrieval();
    await demonstrateErrorHandling();
  })();
}