# Complete Testing Guide - No Real Money Required

## 🎯 Overview
This guide shows you how to test the entire Stealth Money system safely without using real money, real blockchain transactions, or live payment processing.

## 🧪 Test Environment Setup

### 1. Stripe Test Mode
Your Stripe account automatically comes with test mode enabled.

**Test API Keys (use these in `.env`):**
```env
STRIPE_SECRET_KEY=sk_test_51ABC123...  # Starts with sk_test_
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...  # Starts with pk_test_
```

**Test Card Numbers:**
```bash
# Success scenarios
4242424242424242  # Visa - Always succeeds
4000056655665556  # Visa (debit) - Always succeeds
5555555555554444  # Mastercard - Always succeeds

# Failure scenarios
4000000000000002  # Always declined
4000000000009995  # Insufficient funds
4000000000000069  # Expired card
4000000000000127  # Incorrect CVC

# Special scenarios
4000000000003220  # 3D Secure authentication required
4000002500003155  # Requires authentication (SCA)
```

**Test Details for All Cards:**
- **Expiry Date:** Any future date (e.g., 12/25, 01/26)
- **CVC:** Any 3-digit number (e.g., 123, 456)
- **ZIP Code:** Any valid ZIP (e.g., 12345, 90210)
- **Name:** Any name (e.g., "Test User")

### 2. Blockchain Testnet Setup

**Use Sepolia Testnet (Recommended):**
```env
# In your .env file
NODE_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

**Get Free Test ETH:**
1. Go to [Sepolia Faucet](https://sepoliafaucet.com)
2. Enter your wallet address
3. Receive free test ETH (usually 0.5 ETH)

**Deploy Contract to Testnet:**
```bash
cd packages/contracts
# Make sure hardhat.config.ts points to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

### 3. Test Database Setup

**Option A: Separate Test Database**
```env
# Create a separate database for testing
DATABASE_URL="postgresql://user:password@host:port/stealth_money_test"
```

**Option B: Use SQLite for Local Testing**
```env
# Simpler for local testing
DATABASE_URL="file:./test.db"
```

## 🚀 Complete Test Flow

### Step 1: Start All Services
```bash
# Terminal 1: Start API
cd packages/api
npm run dev

# Terminal 2: Start Web App
cd packages/web
npm run dev

# Terminal 3: Check API health
curl http://localhost:4000/api/blockchain/health
```

### Step 2: Test Exchange Rates
```bash
# Test different currency pairs
curl http://localhost:4000/api/exchange-rate/USD/EUR
curl http://localhost:4000/api/exchange-rate/EUR/BRL
curl http://localhost:4000/api/exchange-rate/GBP/USD
```

### Step 3: Test Transfer Creation
```bash
# Create a test transfer
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "sourceCurrency": "USD",
    "destCurrency": "EUR"
  }'

# Should return clientSecret for Stripe payment
```

### Step 4: Test Frontend Integration
1. **Open browser:** http://localhost:3000
2. **Enter amount:** Try $100 USD → EUR
3. **Watch calculations:** Should show live exchange rates
4. **Click Continue:** Should proceed to payment (when implemented)

### Step 5: Test Payment Flow (When Frontend Payment is Added)
1. **Use test card:** 4242424242424242
2. **Enter test details:** 12/25, 123, 12345
3. **Complete payment:** Should succeed in test mode
4. **Check database:** Transaction should update to "PAID"

## 🧪 Specific Test Scenarios

### Currency Conversion Tests
```bash
# Test major currency pairs
USD → EUR (should be ~0.85)
EUR → USD (should be ~1.18)
USD → GBP (should be ~0.73)
GBP → USD (should be ~1.37)
USD → BRL (should be ~5.15)
```

### Payment Tests
| Card Number | Expected Result |
|-------------|----------------|
| 4242424242424242 | ✅ Payment succeeds |
| 4000000000000002 | ❌ Payment declined |
| 4000000000009995 | ❌ Insufficient funds |
| 4000000000003220 | 🔐 Requires 3D Secure |

### Blockchain Tests
```bash
# Check wallet balance (should show test ETH)
curl http://localhost:4000/api/blockchain/health

# Check contract balance (should show test tokens)
curl http://localhost:4000/api/blockchain/contract-balance
```

## 🔍 Monitoring Test Activity

### Stripe Dashboard
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure you're in **Test Mode** (toggle in left sidebar)
3. Check **Payments** section for test transactions
4. View **Logs** for webhook events

### Database Monitoring
```bash
# View all test transactions
cd packages/api
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

### API Logs
Watch your API terminal for:
- Exchange rate fetches
- Payment intent creations
- Webhook events
- Blockchain interactions

## 🚨 Safety Checklist

**Before Testing:**
- [ ] Using Stripe test keys (sk_test_, pk_test_)
- [ ] Connected to testnet (not mainnet)
- [ ] Using test database
- [ ] Server wallet has test ETH only
- [ ] No real money in any accounts

**Red Flags (Stop if you see these):**
- ❌ Stripe keys start with `sk_live_` or `pk_live_`
- ❌ Ethereum mainnet in blockchain health check
- ❌ Real money amounts in Stripe dashboard
- ❌ Production database URLs

## 🎮 Fun Test Scenarios

### 1. International Transfer Simulation
- **Scenario:** Send $500 USD to Brazil
- **Expected:** ~R$2,575 BRL (varies with real rates)
- **Test:** Use 4242424242424242 for payment

### 2. European Transfer
- **Scenario:** Send €200 EUR to UK
- **Expected:** ~£173 GBP
- **Test:** Try different test cards

### 3. Reverse Calculation
- **Scenario:** Recipient needs exactly $1,000 USD
- **Test:** Enter 1000 in "Recipient Gets" field
- **Expected:** Shows how much to send in source currency

### 4. Error Handling
- **Scenario:** Use declined card (4000000000000002)
- **Expected:** Payment fails, transaction marked as FAILED
- **Check:** Database should reflect failed status

## 🔧 Troubleshooting

### Common Issues:

**"Exchange rate API error"**
- Check EXCHANGERATE_API_KEY in .env
- Verify API service is running

**"Stripe webhook failed"**
- Ensure webhook endpoint is configured
- Check STRIPE_WEBHOOK_SECRET

**"Blockchain connection failed"**
- Verify testnet RPC URL
- Check wallet has test ETH for gas

**"Database connection error"**
- Ensure PostgreSQL is running
- Run `npm run db:migrate`

## 📊 Test Results Tracking

Create a simple test log:
```
✅ Exchange rates: USD/EUR working
✅ Payment: Test card 4242... successful
✅ Database: Transaction created and updated
✅ Blockchain: Wallet connected to Sepolia
✅ Frontend: Two-way calculations working
```

## 🎯 Next Steps After Testing

Once everything works in test mode:
1. **Document your test results**
2. **Create automated tests** (optional)
3. **Prepare for production** (separate guide)
4. **Set up monitoring** for live environment

---

**Remember:** Everything in this guide uses fake money, test networks, and sandbox environments. You can test as much as you want without any financial risk! 🎉