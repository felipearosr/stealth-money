/**
 * Test script for CLP-to-CLP transfer API endpoint
 */

import express from 'express';
import request from 'supertest';
import transfersController from './routes/transfers.controller';

async function testCLPAPI() {
  console.log('🧪 Testing CLP-to-CLP transfer API endpoint...\n');

  // Create test app
  const app = express();
  app.use(express.json());
  app.use('/api', transfersController);

  try {
    // Test 1: Basic CLP-to-CLP calculation
    console.log('Test 1: Basic CLP-to-CLP calculation');
    const response1 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 10000,
        sendCurrency: 'CLP',
        receiveCurrency: 'CLP'
      });

    console.log('Status:', response1.status);
    if (response1.status === 200) {
      console.log('Send Amount:', response1.body.sendAmount, 'CLP');
      console.log('Receive Amount:', response1.body.receiveAmount, 'CLP');
      console.log('Exchange Rate:', response1.body.exchangeRate);
      console.log('Total Fees:', response1.body.fees, 'CLP');
      console.log('Fee Breakdown:', response1.body.breakdown.fees);
    } else {
      console.log('Error:', response1.body);
    }
    console.log('');

    // Test 2: Larger amount
    console.log('Test 2: Larger CLP-to-CLP calculation (100,000 CLP)');
    const response2 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100000,
        sendCurrency: 'CLP',
        receiveCurrency: 'CLP'
      });

    console.log('Status:', response2.status);
    if (response2.status === 200) {
      console.log('Send Amount:', response2.body.sendAmount, 'CLP');
      console.log('Receive Amount:', response2.body.receiveAmount, 'CLP');
      console.log('Exchange Rate:', response2.body.exchangeRate);
      console.log('Total Fees:', response2.body.fees, 'CLP');
    } else {
      console.log('Error:', response2.body);
    }
    console.log('');

    // Test 3: Minimum amount validation
    console.log('Test 3: Below minimum amount (500 CLP)');
    const response3 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 500,
        sendCurrency: 'CLP',
        receiveCurrency: 'CLP'
      });

    console.log('Status:', response3.status);
    console.log('Response:', response3.body);
    console.log('');

    // Test 4: Maximum amount validation
    console.log('Test 4: Above maximum amount (50M CLP)');
    const response4 = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 50000000,
        sendCurrency: 'CLP',
        receiveCurrency: 'CLP'
      });

    console.log('Status:', response4.status);
    console.log('Response:', response4.body);
    console.log('');

    console.log('✅ All CLP API tests completed!');

  } catch (error) {
    console.error('❌ Error testing CLP API:', error);
    process.exit(1);
  }
}

// Run the test
testCLPAPI();