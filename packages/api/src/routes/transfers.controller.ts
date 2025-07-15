// src/routes/transfers.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FxService } from '../services/fx.service';
import { DatabaseService } from '../services/database.service';
import { BlockchainService } from '../services/blockchain.service';
import { PaymentService } from '../services/payment.service';

const router = Router();
const fxService = new FxService();
const dbService = new DatabaseService();
const blockchainService = new BlockchainService();
const paymentService = new PaymentService();

// Zod schema for validation
const createTransferSchema = z.object({
    amount: z.number().positive(),
    sourceCurrency: z.string().length(3),
    destCurrency: z.string().length(3),
    // Future fields: recipientDetails, etc.
});

// Test endpoint to check blockchain connection and wallet balance
router.get('/blockchain/health', async (req: Request, res: Response) => {
    try {
        const healthCheck = await blockchainService.healthCheck();
        const walletBalance = await blockchainService.getWalletBalance();
        
        res.json({
            ...healthCheck,
            walletBalance: `${walletBalance} ETH`,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Blockchain health check error:', error);
        res.status(500).json({
            message: 'Blockchain connection failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test endpoint to check contract token balance
router.get('/blockchain/contract-balance', async (req: Request, res: Response) => {
    try {
        const tokenBalance = await blockchainService.getContractTokenBalance();
        
        res.json({
            contractAddress: blockchainService.getContractAddress(),
            tokenBalance,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Contract balance check error:', error);
        res.status(500).json({
            message: 'Could not fetch contract balance',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get Stripe publishable key for frontend
router.get('/stripe/config', async (req: Request, res: Response) => {
    try {
        const publishableKey = paymentService.getPublishableKey();
        res.json({
            publishableKey,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Stripe config error:', error);
        res.status(500).json({
            message: 'Could not fetch Stripe configuration',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get payment intent status
router.get('/payments/:paymentIntentId', async (req: Request, res: Response) => {
    try {
        const { paymentIntentId } = req.params;
        const paymentIntent = await paymentService.getPaymentIntent(paymentIntentId);
        
        res.json({
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            metadata: paymentIntent.metadata,
            created: paymentIntent.created,
        });
    } catch (error) {
        console.error('Payment intent retrieval error:', error);
        res.status(500).json({
            message: 'Could not fetch payment intent',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test endpoint to check exchange rates
router.get('/exchange-rate/:from/:to', async (req: Request, res: Response) => {
    try {
        const { from, to } = req.params;

        if (!from || !to || from.length !== 3 || to.length !== 3) {
            return res.status(400).json({
                message: 'Invalid currency codes. Both must be 3 characters.'
            });
        }

        const rate = await fxService.getRate(from.toUpperCase(), to.toUpperCase());

        res.json({
            from: from.toUpperCase(),
            to: to.toUpperCase(),
            rate,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Exchange rate error:', error);
        res.status(500).json({
            message: 'Could not fetch exchange rate',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get transaction by ID
router.get('/transfers/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const transaction = await dbService.getTransaction(id);
        
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        
        res.json(transaction);
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            message: 'Could not fetch transaction',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get all transactions
router.get('/transfers', async (req: Request, res: Response) => {
    try {
        const transactions = await dbService.getAllTransactions();
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            message: 'Could not fetch transactions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.post('/transfers', async (req: Request, res: Response) => {
    try {
        const validatedData = createTransferSchema.parse(req.body);
        console.log('Transfer request validated:', validatedData);

        const { amount, sourceCurrency, destCurrency } = validatedData;

        // Fetch exchange rate using FxService
        const exchangeRate = await fxService.getRate(sourceCurrency, destCurrency);
        const recipientAmount = amount * exchangeRate;

        // Create transaction record in database
        const newTransaction = await dbService.createTransaction({
            amount,
            sourceCurrency,
            destCurrency,
            exchangeRate,
            recipientAmount: parseFloat(recipientAmount.toFixed(2)),
        });

        // Create Stripe Payment Intent
        // Stripe requires the amount in cents, so we multiply by 100
        const amountInCents = Math.round(amount * 100);
        const { clientSecret, paymentIntentId } = await paymentService.createPaymentIntent(
            amountInCents,
            sourceCurrency,
            newTransaction.id
        );

        // Update our DB record with the Stripe Payment Intent ID for tracking
        await dbService.updateTransactionStatus(newTransaction.id, 'PENDING_PAYMENT', { 
            paymentId: paymentIntentId 
        });

        console.log(`Exchange rate ${sourceCurrency} to ${destCurrency}: ${exchangeRate}`);
        console.log(`${amount} ${sourceCurrency} = ${recipientAmount.toFixed(2)} ${destCurrency}`);
        console.log(`Transaction created with ID: ${newTransaction.id}`);
        console.log(`Payment Intent created: ${paymentIntentId}`);

        // The frontend needs this secret to confirm the payment
        res.status(201).json({
            clientSecret,
            transactionId: newTransaction.id,
            rate: exchangeRate,
            sourceAmount: amount,
            recipientAmount: parseFloat(recipientAmount.toFixed(2)),
            sourceCurrency,
            destCurrency,
            status: 'PENDING_PAYMENT',
            createdAt: newTransaction.createdAt,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ message: 'Invalid input', errors: error.errors });
        }
        console.error('Transfer error:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Stripe webhook endpoint (requires raw body parser)
// Note: This endpoint needs express.raw() middleware for proper signature verification
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
    try {
        const sig = req.headers['stripe-signature'] as string;
        
        if (!sig) {
            return res.status(400).json({ message: 'Missing stripe-signature header' });
        }

        // Note: req.body should be raw buffer for signature verification
        // You'll need to configure express.raw() middleware for this route
        const event = paymentService.verifyWebhookSignature(req.body, sig);
        
        console.log('Received Stripe webhook:', event.type);

        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                const transactionId = paymentIntent.metadata.internalTransactionId;
                
                if (transactionId) {
                    // Update database status to PAID
                    await dbService.updateTransactionStatus(transactionId, 'PAID', {
                        paymentId: paymentIntent.id
                    });
                    
                    console.log(`Payment succeeded for transaction: ${transactionId}`);
                    
                    // TODO: Trigger blockchain release here
                    // const transaction = await dbService.getTransaction(transactionId);
                    // await blockchainService.releaseFunds(recipientAddress, amount, transactionId);
                }
                break;
                
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                const failedTransactionId = failedPayment.metadata.internalTransactionId;
                
                if (failedTransactionId) {
                    await dbService.updateTransactionStatus(failedTransactionId, 'FAILED', {
                        paymentId: failedPayment.id
                    });
                    
                    console.log(`Payment failed for transaction: ${failedTransactionId}`);
                }
                break;
                
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(400).json({
            message: 'Webhook error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;