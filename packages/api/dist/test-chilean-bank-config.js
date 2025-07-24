#!/usr/bin/env ts-node
"use strict";
/**
 * Test script to verify Chilean bank configuration integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const bank_config_1 = require("../../web/src/lib/bank-config");
async function testChileanBankConfig() {
    console.log('🏦 Testing Chilean Bank Configuration...\n');
    // Test 1: Chilean Banking Config
    console.log('1. Testing Chilean Banking Configuration:');
    const chileanConfig = bank_config_1.COUNTRY_BANKING_CONFIGS['CL'];
    if (chileanConfig) {
        console.log('   ✅ Chilean configuration found:');
        console.log(`   - Country: ${chileanConfig.countryName} (${chileanConfig.countryCode})`);
        console.log(`   - Currency: ${chileanConfig.currency}`);
        console.log(`   - Flag: ${chileanConfig.flag}`);
        console.log(`   - Banks: ${chileanConfig.banks.length} banks configured`);
        console.log(`   - Account Types: ${chileanConfig.accountTypes.map(t => t.label).join(', ')}`);
        console.log(`   - Required Fields: ${chileanConfig.requiredFields.map(f => f.field).join(', ')}`);
    }
    else {
        console.log('   ❌ Chilean configuration not found');
        return;
    }
    // Test 2: Chilean Banks
    console.log('\n2. Testing Chilean Banks:');
    chileanConfig.banks.forEach((bank, index) => {
        console.log(`   ${index + 1}. ${bank.name} (Code: ${bank.code}, ID: ${bank.id})`);
    });
    // Test 3: Bank Code Lookup
    console.log('\n3. Testing Bank Code Lookup:');
    const testBankCodes = ['001', '012', '016', '037', '999'];
    for (const code of testBankCodes) {
        const bank = (0, bank_config_1.getBankByCode)('CL', code);
        if (bank) {
            console.log(`   ✅ Code ${code}: ${bank.name}`);
        }
        else {
            console.log(`   ❌ Code ${code}: Not found`);
        }
    }
    // Test 4: Required Fields Validation
    console.log('\n4. Testing Required Fields:');
    const requiredFields = chileanConfig.requiredFields;
    console.log('   Chilean accounts require:');
    requiredFields.forEach(field => {
        console.log(`   - ${field.label} (${field.field}): ${field.type} input`);
        if (field.placeholder)
            console.log(`     Placeholder: ${field.placeholder}`);
        if (field.validation)
            console.log(`     Validation: ${field.validation}`);
        if (field.maxLength)
            console.log(`     Max Length: ${field.maxLength}`);
    });
    // Test 5: Account Types
    console.log('\n5. Testing Account Types:');
    console.log('   Available account types for Chilean users:');
    chileanConfig.accountTypes.forEach(type => {
        console.log(`   - ${type.label} (${type.value})`);
    });
    console.log('\n🎉 Chilean bank configuration test completed!');
}
// Run the test
testChileanBankConfig().catch(console.error);
