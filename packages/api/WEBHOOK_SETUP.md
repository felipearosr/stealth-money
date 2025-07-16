# Stripe Webhook Setup Guide

## 🔗 **What Are Webhooks?**

Webhooks are HTTP callbacks that Stripe sends to your application when events occur (like successful payments). They're essential for:

- **Automatic payment confirmation** - Know instantly when payments succeed
- **Triggering blockchain releases** - Release funds after payment confirmation  
- **Updating transaction status** - Keep your database in sync
- **Handling failures** - Process declined payments appropriately

## 🏠 **Local Development Setup**

Since you're testing on `localhost:4000`, Stripe can't reach your computer directly. Here are two solutions:

### **Option 1: Stripe CLI (Recommended)**

**Step 1: Install Stripe CLI**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

**Step 2: Login to Stripe**
```bash
stripe login
# This opens browser to authenticate with your Stripe account
```

**Step 3: Forward Webhooks to Local Server**
```bash
# Forward webhooks to your local API
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# You'll see output like:
# > Ready! Your webhook signing secret is whsec_1234567890abcdef...
# Copy this secret for your .env file
```

**Step 4: Update Your .env**
```env
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef...
```

**Step 5: Test Webhook**
```bash
# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

### **Option 2: ngrok (Alternative)**

**Step 1: Install ngrok**
```bash
# Download from https://ngrok.com/download
# Or install via package manager:
npm install -g ngrok
```

**Step 2: Expose Local Server**
```bash
# Start your API server first
cd packages/api
npm run dev

# In another terminal, expose port 4000
ngrok http 4000

# You'll get a public URL like: https://abc123.ngrok.io
```

**Step 3: Configure Stripe Webhook**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter URL: `https://abc123.ngrok.io/api/webhooks/stripe`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
6. Click **Add endpoint**
7. Copy the **Signing secret** to your `.env`

## 🚀 **Production Setup**

For production deployment:

**Step 1: Deploy Your API**
```bash
# Deploy to Heroku, Vercel, Railway, etc.
# Your API will have a public URL like: https://your-app.herokuapp.com
```

**Step 2: Add Production Webhook**
1. In Stripe Dashboard → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-app.herokuapp.com/api/webhooks/stripe`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy signing secret to production environment variables

## 🧪 **Testing Your Webhook**

### **Test 1: Verify Webhook Endpoint**
```bash
# Check if your webhook endpoint responds
curl -X POST http://localhost:4000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Should return error about missing signature (this is expected)
```

### **Test 2: Trigger Test Events**
```bash
# If using Stripe CLI
stripe trigger payment_intent.succeeded

# Check your API logs for webhook processing
```

### **Test 3: Complete Payment Flow**
1. **Create transfer** via your web app
2. **Complete payment** with test card `4242424242424242`
3. **Check logs** - should see webhook received
4. **Check database** - transaction status should update to "PAID"

## 🔍 **Webhook Event Structure**

Here's what Stripe sends to your webhook:

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "amount": 10000,
      "currency": "usd",
      "status": "succeeded",
      "metadata": {
        "internalTransactionId": "clx123abc"
      }
    }
  }
}
```

## 🛡️ **Security: Webhook Signature Verification**

**Why verify signatures?**
- Ensures webhooks actually come from Stripe
- Prevents malicious fake webhook calls
- Required for production security

**How it works:**
```typescript
// Your webhook handler (already implemented)
const sig = req.headers['stripe-signature'] as string;
const event = paymentService.verifyWebhookSignature(req.body, sig);
// Only processes if signature is valid
```

## 🔧 **Webhook Handler Code**

Your API already includes this webhook handler:

```typescript
// POST /api/webhooks/stripe
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const event = paymentService.verifyWebhookSignature(req.body, sig);
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Payment succeeded - update database
        const paymentIntent = event.data.object;
        const transactionId = paymentIntent.metadata.internalTransactionId;
        
        await dbService.updateTransactionStatus(transactionId, 'PAID', {
          paymentId: paymentIntent.id
        });
        
        // TODO: Trigger blockchain fund release
        break;
        
      case 'payment_intent.payment_failed':
        // Payment failed - mark as failed
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).send('Webhook Error');
  }
});
```

## 📊 **Monitoring Webhooks**

### **Stripe Dashboard**
1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View **Recent deliveries** tab
4. See success/failure rates and retry attempts

### **Your API Logs**
```bash
# Watch your API logs for webhook events
cd packages/api
npm run dev

# You'll see logs like:
# "Received Stripe webhook: payment_intent.succeeded"
# "Payment succeeded for transaction: clx123abc"
```

## 🚨 **Common Issues & Solutions**

### **"Webhook signature verification failed"**
- **Cause**: Wrong webhook secret or raw body not preserved
- **Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- **Check**: Raw body middleware is configured correctly

### **"Webhook endpoint not found (404)"**
- **Cause**: Wrong URL in Stripe dashboard
- **Solution**: Verify URL matches your API route exactly
- **Local**: Use ngrok URL or Stripe CLI forwarding

### **"Webhook timeout"**
- **Cause**: Your webhook handler takes too long (>30 seconds)
- **Solution**: Process webhooks quickly, use background jobs for heavy work

### **"Duplicate webhook events"**
- **Cause**: Stripe retries failed webhooks
- **Solution**: Make webhook handlers idempotent (safe to run multiple times)

## 🎯 **Quick Setup Checklist**

**For Local Development:**
- [ ] Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
- [ ] Login: `stripe login`
- [ ] Forward webhooks: `stripe listen --forward-to localhost:4000/api/webhooks/stripe`
- [ ] Copy webhook secret to `.env`
- [ ] Test: `stripe trigger payment_intent.succeeded`

**For Production:**
- [ ] Deploy API to public URL
- [ ] Add webhook endpoint in Stripe dashboard
- [ ] Configure production webhook secret
- [ ] Test with real payment flow

## 🎉 **Success Indicators**

You'll know webhooks are working when:
- ✅ Stripe CLI shows "Event received" messages
- ✅ Your API logs show webhook processing
- ✅ Database transactions update from "PENDING_PAYMENT" to "PAID"
- ✅ Stripe dashboard shows successful webhook deliveries

## 🔄 **Complete Payment Flow**

With webhooks properly set up:

1. **User creates transfer** → Database: "PENDING"
2. **API creates Payment Intent** → Database: "PENDING_PAYMENT"  
3. **User completes payment** → Stripe processes payment
4. **Stripe sends webhook** → Your API receives notification
5. **Webhook updates database** → Database: "PAID"
6. **Trigger blockchain release** → Database: "COMPLETED"

This creates a reliable, automated payment processing system! 🚀