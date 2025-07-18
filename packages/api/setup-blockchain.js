#!/usr/bin/env node

/**
 * Simple setup script for blockchain mode switching
 * Usage: node setup-blockchain.js [mode]
 * 
 * Examples:
 *   node setup-blockchain.js mock    # Switch to mock mode
 *   node setup-blockchain.js real    # Switch to real mode
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '.env');

function updateEnvFile(mode) {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('❌ .env file not found. Please copy from .env.example first.');
    console.log('   cp .env.example .env');
    process.exit(1);
  }

  let envContent = fs.readFileSync(ENV_FILE, 'utf8');
  
  // Update BLOCKCHAIN_MODE
  if (envContent.includes('BLOCKCHAIN_MODE=')) {
    envContent = envContent.replace(/BLOCKCHAIN_MODE=.*/g, `BLOCKCHAIN_MODE=${mode}`);
  } else {
    envContent += `\nBLOCKCHAIN_MODE=${mode}\n`;
  }

  fs.writeFileSync(ENV_FILE, envContent);
  console.log(`✅ Blockchain mode set to: ${mode}`);
}

function showStatus() {
  if (!fs.existsSync(ENV_FILE)) {
    console.log('❌ .env file not found');
    return;
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const modeMatch = envContent.match(/BLOCKCHAIN_MODE=(.+)/);
  const currentMode = modeMatch ? modeMatch[1].trim() : 'not set';
  
  console.log('📊 Current Configuration:');
  console.log(`   Blockchain Mode: ${currentMode}`);
  
  if (currentMode === 'real') {
    const hasPrivateKey = envContent.includes('SERVER_WALLET_PRIVATE_KEY=') && 
                         !envContent.includes('SERVER_WALLET_PRIVATE_KEY=your_server_wallet_private_key');
    const hasNodeUrl = envContent.includes('NODE_PROVIDER_URL=') && 
                      !envContent.includes('NODE_PROVIDER_URL=your_infura_or_alchemy_url');
    const hasContract = envContent.includes('TRANSFER_MANAGER_CONTRACT_ADDRESS=') && 
                       !envContent.includes('TRANSFER_MANAGER_CONTRACT_ADDRESS=your_deployed_contract_address');
    
    console.log(`   Private Key: ${hasPrivateKey ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Node URL: ${hasNodeUrl ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Contract Address: ${hasContract ? '✅ Set' : '❌ Not set'}`);
    
    if (!hasPrivateKey || !hasNodeUrl || !hasContract) {
      console.log('\n⚠️  Real mode requires additional configuration.');
      console.log('   See BLOCKCHAIN_INTEGRATION_GUIDE.md for setup instructions.');
    }
  }
}

function showUsage() {
  console.log('🔧 Blockchain Setup Script\n');
  console.log('Usage: node setup-blockchain.js [command]\n');
  console.log('Commands:');
  console.log('  mock      Switch to mock mode (for testing)');
  console.log('  real      Switch to real blockchain mode');
  console.log('  status    Show current configuration');
  console.log('  help      Show this help message\n');
  console.log('Examples:');
  console.log('  node setup-blockchain.js mock');
  console.log('  node setup-blockchain.js real');
  console.log('  node setup-blockchain.js status');
}

function main() {
  const command = process.argv[2] || 'status';
  
  switch (command.toLowerCase()) {
    case 'mock':
      updateEnvFile('mock');
      console.log('\n🧪 Mock mode enabled:');
      console.log('   - All blockchain operations will be simulated');
      console.log('   - Perfect for development and testing');
      console.log('   - No real blockchain setup required');
      break;
      
    case 'real':
      updateEnvFile('real');
      console.log('\n🔗 Real mode enabled:');
      console.log('   - Blockchain operations will use Sepolia testnet');
      console.log('   - Requires proper configuration (see BLOCKCHAIN_INTEGRATION_GUIDE.md)');
      console.log('   - Make sure you have test ETH and deployed contracts');
      break;
      
    case 'status':
      showStatus();
      break;
      
    case 'help':
    default:
      showUsage();
      break;
  }
}

main();