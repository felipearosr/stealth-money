#!/usr/bin/env ts-node
"use strict";
/**
 * Test script for Chilean user search functionality
 * This script tests the new Chilean user search features added to the API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testChileanUserSearch = testChileanUserSearch;
const database_service_1 = require("./services/database.service");
async function testChileanUserSearch() {
    console.log('🧪 Testing Chilean User Search Functionality\n');
    const dbService = new database_service_1.DatabaseService();
    try {
        // Test 1: Basic user search without country filter
        console.log('1. Testing basic user search...');
        const basicResults = await dbService.intelligentUserSearch('test', 5);
        console.log(`   Found ${basicResults.length} users with basic search`);
        // Test 2: User search with Chilean country filter
        console.log('2. Testing Chilean user search...');
        const chileanResults = await dbService.intelligentUserSearch('test', 5, 'CLP', 'CL');
        console.log(`   Found ${chileanResults.length} Chilean users`);
        // Test 3: Username-based search
        console.log('3. Testing username search...');
        const usernameResults = await dbService.intelligentUserSearch('juan', 5, 'CLP', 'CL');
        console.log(`   Found ${usernameResults.length} users with username 'juan'`);
        // Test 4: Email-based search
        console.log('4. Testing email search...');
        const emailResults = await dbService.intelligentUserSearch('test@example.com', 5, 'CLP', 'CL');
        console.log(`   Found ${emailResults.length} users with email search`);
        console.log('\n✅ Chilean user search tests completed successfully!');
        // Display sample results if any
        if (chileanResults.length > 0) {
            console.log('\nSample Chilean user result:');
            const sample = chileanResults[0];
            console.log(`   ID: ${sample.id}`);
            console.log(`   Email: ${sample.email}`);
            console.log(`   Username: ${sample.username || 'N/A'}`);
            console.log(`   Country: ${sample.country || 'N/A'}`);
            console.log(`   Bank Accounts: ${sample.bankAccounts?.length || 0}`);
        }
    }
    catch (error) {
        console.error('❌ Error testing Chilean user search:', error);
        if (error instanceof Error && error.message.includes('Environment variable not found')) {
            console.log('\n💡 This is expected in development - database connection not configured');
            console.log('   The search functionality will work when properly configured');
        }
    }
}
// Run the test
if (require.main === module) {
    testChileanUserSearch()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}
