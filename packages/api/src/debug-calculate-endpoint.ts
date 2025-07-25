#!/usr/bin/env node

/**
 * Debug script to test the calculate endpoint and see what's causing the 500 errors
 */

import request from 'supertest';
import express from 'express';
import transfersController from './routes/transfers.controller';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', transfersController);

async function debugCalculateEndpoint() {
  console.log('🔍 Debugging Calculate Endpoint...\n');

  try {
    const response = await request(app)
      .post('/api/transfers/calculate')
      .send({
        sendAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR'
      });

    console.log('Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.body, null, 2));

    if (response.status !== 200) {
      console.log('\n❌ Error Response Details:');
      console.log('Error:', response.body.error);
      console.log('Message:', response.body.message);
      console.log('Details:', response.body.details);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run the debug
if (require.main === module) {
  debugCalculateEndpoint()
    .then(() => {
      console.log('\n✅ Debug completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Debug failed:', error);
      process.exit(1);
    });
}

export default debugCalculateEndpoint;