# Complete Setup Guide - Get All API Keys

This guide will help you get all the required API keys and configuration for testing Stealth Money safely and for free.

## 🗄️ **Step 1: Database Setup (Free)**

### **Option A: Supabase (Recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"** 
3. Sign up with GitHub/Google (free)
4. Click **"New project"**
5. Fill in:
   - **Name:** `stealth-money-test`
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to you
   - **Plan:** Free (default)
6. Click **"Create new project"** (takes 2-3 minutes)
7. Once ready, go to **Settings** → **Database**
8. Scroll to **Connection string** → **URI**
9. Copy the connection string

**Your DATABASE_URL will look like:**
```env
DATABASE_URL="postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### **Option B: Neon (Alternative)**
1. Go to [neon.tech](https://neon.tech)
2. Sign up (free)
3. Create project: `stealth-money`
4. Copy connection string from dashboard

## ⛓️ **Step 2: Blockchain Setup (Free Testnet)**

### **2A: Get RPC Provider**

**Infura (Recommended):**
1. Go to [infura.io](https://infura.io)
2. Sign up (free account)
3. Click **"Create New Key"**
4. Choose **"Web3 API"**
5. Name: `stealth-money`
6. Network: **Ethereum**
7. Copy your **Project ID** (looks like: `abc123def456...`)

**Your NODE_PROVIDER_URL:**
```env
NODE_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

### **2B: Create Test Wallet**
We already generated one for you! Use this:

```env
SERVER_WALLET_PRIVATE_KEY=0xa102eb786264342a5223767a74665fefd419c19ed481144c2c7b0434cb36757f
```

**Wallet Address:** `0x3081d2Ad64174e3e934123D44EAD1947F8a303C5`

### **2C: Get Free Test ETH**
1. Go to [Sepolia Faucet](https://sepoliafaucet.com)
2. Enter wallet address: `0x3081d2Ad64174e3e934123D44EAD1947F8a303C5`
3. Complete captcha and request
4. Wait 1-2 minutes for test ETH

### **2D: Deploy Smart Contract**
```bash
# Navigate to contracts
cd packages/contracts

# Install dependencies
npm install

# Configure for Sepolia testnet
# Edit hardhat.config.ts to include Sepolia network

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia
```

**After deployment, you'll get a contract address like:**
```env
TRANSFER_MANAGER_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

## 💳 **Step 3: Stripe Setup (Free Test Mode)**

1. Go to [stripe.com](https://stripe.com)
2. Click **"Start now"** → Sign up
3. Complete account setup (no payment required for test mode)
4. Go to **Developers** → **API Keys**
5. Copy your test keys:

```env
STRIPE_SECRET_KEY=sk_test_51ABC123...
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
```

6. For webhooks (later):
   - Go to **Developers** → **Webhooks**
   - Add endpoint: `http://localhost:4000/api/webhooks/stripe`
   - Copy webhook secret: `whsec_ABC123...`

## 📝 **Step 4: Complete .env File**

Your final `.env` file should look like:

```env
# Server Configuration
PORT=4000

# Foreign Exchange (optional - uses mock data if not provided)
EXCHANGERATE_API_KEY=your_api_key_here

# Database (from Supabase)
DATABASE_URL="postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.abc123:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Stripe (test keys)
STRIPE_SECRET_KEY=sk_test_51ABC123...
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
STRIPE_WEBHOOK_SECRET=whsec_ABC123...

# Payment Request System
JWT_SECRET=your-super-secret-jwt-key-change-in-production
BASE_URL=http://localhost:3000

# Blockchain (testnet only!)
SERVER_WALLET_PRIVATE_KEY=0xa102eb786264342a5223767a74665fefd419c19ed481144c2c7b0434cb36757f
NODE_PROVIDER_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
TRANSFER_MANAGER_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
```

## 🧪 **Step 5: Test Everything**

```bash
# 1. Set up database
cd packages/api
npm run db:migrate -- --name init

# 2. Start API server
npm run dev

# 3. Test in another terminal
curl http://localhost:4000/api/blockchain/health
curl http://localhost:4000/api/exchange-rate/USD/EUR

# 4. Start web app
cd packages/web
npm run dev
```

## 🎯 **Quick Setup Checklist**

- [ ] **Database:** Supabase account created, connection string copied
- [ ] **RPC Provider:** Infura account created, project ID copied  
- [ ] **Test Wallet:** Private key added to .env
- [ ] **Test ETH:** Wallet funded from Sepolia faucet
- [ ] **Smart Contract:** Deployed to Sepolia, address copied
- [ ] **Stripe:** Account created, test keys copied
- [ ] **API Server:** Running on localhost:4000
- [ ] **Web App:** Running on localhost:3000

## 💰 **Cost Breakdown**
- **Database (Supabase):** FREE (500MB, 2 million rows)
- **RPC Provider (Infura):** FREE (100,000 requests/day)
- **Test ETH:** FREE (from faucets)
- **Smart Contract Deployment:** FREE (uses test ETH)
- **Stripe:** FREE (test mode, unlimited transactions)
- **Exchange Rates:** FREE (mock data, or 1,500 requests/month)

**Total Cost: $0.00** 🎉

## 🚨 **Security Reminders**

- ✅ All keys are for TESTING only
- ✅ Wallet contains TEST ETH only
- ✅ Stripe is in TEST mode
- ✅ Database is for development
- ❌ Never use these keys in production
- ❌ Never commit .env to version control

## 🆘 **Need Help?**

If you get stuck on any step:

1. **Database issues:** Check Supabase dashboard, verify connection string
2. **Blockchain issues:** Ensure wallet has test ETH, check Infura project status
3. **Contract deployment:** Make sure hardhat.config.ts has Sepolia network
4. **Stripe issues:** Verify you're using test keys (start with `sk_test_`)

## 🎮 **Ready to Test!**

Once everything is set up, you can:
- Create transfers with real exchange rates
- Process payments with test cards (4242424242424242)
- Generate payment requests with QR codes and shareable links
- Test payment request flows for registered and unregistered users
- Track transactions in your database
- Monitor blockchain interactions
- Test the complete money transfer flow

### Payment Request System Testing
```bash
# Test payment request creation
curl -X POST http://localhost:4000/api/payment-requests \
  -H "Content-Type: application/json" \
  -d '{"requesterId":"user-123","amount":100,"currency":"USD","description":"Test payment"}'

# Test QR code generation
curl http://localhost:4000/api/payment-requests/REQUEST_ID/qr-code

# Test shareable link generation
curl http://localhost:4000/api/payment-requests/REQUEST_ID/shareable-link
```

All safely in test mode with no real money involved! 🚀