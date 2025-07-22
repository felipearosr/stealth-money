// src/routes/transfers.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FXService } from '../services/fx.service';
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
const fxService = new FXService();
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

// Transfer status endpoint - Task 4.3
router.get('/transfers/:id/status', generalRateLimit, async (req: Request, res: Response) => {
    try {
        // Validate request parameters
        const transferIdSchema = z.object({
            id: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/)
        });

        const { id } = transferIdSchema.parse(req.params);

        // Import services
        const { TransferService } = await import('../services/transfer.service');
        const transferService = new TransferService();

        // Get transfer status from TransferService
        let transferStatus;
        try {
            transferStatus = await transferService.getTransferStatus(id);
        } catch (error) {
            // If transfer not found in TransferService, check database
            const transaction = await dbService.getTransaction(id);
            if (!transaction) {
                return res.status(404).json({
                    error: 'TRANSFER_NOT_FOUND',
                    message: 'Transfer not found',
                    transferId: id
                });
            }

            // Convert database transaction to transfer status format
            transferStatus = {
                id: transaction.id,
                status: transaction.status || 'UNKNOWN',
                sendAmount: transaction.amount,
                receiveAmount: transaction.recipientAmount,
                exchangeRate: transaction.exchangeRate,
                fees: 0, // Calculate fees if needed
                timeline: [{
                    id: `event-${transaction.id}-created`,
                    transferId: transaction.id,
                    type: 'transfer_created',
                    status: 'success',
                    message: 'Transfer created',
                    timestamp: transaction.createdAt,
                    metadata: {}
                }],
                estimatedCompletion: transaction.createdAt ? 
                    new Date(new Date(transaction.createdAt).getTime() + 5 * 60 * 1000) : undefined,
                completedAt: transaction.status === 'COMPLETED' ? transaction.updatedAt : undefined
            };
        }

        // Format response according to design document
        const response = {
            transferId: transferStatus.id,
            status: transferStatus.status,
            timeline: transferStatus.timeline.map(event => ({
                type: event.type,
                status: event.status,
                message: event.message,
                timestamp: event.timestamp instanceof Date ? 
                    event.timestamp.toISOString() : event.timestamp,
                metadata: event.metadata || {}
            })),
            sendAmount: transferStatus.sendAmount,
            receiveAmount: transferStatus.receiveAmount,
            exchangeRate: transferStatus.exchangeRate,
            fees: transferStatus.fees,
            estimatedCompletion: transferStatus.estimatedCompletion instanceof Date ?
                transferStatus.estimatedCompletion.toISOString() : transferStatus.estimatedCompletion,
            completedAt: transferStatus.completedAt instanceof Date ?
                transferStatus.completedAt.toISOString() : transferStatus.completedAt,
            lastUpdated: new Date().toISOString()
        };

        res.json(response);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_TRANSFER_ID',
                message: 'Invalid transfer ID format',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Transfer status error:', error);
        res.status(500).json({
            error: 'STATUS_FETCH_FAILED',
            message: 'Failed to fetch transfer status',
            details: error instanceof Error ? error.message : 'Unknown error',
            retryable: true
        });
    }
});

