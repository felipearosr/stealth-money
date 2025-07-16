"use strict";
// Simple test script to verify API functionality
// Run with: npx ts-node src/test-fx.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fx_service_1 = require("./services/fx.service");
const database_service_1 = require("./services/database.service");
function testAPI() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('🧪 Testing Stealth Money API...\n');
        // Test 1: Exchange Rate Service
        console.log('1️⃣ Testing Exchange Rate Service');
        try {
            const fxService = new fx_service_1.FxService();
            const rate = yield fxService.getRate('USD', 'EUR');
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
            const testTransaction = yield dbService.createTransaction({
                amount: 100,
                sourceCurrency: 'USD',
                destCurrency: 'EUR',
                exchangeRate: 0.85,
                recipientAmount: 85
            });
            console.log(`✅ Test transaction created: ${testTransaction.id}`);
            // Update the transaction status
            yield dbService.updateTransactionStatus(testTransaction.id, 'COMPLETED', {
                paymentId: 'test_payment_123'
            });
            console.log(`✅ Transaction status updated to COMPLETED`);
            // Retrieve the transaction
            const retrieved = yield dbService.getTransaction(testTransaction.id);
            console.log(`✅ Transaction retrieved: Status = ${retrieved === null || retrieved === void 0 ? void 0 : retrieved.status}`);
        }
        catch (error) {
            console.log(`❌ Database test failed: ${error}`);
        }
        // Test 3: API Endpoints
        console.log('\n3️⃣ Testing API Endpoints');
        try {
            const response = yield fetch('http://localhost:4000/api/exchange-rate/USD/EUR');
            if (response.ok) {
                const data = yield response.json();
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
    });
}
testAPI().catch(console.error);
