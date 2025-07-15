// src/test-fx.ts
// Test script to demonstrate FxService functionality

import { MockFxService } from './services/fx.service.mock';

async function testFxService() {
  const fxService = new MockFxService();

  console.log('🧪 Testing FxService...\n');

  try {
    // Test various currency pairs
    const testPairs = [
      ['USD', 'EUR'],
      ['EUR', 'USD'],
      ['USD', 'GBP'],
      ['GBP', 'JPY'],
      ['USD', 'USD'], // Same currency
    ];

    for (const [from, to] of testPairs) {
      const rate = await fxService.getRate(from, to);
      console.log(`${from} → ${to}: ${rate}`);
      
      // Example conversion
      const amount = 100;
      const converted = amount * rate;
      console.log(`  ${amount} ${from} = ${converted.toFixed(2)} ${to}\n`);
    }

    // Test error case
    console.log('Testing unsupported currency pair...');
    try {
      await fxService.getRate('USD', 'XYZ');
    } catch (error) {
      console.log(`❌ Expected error: ${error.message}\n`);
    }

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFxService();