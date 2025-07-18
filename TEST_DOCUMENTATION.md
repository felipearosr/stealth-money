# Payment Flow Integration Tests

This document describes the comprehensive test suite for the payment flow integration in Stealth Money.

## Test Files Overview

### 1. `test-payment-flow.js` - Main Test Suite
Comprehensive Node.js test script that validates the complete payment flow integration.

**What it tests:**
- ✅ API health endpoints
- ✅ Transfer creation and retrieval
- ✅ Webhook processing and security
- ✅ Orchestrator workflow
- ✅ Exchange rate endpoints
- ✅ Backup payment processing

### 2. `.github/workflows/payment-flow-tests.yml` - CI/CD Pipeline
GitHub Actions workflow for automated testing on push/PR.

**What it includes:**
- ✅ Multi-service setup (API + Database)
- ✅ Environment configuration
- ✅ Build and test execution
- ✅ Frontend build validation
- ✅ Integration testing

### 3. `run-tests.sh` - Local Test Runner
Bash script for running tests locally with colored output and status checks.

**What it provides:**
- ✅ Prerequisites checking
- ✅ Colored output for better readability
- ✅ Manual test execution
- ✅ Next steps guidance

## Running Tests

### Local Testing

1. **Start the API server:**
   ```bash
   npm run dev --prefix packages/api
   ```

2. **Run the comprehensive test suite:**
   ```bash
   node test-payment-flow.js
   ```

3. **Or use the test runner script:**
   ```bash
   ./run-tests.sh
   ```

### CI/CD Testing

Tests run automatically on:
- Push to `main`, `develop`, or `feature/payment-flow` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

## Expected Test Outputs

### ✅ Successful Test Run

```
📋 [2024-01-01T12:00:00.000Z] Testing API health endpoints...
✅ [2024-01-01T12:00:00.100Z] PASS: API health endpoint returns 200
✅ [2024-01-01T12:00:00.200Z] PASS: Orchestrator health endpoint returns 200
✅ [2024-01-01T12:00:00.300Z] PASS: Stripe config returns valid publishable key

📋 [2024-01-01T12:00:01.000Z] Testing transfer creation...
✅ [2024-01-01T12:00:01.100Z] PASS: Transfer creation returns 201
✅ [2024-01-01T12:00:01.200Z] PASS: Transfer creation returns transaction ID
✅ [2024-01-01T12:00:01.300Z] PASS: Transfer initial status is PENDING_PAYMENT

📋 [2024-01-01T12:00:02.000Z] Testing webhook processing...
✅ [2024-01-01T12:00:02.100Z] PASS: Webhook processing returns 200
✅ [2024-01-01T12:00:02.200Z] PASS: Transaction status changed after webhook processing

==========================================
🏁 Test Results Summary
==========================================
Total Tests: 15
✅ Passed: 15
✅ Failed: 0
Duration: 3.45s
Success Rate: 100.0%
```

## Test Categories

### 1. Health Check Tests
- **API Health**: `/health` endpoint returns 200
- **Orchestrator Health**: `/api/orchestrator/health` returns service status
- **Stripe Config**: `/api/stripe/config` returns valid publishable key

### 2. Transfer Flow Tests
- **Creation**: POST `/api/transfers` creates transfer with transaction ID
- **Retrieval**: GET `/api/transfers/:id` returns transfer details
- **Status**: Initial status is `PENDING_PAYMENT`

### 3. Webhook Security Tests
- **Missing Signature**: Returns 400 with appropriate error
- **Invalid Signature**: Returns 400 with appropriate error
- **Valid Signature**: Processes webhook successfully

### 4. Payment Processing Tests
- **Webhook Processing**: Triggers orchestrator workflow
- **Status Updates**: Transaction status changes from `PENDING_PAYMENT`
- **Backup Processing**: Handles edge cases gracefully

### 5. Exchange Rate Tests
- **Rate Retrieval**: Returns valid exchange rates
- **Currency Validation**: Includes correct currency codes
- **Error Handling**: Handles invalid currency pairs

## Success Criteria

### API Tests
- ✅ All health endpoints return 200
- ✅ Transfer creation returns 201 with valid data
- ✅ Transfer retrieval returns correct transaction
- ✅ Exchange rates return valid numeric values

### Security Tests
- ✅ Webhook rejects unsigned requests (400)
- ✅ Webhook rejects invalid signatures (400)
- ✅ Webhook processes valid signatures (200)

### Integration Tests
- ✅ Webhook triggers orchestrator workflow
- ✅ Transaction status updates correctly
- ✅ Backup processing handles edge cases
- ✅ No duplicate processing occurs

### Performance Tests
- ✅ All tests complete within 10 seconds
- ✅ API responses under 1 second
- ✅ No memory leaks or hanging processes

## Troubleshooting

### Common Issues

1. **API Server Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:4000
   Solution: Start API server with `npm run dev --prefix packages/api`
   ```

2. **Database Connection Failed**
   ```
   Error: Database connection failed
   Solution: Check DATABASE_URL in .env file
   ```

3. **Stripe Configuration Missing**
   ```
   Error: Stripe not configured
   Solution: Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to .env
   ```

4. **Webhook Signature Verification Failed**
   ```
   Error: Invalid webhook signature
   Solution: Check STRIPE_WEBHOOK_SECRET in .env file
   ```

### Debug Mode

Run tests with debug output:
```bash
DEBUG=1 node test-payment-flow.js
```

### Manual Testing

Test individual endpoints:
```bash
# Health check
curl http://localhost:4000/health

# Create transfer
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "sourceCurrency": "USD", "destCurrency": "EUR"}'

# Test webhook (will fail without signature)
curl -X POST http://localhost:4000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Next Steps After Tests Pass

1. **Manual Browser Testing**
   - Visit `http://localhost:3000`
   - Create a transfer
   - Complete payment with test card: `4242424242424242`
   - Verify status page updates

2. **Ready for Step 2**
   - All payment flow integration tests passing
   - Webhook processing working correctly
   - Status updates functioning properly
   - Ready to implement recipient information collection

---

**Note**: These tests validate the complete payment flow integration and ensure all components work together seamlessly. They should be run before any deployment and after any changes to the payment processing logic.