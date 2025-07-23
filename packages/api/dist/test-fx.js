"use strict";
// Simple test script to verify API functionality
// Run with: npx ts-node src/test-fx.ts
Object.defineProperty(exports, "__esModule", { value: true });
const fx_service_1 = require("./services/fx.service");
const database_service_1 = require("./services/database.service");
async function testAPI() {
    console.log('🧪 Testing Stealth Money API...\n');
    // Test 1: Exchange Rate Service
    console.log('1️⃣ Testing Exchange Rate Service');
    try {
        const fxService = new fx_service_1.FxService();
        const rate = await fxService.getRate('USD', 'EUR');
        console.log(`✅ USD to EUR rate: ${rate}`);
    }
    catch (error) {
        console.log(`❌ Exchange rate test failed: ${error}`);
    }
    // Test 2: Database Service
    console.log('\n2️⃣ Testing Database Service');
    try {
        const dbService = new database_service_1.DatabaseService();
        // Create a test transaction
        const testTransaction = await dbService.createTransaction({
            amount: 100,
            sourceCurrency: 'USD',
            destCurrency: 'EUR',
            exchangeRate: 0.85,
            recipientAmount: 85
        });
        console.log(`✅ Test transaction created: ${testTransaction.id}`);
        // Update the transaction status
        await dbService.updateTransactionStatus(testTransaction.id, 'COMPLETED', {
            stripePaymentIntentId: 'test_payment_123'
        });
        console.log(`✅ Transaction status updated to COMPLETED`);
        // Retrieve the transaction
        const retrieved = await dbService.getTransactionById(testTransaction.id);
        console.log(`✅ Transaction retrieved: Status = ${retrieved?.status}`);
    }
    catch (error) {
        console.log(`❌ Database test failed: ${error}`);
    }
    // Test 3: API Endpoints
    console.log('\n3️⃣ Testing API Endpoints');
    try {
        const response = await fetch('http://localhost:4000/api/exchange-rate/USD/EUR');
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API endpoint working: ${data.from} to ${data.to} = ${data.rate}`);
        }
        else {
            console.log(`❌ API endpoint failed: ${response.status}`);
        }
    }
    catch (error) {
        console.log(`❌ API endpoint test failed: ${error}`);
        console.log('💡 Make sure the API server is running: npm run dev');
    }
    console.log('\n🎉 Test complete! Check results above.');
}
testAPI().catch(console.error);
