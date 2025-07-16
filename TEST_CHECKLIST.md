# Stealth Money - Complete Testing Checklist

This guide will help you test each component of the Stealth Money system systematically to ensure production readiness.

## 🎯 **Testing Overview**

We'll test in this order:
1. **Environment Setup** - Verify all config is correct
2. **Database Service** - Test data persistence
3. **Exchange Rate Service** - Test currency conversion
4. **Payment Service** - Test Stripe integration
5. **Blockchain Service** - Test smart contract interaction
6. **API Endpoints** - Test all REST endpoints
7. **Frontend Integration** - Test UI components
8. **Webhook Integration** - Test payment flow
9. **End-to-End Flow** - Complete user journey
10. **Production Readiness** - Security and performance

---

## ✅ **Test 1: Environment Setup**

### **Check Configuration Files**

**API Environment (.env):**
```bash
cd packages/api
cat .env
```

**Expected variables:**
- [ ] `PORT=4000`
- [ ] `DATABASE_URL` (starts with postgresql://)
- [ ] `STRIPE_SECRET_KEY` (starts with sk_test_)
- [ ] `STRIPE_PUBLISHABLE_KEY` (starts with pk_test_)
- [ ] `STRIPE_WEBHOOK_SECRET` (starts with whsec_)
- [ ] `SERVER_WALLET_PRIVATE_KEY` (starts with 0x)
- [ ] `NODE_PROVIDER_URL` (contains infura.io or alchemy.com)
- [ ] `TRANSFER_MANAGER_CONTRACT_ADDRESS` (starts with 0x)

**Web Environment (.env.local):**
```bash
cd packages/web
cat .env.local
```

**Expected:**
- [ ] `NEXT_PUBLIC_API_URL=http://localhost:4000`

### **Test Result:**
- [ ] ✅ All environment variables present
- [ ] ❌ Missing variables: ________________

---

## ✅ **Test 2: Database Service**

### **Setup Database**
```bash
cd packages/api
npm run db:migrate -- --name init
npm run db:generate
```

### **Test Database Connection**
```bash
# Start API server
npm run dev

# In another terminal, test database
npx ts-node src/test-fx.ts
```

### **Manual Database Test**
```bash
# Open Prisma Studio
npm run db:studio
# Should open http://localhost:5555
```

**Check:**
- [ ] Database migration successful
- [ ] Prisma Studio opens without errors
- [ ] Can view Transaction table structure
- [ ] Test script creates and retrieves transactions

### **Test Result:**
- [ ] ✅ Database fully functional
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 3: Exchange Rate Service**

### **Test Mock Exchange Rates**
```bash
# Test various currency pairs
curl http://localhost:4000/api/exchange-rate/USD/EUR
curl http://localhost:4000/api/exchange-rate/EUR/GBP
curl http://localhost:4000/api/exchange-rate/USD/BRL
curl http://localhost:4000/api/exchange-rate/GBP/USD
```

**Expected Response Format:**
```json
{
  "from": "USD",
  "to": "EUR",
  "rate": 0.8521,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Test Edge Cases**
```bash
# Same currency (should return rate: 1)
curl http://localhost:4000/api/exchange-rate/USD/USD

# Invalid currency
curl http://localhost:4000/api/exchange-rate/USD/XYZ
```

**Check:**
- [ ] All major currency pairs work (USD, EUR, GBP, BRL)
- [ ] Same currency returns rate of 1
- [ ] Invalid currencies return appropriate errors
- [ ] Rates are realistic (USD/EUR ~0.85, USD/BRL ~5.1)

### **Test Result:**
- [ ] ✅ Exchange rates working correctly
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 4: Payment Service (Stripe)**

### **Test Stripe Configuration**
```bash
curl http://localhost:4000/api/stripe/config
```

**Expected Response:**
```json
{
  "publishableKey": "pk_test_51...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Test Transfer Creation (Creates Payment Intent)**
```bash
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "sourceCurrency": "USD",
    "destCurrency": "EUR"
  }'
```

**Expected Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "transactionId": "clx...",
  "rate": 0.8521,
  "sourceAmount": 100,
  "recipientAmount": 85.21,
  "sourceCurrency": "USD",
  "destCurrency": "EUR",
  "status": "PENDING_PAYMENT",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### **Test Payment Intent Retrieval**
```bash
# Use payment intent ID from previous response
curl http://localhost:4000/api/payments/pi_1234567890
```

**Check:**
- [ ] Stripe config returns publishable key
- [ ] Transfer creation returns clientSecret
- [ ] Payment intent can be retrieved
- [ ] Database record created with PENDING_PAYMENT status

### **Test Result:**
- [ ] ✅ Stripe integration working
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 5: Blockchain Service**

### **Test Blockchain Connection**
```bash
curl http://localhost:4000/api/blockchain/health
```

**Expected Response:**
```json
{
  "connected": true,
  "network": "sepolia",
  "walletAddress": "0x3081d2Ad64174e3e934123D44EAD1947F8a303C5",
  "contractAddress": "0x...",
  "blockNumber": 12345,
  "walletBalance": "0.05 ETH",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Test Contract Balance**
```bash
curl http://localhost:4000/api/blockchain/contract-balance
```

**Expected Response:**
```json
{
  "contractAddress": "0x...",
  "tokenBalance": "1000.0",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Check:**
- [ ] Blockchain connection successful
- [ ] Connected to Sepolia testnet (not mainnet!)
- [ ] Wallet has test ETH balance
- [ ] Contract address is valid
- [ ] Can read contract token balance

### **Test Result:**
- [ ] ✅ Blockchain integration working
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 6: API Endpoints**

### **Test All Transfer Endpoints**
```bash
# Create transfer
TRANSFER_RESPONSE=$(curl -s -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 50, "sourceCurrency": "USD", "destCurrency": "EUR"}')

echo $TRANSFER_RESPONSE

# Extract transaction ID
TRANSACTION_ID=$(echo $TRANSFER_RESPONSE | grep -o '"transactionId":"[^"]*' | cut -d'"' -f4)

# Get specific transfer
curl http://localhost:4000/api/transfers/$TRANSACTION_ID

# Get all transfers
curl http://localhost:4000/api/transfers
```

### **Test Error Handling**
```bash
# Invalid input
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": -100, "sourceCurrency": "USD", "destCurrency": "EUR"}'

# Missing fields
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**Check:**
- [ ] Transfer creation works
- [ ] Can retrieve specific transfers
- [ ] Can list all transfers
- [ ] Proper error messages for invalid input
- [ ] Validation catches negative amounts and missing fields

### **Test Result:**
- [ ] ✅ All API endpoints working
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 7: Frontend Integration**

### **Start Web Application**
```bash
cd packages/web
npm run dev
```

**Open browser:** http://localhost:3000

### **Test UI Components**
- [ ] Page loads without errors
- [ ] "Stealth Money" title displays
- [ ] Transfer calculator card appears
- [ ] Both input fields are editable
- [ ] Currency dropdowns work
- [ ] Exchange rate displays

### **Test Two-Way Calculations**
1. **Send Amount Test:**
   - Enter `100` in "You Send" field
   - Verify "Recipient Gets" updates automatically
   - Check exchange rate display

2. **Receive Amount Test:**
   - Clear fields
   - Enter `85` in "Recipient Gets" field
   - Verify "You Send" updates automatically

3. **Currency Change Test:**
   - Change source currency from USD to EUR
   - Verify calculations update
   - Change destination currency
   - Verify calculations update again

### **Test Loading States**
- [ ] Loading indicator appears during API calls
- [ ] Button disables during loading
- [ ] Error messages display if API fails

**Check:**
- [ ] All UI components render correctly
- [ ] Two-way calculations work
- [ ] Currency changes trigger recalculation
- [ ] Loading and error states work
- [ ] No console errors in browser

### **Test Result:**
- [ ] ✅ Frontend fully functional
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 8: Webhook Integration**

### **Setup Webhook Forwarding**
```bash
# Terminal 1: Keep API running
cd packages/api
npm run dev

# Terminal 2: Start webhook forwarding
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

### **Test Webhook Processing**
```bash
# Trigger test webhook
stripe trigger payment_intent.succeeded
```

**Expected in API logs:**
```
Received Stripe webhook: payment_intent.succeeded
Payment succeeded for transaction: clx123abc
```

### **Test Webhook with Real Transaction**
1. Create a transfer via API (get transaction ID)
2. Trigger webhook with that transaction ID
3. Check database for status update

**Check:**
- [ ] Webhook endpoint receives events
- [ ] Signature verification works
- [ ] Database updates on payment success
- [ ] Error handling for invalid webhooks

### **Test Result:**
- [ ] ✅ Webhooks working correctly
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 9: End-to-End Flow**

### **Complete User Journey**
1. **Start all services:**
   ```bash
   # Terminal 1: API
   cd packages/api && npm run dev
   
   # Terminal 2: Web
   cd packages/web && npm run dev
   
   # Terminal 3: Webhooks
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```

2. **User Flow Test:**
   - Open http://localhost:3000
   - Enter transfer: $100 USD → EUR
   - Verify calculations are correct
   - Click "Continue" (when payment is implemented)
   - Use test card: `4242424242424242`
   - Verify payment processes
   - Check database for status updates

### **Database Verification**
```bash
# Check transaction status progression
npm run db:studio
# Look for: PENDING → PENDING_PAYMENT → PAID
```

**Check:**
- [ ] Complete flow works without errors
- [ ] Database tracks all status changes
- [ ] Real-time calculations work
- [ ] Payment processing works
- [ ] Webhook updates database

### **Test Result:**
- [ ] ✅ End-to-end flow successful
- [ ] ❌ Issues found: ________________

---

## ✅ **Test 10: Production Readiness**

### **Security Checklist**
- [ ] All API keys are test keys (sk_test_, pk_test_)
- [ ] Using testnet (Sepolia, not mainnet)
- [ ] Webhook signature verification enabled
- [ ] No private keys in version control
- [ ] Environment variables properly configured

### **Performance Tests**
```bash
# Test multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/transfers \
    -H "Content-Type: application/json" \
    -d '{"amount": '$i'0, "sourceCurrency": "USD", "destCurrency": "EUR"}' &
done
wait
```

### **Error Handling Tests**
```bash
# Test with API server down
# Stop API server, try frontend
# Should show appropriate error messages

# Test with invalid data
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": "invalid", "sourceCurrency": "USD", "destCurrency": "EUR"}'
```

### **Monitoring Setup**
- [ ] API logs are clear and informative
- [ ] Database queries are efficient
- [ ] No memory leaks during extended testing
- [ ] Proper error responses for all failure cases

### **Test Result:**
- [ ] ✅ Production ready
- [ ] ❌ Issues to fix: ________________

---

## 🎉 **Final Checklist**

Before considering production deployment:

### **Functionality**
- [ ] All 10 test sections pass
- [ ] No critical bugs found
- [ ] Performance is acceptable
- [ ] Error handling is robust

### **Security**
- [ ] All test credentials only
- [ ] No sensitive data in logs
- [ ] Webhook signatures verified
- [ ] Input validation working

### **Documentation**
- [ ] All setup guides are accurate
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Troubleshooting guides complete

---

## 🚀 **Next Steps After Testing**

Once all tests pass:
1. **Document any issues found**
2. **Fix critical bugs**
3. **Optimize performance bottlenecks**
4. **Prepare production environment**
5. **Set up monitoring and alerting**

---

**Testing Status: [ ] Complete [ ] In Progress [ ] Not Started**

**Overall Result: [ ] ✅ Ready for Production [ ] ❌ Needs Work**

**Notes:**
_Use this space to document any issues, fixes, or observations during testing._