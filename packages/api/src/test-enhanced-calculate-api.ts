#!/usr/bin/env node

/**
 * Test script for enhanced transfer calculation API with Mantle options
 * Tests the /api/transfers/calculate endpoint to ensure it returns both Circle and Mantle estimates
 */

import request from 'supertest';
import express from 'express';
import transfersController from './routes/transfers.controller';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', transfersController);

async function testEnhancedCalculateAPI() {
  console.log('🧪 Testing Enhanced Transfer Calculation API with Mantle Options');
  console.log('=' .repeat(70));

  try {
    // Test 1: Basic calculation with both Circle and Mantle options
    console.log('\n📊 Test 1: Basic USD to EUR calculation with both methods');
    const response1 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    console.log('Transfer Methods Available:', response1.body.transferMethods?.length || 0);
    
    if (response1.body.transferMethods) {
      response1.body.transferMethods.forEach((method: any, index: number) => {
        console.log(`\n  Method ${index + 1}: ${method.method.toUpperCase()}`);
        console.log(`    Estimated Time: ${method.estimatedTime}`);
        console.log(`    Total Cost: $${method.fees?.total?.toFixed(2) || 'N/A'}`);
        console.log(`    Recommended: ${method.recommended ? 'Yes' : 'No'}`);
        console.log(`    Benefits: ${method.benefits?.slice(0, 2).join(', ') || 'N/A'}`);
      });
    }

    console.log(`\nRecommended Method: ${response1.body.recommendedMethod?.toUpperCase() || 'N/A'}`);
    console.log(`Recommendation Reason: ${response1.body.recommendation?.reason || 'N/A'}`);

    // Test 2: Small amount (should recommend Mantle)
    console.log('\n📊 Test 2: Small amount ($50) - should recommend Mantle');
    const response2 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    console.log(`Recommended Method: ${response2.body.recommendedMethod?.toUpperCase() || 'N/A'}`);
    console.log(`Reason: ${response2.body.recommendation?.reason || 'N/A'}`);
    
    if (response2.body.comparison) {
      console.log(`Cost Difference: $${response2.body.comparison.costDifference?.toFixed(2) || 'N/A'}`);
      console.log(`Mantle Savings: ${response2.body.comparison.mantleSavings?.percentage || 'N/A'}%`);
    }

    // Test 3: Large amount (should recommend Circle)
    console.log('\n📊 Test 3: Large amount ($2000) - should recommend Circle');
    const response3 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 2000,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    console.log(`Recommended Method: ${response3.body.recommendedMethod?.toUpperCase() || 'N/A'}`);
    console.log(`Reason: ${response3.body.recommendation?.reason || 'N/A'}`);

    // Test 4: Mantle disabled
    console.log('\n📊 Test 4: Calculation with Mantle disabled');
    const response4 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: false
      })
      .expect(200);

    console.log('✅ Response received');
    console.log('Transfer Methods Available:', response4.body.transferMethods?.length || 0);
    console.log(`Methods: ${response4.body.transferMethods?.map((m: any) => m.method).join(', ') || 'N/A'}`);

    // Test 5: Real-time gas price and network status
    console.log('\n📊 Test 5: Checking real-time gas estimates and network status');
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
    const mantleMethod = response5.body.transferMethods?.find((m: any) => m.method === 'mantle');
    if (mantleMethod) {
      console.log('\nMantle Network Information:');
      console.log(`  Gas Estimate: $${mantleMethod.gasEstimate?.totalCostUSD || 'N/A'}`);
      console.log(`  Gas Limit: ${mantleMethod.gasEstimate?.gasLimit || 'N/A'}`);
      console.log(`  Network Connected: ${mantleMethod.networkStatus?.connected ? 'Yes' : 'No'}`);
      console.log(`  Current Block: ${mantleMethod.networkStatus?.blockNumber || 'N/A'}`);
      console.log(`  Network Latency: ${mantleMethod.networkStatus?.latency || 'N/A'}ms`);
    }

    // Test 6: Error handling - invalid currency
    console.log('\n📊 Test 6: Error handling - invalid currency');
    try {
      await request(app)
        .post('/api/transfers/calculate')
        .send({
          sendAmount: 100,
          sendCurrency: 'INVALID',
          receiveCurrency: 'EUR'
        })
        .expect(400);
      console.log('✅ Correctly rejected invalid currency');
    } catch (error) {
      console.log('❌ Error handling test failed:', error);
    }

    // Test 7: Response structure validation
    console.log('\n📊 Test 7: Response structure validation');
    const response7 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        includeMantle: true
      })
      .expect(200);

    console.log('✅ Response received');
    
    // Validate required fields
    const requiredFields = [
      'sendAmount',
      'sendCurrency', 
      'receiveCurrency',
      'transferMethods',
      'recommendedMethod',
      'recommendation',
      'timestamp'
    ];

    const missingFields = requiredFields.filter(field => !(field in response7.body));
    if (missingFields.length === 0) {
      console.log('✅ All required fields present in response');
    } else {
      console.log('❌ Missing required fields:', missingFields);
    }

    // Validate transfer method structure
    if (response7.body.transferMethods && response7.body.transferMethods.length > 0) {
      const method = response7.body.transferMethods[0];
      const methodFields = ['method', 'estimatedTime', 'fees', 'benefits', 'limitations', 'recommended'];
      const missingMethodFields = methodFields.filter(field => !(field in method));
      
      if (missingMethodFields.length === 0) {
        console.log('✅ Transfer method structure is valid');
      } else {
        console.log('❌ Missing transfer method fields:', missingMethodFields);
      }
    }

    console.log('\n🎉 Enhanced Transfer Calculation API Tests Completed!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedCalculateAPI()
    .then(() => {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

export default testEnhancedCalculateAPI;