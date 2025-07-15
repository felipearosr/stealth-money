// src/services/payment.service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class PaymentService {
  /**
   * Creates a Stripe Payment Intent.
   * @param amount The amount to be charged, in the smallest currency unit (e.g., cents).
   * @param currency The currency code (e.g., 'usd').
   * @param transactionId The internal transaction ID for tracking.
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          internalTransactionId: transactionId, // Link Stripe payment to our DB record
        },
      });

      if (!paymentIntent.client_secret) {
        throw new Error('Failed to create payment intent.');
      }

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Error creating Stripe Payment Intent:', error);
      throw new Error('Could not initiate payment.');
    }
  }

  /**
   * Retrieve a payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      throw new Error('Could not retrieve payment intent.');
    }
  }

  /**
   * Confirm a payment intent (for server-side confirmation if needed)
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw new Error('Could not confirm payment intent.');
    }
  }

  /**
   * Get Stripe publishable key for frontend
   */
  getPublishableKey(): string {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('Stripe publishable key not configured');
    }
    return publishableKey;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }
}