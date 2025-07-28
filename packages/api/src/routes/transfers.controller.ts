// src/routes/transfers.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FxService } from '../services/fx.service';
import { SimpleDatabaseService } from '../services/database-simple.service';
import { BlockchainService } from '../services/blockchain.service';
import { PaymentService } from '../services/payment.service';
import { PaymentProcessorService, SelectionCriteria } from '../services/payment-processor.service';

const router = Router();
const fxService = new FxService();
const dbService = new SimpleDatabaseService();
const blockchainService = new BlockchainService();
const paymentService = new PaymentService();
const paymentProcessorService = new PaymentProcessorService();

// Zod schema for validation
const createTransferSchema = z.object({
    amount: z.number().positive(),
    sourceCurrency: z.string().length(3),
    destCurrency: z.string().length(3),
    userId: z.string().optional(),
    processorId: z.string().optional(),
    // Future fields: recipientDetails, etc.
});

const processorSelectionSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    amount: z.number().positive().optional(),
    currency: z.string().length(3).optional(),
    prioritizeCost: z.boolean().optional().default(false),
    prioritizeSpeed: z.boolean().optional().default(false),
    prioritizeReliability: z.boolean().optional().default(true),
    maxFeePercentage: z.number().positive().optional(),
    preferredProcessors: z.array(z.string()).optional(),
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

        const { amount, sourceCurrency, destCurrency, userId, processorId } = validatedData;

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

        let paymentResult;
        let selectedProcessor = 'stripe'; // Default fallback

        try {
            if (userId && !processorId) {
                // Use intelligent processor selection
                console.log('Using intelligent processor selection for user:', userId);
                
                const location = await paymentProcessorService.analyzeUserLocation(userId);
                const criteria: SelectionCriteria = {
                    prioritizeCost: false,
                    prioritizeSpeed: false,
                    prioritizeReliability: true
                };

                const paymentData = {
                    amount,
                    currency: sourceCurrency,
                    description: `Transfer from ${sourceCurrency} to ${destCurrency}`,
                    metadata: { transactionId: newTransaction.id }
                };

                paymentResult = await paymentProcessorService.processPaymentWithFallback(
                    location,
                    paymentData,
                    criteria
                );

                selectedProcessor = paymentResult.processorResponse?.actualProcessor || 
                                 paymentResult.processorResponse?.processorId || 
                                 'stripe';

            } else if (processorId) {
                // Use specified processor
                console.log('Using specified processor:', processorId);
                selectedProcessor = processorId;

                const paymentData = {
                    amount,
                    currency: sourceCurrency,
                    description: `Transfer from ${sourceCurrency} to ${destCurrency}`,
                    metadata: { transactionId: newTransaction.id }
                };

                paymentResult = await paymentProcessorService.processPayment(processorId, paymentData);

            } else {
                // Fallback to Stripe for backward compatibility
                console.log('Using default Stripe processor');
                const amountInCents = Math.round(amount * 100);
                const stripeResult = await paymentService.createPaymentIntent(
                    amountInCents,
                    sourceCurrency,
                    newTransaction.id
                );

                paymentResult = {
                    success: true,
                    transactionId: newTransaction.id,
                    clientSecret: stripeResult.clientSecret,
                    paymentIntentId: stripeResult.paymentIntentId
                };
            }

            if (!paymentResult.success) {
                throw new Error(paymentResult.error || 'Payment processing failed');
            }

            // Update our DB record with the payment processor information
            await dbService.updateTransactionStatus(newTransaction.id, 'PENDING_PAYMENT', { 
                paymentId: paymentResult.paymentIntentId || paymentResult.transactionId,
                processorId: selectedProcessor,
                processorResponse: paymentResult.processorResponse
            });

            console.log(`Exchange rate ${sourceCurrency} to ${destCurrency}: ${exchangeRate}`);
            console.log(`${amount} ${sourceCurrency} = ${recipientAmount.toFixed(2)} ${destCurrency}`);
            console.log(`Transaction created with ID: ${newTransaction.id}`);
            console.log(`Payment processed with processor: ${selectedProcessor}`);

            // The frontend needs this information to complete the payment
            res.status(201).json({
                clientSecret: paymentResult.clientSecret,
                transactionId: newTransaction.id,
                paymentId: paymentResult.paymentIntentId || paymentResult.transactionId,
                processorId: selectedProcessor,
                rate: exchangeRate,
                sourceAmount: amount,
                recipientAmount: parseFloat(recipientAmount.toFixed(2)),
                sourceCurrency,
                destCurrency,
                status: 'PENDING_PAYMENT',
                createdAt: newTransaction.createdAt,
                fallbackUsed: paymentResult.processorResponse?.fallbackUsed || false,
                processorInfo: paymentResult.processorResponse ? {
                    originalProcessor: paymentResult.processorResponse.originalProcessor,
                    actualProcessor: paymentResult.processorResponse.actualProcessor
                } : undefined
            });

        } catch (processorError) {
            console.error('Processor selection/payment failed, falling back to Stripe:', processorError);
            
            // Final fallback to Stripe
            try {
                const amountInCents = Math.round(amount * 100);
                const { clientSecret, paymentIntentId } = await paymentService.createPaymentIntent(
                    amountInCents,
                    sourceCurrency,
                    newTransaction.id
                );

                await dbService.updateTransactionStatus(newTransaction.id, 'PENDING_PAYMENT', { 
                    paymentId: paymentIntentId,
                    processorId: 'stripe',
                    fallbackReason: processorError instanceof Error ? processorError.message : 'Unknown error'
                });

                res.status(201).json({
                    clientSecret,
                    transactionId: newTransaction.id,
                    paymentId: paymentIntentId,
                    processorId: 'stripe',
                    rate: exchangeRate,
                    sourceAmount: amount,
                    recipientAmount: parseFloat(recipientAmount.toFixed(2)),
                    sourceCurrency,
                    destCurrency,
                    status: 'PENDING_PAYMENT',
                    createdAt: newTransaction.createdAt,
                    fallbackUsed: true,
                    fallbackReason: 'Primary processor selection failed'
                });

            } catch (stripeError) {
                console.error('Final Stripe fallback also failed:', stripeError);
                
                // Update transaction status to failed
                await dbService.updateTransactionStatus(newTransaction.id, 'FAILED', {
                    error: 'All payment processors failed'
                });

                return res.status(500).json({
                    message: 'All payment processors failed',
                    transactionId: newTransaction.id,
                    error: stripeError instanceof Error ? stripeError.message : 'Unknown error'
                });
            }
        }

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

