# Stealth Money API

**Backend API for Mantle Hackathon Submission**

A comprehensive backend service that powers seamless international money transfers using the Mantle Network. This API abstracts blockchain complexity while providing secure, fast, and cost-effective cross-border payments.

## Overview

The API serves as the bridge between traditional payment systems and the Mantle Network, enabling users to send money internationally without understanding blockchain mechanics. It handles everything from exchange rate calculations to smart contract interactions.

## Key Features

**Mantle Network Integration:**
- Smart contract deployment and interaction on Mantle Network
- Optimized gas usage for cost-effective transactions
- Real-time blockchain status monitoring
- Automated fund escrow and release mechanisms

**Payment Processing:**
- Stripe integration for traditional payment methods
- Circle API for seamless fiat-to-crypto conversion
- Multi-currency support with real-time exchange rates
- Secure payment intent management

**Transfer Management:**
- End-to-end transfer orchestration
- Real-time status tracking and updates
- Comprehensive transaction logging
- Automated notification system

**Security & Compliance:**
- Bank-grade security measures
- PCI DSS compliance through Stripe
- Comprehensive audit logging
- Rate limiting and DDoS protection

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Supabase/Neon recommended)
- Stripe account with API keys
- Ethereum wallet and RPC provider (Infura/Alchemy)
- Deployed TransferManager smart contract

## 🛠️ Installation

1. **Install dependencies:**
```bash
cd packages/api
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Set up database:**
```bash
npm run db:migrate -- --name init
npm run db:generate
```

4. **Start development server:**
```bash
npm run dev
```

## ⚙️ Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=4000

# Foreign Exchange API
EXCHANGERATE_API_KEY=your_api_key_here

# Database
DATABASE_URL="postgresql://user:password@host:port/dbname"

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Blockchain Configuration
SERVER_WALLET_PRIVATE_KEY=your_server_wallet_private_key
NODE_PROVIDER_URL=your_infura_or_alchemy_url
TRANSFER_MANAGER_CONTRACT_ADDRESS=your_deployed_contract_address
```

## 📚 API Endpoints

### Transfer Operations

#### Create Transfer
```http
POST /api/transfers
Content-Type: application/json

{
  "amount": 100,
  "sourceCurrency": "USD",
  "destCurrency": "EUR"
}
```

**Response:**
```json
{
  "clientSecret": "pi_ABC123_secret_XYZ",
  "transactionId": "clx123abc",
  "rate": 0.85,
  "sourceAmount": 100,
  "recipientAmount": 85,
  "sourceCurrency": "USD",
  "destCurrency": "EUR",
  "status": "PENDING_PAYMENT",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

#### Get All Transfers
```http
GET /api/transfers
```

#### Get Transfer by ID
```http
GET /api/transfers/{id}
```

### Exchange Rates

#### Get Exchange Rate
```http
GET /api/exchange-rate/{from}/{to}
```

**Example:**
```http
GET /api/exchange-rate/USD/EUR
```

### Payment Operations

#### Get Stripe Configuration
```http
GET /api/stripe/config
```

#### Get Payment Intent Status
```http
GET /api/payments/{paymentIntentId}
```

#### Stripe Webhook
```http
POST /api/webhooks/stripe
Content-Type: application/json
Stripe-Signature: {signature}
```

### Blockchain Operations

#### Blockchain Health Check
```http
GET /api/blockchain/health
```

**Response:**
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

#### Contract Token Balance
```http
GET /api/blockchain/contract-balance
```

## Mantle Network Integration

### Why Mantle Network?

**Cost Efficiency:**
- Significantly lower gas fees compared to Ethereum mainnet
- Reduced operational costs passed to users
- Sustainable economics for micro-transactions

**Performance Benefits:**
- Fast transaction finality (2-3 seconds)
- High throughput for concurrent transfers
- Reliable network uptime and stability

**Developer Experience:**
- Full EVM compatibility for seamless integration
- Robust tooling and infrastructure support
- Active ecosystem and community

### Technical Implementation

**Smart Contract Architecture:**
```solidity
// TransferManager contract on Mantle Network
contract TransferManager {
    // Escrow funds securely until payment confirmation
    // Automated release upon successful payment
    // Gas-optimized operations for cost efficiency
}
```

**Network Configuration:**
```typescript
// Mantle Network connection
const mantleProvider = new ethers.JsonRpcProvider(MANTLE_RPC_URL);
const mantleWallet = new ethers.Wallet(PRIVATE_KEY, mantleProvider);

