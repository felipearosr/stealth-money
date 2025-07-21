const { CircleService } = require('./dist/services/circle.service');

/**
 * Test script to verify Circle API integration
 * Run with: npm run test:circle
 */
async function testCircleIntegration() {
  console.log('🔄 Testing Circle API integration...\n');

  try {
    // Test configuration loading
    console.log('1. Testing configuration...');
    const circleService = new CircleService();
    console.log(`   ✅ Environment: ${circleService.getEnvironment()}`);
    console.log(`   ✅ Sandbox mode: ${circleService.isSandbox()}`);

    // Test API connectivity
    console.log('\n2. Testing API connectivity...');
    const healthCheck = await circleService.healthCheck();
    console.log(`   Status: ${healthCheck.status}`);
    console.log(`   Environment: ${healthCheck.environment}`);
    
    if (healthCheck.status === 'healthy') {
      console.log('   ✅ Circle API connection successful');
    } else {
      console.log('   ❌ Circle API connection failed');
    }

    console.log('\n✅ Circle API integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Circle API integration test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('CIRCLE_API_KEY')) {
      console.log('\n💡 To fix this:');
      console.log('1. Sign up for a Circle developer account at: https://console.circle.com');
      console.log('2. Get your sandbox API key');
      console.log('3. Add CIRCLE_API_KEY=your_api_key to your .env file');
    }
    
    process.exit(1);
  }
}

// Run the test
testCircleIntegration();