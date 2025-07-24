/**
 * Chilean Integration Test
 * This file contains integration tests for the Chilean onboarding requirements
 */

import { validateRUT, formatRUT, isValidChileanUser } from '@/lib/chilean-utils';

// Test data for Chilean integration
const testData = {
  validRUTs: [
    '12.345.678-5',
    '11.111.111-1',
    '22.222.222-2',
    '9.876.543-3',
    '1.234.567-4'
  ],
  invalidRUTs: [
    '12.345.678-9', // Wrong verification digit
    '123.456.789-0', // Too many digits
    '123.456-7', // Too few digits
    '12.345.678-X', // Invalid verification digit
    '', // Empty
    'not-a-rut' // Invalid format
  ],
  chileanBankAccounts: [
    {
      id: '1',
      currency: 'CLP',
      country: 'CL',
      isVerified: true,
      isActive: true,
      bankName: 'Banco de Chile',
      accountNumber: '1234567890',
      rut: '12.345.678-5'
    },
    {
      id: '2',
      currency: 'CLP',
      country: 'CL',
      isVerified: false,
      isActive: true,
      bankName: 'BancoEstado',
      accountNumber: '0987654321',
      rut: '11.111.111-1'
    }
  ],
  nonChileanBankAccounts: [
    {
      id: '3',
      currency: 'USD',
      country: 'US',
      isVerified: true,
      isActive: true,
      bankName: 'Bank of America',
      accountNumber: '1234567890',
      routingNumber: '123456789'
    }
  ]
};

/**
 * Test Chilean RUT validation
 */
export function testChileanRUTValidation(): boolean {
  console.log('Testing Chilean RUT validation...');
  
  // Test valid RUTs
  for (const rut of testData.validRUTs) {
    if (!validateRUT(rut)) {
      console.error(`Valid RUT failed validation: ${rut}`);
      return false;
    }
  }
  
  // Test invalid RUTs
  for (const rut of testData.invalidRUTs) {
    if (validateRUT(rut)) {
      console.error(`Invalid RUT passed validation: ${rut}`);
      return false;
    }
  }
  
  console.log('✅ Chilean RUT validation tests passed');
  return true;
}

/**
 * Test Chilean RUT formatting
 */
export function testChileanRUTFormatting(): boolean {
  console.log('Testing Chilean RUT formatting...');
  
  const testCases = [
    { input: '123456785', expected: '12.345.678-5' },
    { input: '111111111', expected: '11.111.111-1' },
    { input: '98765433', expected: '9.876.543-3' },
    { input: '12345674', expected: '1.234.567-4' }
  ];
  
  for (const testCase of testCases) {
    const formatted = formatRUT(testCase.input);
    if (formatted !== testCase.expected) {
      console.error(`RUT formatting failed: ${testCase.input} -> ${formatted}, expected: ${testCase.expected}`);
      return false;
    }
  }
  
  console.log('✅ Chilean RUT formatting tests passed');
  return true;
}

/**
 * Test Chilean user validation
 */
export function testChileanUserValidation(): boolean {
  console.log('Testing Chilean user validation...');
  
  // Test user with verified Chilean account
  const validChileanUser = {
    id: '1',
    username: 'juan.perez',
    verifiedPaymentMethods: [testData.chileanBankAccounts[0]]
  };
  
  if (!isValidChileanUser(validChileanUser)) {
    console.error('Valid Chilean user failed validation');
    return false;
  }
  
  // Test user with unverified Chilean account
  const unverifiedChileanUser = {
    id: '2',
    username: 'maria.gonzalez',
    verifiedPaymentMethods: [testData.chileanBankAccounts[1]]
  };
  
  if (isValidChileanUser(unverifiedChileanUser)) {
    console.error('Unverified Chilean user passed validation');
    return false;
  }
  
  // Test user with only non-Chilean accounts
  const nonChileanUser = {
    id: '3',
    username: 'john.doe',
    verifiedPaymentMethods: [testData.nonChileanBankAccounts[0]]
  };
  
  if (isValidChileanUser(nonChileanUser)) {
    console.error('Non-Chilean user passed validation');
    return false;
  }
  
  console.log('✅ Chilean user validation tests passed');
  return true;
}

/**
 * Test Chilean onboarding requirements
 */
export function testChileanOnboardingRequirements(): boolean {
  console.log('Testing Chilean onboarding requirements...');
  
  // Simulate different account scenarios
  const scenarios = [
    {
      name: 'No accounts',
      accounts: [],
      shouldRequireOnboarding: true
    },
    {
      name: 'Verified Chilean account',
      accounts: [testData.chileanBankAccounts[0]],
      shouldRequireOnboarding: false
    },
    {
      name: 'Unverified Chilean account',
      accounts: [testData.chileanBankAccounts[1]],
      shouldRequireOnboarding: true
    },
    {
      name: 'Verified non-Chilean account',
      accounts: [testData.nonChileanBankAccounts[0]],
      shouldRequireOnboarding: true
    },
    {
      name: 'Mixed accounts (verified US, unverified Chilean)',
      accounts: [testData.nonChileanBankAccounts[0], testData.chileanBankAccounts[1]],
      shouldRequireOnboarding: true
    },
    {
      name: 'Mixed accounts (verified US, verified Chilean)',
      accounts: [testData.nonChileanBankAccounts[0], testData.chileanBankAccounts[0]],
      shouldRequireOnboarding: false
    }
  ];
  
  for (const scenario of scenarios) {
    const hasVerifiedChileanAccount = scenario.accounts.some(acc => 
      acc.isVerified && acc.country === 'CL' && acc.currency === 'CLP'
    );
    
    const requiresOnboarding = !hasVerifiedChileanAccount;
    
    if (requiresOnboarding !== scenario.shouldRequireOnboarding) {
      console.error(`Scenario "${scenario.name}" failed: expected ${scenario.shouldRequireOnboarding}, got ${requiresOnboarding}`);
      return false;
    }
  }
  
  console.log('✅ Chilean onboarding requirements tests passed');
  return true;
}

/**
 * Run all Chilean integration tests
 */
export function runChileanIntegrationTests(): boolean {
  console.log('🇨🇱 Running Chilean Integration Tests...\n');
  
  const tests = [
    testChileanRUTValidation,
    testChileanRUTFormatting,
    testChileanUserValidation,
    testChileanOnboardingRequirements
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      if (!test()) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`Test failed with error:`, error);
      allPassed = false;
    }
    console.log(''); // Add spacing between tests
  }
  
  if (allPassed) {
    console.log('🎉 All Chilean integration tests passed!');
  } else {
    console.log('❌ Some Chilean integration tests failed');
  }
  
  return allPassed;
}

// Export test data for use in other tests
export { testData };

// Run tests if this file is executed directly
if (typeof window !== 'undefined' && (window as { runChileanTests?: boolean }).runChileanTests) {
  runChileanIntegrationTests();
}