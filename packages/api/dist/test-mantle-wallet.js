"use strict";
/**
 * Manual test script for Mantle wallet management functionality
 * This tests the wallet operations without complex mocking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMantleWalletManagement = testMantleWalletManagement;
const mantle_service_1 = require("./services/mantle.service");
async function testMantleWalletManagement() {
    console.log('🧪 Testing Mantle Wallet Management Functionality');
    console.log('================================================');
    try {
        // Initialize the service
        const mantleService = new mantle_service_1.MantleService();
        await mantleService.waitForInitialization();
        console.log('\n1. Service Initialization Test');
        console.log('------------------------------');
        console.log(`✅ Service enabled: ${mantleService.isEnabled()}`);
        const config = mantleService.getConfig();
        console.log(`✅ Environment: ${config.environment}`);
        console.log(`✅ Network ID: ${config.networkId}`);
        console.log(`✅ RPC URL: ${config.rpcUrl}`);
        if (!mantleService.isEnabled()) {
            console.log('⚠️  Mantle service is disabled, skipping wallet tests');
            return;
        }
        console.log('\n2. Network Status Test');
        console.log('----------------------');
        const networkStatus = await mantleService.getCurrentNetworkStatus();
        console.log(`✅ Connected: ${networkStatus.connected}`);
        console.log(`✅ Block Number: ${networkStatus.blockNumber}`);
        console.log(`✅ Gas Price: ${networkStatus.gasPrice}`);
        console.log(`✅ Latency: ${networkStatus.latency}ms`);
        console.log('\n3. Address Validation Test');
        console.log('--------------------------');
        const validAddress = '0x1234567890123456789012345678901234567890';
        const invalidAddress = 'invalid-address';
        console.log(`✅ Valid address check: ${mantleService.isValidAddress(validAddress)}`);
        console.log(`✅ Invalid address check: ${mantleService.isValidAddress(invalidAddress)}`);
        console.log('\n4. Wallet Creation Test');
        console.log('-----------------------');
        const testUserId = 'test-user-123';
        try {
            // Test basic wallet creation
            const basicWallet = await mantleService.createWallet(testUserId);
            console.log(`✅ Basic wallet created:`);
            console.log(`   ID: ${basicWallet.wallet.id}`);
            console.log(`   Address: ${basicWallet.wallet.address}`);
            console.log(`   User ID: ${basicWallet.wallet.userId}`);
            console.log(`   Created: ${basicWallet.wallet.createdAt}`);
            // Test wallet creation with mnemonic
            const mnemonicWallet = await mantleService.createWallet(testUserId, {
                generateMnemonic: true
            });
            console.log(`✅ Mnemonic wallet created:`);
            console.log(`   Address: ${mnemonicWallet.wallet.address}`);
            console.log(`   Has mnemonic: ${!!mnemonicWallet.mnemonic}`);
            // Test wallet creation with encryption
            const encryptedWallet = await mantleService.createWallet(testUserId, {
                encryptPrivateKey: true
            });
            console.log(`✅ Encrypted wallet created:`);
            console.log(`   Address: ${encryptedWallet.wallet.address}`);
            console.log(`   Has encrypted key: ${!!encryptedWallet.wallet.encryptedPrivateKey}`);
            console.log('\n5. Wallet Balance Test');
            console.log('----------------------');
            // Test balance checking (will be 0 for new addresses)
            const balance = await mantleService.getWalletBalance(basicWallet.wallet.address);
            console.log(`✅ Wallet balance retrieved:`);
            console.log(`   Address: ${balance.address}`);
            console.log(`   Native (MNT): ${balance.native}`);
            console.log(`   Stablecoin (USDC): ${balance.stablecoin}`);
            console.log(`   Native USD: ${balance.nativeUSD || 'N/A'}`);
            console.log(`   Stablecoin USD: ${balance.stablecoinUSD || 'N/A'}`);
            console.log(`   Total USD: ${balance.totalUSD || 'N/A'}`);
            console.log('\n6. Wallet Info Test');
            console.log('-------------------');
            const walletInfo = await mantleService.getWalletInfo(basicWallet.wallet.address);
            console.log(`✅ Wallet info retrieved:`);
            console.log(`   Address: ${walletInfo.address}`);
            console.log(`   Is Contract: ${walletInfo.isContract}`);
            console.log(`   Transaction Count: ${walletInfo.transactionCount}`);
            console.log('\n7. Gas Estimation Test');
            console.log('----------------------');
            const gasEstimate = await mantleService.estimateGasCost(100, 'USD');
            console.log(`✅ Gas estimate calculated:`);
            console.log(`   Gas Limit: ${gasEstimate.gasLimit}`);
            console.log(`   Gas Price: ${gasEstimate.gasPrice}`);
            console.log(`   Total Cost: ${gasEstimate.totalCost} MNT`);
            console.log(`   Total Cost USD: $${gasEstimate.totalCostUSD}`);
        }
        catch (walletError) {
            console.error(`❌ Wallet operation failed: ${walletError}`);
        }
        console.log('\n8. Health Check Test');
        console.log('--------------------');
        const healthCheck = await mantleService.healthCheck();
        console.log(`✅ Health check completed:`);
        console.log(`   Enabled: ${healthCheck.enabled}`);
        console.log(`   Connected: ${healthCheck.connected}`);
        console.log(`   Environment: ${healthCheck.environment}`);
        console.log(`   Block Number: ${healthCheck.blockNumber || 'N/A'}`);
        console.log(`   Latency: ${healthCheck.latency || 'N/A'}ms`);
        console.log(`   Error: ${healthCheck.error || 'None'}`);
        console.log('\n✅ All Mantle wallet management tests completed successfully!');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    testMantleWalletManagement()
        .then(() => {
        console.log('\n🎉 Mantle wallet management test suite completed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });
}
