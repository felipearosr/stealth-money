// Generate a test wallet for blockchain operations
// Run with: node scripts/generate-wallet.js

const { ethers } = require('ethers');

console.log('🔐 Generating test wallet for Stealth Money...\n');

// Generate a random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ Test Wallet Generated:');
console.log('📍 Address:', wallet.address);
console.log('🔑 Private Key:', wallet.privateKey);
console.log('🌱 Mnemonic:', wallet.mnemonic.phrase);

console.log('\n📋 Add this to your .env file:');
console.log(`SERVER_WALLET_PRIVATE_KEY=${wallet.privateKey}`);

console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('• This is a TEST wallet - only use on testnets');
console.log('• Never use this wallet on mainnet');
console.log('• Never commit private keys to version control');
console.log('• Fund this wallet with TEST ETH only');

console.log('\n💰 Get free test ETH:');
console.log('• Sepolia: https://sepoliafaucet.com');
console.log('• Enter address:', wallet.address);

console.log('\n🎯 Next steps:');
console.log('1. Add private key to .env file');
console.log('2. Get free test ETH from faucet');
console.log('3. Deploy smart contract to testnet');