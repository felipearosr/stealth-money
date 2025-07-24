#!/usr/bin/env node

/**
 * 🇨🇱 Chilean Bank Account Flow - Complete Test
 * Tests the end-to-end flow from account creation to verification
 */

const API_URL = 'http://localhost:4000';

// Mock authentication token (in real testing, use Clerk token)
const MOCK_TOKEN = 'mock-test-token-for-user-123';

// Test data for Chilean account
const CHILEAN_ACCOUNT_DATA = {
  accountName: 'Mi Cuenta Banco de Chile',
  currency: 'CLP',
  country: 'CL',
  bankName: 'Banco de Chile',
  bankCode: '001',
  accountHolderName: 'Juan Carlos Pérez Morales',
  accountType: 'checking',
  isPrimary: true,
  rut: '12.345.678-9',
  accountNumber: '1234567890'
};

console.log('🇨🇱 Testing Chilean Bank Account Flow');
console.log('=====================================\n');

async function testFlow() {
  try {
    // Step 1: Test API Health
    console.log('📡 Step 1: Checking API Health...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ API Status: ${healthData.status}`);
    console.log('');

    // Step 2: Test Bank Account Creation
    console.log('🏦 Step 2: Creating Chilean Bank Account...');
    console.log('Data:', JSON.stringify(CHILEAN_ACCOUNT_DATA, null, 2));
    
    const createResponse = await fetch(`${API_URL}/api/users/me/bank-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOCK_TOKEN}`
      },
      body: JSON.stringify(CHILEAN_ACCOUNT_DATA)
    });

    console.log(`Response Status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      const accountData = await createResponse.json();
      console.log('✅ Account Created Successfully!');
      console.log(`   Account ID: ${accountData.id}`);
      console.log(`   Bank: ${accountData.bankName}`);
      console.log(`   Currency: ${accountData.currency}`);
      console.log(`   RUT: ${accountData.rut}`);
      console.log(`   Account Number: ${accountData.accountNumber}`);
      console.log(`   Verified: ${accountData.isVerified}`);
      console.log('');

      // Step 3: Test Account Retrieval
      console.log('📋 Step 3: Retrieving User Bank Accounts...');
      const getResponse = await fetch(`${API_URL}/api/users/me/bank-accounts`, {
        headers: {
          'Authorization': `Bearer ${MOCK_TOKEN}`
        }
      });

      if (getResponse.ok) {
        const response = await getResponse.json();
        const accounts = response.bankAccounts || response; // Handle both formats
        console.log(`✅ Retrieved ${accounts.length} account(s)`);
        
        accounts.forEach((acc, index) => {
          console.log(`   Account ${index + 1}:`);
          console.log(`     Name: ${acc.accountName}`);
          console.log(`     Bank: ${acc.bankName} (${acc.currency})`);
          console.log(`     Country: ${acc.country}`);
          console.log(`     Verified: ${acc.isVerified ? '✅' : '❌ Pending'}`);
          console.log(`     Primary: ${acc.isPrimary ? '⭐' : '  '}`);
        });
        console.log('');

        // Step 4: Test Verification Status
        console.log('🔍 Step 4: Testing Onboarding Status Logic...');
        const hasAccounts = accounts.length > 0;
        const hasVerifiedAccount = accounts.some(acc => acc.isVerified);
        
        console.log(`   Has accounts: ${hasAccounts ? '✅' : '❌'}`);
        console.log(`   Has verified: ${hasVerifiedAccount ? '✅' : '❌'}`);
        console.log(`   Needs onboarding: ${!hasVerifiedAccount ? '✅ Yes' : '❌ No'}`);
        console.log('');

        // Step 5: Success Summary
        console.log('🎉 Flow Test Results:');
        console.log('=====================');
        console.log(`✅ API Health Check: Passed`);
        console.log(`✅ Account Creation: Passed`);
        console.log(`✅ Account Retrieval: Passed`);
        console.log(`✅ Chilean RUT Field: ${accountData.rut}`);
        console.log(`✅ Bank Configuration: ${accountData.bankName} (${accountData.bankCode})`);
        console.log(`✅ Account Types: ${accountData.accountType}`);
        
        if (!hasVerifiedAccount) {
          console.log(`🔔 Next Step: Account verification required`);
          console.log(`   Frontend should show verification prompt`);
          console.log(`   OnboardingGate should block until verified`);
        }

      } else {
        const errorData = await getResponse.json();
        console.error('❌ Failed to retrieve accounts:', errorData);
      }

    } else {
      const errorData = await createResponse.json();
      console.error('❌ Failed to create account:', errorData);
      
      if (errorData.error && errorData.error.includes('unique constraint')) {
        console.log('');
        console.log('💡 Note: This might be because an account already exists.');
        console.log('   Try deleting existing test accounts or testing with a different user.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure the API server is running:');
      console.log('   cd /home/faros/stealth-money && npm run dev:api');
    }
  }
}

// Run the test
testFlow().then(() => {
  console.log('\n🏁 Test completed!');
}).catch(console.error);