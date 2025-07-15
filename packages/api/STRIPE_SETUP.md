# Stripe Payment Integration Setup Guide

## Overview
The PaymentService integrates Stripe to handle secure card payments for your money transfer API. This service creates Payment Intents and processes payment confirmations.

## Setup Steps

### 1. Create Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete account verification (required for live payments)
3. Navigate to the Developer Dashboard

### 2. Get API Keys
In your Stripe Dashboard:
1. Go to **Developers** → **API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 3. Configure Environment Variables
Update your `.env` file:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51ABC123...  # Your secret key
STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...  # Your publishable key
STRIPE_WEBHOOK_SECRET=whsec_ABC123...  # Get this after creating webhook (step 4)
```

### 4. Set Up Webhooks (Important!)
Webhooks notify your API when payments are completed:

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing Secret** and add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

## Testing the Integration

### 1. Get Stripe Configuration
Test that your API can access Stripe keys:
```bash
curl http://localhost:4000/api/stripe/config
```

Expected response:
```json
{
  "publishableKey": "pk_test_51ABC123...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Create a Transfer with Payment
```bash
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "sourceCurrency": "USD",
    "destCurrency": "EUR"
  }'
```

Expected response:
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

### 3. Check Payment Intent Status
```bash
curl http://localhost:4000/api/payments/pi_ABC123
```

## Payment Flow

Here's how the complete payment flow works:

1. **User initiates transfer** → API creates database record
2. **API creates Payment Intent** → Returns `clientSecret` to frontend
3. **Frontend collects payment** → Uses Stripe.js with `clientSecret`
4. **Payment succeeds** → Stripe sends webhook to your API
5. **Webhook processes payment** → Updates database, triggers blockchain release

## Frontend Integration

Your frontend will need to:

1. **Get Stripe publishable key**:
```javascript
const response = await fetch('/api/stripe/config');
const { publishableKey } = await response.json();
```

2. **Initialize Stripe**:
```javascript
import { loadStripe } from '@stripe/stripe-js';
const stripe = await loadStripe(publishableKey);
```

3. **Create transfer and get client secret**:
```javascript
const response = await fetch('/api/transfers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100,
    sourceCurrency: 'USD',
    destCurrency: 'EUR'
  })
});
const { clientSecret } = await response.json();
```

4. **Confirm payment**:
```javascript
const { error } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Customer Name' }
  }
});
```

## Webhook Implementation

You'll need to add a webhook endpoint to handle payment confirmations:

```typescript
// Add to your routes
router.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  
  try {
    const event = paymentService.verifyWebhookSignature(req.body, sig);
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const transactionId = paymentIntent.metadata.internalTransactionId;
      
      // Update database status
      await dbService.updateTransactionStatus(transactionId, 'PAID', {
        paymentId: paymentIntent.id
      });
      
      // Trigger blockchain release (implement this logic)
      // await blockchainService.releaseFunds(...);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send('Webhook Error');
  }
});
```

## Test Cards

Use these test card numbers in development:

- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Insufficient Funds**: `4000000000009995`
- **3D Secure**: `4000000000003220`

All test cards:
- Use any future expiry date
- Use any 3-digit CVC
- Use any ZIP code

## Security Best Practices

1. **Environment Variables**: Never commit API keys to version control
2. **Webhook Verification**: Always verify webhook signatures
3. **HTTPS**: Use HTTPS in production for webhook endpoints
4. **Amount Validation**: Verify payment amounts match your records
5. **Idempotency**: Handle duplicate webhook events gracefully

## Common Issues

### "No such payment_intent"
- Check that your secret key matches the environment (test vs live)
- Verify the payment intent ID is correct

### "Invalid API key"
- Ensure your secret key is correctly set in environment variables
- Check for extra spaces or characters in the key

### "Webhook signature verification failed"
- Verify webhook secret is correctly configured
- Ensure raw body is passed to verification function
- Check that webhook endpoint URL matches Stripe configuration

## Production Checklist

Before going live:

- [ ] Switch to live API keys (`sk_live_` and `pk_live_`)
- [ ] Update webhook endpoint to production URL
- [ ] Enable HTTPS for all endpoints
- [ ] Set up proper error monitoring
- [ ] Test with real (small) amounts
- [ ] Configure proper logging for payments
- [ ] Set up alerts for failed payments

## Next Steps

1. Implement webhook endpoint for payment confirmations
2. Add proper error handling and retry logic
3. Integrate with blockchain service for fund release
4. Add payment status tracking in your frontend
5. Set up monitoring and alerting for payment issues