# 🔗 Real Blockchain Integration Setup

This document provides a complete guide for setting up real blockchain integration with Sepolia testnet while maintaining mock mode for testing.

## 🚀 Quick Start

### Option 1: Mock Mode (Recommended for Development)
```bash
cd packages/api
npm run blockchain:mock
npm run test:blockchain:health
```

### Option 2: Real Blockchain Mode
```bash
cd packages/api
npm run blockchain:real
# Follow setup guide below
npm run test:blockchain:health
```

## 📋 What's Been Implemented

### ✅ Enhanced Blockchain Service
- **Dual Mode Support**: Seamlessly switch between real and mock blockchain
- **Real Sepolia Integration**: Connect to actual Ethereum testnet
- **Smart Contract Integration**: Full TransferManager contract support
- **Error Handling**: Comprehensive error handling and retry logic
- **Gas Optimization**: Automatic gas estimation with 20% buffer
- **Transaction Confirmation**: Wait for blockchain confirmations
- **Health Monitoring**: Real-time blockchain connection status

### ✅ Smart Contracts
- **TransferManager.sol**: Escrow contract for fund management
- **MockERC20.sol**: Test token for local development
- **Deployment Scripts**: Automated deployment to Sepolia
- **TypeScript Integration**: Full type safety with TypeChain

### ✅ Orchestrator Updates
- **Blockchain Confirmation Waiting**: Wait for required confirmations
- **Enhanced Error Handling**: Detailed error messages and status updates
- **Transaction Monitoring**: Real-time transaction status tracking
- **Dual Mode Support**: Works with both real and mock blockchain

### ✅ Testing & Utilities
- **Test Scripts**: Comprehensive blockchain testing utilities
- **Setup Scripts**: Easy mode switching between real/mock
- **Health Checks**: Monitor blockchain connection status
- **Integration Tests**: End-to-end transaction flow testing

## 🛠️ Setup Instructions

### Prerequisites
1. Node.js 18+ installed
2. Git repository access
3. Basic understanding of Ethereum/blockchain concepts

### Step 1: Install Dependencies
```bash
# Install API dependencies
cd packages/api
npm install

# Install contract dependencies
cd ../contracts
npm install
```

### Step 2: Choose Your Mode

#### Mock Mode (Easy Setup)
```bash
cd packages/api
npm run blockchain:mock
npm run test:blockchain:health
```

#### Real Mode (Advanced Setup)
Follow the detailed guide in `packages/api/BLOCKCHAIN_INTEGRATION_GUIDE.md`

### Step 3: Test the Integration
```bash
# Test blockchain health
npm run test:blockchain:health

# Test contract balance
npm run test:blockchain:balance

# Test complete flow
npm run test:blockchain:release
```

## 🔧 Available Commands

### Blockchain Setup
```bash
npm run blockchain:setup      # Interactive setup
npm run blockchain:mock       # Switch to mock mode
npm run blockchain:real       # Switch to real mode
npm run blockchain:status     # Check current configuration
```

### Testing
```bash
npm run test:blockchain              # Show test options
npm run test:blockchain:health       # Test connection
npm run test:blockchain:balance      # Check balances
npm run test:blockchain:release      # Test fund release
```

### Contract Deployment
```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network sepolia
```

## 📊 Transaction Flow

```
1. Payment Confirmed (Stripe) 
   ↓
2. Status: PROCESSING
   ↓
3. Blockchain Release
   ├── Mock Mode: Simulate (2s delay)
   └── Real Mode: Actual transaction
   ↓
4. Wait for Confirmation
   ├── Mock Mode: Instant
   └── Real Mode: 1+ confirmations
   ↓
5. Status: FUNDS_SENT_TO_PARTNER
```

## 🔍 Monitoring & Debugging

### Health Check Endpoint
```bash
curl http://localhost:4000/api/transfers/blockchain/health
```

### Response Example (Mock Mode)
```json
{
  "connected": true,
  "mode": "mock",
  "network": "mock",
  "walletAddress": "0x0000000000000000000000000000000000000000",
  "contractAddress": "0x0000000000000000000000000000000000000000",
  "blockNumber": 18234567,
  "walletBalance": "0.05",
  "contractBalance": "1000.0"
}
```

### Response Example (Real Mode)
```json
{
  "connected": true,
  "mode": "real",
  "network": "sepolia",
  "walletAddress": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "contractAddress": "0x1234567890123456789012345678901234567890",
  "blockNumber": 4567890,
  "walletBalance": "0.05",
  "contractBalance": "0.0"
}
```

## 🚨 Error Handling

The system handles various scenarios:

### Common Errors
- **Insufficient Gas**: Automatically estimated with buffer
- **Network Issues**: Retry with exponential backoff
- **Transaction Failures**: Detailed error messages
- **Configuration Issues**: Clear setup instructions

### Transaction Status
- `PENDING_PAYMENT`: Waiting for Stripe payment
- `PAID`: Payment confirmed, ready for processing  
- `PROCESSING`: Blockchain transaction initiated
- `FUNDS_SENT_TO_PARTNER`: Blockchain confirmed
- `FAILED`: Error occurred, manual intervention needed

## 🔐 Security Features

### Mock Mode Security
- No real funds at risk
- Safe for development/testing
- Realistic simulation without blockchain costs

### Real Mode Security
- Private key environment variables only
- Gas limit protection
- Transaction confirmation waiting
- Comprehensive error handling
- Audit trail in database

## 📈 Performance Considerations

### Mock Mode
- ⚡ Instant responses
- 🔄 2-second simulated delays
- 💰 No gas costs
- 🧪 Perfect for CI/CD

### Real Mode
- ⏱️ 15-30 second transactions
- ⛽ Real gas costs (~$0.50-2.00)
- 🔗 Network dependent
- 📊 Real blockchain data

## 🎯 Next Steps

1. **Test in Mock Mode**: Verify complete flow works
2. **Deploy to Sepolia**: Follow real mode setup guide
3. **Integration Testing**: Test with real blockchain
4. **Production Planning**: Consider mainnet deployment

## 📚 Additional Resources

- `packages/api/BLOCKCHAIN_INTEGRATION_GUIDE.md` - Detailed setup guide
- `packages/contracts/README.md` - Smart contract documentation
- Sepolia Faucet: https://sepoliafaucet.com/
- Infura: https://infura.io/
- Etherscan Sepolia: https://sepolia.etherscan.io/

## 🆘 Support

If you encounter issues:

1. Check `npm run blockchain:status`
2. Review logs for error messages
3. Test with mock mode first
4. Verify configuration matches guides
5. Check network connectivity and gas prices

---

**Ready to test?** Run `npm run test:blockchain:health` to get started! 🚀