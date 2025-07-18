// src/routes/webhooks.controller.ts
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PaymentService } from '../services/payment.service';
import { OrchestratorService } from '../services/orchestrator.service';
import { validateWebhookSignature } from '../middleware/validation.middleware';
import { logSecurityEvent, logTransactionEvent } from '../middleware/logging.middleware';
import { strictRateLimit } from '../middleware/security.middleware';

const router = Router();
const paymentService = new PaymentService();
const orchestratorService = new OrchestratorService();

/**
 * Critical Security Endpoint: Stripe Webhook Handler
 */
router.post('/stripe', strictRateLimit, validateWebhookSignature, async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string;
    
    logSecurityEvent('webhook_received', {
        type: 'stripe',
        ip: req.ip,
        userAgent: req.get('User-Agent')
    }, req);
    
    try {
        const signature = req.headers['stripe-signature'] as string;
        let event: Stripe.Event;
        
        try {
            event = paymentService.verifyWebhookSignature(req.body, signature);
            
            logSecurityEvent('webhook_signature_verified', {
                eventType: event.type,
                eventId: event.id,
                processingTime: Date.now() - startTime
            }, req);
            
        } catch (error) {
            logSecurityEvent('webhook_signature_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                signatureProvided: !!signature,
                bodySize: req.body?.length || 0
            }, req);
            
            return res.status(400).json({ 
                error: 'Invalid webhook signature',
                received: false,
                requestId
            });
        }

        // Process the webhook event
        let processingResult;
        switch (event.type) {
            case 'payment_intent.succeeded':
                processingResult = await handlePaymentIntentSucceeded(event, req);
                break;
                
            case 'payment_intent.payment_failed':
                processingResult = await handlePaymentIntentFailed(event, req);
                break;
                
            default:
                logTransactionEvent('unknown', 'webhook_unhandled_event', {
                    eventType: event.type,
                    eventId: event.id
                });
        }

        const totalProcessingTime = Date.now() - startTime;
        
        logTransactionEvent('webhook', 'webhook_processed_successfully', {
            eventType: event.type,
            eventId: event.id,
            processingTime: totalProcessingTime,
            result: processingResult
        });

        res.status(200).json({ 
            received: true, 
            eventType: event.type,
            requestId,
            processingTime: totalProcessingTime
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const processingTime = Date.now() - startTime;
        
        logSecurityEvent('webhook_processing_error', {
            error: errorMessage,
            processingTime,
            stack: error instanceof Error ? error.stack : undefined
        }, req);
        
        res.status(500).json({ 
            error: 'Webhook processing failed',
            received: false,
            requestId,
            processingTime
        });
    }
});

async function handlePaymentIntentSucceeded(event: Stripe.Event, req: Request) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    if (!internalTransactionId) {
        logSecurityEvent('webhook_missing_transaction_id', {
            eventId: event.id,
            paymentIntentId: paymentIntent.id
        }, req);
        throw new Error('Missing internal transaction ID');
    }
    
    logTransactionEvent(internalTransactionId, 'payment_succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        eventId: event.id
    });
    
    try {
        await orchestratorService.handleSuccessfulPayment(internalTransactionId);
        
        logTransactionEvent(internalTransactionId, 'orchestration_completed', {
            paymentIntentId: paymentIntent.id,
            eventId: event.id
        });
        
        return { success: true, transactionId: internalTransactionId };
    } catch (error) {
        logTransactionEvent(internalTransactionId, 'orchestration_failed', {
            paymentIntentId: paymentIntent.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            eventId: event.id
        });
        throw error;
    }
}

async function handlePaymentIntentFailed(event: Stripe.Event, req: Request) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const internalTransactionId = paymentIntent.metadata.internalTransactionId;
    
    logTransactionEvent(internalTransactionId || 'unknown', 'payment_failed', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        lastPaymentError: paymentIntent.last_payment_error,
        eventId: event.id
    });
    
    return { success: false, transactionId: internalTransactionId };
}

export default router;