// Transfer creation endpoint - Task 4.2
router.post('/transfers/create', transferCreationRateLimit, async (req: Request, res: Response) => {
    try {
        // Validate request body
        const createTransferSchema = z.object({
            sendAmount: z.number().min(0.01).max(50000),
            cardDetails: z.object({
                number: z.string().min(13).max(19),
                expiryMonth: z.number().min(1).max(12),
                expiryYear: z.number().min(new Date().getFullYear()).max(new Date().getFullYear() + 20),
                cvv: z.string().min(3).max(4)
            }),
            recipientInfo: z.object({
                name: z.string().min(2).max(100),
                email: z.string().email(),
                bankAccount: z.object({
                    iban: z.string().min(15).max(34),
                    bic: z.string().min(8).max(11),
                    bankName: z.string().min(2).max(100),
                    accountHolderName: z.string().min(2).max(100),
                    country: z.literal('DE')
                })
            }),
            rateId: z.string().optional() // Optional locked rate ID
        });

        const validatedData = createTransferSchema.parse(req.body);
        const { sendAmount, cardDetails, recipientInfo, rateId } = validatedData;

        // Get user ID from authenticated request (optional for now)
        const userId = (req as any).userId || 'anonymous-user';

        // Import services
        const { FXService } = await import('../services/fx.service');
        const { CirclePaymentService } = await import('../services/circle-payment.service');
        const { CircleWalletService } = await import('../services/circle-wallet.service');
        const { CirclePayoutService } = await import('../services/circle-payout.service');
        const { TransferService } = await import('../services/transfer.service');

        const fxService = new FXService();
        const transferService = new TransferService();

        // Validate or get exchange rate
        let exchangeRate: number;
        let calculation;

        if (rateId) {
            // Use locked rate if provided
            const lockedRate = await fxService.getLockedRate(rateId);
            if (!lockedRate) {
                return res.status(400).json({
                    error: 'RATE_EXPIRED',
                    message: 'The locked exchange rate has expired',
                    retryable: false
                });
            }
            exchangeRate = lockedRate.rate;
            calculation = {
                sendAmount: lockedRate.amount,
                receiveAmount: lockedRate.convertedAmount,
                exchangeRate: lockedRate.rate,
                fees: lockedRate.fees
            };
        } else {
            // Calculate fresh rate
            calculation = await fxService.calculateTransfer({
                sendAmount,
                sendCurrency: 'USD',
                receiveCurrency: 'EUR'
            });
            exchangeRate = calculation.exchangeRate;
        }

        // Create transfer record in database
        const transferRecord = await dbService.createTransaction({
            amount: sendAmount,
            sourceCurrency: 'USD',
            destCurrency: 'EUR',
            exchangeRate,
            recipientAmount: calculation.receiveAmount,
            recipientUserId: recipientInfo.email,
            userId,
            recipientEmail: recipientInfo.email,
            recipientName: recipientInfo.name,
            payoutMethod: 'bank_account',
            payoutDetails: {
                iban: recipientInfo.bankAccount.iban,
                bic: recipientInfo.bankAccount.bic,
                bankName: recipientInfo.bankAccount.bankName,
                accountHolderName: recipientInfo.bankAccount.accountHolderName,
                country: recipientInfo.bankAccount.country
            }
        });

        // Transform card details to match CirclePaymentService format
        const transformedCardDetails = {
            number: cardDetails.number,
            cvv: cardDetails.cvv,
            expiry: {
                month: cardDetails.expiryMonth.toString().padStart(2, '0'),
                year: cardDetails.expiryYear.toString()
            },
            billingDetails: {
                name: recipientInfo.name, // Use recipient name as default
                city: 'Unknown',
                country: 'US',
                line1: 'Unknown',
                postalCode: '00000'
            }
        };

        // Process the transfer using TransferService
        const result = await transferService.createTransfer({
            sendAmount,
            sendCurrency: 'USD',
            receiveCurrency: 'EUR',
            cardDetails: transformedCardDetails,
            recipientInfo,
            exchangeRate
        });

        // Return success response
        res.status(201).json({
            transferId: transferRecord.id,
            status: 'PROCESSING', // Use a consistent status for the API response
            estimatedCompletion: result.estimatedCompletion?.toISOString(),
            sendAmount,
            receiveAmount: calculation.receiveAmount,
            exchangeRate,
            fees: calculation.fees,
            timeline: [{
                type: 'transfer_created',
                status: 'success',
                message: 'Transfer created successfully',
                timestamp: new Date().toISOString()
            }]
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'VALIDATION_FAILED',
                message: 'Request validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                })),
                retryable: false
            });
        }

        console.error('Transfer creation error:', error);
        res.status(500).json({
            error: 'TRANSFER_CREATION_FAILED',
            message: 'Failed to create transfer',
            details: error instanceof Error ? error.message : 'Unknown error',
            retryable: true
        });
    }
});

