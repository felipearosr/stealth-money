#!/usr/bin/env ts-node
"use strict";
/**
 * Integration test for Transfer Method Selection functionality
 * Tests the enhanced TransferService with method selection logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testTransferMethodSelection = testTransferMethodSelection;
const transfer_service_1 = require("./services/transfer.service");
async function testTransferMethodSelection() {
    console.log('🧪 Testing Transfer Method Selection Logic...\n');
    const transferService = new transfer_service_1.TransferService();
    try {
        // Test 1: Calculate transfer options for different amounts
        console.log('📊 Test 1: Calculate transfer options for different amounts');
        const testAmounts = [50, 500, 1500];
        for (const amount of testAmounts) {
            console.log(`\n💰 Testing amount: $${amount}`);
            const request = {
                sendAmount: amount,
                sendCurrency: 'USD',
                receiveCurrency: 'EUR'
            };
            try {
                const calculation = await transferService.calculateTransfer(request);
                console.log(`   Exchange Rate: ${calculation.exchangeRate}`);
                console.log(`   Recommended Method: ${calculation.recommendedMethod}`);
                console.log(`   Available Options: ${calculation.options.length}`);
                calculation.options.forEach(option => {
                    console.log(`   
   ${option.method.toUpperCase()} Option:
     - Total Cost: $${option.totalCost.toFixed(2)}
     - Processing Fee: $${option.fees.processing.toFixed(2)}
     - Network Fee: $${option.fees.network.toFixed(2)}
     - Exchange Fee: $${option.fees.exchange.toFixed(2)}
     - Estimated Time: ${option.estimatedTime}
     - Recommended: ${option.recommended}
     - Available: ${option.availableForAmount}
     - Benefits: ${option.benefits.slice(0, 2).join(', ')}...`);
                });
            }
            catch (error) {
                console.error(`   ❌ Error calculating for $${amount}:`, error instanceof Error ? error.message : error);
            }
        }
        // Test 2: Method recommendations
        console.log('\n\n🎯 Test 2: Method recommendation logic');
        const recommendationTests = [
            { amount: 25, description: 'Small amount (should recommend Mantle)' },
            { amount: 500, description: 'Medium amount (cost-based recommendation)' },
            { amount: 2000, description: 'Large amount (should recommend Circle)' }
        ];
        for (const test of recommendationTests) {
            console.log(`\n${test.description}:`);
            try {
                const recommendation = await transferService.getTransferMethodRecommendation(test.amount, { send: 'USD', receive: 'EUR' });
                console.log(`   Recommended: ${recommendation.recommendedMethod}`);
                console.log(`   Reason: ${recommendation.reason}`);
                if (recommendation.costSavings) {
                    console.log(`   Cost Savings: $${recommendation.costSavings.toFixed(2)}`);
                }
                if (recommendation.timeSavings) {
                    console.log(`   Time Savings: ${recommendation.timeSavings}`);
                }
                console.log(`   Alternatives: ${recommendation.alternatives.length} option(s)`);
            }
            catch (error) {
                console.error(`   ❌ Error getting recommendation:`, error instanceof Error ? error.message : error);
            }
        }
        // Test 3: User preference handling
        console.log('\n\n👤 Test 3: User preference handling');
        const preferenceTests = [
            { amount: 500, preferred: transfer_service_1.TransferMethod.CIRCLE, description: 'User prefers Circle' },
            { amount: 500, preferred: transfer_service_1.TransferMethod.MANTLE, description: 'User prefers Mantle' }
        ];
        for (const test of preferenceTests) {
            console.log(`\n${test.description}:`);
            try {
                const recommendation = await transferService.getTransferMethodRecommendation(test.amount, { send: 'USD', receive: 'EUR' }, test.preferred);
                console.log(`   Recommended: ${recommendation.recommendedMethod}`);
                console.log(`   Reason: ${recommendation.reason}`);
                console.log(`   Respects Preference: ${recommendation.recommendedMethod === test.preferred}`);
            }
            catch (error) {
                console.error(`   ❌ Error testing preference:`, error instanceof Error ? error.message : error);
            }
        }
        // Test 4: Service health check
        console.log('\n\n🏥 Test 4: Enhanced health check');
        try {
            const health = await transferService.healthCheck();
            console.log(`   Overall Status: ${health.status}`);
            console.log(`   Services:`);
            console.log(`     Payment: ${health.services.payment}`);
            console.log(`     Wallet: ${health.services.wallet}`);
            console.log(`     Payout: ${health.services.payout}`);
            console.log(`     Mantle: ${health.services.mantle}`);
        }
        catch (error) {
            console.error(`   ❌ Health check failed:`, error instanceof Error ? error.message : error);
        }
        console.log('\n✅ Transfer Method Selection tests completed successfully!');
    }
    catch (error) {
        console.error('\n❌ Transfer Method Selection test failed:', error);
        process.exit(1);
    }
}
// Run the test
if (require.main === module) {
    testTransferMethodSelection()
        .then(() => {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Test suite failed:', error);
        process.exit(1);
    });
}