// NEW PROCESSOR SELECTION ENDPOINTS

/**
 * GET /api/processors/available/:userId
 * Get available payment processors for a user based on their location
 */
router.get('/processors/available/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        
        // Analyze user location
        const location = await paymentProcessorService.analyzeUserLocation(userId);
        
        // Get available processors for this location
        const availableProcessors = await paymentProcessorService.getAvailableProcessors(location);
        
        res.json({
            success: true,
            data: {
                location,
                processors: availableProcessors,
                count: availableProcessors.length
            },
            message: 'Available processors retrieved successfully'
        });
    } catch (error) {
        console.error('Get available processors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get available processors',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/processors/select
 * Select optimal payment processor based on criteria
 */
router.post('/processors/select', async (req: Request, res: Response) => {
    try {
        const validatedData = processorSelectionSchema.parse(req.body);
        
        // Analyze user location
        const location = await paymentProcessorService.analyzeUserLocation(validatedData.userId);
        
        // Get available processors
        const availableProcessors = await paymentProcessorService.getAvailableProcessors(location);
        
        if (availableProcessors.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No payment processors available for your location'
            });
        }
        
        // Build selection criteria
        const criteria: SelectionCriteria = {
            prioritizeCost: validatedData.prioritizeCost,
            prioritizeSpeed: validatedData.prioritizeSpeed,
            prioritizeReliability: validatedData.prioritizeReliability,
            maxFeePercentage: validatedData.maxFeePercentage,
            preferredProcessors: validatedData.preferredProcessors
        };
        
        // Select optimal processor
        const selection = await paymentProcessorService.selectOptimalProcessor(
            availableProcessors,
            criteria
        );
        
        res.json({
            success: true,
            data: {
                location,
                selection,
                criteria
            },
            message: 'Optimal processor selected successfully'
        });
    } catch (error) {
        console.error('Processor selection error:', error);
        
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid selection criteria',
                errors: error.errors
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to select processor',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/processors/capabilities
 * Get capabilities of all payment processors
 */
router.get('/processors/capabilities', async (req: Request, res: Response) => {
    try {
        const { country, currency } = req.query;
        
        // Get all processor capabilities
        const capabilities = [];
        const processorIds = ['stripe', 'plaid', 'circle'];
        
        for (const processorId of processorIds) {
            try {
                const adapter = (paymentProcessorService as any).adapters.get(processorId);
                if (adapter) {
                    const capability = adapter.getCapabilities();
                    const isAvailable = await adapter.isAvailable();
                    
                    // Filter by country and currency if specified
                    let includeProcessor = true;
                    if (country && !capability.supportedCountries.includes(country as string)) {
                        includeProcessor = false;
                    }
                    if (currency && !capability.supportedCurrencies.includes(currency as string)) {
                        includeProcessor = false;
                    }
                    
                    if (includeProcessor) {
                        capabilities.push({
                            ...capability,
                            isAvailable
                        });
                    }
                }
            } catch (error) {
                console.warn(`Error getting capabilities for ${processorId}:`, error);
            }
        }
        
        res.json({
            success: true,
            data: {
                processors: capabilities,
                filters: {
                    country: country as string || null,
                    currency: currency as string || null
                }
            },
            message: 'Processor capabilities retrieved successfully'
        });
    } catch (error) {
        console.error('Get processor capabilities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get processor capabilities',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/processors/health
 * Check health and availability of all payment processors
 */
router.get('/processors/health', async (req: Request, res: Response) => {
    try {
        const healthChecks = [];
        const processorIds = ['stripe', 'plaid', 'circle'];
        
        for (const processorId of processorIds) {
            try {
                const adapter = (paymentProcessorService as any).adapters.get(processorId);
                if (adapter) {
                    const isAvailable = await adapter.isAvailable();
                    const capability = adapter.getCapabilities();
                    
                    healthChecks.push({
                        processorId,
                        name: capability.name,
                        isAvailable,
                        status: isAvailable ? 'healthy' : 'unavailable',
                        lastChecked: new Date().toISOString()
                    });
                }
            } catch (error) {
                healthChecks.push({
                    processorId,
                    isAvailable: false,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    lastChecked: new Date().toISOString()
                });
            }
        }
        
        const overallHealth = healthChecks.some(check => check.isAvailable) ? 'healthy' : 'degraded';
        
        res.json({
            success: true,
            data: {
                overallHealth,
                processors: healthChecks,
                timestamp: new Date().toISOString()
            },
            message: 'Processor health check completed'
        });
    } catch (error) {
        console.error('Processor health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check processor health',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;