#!/usr/bin/env ts-node

/**
 * Test script to verify Chilean bank account integration
 */

import { HybridVerificationService, VerificationRequest } from './services/hybrid-verification.service';
// Note: RUT validation would be imported from the web package in a real scenario
// For this test, we'll create simple mock functions
function validateRUT(rut: string): boolean {
  // Simple mock validation - in real implementation this would be more robust
  return rut.includes('-') && rut.length >= 9;
}

function formatRUT(rut: string): string {
  // Simple mock formatting
  return rut.replace(/\./g, '').replace(/(\d{1,2})(\d{3})(\d{3})(\w{1})/, '$1.$2.$3-$4');
}

async function testChileanIntegration() {
  console.log('🇨🇱 Testing Chilean Bank Account Integration...\n');

  // Test 1: RUT Validation
  console.log('1. Testing RUT Validation:');
  const testRuts = [
    '12345678-9',
    '11.111.111-1',
    '22222222-2',
    'invalid-rut'
  ];

  for (const rut of testRuts) {
    try {
      const isValid = validateRUT(rut);
      const formatted = formatRUT(rut);
      console.log(`   RUT: ${rut} -> Valid: ${isValid}, Formatted: ${formatted}`);
    } catch (error) {
      console.log(`   RUT: ${rut} -> Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test 2: Hybrid Verification Service for Chile
  console.log('\n2. Testing Chilean Microdeposit Verification:');
  const hybridService = new HybridVerificationService();

  const chileanVerificationRequest: VerificationRequest = {
    bankAccount: {
      id: 'test-account-123',
      accountNumber: '1234567890',
      country: 'CL',
      currency: 'CLP',
      accountHolderName: 'Juan Pérez',
      bankName: 'Banco de Chile',
      rut: '12.345.678-9',
      bankCode: '001',
      chileanAccountNumber: '1234567890'
    },
    userId: 'test-user-123',
    metadata: {
      testMode: true
    }
  };

  try {
    const verificationResponse = await hybridService.startVerification(chileanVerificationRequest);
    console.log('   ✅ Chilean verification initiated successfully:');
    console.log(`   - Provider: ${verificationResponse.provider}`);
    console.log(`   - Method: ${verificationResponse.method}`);
    console.log(`   - Cost: $${verificationResponse.cost}`);
    console.log(`   - Estimated Time: ${verificationResponse.estimatedTime.min}-${verificationResponse.estimatedTime.max} ${verificationResponse.estimatedTime.unit}`);
    console.log(`   - Instructions: ${verificationResponse.instructions}`);
  } catch (error) {
    console.log(`   ❌ Chilean verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 3: Cost Estimate for Chile
  console.log('\n3. Testing Cost Estimate for Chile:');
  try {
    const costEstimate = await hybridService.getCostEstimate('CL');
    console.log('   ✅ Chilean cost estimate:');
    console.log(`   - Provider: ${costEstimate.provider}`);
    console.log(`   - Cost: $${costEstimate.cost}`);
    console.log(`   - Method: ${costEstimate.method}`);
    console.log(`   - Estimated Time: ${costEstimate.estimatedTime}`);
  } catch (error) {
    console.log(`   ❌ Cost estimate failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 4: Supported Countries
  console.log('\n4. Testing Supported Countries:');
  try {
    const supportedCountries = hybridService.getSupportedCountries();
    if (supportedCountries['CL']) {
      console.log('   ✅ Chile is supported:');
      console.log(`   - Provider: ${supportedCountries['CL'].provider}`);
      console.log(`   - Cost: $${supportedCountries['CL'].cost}`);
      console.log(`   - Method: ${supportedCountries['CL'].method}`);
    } else {
      console.log('   ❌ Chile is not in supported countries list');
    }
  } catch (error) {
    console.log(`   ❌ Supported countries check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log('\n🎉 Chilean integration test completed!');
}

// Run the test
testChileanIntegration().catch(console.error);