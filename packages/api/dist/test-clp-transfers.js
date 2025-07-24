"use strict";
/**
 * Test script for CLP-to-CLP transfer calculations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const fx_service_1 = require("./services/fx.service");
const currency_config_service_1 = require("./services/currency-config.service");
async function testCLPTransfers() {
    console.log('🧪 Testing CLP-to-CLP transfer calculations...\n');
    const fxService = new fx_service_1.FXService();
    try {
        // Test 1: Basic CLP-to-CLP transfer
        console.log('Test 1: Basic CLP-to-CLP transfer (10,000 CLP)');
        const result1 = await fxService.calculateTransfer({
            sendAmount: 10000,
            sendCurrency: 'CLP',
            receiveCurrency: 'CLP'
        });
        console.log('Send Amount:', result1.sendAmount, 'CLP');
        console.log('Receive Amount:', result1.receiveAmount, 'CLP');
        console.log('Exchange Rate:', result1.exchangeRate);
        console.log('Total Fees:', result1.fees.total, 'CLP');
        console.log('Fee Breakdown:');
        console.log('  - Card Processing:', result1.fees.cardProcessing, 'CLP');
        console.log('  - Transfer Fee:', result1.fees.transfer, 'CLP');
        console.log('  - Payout Fee:', result1.fees.payout, 'CLP');
        console.log('Estimated Arrival:', result1.estimatedArrival);
        console.log('');
        // Test 2: Larger CLP-to-CLP transfer
        console.log('Test 2: Larger CLP-to-CLP transfer (100,000 CLP)');
        const result2 = await fxService.calculateTransfer({
            sendAmount: 100000,
            sendCurrency: 'CLP',
            receiveCurrency: 'CLP'
        });
        console.log('Send Amount:', result2.sendAmount, 'CLP');
        console.log('Receive Amount:', result2.receiveAmount, 'CLP');
        console.log('Exchange Rate:', result2.exchangeRate);
        console.log('Total Fees:', result2.fees.total, 'CLP');
        console.log('Fee Breakdown:');
        console.log('  - Card Processing:', result2.fees.cardProcessing, 'CLP');
        console.log('  - Transfer Fee:', result2.fees.transfer, 'CLP');
        console.log('  - Payout Fee:', result2.fees.payout, 'CLP');
        console.log('');
        // Test 3: Currency pair validation
        console.log('Test 3: Currency pair validation');
        const validation1 = currency_config_service_1.CurrencyConfigService.validateCurrencyPair('CLP', 'CLP', 10000);
        console.log('CLP-to-CLP validation (10,000 CLP):', validation1 || 'Valid');
        const validation2 = currency_config_service_1.CurrencyConfigService.validateCurrencyPair('CLP', 'CLP', 500);
        console.log('CLP-to-CLP validation (500 CLP - below minimum):', validation2 || 'Valid');
        const validation3 = currency_config_service_1.CurrencyConfigService.validateCurrencyPair('CLP', 'CLP', 50000000);
        console.log('CLP-to-CLP validation (50M CLP - above maximum):', validation3 || 'Valid');
        console.log('');
        // Test 4: Currency pair configuration
        console.log('Test 4: Currency pair configuration');
        const pairConfig = currency_config_service_1.CurrencyConfigService.getCurrencyPair('CLP', 'CLP');
        if (pairConfig) {
            console.log('CLP-to-CLP pair supported:', pairConfig.isSupported);
            console.log('Min amount:', pairConfig.minAmount, 'CLP');
            console.log('Max amount:', pairConfig.maxAmount, 'CLP');
            console.log('Estimated arrival:', pairConfig.estimatedArrival);
        }
        else {
            console.log('CLP-to-CLP pair not found');
        }
        console.log('');
        // Test 5: Send/Receive currency support
        console.log('Test 5: Currency support checks');
        console.log('CLP supported as send currency:', currency_config_service_1.CurrencyConfigService.isSendCurrencySupported('CLP'));
        console.log('CLP supported as receive currency:', currency_config_service_1.CurrencyConfigService.isReceiveCurrencySupported('CLP'));
        console.log('CLP-to-CLP pair supported:', currency_config_service_1.CurrencyConfigService.isCurrencyPairSupported('CLP', 'CLP'));
        console.log('');
        console.log('✅ All CLP transfer tests completed successfully!');
    }
    catch (error) {
        console.error('❌ Error testing CLP transfers:', error);
        process.exit(1);
    }
}
// Run the test
testCLPTransfers();
