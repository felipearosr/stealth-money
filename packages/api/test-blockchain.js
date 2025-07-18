#!/usr/bin/env node

/**
 * Simple test script for blockchain integration
 * Usage: node test-blockchain.js [mode]
 * 
 * Examples:
 *   node test-blockchain.js health    # Test blockchain health
 *   node test-blockchain.js balance   # Check contract balance
 *   node test-blockchain.js release   # Test fund release (mock transaction)
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

const API_URL = process.env.API_URL || 'http://localhost:4000';

async function makeRequest(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

async function testHealth() {
  console.log('🔍 Testing blockchain health...\n');
  
  const health = await makeRequest('/api/transfers/blockchain/health');
  
  console.log('📊 Blockchain Health Status:');
  console.log(`   Mode: ${health.mode}`);
  console.log(`   Connected: ${health.connected ? '✅' : '❌'}`);
  console.log(`   Network: ${health.network}`);
  console.log(`   Wallet: ${health.walletAddress}`);
  console.log(`   Contract: ${health.contractAddress}`);
  
  if (health.blockNumber) {
    console.log(`   Block Number: ${health.blockNumber}`);
  }
  
  if (health.walletBalance) {
    console.log(`   Wallet Balance: ${health.walletBalance} ETH`);
  }
  
  if (health.contractBalance) {
    console.log(`   Contract Balance: ${health.contractBalance} tokens`);
  }
}

async function testBalance() {
  console.log('💰 Testing contract balance...\n');
  
  const balance = await makeRequest('/api/transfers/blockchain/contract-balance');
  
  console.log('📊 Contract Balance:');
  console.log(`   Address: ${balance.contractAddress}`);
  console.log(`   Balance: ${balance.tokenBalance} tokens`);
  console.log(`   Timestamp: ${balance.timestamp}`);
}

async function testRelease() {
  console.log('🚀 Testing fund release with mock transaction...\n');
  
  // First create a mock transaction
  console.log('📝 Creating mock transaction...');
  const transfer = await makeRequest('/api/transfers', 'POST', {
    amount: 100,
    sourceCurrency: 'USD',
    destCurrency: 'USD',
    recipientName: 'Test Recipient',
    recipientEmail: 'test@example.com',
    recipientPhone: '+1234567890',
    payoutMethod: 'bank_account'
  });
  
  console.log(`   Transaction ID: ${transfer.transactionId}`);
  console.log(`   Status: ${transfer.status}`);
  
  // Test the orchestrator
  console.log('\n⚙️  Testing orchestrator...');
  const result = await makeRequest('/api/test-orchestrator', 'POST', {
    transactionId: transfer.transactionId
  });
  
  console.log('📊 Orchestrator Result:');
  console.log(`   Success: ${result.success ? '✅' : '❌'}`);
  console.log(`   Message: ${result.message}`);
  console.log(`   Transaction ID: ${result.transactionId}`);
  
  // Check final transaction status
  console.log('\n🔍 Checking final transaction status...');
  const finalStatus = await makeRequest(`/api/transfers/${transfer.transactionId}`);
  
  console.log('📊 Final Transaction Status:');
  console.log(`   Status: ${finalStatus.status}`);
  console.log(`   Amount: ${finalStatus.amount} ${finalStatus.sourceCurrency}`);
  console.log(`   Recipient: ${finalStatus.recipientAmount} ${finalStatus.destCurrency}`);
  
  if (finalStatus.blockchainTxHash) {
    console.log(`   Blockchain TX: ${finalStatus.blockchainTxHash}`);
  }
}

async function showUsage() {
  console.log('🧪 Blockchain Integration Test Script\n');
  console.log('Usage: node test-blockchain.js [command]\n');
  console.log('Commands:');
  console.log('  health    Test blockchain connection and health');
  console.log('  balance   Check smart contract token balance');
  console.log('  release   Test complete fund release flow');
  console.log('  help      Show this help message\n');
  console.log('Examples:');
  console.log('  node test-blockchain.js health');
  console.log('  node test-blockchain.js balance');
  console.log('  node test-blockchain.js release');
}

async function main() {
  const command = process.argv[2] || 'help';
  
  console.log(`🔗 API URL: ${API_URL}`);
  console.log(`🧪 Blockchain Mode: ${process.env.BLOCKCHAIN_MODE || 'mock'}\n`);
  
  switch (command.toLowerCase()) {
    case 'health':
      await testHealth();
      break;
    case 'balance':
      await testBalance();
      break;
    case 'release':
      await testRelease();
      break;
    case 'help':
    default:
      await showUsage();
      break;
  }
}

// Add fetch polyfill for Node.js < 18
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

main().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});