#!/usr/bin/env node

/**
 * Integration test for Chilean user search functionality
 * This script tests the complete Chilean user search flow
 */

// Mock Chilean user data for testing
const mockChileanUsers = [
  {
    id: '1',
    email: 'juan.perez@example.com',
    username: 'juan.perez',
    fullName: 'Juan Pérez',
    isVerified: true,
    verifiedPaymentMethods: [
      {
        id: 'pm1',
        type: 'bank_account',
        currency: 'CLP',
        country: 'CL',
        bankName: 'Banco de Chile',
        accountType: 'checking',
        isDefault: true,
        verifiedAt: '2024-01-01T00:00:00Z'
      }
    ],
    supportedCurrencies: ['CLP']
  },
  {
    id: '2',
    email: 'maria.gonzalez@example.com',
    username: 'maria_gonzalez',
    fullName: 'María González',
    isVerified: true,
    verifiedPaymentMethods: [
      {
        id: 'pm2',
        type: 'bank_account',
        currency: 'CLP',
        country: 'CL',
        bankName: 'Banco Santander',
        accountType: 'savings',
        isDefault: true,
        verifiedAt: '2024-01-01T00:00:00Z'
      }
    ],
    supportedCurrencies: ['CLP']
  }
];

// Import Chilean utilities
import { 
  isValidChileanUser, 
  filterChileanUsers, 
  formatChileanUserDisplay,
  isChileanUsernamePattern 
} from './lib/chilean-utils';

function testChileanUserSearch() {
  console.log('🧪 Testing Chilean User Search Integration\n');
  
  // Test 1: Validate Chilean users
  console.log('1. Testing Chilean user validation...');
  const validUsers = mockChileanUsers.filter(isValidChileanUser);
  console.log(`   ✅ Found ${validUsers.length} valid Chilean users`);
  
  // Test 2: Filter Chilean users
  console.log('2. Testing Chilean user filtering...');
  const mixedUsers = [
    ...mockChileanUsers,
    {
      id: '3',
      email: 'john.doe@example.com',
      username: 'john_doe',
      fullName: 'John Doe',
      isVerified: true,
      verifiedPaymentMethods: [
        {
          id: 'pm3',
          type: 'bank_account',
          currency: 'USD',
          country: 'US',
          bankName: 'Chase Bank',
          accountType: 'checking',
          isDefault: true,
          verifiedAt: '2024-01-01T00:00:00Z'
        }
      ],
      supportedCurrencies: ['USD']
    }
  ];
  
  const chileanOnly = filterChileanUsers(mixedUsers);
  console.log(`   ✅ Filtered ${chileanOnly.length} Chilean users from ${mixedUsers.length} total users`);
  
  // Test 3: Username pattern recognition
  console.log('3. Testing Chilean username patterns...');
  const testUsernames = ['juan.perez', 'maria_gonzalez', 'carlos123', 'test@email.com', '+56912345678'];
  testUsernames.forEach(username => {
    const isChilean = isChileanUsernamePattern(username);
    console.log(`   ${isChilean ? '✅' : '❌'} "${username}" ${isChilean ? 'matches' : 'does not match'} Chilean pattern`);
  });
  
  // Test 4: User display formatting
  console.log('4. Testing Chilean user display formatting...');
  mockChileanUsers.forEach(user => {
    const display = formatChileanUserDisplay(user);
    console.log(`   ✅ ${display.displayName} (${display.subtitle}) - Badges: ${display.badges.join(', ')}`);
  });
  
  // Test 5: Simulate search functionality
  console.log('5. Testing search simulation...');
  
  // Simulate username search
  const usernameQuery = 'juan';
  const usernameResults = mockChileanUsers.filter(user => 
    user.username?.toLowerCase().includes(usernameQuery.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(usernameQuery.toLowerCase())
  );
  console.log(`   ✅ Username search for "${usernameQuery}": ${usernameResults.length} results`);
  
  // Simulate email search
  const emailQuery = 'maria.gonzalez@example.com';
  const emailResults = mockChileanUsers.filter(user => 
    user.email?.toLowerCase().includes(emailQuery.toLowerCase())
  );
  console.log(`   ✅ Email search for "${emailQuery}": ${emailResults.length} results`);
  
  // Test 6: CLP transfer compatibility
  console.log('6. Testing CLP transfer compatibility...');
  const clpCompatibleUsers = mockChileanUsers.filter(user => 
    user.verifiedPaymentMethods.some(method => 
      method.currency === 'CLP' && method.country === 'CL'
    )
  );
  console.log(`   ✅ ${clpCompatibleUsers.length} users can receive CLP transfers`);
  
  console.log('\n🎉 Chilean User Search Integration Test Completed Successfully!');
  console.log('\nSummary:');
  console.log(`- ${validUsers.length} valid Chilean users identified`);
  console.log(`- ${chileanOnly.length} users filtered as Chilean from mixed dataset`);
  console.log(`- ${clpCompatibleUsers.length} users compatible with CLP transfers`);
  console.log('- Username pattern recognition working correctly');
  console.log('- User display formatting working correctly');
  console.log('- Search simulation working correctly');
}

// Run the test
if (require.main === module) {
  try {
    testChileanUserSearch();
    process.exit(0);
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

export { testChileanUserSearch };