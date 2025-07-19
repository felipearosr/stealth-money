// src/routes/transfers.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FxService } from '../services/fx.service';
import { SimpleDatabaseService } from '../services/database-simple.service';
import { BlockchainService } from '../services/blockchain.service';
import { PaymentService } from '../services/payment.service';
import { 
  generalRateLimit, 
  strictRateLimit, 
  transferCreationRateLimit,
  apiKeyAuth 
} from '../middleware/security.middleware';
import { 
  validateTransferCreation,
  validateRecipientUpdate,
  validateTransactionId,
  validateExchangeRate,
  transferCreationSchema,
  recipientUpdateSchema
} from '../middleware/validation.middleware';
import { logTransactionEvent, logSecurityEvent } from '../middleware/logging.middleware';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const fxService = new FxService();
const dbService = new SimpleDatabaseService();
const blockchainService = new BlockchainService();
const paymentService = new PaymentService();

// Transfer creation validation schema
const createTransferSchema = z.object({
  amount: z.number().min(0.01).max(50000),
  sourceCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  destCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
  recipientUserId: z.string().min(1), // Recipient user ID (email or username)
  userId: z.string().optional(), // Sender user ID (from auth)
});

// Test endpoint to check blockchain connection and wallet balance
router.get('/blockchain/health', generalRateLimit, async (req: Request, res: Response) => {
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
router.get('/blockchain/contract-balance', generalRateLimit, async (req: Request, res: Response) => {
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
router.get('/stripe/config', generalRateLimit, async (req: Request, res: Response) => {
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

// Health check for orchestrator service
router.get('/orchestrator/health', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const { OrchestratorService } = await import('../services/orchestrator.service');
        const orchestratorService = new OrchestratorService();
        const health = await orchestratorService.healthCheck();
        
        res.json({
            ...health,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Orchestrator health check error:', error);
        res.status(500).json({
            message: 'Orchestrator health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test endpoint to directly trigger orchestrator workflow
router.post('/test-orchestrator', strictRateLimit, apiKeyAuth, async (req: Request, res: Response) => {
    try {
        const { transactionId } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ error: 'transactionId is required' });
        }
        
        console.log(`🧪 Test orchestrator triggered for transaction: ${transactionId}`);
        
        const { OrchestratorService } = await import('../services/orchestrator.service');
        const orchestratorService = new OrchestratorService();
        
        // Trigger the main orchestration workflow
        await orchestratorService.handleSuccessfulPayment(transactionId);
        
        res.json({
            success: true,
            message: 'Orchestrator workflow completed successfully',
            transactionId: transactionId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Test orchestrator error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            transactionId: req.body.transactionId
        });
    }
});

// Get payment intent status
router.get('/payments/:paymentIntentId', generalRateLimit, async (req: Request, res: Response) => {
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
router.get('/exchange-rate/:from/:to', generalRateLimit, validateExchangeRate, async (req: Request, res: Response) => {
    console.log(`📊 Exchange rate request: ${req.params.from} -> ${req.params.to}`);
    try {
        const { from, to } = req.params;

        if (!from || !to || from.length !== 3 || to.length !== 3) {
            console.log(`❌ Invalid currency codes: from=${from}, to=${to}`);
            return res.status(400).json({
                message: 'Invalid currency codes. Both must be 3 characters.'
            });
        }

        console.log(`🔄 Fetching rate for ${from.toUpperCase()} -> ${to.toUpperCase()}`);
        const rate = await fxService.getRate(from.toUpperCase(), to.toUpperCase());
        console.log(`✅ Rate fetched successfully: ${rate}`);

        res.json({
            from: from.toUpperCase(),
            to: to.toUpperCase(),
            rate,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('❌ Exchange rate error:', error);
        res.status(500).json({
            message: 'Could not fetch exchange rate',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get transaction by ID
router.get('/transfers/:id', generalRateLimit, validateTransactionId, async (req: Request, res: Response) => {
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

// Update transaction with recipient information
router.put('/transfers/:id/recipient', transferCreationRateLimit, validateRecipientUpdate, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { recipientName, recipientEmail, recipientPhone, payoutMethod, payoutDetails } = req.body;

        // Validate required fields
        if (!recipientName || !recipientEmail || !recipientPhone || !payoutMethod) {
            return res.status(400).json({ 
                message: 'Missing required recipient information',
                required: ['recipientName', 'recipientEmail', 'recipientPhone', 'payoutMethod']
            });
        }

        // Get the existing transaction
        const existingTransaction = await dbService.getTransaction(id);
        if (!existingTransaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Update the transaction with recipient information
        const updatedTransaction = await dbService.updateTransactionRecipient(id, {
            recipientName,
            recipientEmail,
            recipientPhone,
            payoutMethod,
            payoutDetails
        });

        // Create Stripe Payment Intent if not already created
        let clientSecret = null;
        if (!existingTransaction.stripePaymentIntentId) {
            const amountInCents = Math.round(existingTransaction.amount * 100);
            const paymentResult = await paymentService.createPaymentIntent(
                amountInCents,
                existingTransaction.sourceCurrency,
                id
            );
            clientSecret = paymentResult.clientSecret;

            // Update transaction with payment intent ID
            await dbService.updateTransactionStatus(id, 'PENDING_PAYMENT', { 
                paymentId: paymentResult.paymentIntentId 
            });
        }

        res.json({
            success: true,
            transaction: updatedTransaction,
            clientSecret,
            message: 'Recipient information updated successfully'
        });

    } catch (error) {
        console.error('Update recipient error:', error);
        res.status(500).json({
            message: 'Could not update recipient information',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get all transactions (now requires authentication and filters by user)
router.get('/transfers', requireAuth, async (req: Request, res: Response) => {
    try {
        // Get user ID from authenticated request
        const userId = (req as any).userId;
        
        if (!userId) {
            return res.status(401).json({ 
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }

        // Get transactions for the authenticated user
        const transactions = await dbService.getTransactionsByUserId(userId);
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            message: 'Could not fetch transactions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.post('/transfers', requireAuth, transferCreationRateLimit, validateTransferCreation, async (req: Request, res: Response) => {
    try {
        const validatedData = createTransferSchema.parse(req.body);
        console.log('Transfer request validated:', validatedData);

        // Get user ID from authenticated request
        const senderUserId = (req as any).userId;
        
        if (!senderUserId) {
            return res.status(401).json({ 
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }

        const { 
            amount, 
            sourceCurrency, 
            destCurrency,
            recipientUserId
        } = validatedData;

        // Validate that sender and recipient are different
        if (senderUserId === recipientUserId) {
            return res.status(400).json({
                message: 'Cannot send money to yourself',
                error: 'Invalid recipient'
            });
        }

        // TODO: Validate that recipientUserId exists in the system
        // For now, we'll assume the recipient exists

        // Fetch exchange rate using FxService
        const exchangeRate = await fxService.getRate(sourceCurrency, destCurrency);
        const recipientAmount = amount * exchangeRate;

        // Create transaction record in database for internal transfer
        const newTransaction = await dbService.createTransaction({
            amount,
            sourceCurrency,
            destCurrency,
            exchangeRate,
            recipientAmount: parseFloat(recipientAmount.toFixed(2)),
            recipientUserId, // Store recipientUserId
            userId: senderUserId, // Store senderUserId
        });

        // For internal transfers, we don't need Stripe payment intents
        // The money is transferred directly between accounts
        // Update transaction status to COMPLETED for internal transfers
        await dbService.updateTransactionStatus(newTransaction.id, 'COMPLETED', {});

        console.log(`Internal transfer created: ${amount} ${sourceCurrency} from ${senderUserId} to ${recipientUserId}`);
        console.log(`Exchange rate ${sourceCurrency} to ${destCurrency}: ${exchangeRate}`);
        console.log(`Recipient receives: ${recipientAmount.toFixed(2)} ${destCurrency}`);

        // Return success response for internal transfer
        res.status(201).json({
            success: true,
            transactionId: newTransaction.id,
            rate: exchangeRate,
            sourceAmount: amount,
            recipientAmount: parseFloat(recipientAmount.toFixed(2)),
            sourceCurrency,
            destCurrency,
            recipientUserId,
            status: 'COMPLETED',
            createdAt: newTransaction.createdAt,
            message: 'Money sent successfully to platform user'
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

// Note: Stripe webhook handling has been moved to /routes/webhooks.controller.ts
// This provides better separation of concerns and proper raw body parsing

export default router;