// Optimized gas settings for Mantle
const gasSettings = {
    gasLimit: 100000,  // Efficient contract calls
    gasPrice: ethers.parseUnits('0.001', 'gwei')  // Low Mantle fees
};
```

## Architecture

### Core Services

#### 1. MantleService (`src/services/mantle.service.ts`)
**Mantle Network Integration:**
- Direct connection to Mantle Network RPC
- Smart contract interaction for fund escrow
- Gas optimization for cost-effective transactions
- Real-time network status monitoring

#### 2. FxService (`src/services/fx.service.ts`)
**Exchange Rate Management:**
- Real-time currency conversion rates
- Multi-currency support (150+ currencies)
- Rate caching for performance optimization
- Fallback providers for reliability

#### 3. DatabaseService (`src/services/database.service.ts`)
**Transaction Management:**
- Comprehensive transaction logging
- Status tracking throughout transfer lifecycle
- Integration with Mantle Network transaction hashes
- Audit trail for compliance

#### 4. PaymentService (`src/services/payment.service.ts`)
**Payment Processing:**
- Stripe integration for traditional payments
- Circle API for crypto-fiat conversion
- Webhook handling for real-time updates
- Multi-payment method support

#### 5. OrchestrationService (`src/services/orchestrator.service.ts`)
**Transfer Orchestration:**
- End-to-end transfer coordination
- Automatic retry mechanisms
- Error handling and recovery
- Status notification system

### Database Schema

```prisma
model Transaction {
  id                    String   @id @default(cuid())
  amount                Float
  sourceCurrency        String
  destCurrency          String
  exchangeRate          Float
  recipientAmount       Float
  status                String   @default("PENDING")
  stripePaymentIntentId String?  @unique
  blockchainTxHash      String?  @unique
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

### Transaction Status Flow

1. **PENDING** - Initial transaction created
2. **PENDING_PAYMENT** - Stripe Payment Intent created
3. **PAID** - Payment confirmed via webhook
4. **PROCESSING** - Blockchain transaction initiated
5. **COMPLETED** - Funds released on blockchain
6. **FAILED** - Payment or blockchain transaction failed

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload

# Database
npm run db:migrate       # Run database migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio (database GUI)

# Testing
npm test                 # Run tests (when implemented)
```

## 🔒 Security Features

- **Environment Variable Protection** - Sensitive keys never committed
- **Webhook Signature Verification** - Validates Stripe webhook authenticity
- **Database Input Validation** - Zod schema validation for all inputs
- **Blockchain Transaction Signing** - Secure wallet management
- **CORS Configuration** - Proper cross-origin request handling

## 📖 Setup Guides

Detailed setup instructions are available in:

- [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) - PostgreSQL and Prisma configuration
- [`STRIPE_SETUP.md`](./STRIPE_SETUP.md) - Payment processing setup
- [`BLOCKCHAIN_SETUP.md`](./BLOCKCHAIN_SETUP.md) - Web3 integration guide

## 🧪 Testing

### Test Exchange Rates
```bash
curl http://localhost:4000/api/exchange-rate/USD/EUR
```

### Test Transfer Creation
```bash
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "sourceCurrency": "USD", "destCurrency": "EUR"}'
```

### Test Blockchain Connection
```bash
curl http://localhost:4000/api/blockchain/health
```

## 🚨 Error Handling

The API includes comprehensive error handling:

- **Validation Errors** - 400 status with detailed field errors
- **Service Errors** - 500 status with error messages
- **Rate Limiting** - Built-in protection against abuse
- **Webhook Failures** - Proper error responses for Stripe

## 📊 Monitoring

Key metrics to monitor:

- **Transaction Success Rate** - Percentage of completed transfers
- **Payment Failures** - Failed Stripe payments
- **Blockchain Errors** - Failed smart contract interactions
- **API Response Times** - Performance monitoring
- **Wallet Balance** - Server wallet ETH balance for gas fees

## 🔄 Deployment

### Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Configure production database
- [ ] Set up HTTPS for webhooks
- [ ] Deploy smart contract to mainnet
- [ ] Configure monitoring and alerting
- [ ] Set up proper logging
- [ ] Test with small amounts first

### Environment Variables for Production

Ensure all environment variables are properly set in your production environment, especially:

- Use `sk_live_` and `pk_live_` Stripe keys
- Production database connection string
- Mainnet RPC provider URL
- Production smart contract address

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:

1. Check the setup guides in this directory
2. Review the API endpoint documentation
3. Test with the provided curl examples
4. Check logs for detailed error messages

---

**Built with:** Node.js, Express, TypeScript, Prisma, Stripe, Ethers.js, PostgreSQL