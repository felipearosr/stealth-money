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
 */
router.post('/stripe', async (req: Request, res: Response) => {
    console.log('🔔 Stripe webhook received');
    
    try {
        const signature = req.headers['stripe-signature'] as string;
        
        if (!signature) {
            console.error('❌ Missing stripe-signature header');
            return res.status(400).json({ 
                error: 'Missing stripe-signature header',
                received: false 
            });
        }

        let event: Stripe.Event;
        
        try {
            event = paymentService.verifyWebhookSignature(req.body, signature);
            console.log('✅ Webhook signature verified successfully');
            console.log(`📋 Event type: ${event.type}`);
        } catch (error) {
            console.error('❌ Webhook signature verification failed:', error);
            return res.status(400).json({ 
                error: 'Invalid webhook signature',
                received: false 
            });
        }

        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event);
                break;
                
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event);
                break;
                
            default:
                console.log(`ℹ️  Unhandled event type: ${event.type}`);
        }

        console.log('✅ Webhook processed successfully');
        res.status(200).json({ received: true, eventType: event.type });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({ 
            error: 'Webhook processing failed',
            received: false 
        });
    }
});

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
    console.log('🎉 Payment succeeded! Processing transfer...');
    
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (!internalTransactionId) {
        console.error('❌ Missing internalTransactionId in payment metadata');
        throw new Error('Missing internal transaction ID');
    }
    
    console.log(`💰 Processing successful payment for transaction: ${internalTransactionId}`);
    
    try {
        await orchestratorService.handleSuccessfulPayment(internalTransactionId);
        console.log('✅ Payment processing completed successfully');
    } catch (error) {
        console.error('❌ Failed to process successful payment:', error);
        throw error;
    }
}

async function handlePaymentIntentFailed(event: Stripe.Event) {
    console.log('❌ Payment failed');
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (internalTransactionId) {
        console.log(`💔 Payment failed for transaction: ${internalTransactionId}`);
    }
}

export default router;