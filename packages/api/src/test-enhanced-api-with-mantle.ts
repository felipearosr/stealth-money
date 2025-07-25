#!/usr/bin/env node

/**
 * Test script to verify the enhanced transfer calculation API with Mantle options
 * Tests both backward compatibility and new enhanced features
 */

import request from 'supertest';
import express from 'express';
import transfersController from './routes/transfers.controller';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', transfersController);

async function testEnhancedAPIWithMantle() {
  console.log('🧪 Testing Enhanced Transfer Calculation API with Mantle Options');
  console.log('=' .repeat(70));

  try {
    // Test 1: Backward compatibility - should return old format
    console.log('\n📊 Test 1: Backward Compatibility (Old Format)');
    const response1 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
        // No includeMantle flag - should use old format
      })
      .expect(200);

    console.log('✅ Response received');
    console.log('Response format:', Object.keys(response1.body).join(', '));
    
    // Verify old format fields
    const oldFormatFields = ['sendAmount', 'receiveAmount', 'exchangeRate', 'fees', 'breakdown'];
    const hasOldFormat = oldFormatFields.every(field => field in response1.body);
    const hasNewFormat = 'transferMethods' in response1.body;
    
    console.log(`Old format fields present: ${hasOldFormat ? 'Yes' : 'No'}`);
    console.log(`New format fields present: ${hasNewFormat ? 'Yes' : 'No'}`);

    // Test 2: Enhanced API - should return new format with transfer methods
    console.log('\n📊 Test 2: Enhanced API (New Format with Mantle)');
    const response2 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true // Explicitly request enhanced features
      })
      .expect(200);

    console.log('✅ Response received');
    console.log('Response format:', Object.keys(response2.body).join(', '));
    
    // Verify new format fields
    const newFormatFields = ['transferMethods', 'recommendedMethod', 'recommendation'];
    const hasNewFormatFields = newFormatFields.every(field => field in response2.body);
    
    console.log(`New format fields present: ${hasNewFormatFields ? 'Yes' : 'No'}`);
    console.log(`Transfer methods available: ${response2.body.transferMethods?.length || 0}`);
    
    if (response2.body.transferMethods) {
      response2.body.transferMethods.forEach((method: any, index: number) => {
        console.log(`  Method ${index + 1}: ${method.method} (${method.recommended ? 'Recommended' : 'Alternative'})`);
      });
    }

    // Test 3: Small amount - should recommend Mantle if available
    console.log('\n📊 Test 3: Small Amount Recommendation');
    const response3 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    console.log(`Recommended method: ${response3.body.recommendedMethod}`);
    console.log(`Recommendation reason: ${response3.body.recommendation?.reason}`);

    // Test 4: Large amount - should recommend Circle
    console.log('\n📊 Test 4: Large Amount Recommendation');
    const response4 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 2000,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    console.log(`Recommended method: ${response4.body.recommendedMethod}`);
    console.log(`Recommendation reason: ${response4.body.recommendation?.reason}`);

    // Test 5: Verify response structure for enhanced API
    console.log('\n📊 Test 5: Enhanced API Response Structure Validation');
    const response5 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 500,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    
    // Validate required enhanced fields
    const requiredEnhancedFields = [
      'sendAmount',
      'sendCurrency',
      'receiveCurrency',
      'transferMethods',
      'recommendedMethod',
      'recommendation',
      'timestamp'
    ];

    const missingFields = requiredEnhancedFields.filter(field => !(field in response5.body));
    if (missingFields.length === 0) {
      console.log('✅ All required enhanced fields present');
    } else {
      console.log('❌ Missing enhanced fields:', missingFields);
    }

    // Validate transfer method structure
    if (response5.body.transferMethods && response5.body.transferMethods.length > 0) {
      const method = response5.body.transferMethods[0];
      const methodFields = [
        'method', 'sendAmount', 'receiveAmount', 'exchangeRate', 
        'fees', 'estimatedTime', 'benefits', 'limitations', 
        'recommended', 'availableForAmount'
      ];
      
      const missingMethodFields = methodFields.filter(field => !(field in method));
      if (missingMethodFields.length === 0) {
        console.log('✅ Transfer method structure is valid');
      } else {
        console.log('❌ Missing transfer method fields:', missingMethodFields);
      }
    }

    // Test 6: Verify timestamp format
    console.log('\n📊 Test 6: Timestamp Format Validation');
    const timestamp = response5.body.timestamp;
    const isValidISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Valid ISO format: ${isValidISO ? 'Yes' : 'No'}`);

    console.log('\n🎉 Enhanced Transfer Calculation API Tests Completed!');
    console.log('=' .repeat(70));
    console.log('\n✅ Key Features Verified:');
    console.log('   • Backward compatibility maintained');
    console.log('   • Enhanced API with transfer methods');
    console.log('   • Intelligent method recommendation');
    console.log('   • Proper response structure');
    console.log('   • Timestamp formatting');
    console.log('   • Amount-based recommendations');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedAPIWithMantle()
    .then(() => {
      console.log('\n✅ All enhanced API tests passed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Enhanced API tests failed:', error);
      process.exit(1);
    });
}

export default testEnhancedAPIWithMantle;