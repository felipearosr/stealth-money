# Blockchain Integration Guide

This guide explains how to set up and use the real blockchain integration with Sepolia testnet, while maintaining the ability to test in mock mode.

## Quick Start (Mock Mode)

By default, the system runs in **mock mode** for easy testing:

```bash
# In packages/api/.env
BLOCKCHAIN_MODE=mock
```

This allows you to test the entire payment flow without needing real blockchain setup.

## Real Blockchain Setup (Sepolia Testnet)

### Prerequisites

1. **Ethereum Wallet**: Create a test wallet for the server
2. **Infura/Alchemy Account**: Get RPC node access
3. **Sepolia ETH**: Get test ETH for gas fees
4. **Contract Deployment**: Deploy the TransferManager contract

### Step 1: Create Test Wallet

```bash
# Generate a new wallet (save the private key securely!)
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
"
```

### Step 2: Get Sepolia ETH

Visit these faucets to get test ETH:
- https://sepoliafaucet.com/
- https://sepolia-faucet.pk910.de/
- https://www.alchemy.com/faucets/ethereum-sepolia

You'll need at least 0.01 ETH for deployment and transactions.

### Step 3: Get RPC Node Access

**Option A: Infura**
1. Go to https://infura.io/
2. Create account and new project
3. Copy the Sepolia endpoint: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

**Option B: Alchemy**
1. Go to https://alchemy.com/
2. Create account and new app
3. Copy the Sepolia endpoint

### Step 4: Deploy Smart Contracts

```bash
cd packages/contracts

# Install dependencies
npm install

# Set up environment (copy from API package)
cp ../api/.env.example .env
# Edit .env with your values:
# NODE_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# SERVER_WALLET_PRIVATE_KEY=0x...your_private_key

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

The deployment will output your contract address. Copy it for the next step.

### Step 5: Configure API

Update `packages/api/.env`:

```bash
# Switch to real blockchain mode
BLOCKCHAIN_MODE=real
BLOCKCHAIN_NETWORK=sepolia

# Your configuration
SERVER_WALLET_PRIVATE_KEY=0x...your_private_key
NODE_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
TRANSFER_MANAGER_CONTRACT_ADDRESS=0x...deployed_contract_address
```

### Step 6: Test the Integration

```bash
# Test blockchain connection
curl http://localhost:4000/api/transfers/blockchain/health

# Should return:
{
  "connected": true,
  "mode": "real",
  "network": "sepolia",
  "walletAddress": "0x...",
  "contractAddress": "0x...",
  "blockNumber": 12345,
  "walletBalance": "0.05",
  "contractBalance": "0.0"
}
```

## Testing Both Modes

### Mock Mode Testing
```bash
# Set in .env
BLOCKCHAIN_MODE=mock

# All blockchain operations will be simulated
# Perfect for development and CI/CD
```

### Real Mode Testing
```bash
# Set in .env
BLOCKCHAIN_MODE=real

# All blockchain operations use real Sepolia testnet
# Perfect for integration testing
```

## API Endpoints for Testing

### Health Check
```bash
GET /api/transfers/blockchain/health
```

### Contract Balance
```bash
GET /api/transfers/blockchain/contract-balance
```

### Test Orchestrator
```bash
POST /api/test-orchestrator
{
  "transactionId": "your_transaction_id"
}
```

## Transaction Flow

1. **Payment Confirmed** → Stripe webhook triggers orchestrator
2. **Processing** → Transaction status updated to PROCESSING
3. **Blockchain Release** → `releaseFunds()` called on smart contract
4. **Confirmation Wait** → Wait for blockchain confirmation
5. **Complete** → Status updated to FUNDS_SENT_TO_PARTNER

## Error Handling

The system handles various blockchain errors:

- **Insufficient Gas**: Automatically estimates and adds 20% buffer
- **Network Issues**: Retries with exponential backoff
- **Transaction Failures**: Detailed error messages and status updates
- **Confirmation Timeouts**: 5-minute timeout with proper error handling

## Monitoring

### Transaction Status
- `PENDING_PAYMENT`: Waiting for Stripe payment
- `PAID`: Payment confirmed, ready for processing
- `PROCESSING`: Blockchain transaction initiated
- `FUNDS_SENT_TO_PARTNER`: Blockchain confirmed, funds released
- `FAILED`: Error occurred, manual intervention needed

### Logs
The system provides detailed logging:
```
🔗 Releasing funds on blockchain...
   Recipient: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
   Amount: 850000000
   Transaction ID: clx1234567890
⛽ Estimating gas...
   Estimated gas: 65000
   Gas limit: 78000
   Gas price: 20.5 gwei
📤 Sending transaction...
   Transaction sent: 0xabc123...
⏳ Waiting for confirmation...
✅ Transaction confirmed!
   Block number: 4567890
   Gas used: 64521
   Confirmations: 1
```

## Security Considerations

1. **Private Key Security**: Never commit private keys to version control
2. **Environment Variables**: Use secure environment variable management
3. **Network Security**: Use HTTPS for all RPC connections
4. **Access Control**: Only authorized services can call release functions
5. **Gas Limits**: Proper gas estimation prevents stuck transactions

## Troubleshooting

### Common Issues

**"Blockchain service not properly initialized"**
- Check your .env configuration
- Verify RPC URL is accessible
- Ensure private key is valid

**"Insufficient funds for gas"**
- Add more Sepolia ETH to your wallet
- Check current gas prices

**"Transaction failed on blockchain"**
- Check contract has sufficient token balance
- Verify recipient address is valid
- Review transaction logs for specific error

**"Contract not found"**
- Verify contract address is correct
- Ensure contract is deployed on the right network

### Debug Mode

Enable detailed logging:
```bash
# In .env
DEBUG=blockchain:*
```

This will show detailed blockchain interaction logs.

## Production Considerations

For production deployment:

1. **Use Mainnet**: Deploy contracts to Ethereum mainnet
2. **Real USDC**: Use actual USDC contract address
3. **Secure Key Management**: Use AWS KMS or similar for private keys
4. **Monitoring**: Set up alerts for failed transactions
5. **Backup Systems**: Have manual intervention procedures
6. **Gas Optimization**: Monitor and optimize gas usage

## Support

If you encounter issues:

1. Check the logs for detailed error messages
2. Verify your configuration matches this guide
3. Test with mock mode first to isolate blockchain issues
4. Check Sepolia network status and gas prices