// Transfer calculation endpoint - Task 4.1
router.post('/transfers/calculate', generalRateLimit, async (req: Request, res: Response) => {
    try {
        // Validate request body
        const calculateSchema = z.object({
            sendAmount: z.number().min(0.01).max(50000),
            sendCurrency: z.enum(['USD']), // Currently only USD supported for sending
            receiveCurrency: z.enum(['EUR', 'CLP', 'MXN', 'GBP']) // Multiple receive currencies
        });

        const validatedData = calculateSchema.parse(req.body);
        const { sendAmount, sendCurrency, receiveCurrency } = validatedData;

        // Use the FXService instance
        const fxServiceInstance = new FXService();

        // Calculate transfer using the FX service
        const calculation = await fxServiceInstance.calculateTransfer({
            sendAmount,
            sendCurrency,
            receiveCurrency
        });

        // Format response according to design document
        const response = {
            sendAmount: calculation.sendAmount,
            receiveAmount: calculation.receiveAmount,
            sendCurrency: validatedData.sendCurrency,
            receiveCurrency: validatedData.receiveCurrency,
            exchangeRate: calculation.exchangeRate,
            fees: calculation.fees.total,
            rateValidUntil: calculation.rateValidUntil.toISOString(),
            breakdown: {
                sendAmountUSD: calculation.breakdown.sendAmountUSD,
                fees: {
                    cardProcessing: calculation.fees.cardProcessing,
                    transfer: calculation.fees.transfer,
                    payout: calculation.fees.payout,
                    total: calculation.fees.total
                },
                netAmountUSD: calculation.breakdown.netAmountUSD,
                exchangeRate: calculation.breakdown.exchangeRate,
                grossAmountReceive: calculation.breakdown.grossAmountReceive,
                transferFee: calculation.breakdown.transferFee,
                payoutFee: calculation.breakdown.payoutFee,
                finalAmountReceive: calculation.breakdown.finalAmountReceive,
                receiveAmount: calculation.breakdown.finalAmountReceive
            },
            estimatedArrival: calculation.estimatedArrival,
            rateId: calculation.rateId
        };

        res.json(response);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Request validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Transfer calculation error:', error);
        res.status(500).json({
            error: 'CALCULATION_FAILED',
            message: 'Failed to calculate transfer',
            details: error instanceof Error ? error.message : 'Unknown error',
            retryable: true
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

router.post('/transfers', transferCreationRateLimit, validateTransferCreation, async (req: Request, res: Response) => {
    try {
        const validatedData = createTransferSchema.parse(req.body);
        console.log('Transfer request validated:', validatedData);

        // Get user ID from authenticated request
        let senderUserId = (req as any).userId;
        
        // If no user ID is provided, use a fallback for testing
        if (!senderUserId) {
          senderUserId = 'felipe-test-user';
        }

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
        // Temporarily allow sending to yourself for testing
        // if (senderUserId === recipientUserId) {
        //     return res.status(400).json({
        //         message: 'Cannot send money to yourself',
        //         error: 'Invalid recipient'
        //     });
        // }

        // For now, we'll use the recipientUserId as the recipient
        // In a real implementation, you'd look up the user by email
        let actualRecipientUserId = recipientUserId;
        
        // Simple email to user ID mapping for testing
        // In production, this would be a database lookup
        if (recipientUserId.includes('@')) {
          // If it's an email, map it to a user ID
          if (recipientUserId === 'felipe.aros.r@gmail.com') {
            actualRecipientUserId = senderUserId; // Send to yourself for testing
          } else {
            // For other emails, create a user ID based on the email
            actualRecipientUserId = `user_${recipientUserId.replace('@', '_').replace('.', '_')}`;
          }
        }

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
            recipientUserId: actualRecipientUserId, // Store recipientUserId
            userId: senderUserId, // Store senderUserId
            recipientEmail: recipientUserId.includes('@') ? recipientUserId : undefined, // Store email if it's an email
        });

        // For internal transfers, we don't need Stripe payment intents
        // The money is transferred directly between accounts
        // Update transaction status to COMPLETED for internal transfers
        await dbService.updateTransactionStatus(newTransaction.id, 'COMPLETED', {});

        console.log(`Internal transfer created: ${amount} ${sourceCurrency} from ${senderUserId} to ${actualRecipientUserId}`);
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
            recipientUserId: actualRecipientUserId,
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