"use strict";
/**
 * Test script to verify Mantle L2 configuration and basic service functionality
 * Run with: npm run ts-node src/test-mantle-setup.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const mantle_service_1 = require("./services/mantle.service");
const mantle_config_1 = require("./config/mantle.config");
async function testMantleSetup() {
    console.log('🧪 Testing Mantle L2 Setup...\n');
    try {
        // Test 1: Configuration
        console.log('1. Testing Configuration...');
        const config = mantle_config_1.mantleConfig.getConfig();
        console.log(`   Environment: ${config.environment}`);
        console.log(`   Network ID: ${config.networkId}`);
        console.log(`   RPC URL: ${config.rpcUrl}`);
        console.log(`   Enabled: ${config.enabled}`);
        console.log(`   Native Token: ${config.nativeToken}`);
        console.log(`   Stablecoin Address: ${config.stablecoinAddress || 'Not configured'}`);
        console.log(`   Bridge Address: ${config.bridgeContractAddress || 'Not configured'}`);
        console.log('   ✅ Configuration loaded successfully\n');
        // Test 2: Service Initialization
        console.log('2. Testing Service Initialization...');
        const mantleService = new mantle_service_1.MantleService();
        // Wait for initialization to complete
        await mantleService.waitForInitialization();
        console.log(`   Service enabled: ${mantleService.isEnabled()}`);
        console.log('   ✅ Service initialized successfully\n');
        // Test 3: Health Check
        console.log('3. Testing Health Check...');
        const healthStatus = await mantleService.healthCheck();
        console.log(`   Connected: ${healthStatus.connected}`);
        console.log(`   Environment: ${healthStatus.environment}`);
        console.log(`   Network ID: ${healthStatus.networkId}`);
        console.log(`   RPC URL: ${healthStatus.rpcUrl}`);
        if (healthStatus.connected) {
            console.log(`   Block Number: ${healthStatus.blockNumber}`);
            console.log(`   Gas Price: ${healthStatus.gasPrice}`);
            console.log(`   Latency: ${healthStatus.latency}ms`);
        }
        if (healthStatus.error) {
            console.log(`   Error: ${healthStatus.error}`);
        }
        console.log('   ✅ Health check completed\n');
        // Test 4: Network Status (only if enabled and connected)
        if (mantleService.isEnabled() && healthStatus.connected) {
            console.log('4. Testing Network Status...');
            const networkStatus = await mantleService.getCurrentNetworkStatus();
            console.log(`   Connected: ${networkStatus.connected}`);
            console.log(`   Block Number: ${networkStatus.blockNumber}`);
            console.log(`   Gas Price: ${networkStatus.gasPrice} wei`);
            console.log(`   Network ID: ${networkStatus.networkId}`);
            console.log(`   Latency: ${networkStatus.latency}ms`);
            console.log('   ✅ Network status retrieved successfully\n');
            // Test 5: Gas Estimation
            console.log('5. Testing Gas Estimation...');
            const gasEstimate = await mantleService.estimateGasCost(100, 'USD');
            console.log(`   Gas Limit: ${gasEstimate.gasLimit}`);
            console.log(`   Gas Price: ${gasEstimate.gasPrice} wei`);
            console.log(`   Total Cost: ${gasEstimate.totalCost} MNT`);
            console.log(`   Total Cost USD: $${gasEstimate.totalCostUSD}`);
            console.log('   ✅ Gas estimation completed successfully\n');
            // Test 6: Wallet Creation
            console.log('6. Testing Wallet Creation...');
            const testUserId = 'test_user_' + Date.now();
            const wallet = await mantleService.createWallet(testUserId);
            console.log(`   Wallet ID: ${wallet.wallet.id}`);
            console.log(`   Address: ${wallet.wallet.address}`);
            console.log(`   User ID: ${wallet.wallet.userId}`);
            console.log(`   Created At: ${wallet.wallet.createdAt}`);
            console.log('   ✅ Wallet created successfully\n');
            // Test 7: Wallet Balance Check
            console.log('7. Testing Wallet Balance Check...');
            const balance = await mantleService.getWalletBalance(wallet.wallet.address);
            console.log(`   Address: ${balance.address}`);
            console.log(`   Native Balance: ${balance.native} MNT`);
            console.log(`   Stablecoin Balance: ${balance.stablecoin} USDC`);
            console.log('   ✅ Wallet balance retrieved successfully\n');
        }
        else {
            console.log('4-7. Skipping network-dependent tests (service disabled or not connected)\n');
        }
        console.log('🎉 All Mantle L2 setup tests completed successfully!');
        // Summary
        console.log('\n📊 Summary:');
        console.log(`   Configuration: ✅ Loaded`);
        console.log(`   Service: ✅ Initialized`);
        console.log(`   Health Check: ✅ Completed`);
        console.log(`   Network Connection: ${healthStatus.connected ? '✅ Connected' : '❌ Not Connected'}`);
        if (mantleService.isEnabled()) {
            console.log(`   Service Status: ✅ Enabled and Ready`);
        }
        else {
            console.log(`   Service Status: ⚠️  Disabled (set MANTLE_ENABLED=true to enable)`);
        }
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
// Run the test
testMantleSetup().catch(console.error);
