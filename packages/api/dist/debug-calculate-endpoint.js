#!/usr/bin/env node
"use strict";
/**
 * Debug script to test the calculate endpoint and see what's causing the 500 errors
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const transfers_controller_1 = __importDefault(require("./routes/transfers.controller"));
// Create test app
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api', transfers_controller_1.default);
async function debugCalculateEndpoint() {
    console.log('🔍 Debugging Calculate Endpoint...\n');
    try {
        const response = await (0, supertest_1.default)(app)
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
    }
    catch (error) {
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
exports.default = debugCalculateEndpoint;
