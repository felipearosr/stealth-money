// src/routes/webhooks.controller.ts
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/payment.service';
import { OrchestratorService } from '../services/orchestrator.service';

const router = Router();
const paymentService = new PaymentService();
const orchestratorService = new OrchestratorService();

/**
 * Critical Security Endpoint: Stripe Webhook Handler
 * 
 * This endpoint receives and processes webhook events from Stripe.
 * It's responsible for triggering the entire backend workflow when payments succeed.
 * 
 * Security Features:
 * - Signature verification using Stripe webhook secret
 * - Raw body parsing for proper signature validation
 * - Immediate 400 response for invalid signatures
 * - Proper error handling and logging
 */
router.post('/stripe', async (req: Request, res: Response) => {
    console.log('🔔 Stripe webhook received');
    
    try {
        // Get the signature from the request headers
        const signature = req.headers['stripe-signature'] as string;
        
        if (!signature) {
            console.error('❌ Missing stripe-signature header');
            return res.status(400).json({ 
                error: 'Missing stripe-signature header',
                received: false 
            });
        }

        // Verify the webhook signature using the raw body
        // This is critical for security - ensures the event actually came from Stripe
        let event: Stripe.Event;
        
        try {
            event = paymentService.verifyWebhookSignature(req.body, signature);
            console.log('✅ Webhook signature verified successfully');
            console.log(`📋 Event type: ${event.type}`);
            console.log(`🆔 Event ID: ${event.id}`);
        } catch (error) {
            console.error('❌ Webhook signature verification failed:', error);
            return res.status(400).json({ 
                error: 'Invalid webhook signature',
                received: false 
            });
        }

        // Handle different types of Stripe events
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event);
                break;
                
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event);
                break;
                
            case 'payment_intent.canceled':
                await handlePaymentIntentCanceled(event);
                break;
                
            case 'payment_intent.requires_action':
                await handlePaymentIntentRequiresAction(event);
                break;
                
            default:
                console.log(`ℹ️  Unhandled event type: ${event.type}`);
        }

        // Always return 200 to acknowledge receipt
        console.log('✅ Webhook processed successfully');
        res.status(200).json({ received: true, eventType: event.type });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        
        // Return 500 for processing errors (Stripe will retry)
        res.status(500).json({ 
            error: 'Webhook processing failed',
            received: false 
        });
    }
});

/**
 * Handle successful payment - This is the critical path!
 * Triggers the entire backend workflow for money transfer
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    console.log('🎉 Payment succeeded! Processing transfer...');
    
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Extract our internal transaction ID from the payment metadata
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (!internalTransactionId) {
        console.error('❌ Missing internalTransactionId in payment metadata');
        throw new Error('Missing internal transaction ID');
    }
    
    console.log(`💰 Processing successful payment for transaction: ${internalTransactionId}`);
    console.log(`💳 Payment Intent ID: ${paymentIntent.id}`);
    console.log(`💵 Amount: ${paymentIntent.amount} ${paymentIntent.currency.toUpperCase()}`);
    
    try {
        // This is where the magic happens - trigger the orchestrator
        // Using the new handleSuccessfulPayment method that follows the exact workflow
        await orchestratorService.handleSuccessfulPayment(internalTransactionId);
        
        console.log('✅ Payment processing completed successfully');
        
    } catch (error) {
        console.error('❌ Failed to process successful payment:', error);
        throw error; // Re-throw to trigger webhook retry
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
    console.log('❌ Payment failed');
    
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (!internalTransactionId) {
        console.error('❌ Missing internalTransactionId in failed payment metadata');
        return;
    }
    
    console.log(`💔 Payment failed for transaction: ${internalTransactionId}`);
    console.log(`💳 Payment Intent ID: ${paymentIntent.id}`);
    console.log(`❌ Failure reason: ${paymentIntent.last_payment_error?.message || 'Unknown'}`);
    
    try {
        await orchestratorService.processFailedPayment(internalTransactionId, {
            paymentIntentId: paymentIntent.id,
            failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
            failureCode: paymentIntent.last_payment_error?.code || 'unknown_error'
        });
        
        console.log('✅ Failed payment processed successfully');
        
    } catch (error) {
        console.error('❌ Failed to process payment failure:', error);
        throw error;
    }
}

/**
 * Handle canceled payment
 */
async function handlePaymentIntentCanceled(event: Stripe.Event) {
    console.log('🚫 Payment canceled');
    
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (!internalTransactionId) {
        console.error('❌ Missing internalTransactionId in canceled payment metadata');
        return;
    }
    
    console.log(`🚫 Payment canceled for transaction: ${internalTransactionId}`);
    
    try {
        await orchestratorService.processCanceledPayment(internalTransactionId, {
            paymentIntentId: paymentIntent.id,
            canceledAt: new Date().toISOString()
        });
        
        console.log('✅ Canceled payment processed successfully');
        
    } catch (error) {
        console.error('❌ Failed to process payment cancellation:', error);
        throw error;
    }
}

/**
 * Handle payment requiring additional action (e.g., 3D Secure)
 */
async function handlePaymentIntentRequiresAction(event: Stripe.Event) {
    console.log('⚠️  Payment requires additional action');
    
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (!internalTransactionId) {
        console.error('❌ Missing internalTransactionId in payment requiring action');
        return;
    }
    
    console.log(`⚠️  Payment requires action for transaction: ${internalTransactionId}`);
    console.log(`💳 Payment Intent ID: ${paymentIntent.id}`);
    console.log(`🔐 Next action: ${paymentIntent.next_action?.type || 'unknown'}`);
    
    try {
        await orchestratorService.processPaymentRequiringAction(internalTransactionId, {
            paymentIntentId: paymentIntent.id,
            nextActionType: paymentIntent.next_action?.type || 'unknown',
            clientSecret: paymentIntent.client_secret
        });
        
        console.log('✅ Payment requiring action processed successfully');
        
    } catch (error) {
        console.error('❌ Failed to process payment requiring action:', error);
        throw error;
    }
}

export default router;