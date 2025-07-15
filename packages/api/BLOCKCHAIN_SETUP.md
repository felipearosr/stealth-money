# Blockchain Service Setup Guide

## Overview
The BlockchainService connects your API to your deployed TransferManager smart contract using Ethers.js. This service handles releasing funds from escrow after payment confirmation.

## Prerequisites
1. **Deployed TransferManager Contract**: You need the contract address from your deployment
2. **Server Wallet**: A dedicated wallet with some ETH for gas fees
3. **RPC Provider**: Access to an Ethereum node (Infura, Alchemy, etc.)

## Setup Steps

### 1. Get RPC Provider Access
Choose one of these providers for blockchain access:

**Infura** (Recommended):
- Go to [infura.io](https://infura.io)
- Create account and new project
- Copy your project URL (e.g., `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`)

**Alchemy**:
- Go to [alchemy.com](https://www.alchemy.com)
- Create account and new app
- Copy your HTTP URL

### 2. Create Server Wallet
```bash
# Generate a new wallet (save the private key securely!)
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
"
```

**⚠️ SECURITY WARNING**: 
- Never commit private keys to version control
- Store private keys in secure environment variables
- Fund this wallet with minimal ETH (just for gas fees)

### 3. Configure Environment Variables
Update your `.env` file:

```env
# Blockchain Configuration
SERVER_WALLET_PRIVATE_KEY=0x1234567890abcdef...  # Your server wallet private key
NODE_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID  # Your RPC URL
TRANSFER_MANAGER_CONTRACT_ADDRESS=0xYourContractAddress  # From contract deployment
```

### 4. Fund Your Server Wallet
Your server wallet needs ETH for gas fees:

**For Testnets**:
- Sepolia: [sepoliafaucet.com](https://sepoliafaucet.com)
- Goerli: [goerlifaucet.com](https://goerlifaucet.com)

**For Mainnet**:
- Send a small amount of ETH (0.01-0.1 ETH should be sufficient)

## Testing the Integration

### 1. Health Check
Test blockchain connectivity:
```bash
curl http://localhost:4000/api/blockchain/health
```

Expected response:
```json
{
  "connected": true,
  "network": "sepolia",
  "walletAddress": "0x...",
  "contractAddress": "0x...",
  "blockNumber": 12345,
  "walletBalance": "0.05 ETH",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Contract Balance Check
Check your contract's token balance:
```bash
curl http://localhost:4000/api/blockchain/contract-balance
```

## Available Methods

The `BlockchainService` provides these methods:

- `releaseFunds(recipient, amount, transactionId)` - Release funds from escrow
- `getWalletBalance()` - Get server wallet ETH balance
- `getContractTokenBalance()` - Get contract's stablecoin balance
- `healthCheck()` - Verify blockchain connectivity

## Integration with Transfer Flow

The blockchain service integrates with your transfer process:

1. **User initiates transfer** → Database record created (PENDING)
2. **User pays via Stripe** → Payment confirmed
3. **API calls `releaseFunds()`** → Blockchain transaction sent
4. **Transaction confirmed** → Database updated (COMPLETED)

## Troubleshooting

### Common Issues:

**"Missing required blockchain environment variables"**
- Ensure all three env vars are set: `SERVER_WALLET_PRIVATE_KEY`, `NODE_PROVIDER_URL`, `TRANSFER_MANAGER_CONTRACT_ADDRESS`

**"Blockchain connection failed"**
- Check your RPC URL is correct and accessible
- Verify your Infura/Alchemy project is active

**"Insufficient funds for gas"**
- Your server wallet needs ETH for transaction fees
- Check balance with the health endpoint

**"Contract call failed"**
- Verify contract address is correct
- Ensure your wallet is the contract owner (for release function)
- Check if contract has sufficient token balance

## Security Best Practices

1. **Environment Variables**: Never hardcode private keys
2. **Wallet Management**: Use a dedicated server wallet with minimal funds
3. **Access Control**: Ensure only your API can call release functions
4. **Monitoring**: Set up alerts for wallet balance and failed transactions
5. **Backup**: Securely backup your server wallet private key

## Next Steps

Once blockchain service is working:
1. Integrate with Stripe payment confirmation
2. Add transaction status updates to database
3. Implement proper error handling and retries
4. Set up monitoring and alerting