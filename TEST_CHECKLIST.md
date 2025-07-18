# Payment Flow Integration - Test Checklist

Use this checklist to manually verify the payment flow integration is working correctly.

## Prerequisites ✅

- [ ] API server running on `http://localhost:4000`
- [ ] Web server running on `http://localhost:3000` (optional for API-only tests)
- [ ] Environment variables configured in `packages/api/.env`
- [ ] Database connection working (if using PostgreSQL)

## Automated Tests ✅

### Run Test Suite
```bash
node test-payment-flow.js
```

**Expected Results:**
- [ ] All health endpoints return 200
- [ ] Transfer creation works (returns transaction ID)
- [ ] Webhook security blocks unauthorized requests
- [ ] Exchange rate endpoints return valid data
- [ ] Test completes with 100% success rate

### Run Local Test Script
```bash
./run-tests.sh
```

**Expected Results:**
- [ ] API server check passes
- [ ] All endpoint tests pass
- [ ] Transfer creation and retrieval work
- [ ] Webhook security test passes
- [ ] Script shows "All tests completed successfully!"

## Manual API Testing ✅

### 1. Health Checks
```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/orchestrator/health
curl http://localhost:4000/api/stripe/config
```

**Expected:**
- [ ] `/health` returns `{"status": "ok"}`
- [ ] `/api/orchestrator/health` returns services status
- [ ] `/api/stripe/config` returns publishable key starting with `pk_test_`

### 2. Transfer Creation
```bash
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "sourceCurrency": "USD", "destCurrency": "EUR"}'
```

**Expected:**
- [ ] Returns 201 status code
- [ ] Response includes `transactionId` (UUID format)
- [ ] Response includes `clientSecret` (starts with `pi_`)
- [ ] Response shows `status: "PENDING_PAYMENT"`
- [ ] Response includes correct `sourceAmount` and `recipientAmount`

### 3. Transfer Retrieval
```bash
# Use transaction ID from previous step
curl http://localhost:4000/api/transfers/YOUR_TRANSACTION_ID
```

**Expected:**
- [ ] Returns 200 status code
- [ ] Response includes all transaction details
- [ ] Status is `PENDING_PAYMENT`
- [ ] All amounts and currencies match creation request

### 4. Webhook Security
```bash
# Test without signature (should fail)
curl -X POST http://localhost:4000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Expected:**
- [ ] Returns 400 status code
- [ ] Error message: "Missing stripe-signature header"

### 5. Exchange Rates
```bash
curl http://localhost:4000/api/exchange-rate/USD/EUR
curl http://localhost:4000/api/exchange-rate/USD/BRL
curl http://localhost:4000/api/exchange-rate/USD/GBP
```

**Expected:**
- [ ] All return 200 status code
- [ ] Each response includes numeric `rate` value
- [ ] Response includes correct `from` and `to` currencies
- [ ] Rates are reasonable (e.g., USD to EUR around 0.85-0.95)

## Webhook Processing Test ✅

### Test Orchestrator Directly
```bash
# Use transaction ID from transfer creation
curl -X POST http://localhost:4000/api/test-orchestrator \
  -H "Content-Type: application/json" \
  -d '{"transactionId": "YOUR_TRANSACTION_ID"}'
```

**Expected:**
- [ ] Returns 200 status code (or 500 if already processed)
- [ ] API logs show orchestrator workflow steps
- [ ] Transaction status changes from `PENDING_PAYMENT`

### Check Transaction Status After Processing
```bash
curl http://localhost:4000/api/transfers/YOUR_TRANSACTION_ID
```

**Expected:**
- [ ] Status is no longer `PENDING_PAYMENT`
- [ ] Status is `PROCESSING`, `FAILED`, or `FUNDS_SENT_TO_PARTNER`
- [ ] `updatedAt` timestamp is recent

## Frontend Integration Test ✅ (Optional)

### 1. Homepage
- [ ] Visit `http://localhost:3000`
- [ ] Transfer calculator loads without errors
- [ ] Currency dropdowns work
- [ ] Lock icons toggle correctly
- [ ] Exchange rates load automatically
- [ ] Amount calculations work both ways

### 2. Payment Flow
- [ ] Enter transfer details (e.g., $100 USD → EUR)
- [ ] Click "Continue" button
- [ ] Redirected to payment page `/pay/[transactionId]`
- [ ] Payment page shows correct transfer summary
- [ ] Stripe payment form loads
- [ ] Form accepts test card: `4242424242424242`

### 3. Status Page
- [ ] After payment, redirected to `/status/[transactionId]`
- [ ] Status page loads transaction details
- [ ] Payment confirmation banner appears
- [ ] Status updates automatically (every 5 seconds)
- [ ] Timeline shows progress correctly

## Error Handling Tests ✅

### 1. Invalid Requests
```bash
# Invalid currency codes
curl http://localhost:4000/api/exchange-rate/INVALID/EUR

# Invalid transaction ID
curl http://localhost:4000/api/transfers/invalid-id

# Missing required fields
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**Expected:**
- [ ] All return appropriate error status codes (400/404)
- [ ] Error messages are clear and helpful
- [ ] No server crashes or unhandled exceptions

## Final Verification ✅

### Complete End-to-End Test
1. [ ] Create transfer via API
2. [ ] Verify transfer in database/response
3. [ ] Trigger orchestrator workflow
4. [ ] Confirm status updates
5. [ ] Check all logs for errors
6. [ ] Verify no hanging processes

### Ready for Production Checklist
- [ ] All automated tests pass (100% success rate)
- [ ] All manual tests pass
- [ ] No errors in server logs
- [ ] Performance meets requirements
- [ ] Security tests pass
- [ ] Error handling works correctly
- [ ] Documentation is up to date

## ✅ Success Criteria

**All tests pass when:**
- Automated test suite shows 100% success rate
- All manual API tests return expected responses
- Frontend integration works end-to-end
- Error handling is graceful and informative
- Performance meets requirements
- Security measures are effective

**Ready for Step 2 when:**
- This checklist is 100% complete
- No critical issues remain
- Payment flow integration is fully functional
- System is stable under normal load

---

**Next Step:** Recipient Information Collection (Step 2 of MVP completion)