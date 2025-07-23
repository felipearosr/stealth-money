"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/transfers.controller.ts
const express_1 = require("express");
const zod_1 = require("zod");
const fx_service_1 = require("../services/fx.service");
const database_simple_service_1 = require("../services/database-simple.service");
const blockchain_service_1 = require("../services/blockchain.service");
const payment_service_1 = require("../services/payment.service");
const security_middleware_1 = require("../middleware/security.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const fxService = new fx_service_1.FXService();
const dbService = new database_simple_service_1.SimpleDatabaseService();
const blockchainService = new blockchain_service_1.BlockchainService();
const paymentService = new payment_service_1.PaymentService();
// Transfer creation validation schema
const createTransferSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0.01).max(50000),
    sourceCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
    destCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
    recipientUserId: zod_1.z.string().min(1), // Recipient user ID (email or username)
    userId: zod_1.z.string().optional(), // Sender user ID (from auth)
});
// Test endpoint to check blockchain connection and wallet balance
router.get('/blockchain/health', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const healthCheck = await blockchainService.healthCheck();
        const walletBalance = await blockchainService.getWalletBalance();
        res.json({
            ...healthCheck,
            walletBalance: `${walletBalance} ETH`,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Blockchain health check error:', error);
        res.status(500).json({
            message: 'Blockchain connection failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test endpoint to check contract token balance
router.get('/blockchain/contract-balance', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const tokenBalance = await blockchainService.getContractTokenBalance();
        res.json({
            contractAddress: blockchainService.getContractAddress(),
            tokenBalance,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Contract balance check error:', error);
        res.status(500).json({
            message: 'Could not fetch contract balance',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get Stripe publishable key for frontend
router.get('/stripe/config', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const publishableKey = paymentService.getPublishableKey();
        res.json({
            publishableKey,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Stripe config error:', error);
        res.status(500).json({
            message: 'Could not fetch Stripe configuration',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Health check for orchestrator service
router.get('/orchestrator/health', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const { OrchestratorService } = await Promise.resolve().then(() => __importStar(require('../services/orchestrator.service')));
        const orchestratorService = new OrchestratorService();
        const health = await orchestratorService.healthCheck();
        res.json({
            ...health,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Orchestrator health check error:', error);
        res.status(500).json({
            message: 'Orchestrator health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test endpoint to directly trigger orchestrator workflow
router.post('/test-orchestrator', security_middleware_1.strictRateLimit, security_middleware_1.apiKeyAuth, async (req, res) => {
    try {
        const { transactionId } = req.body;
        if (!transactionId) {
            return res.status(400).json({ error: 'transactionId is required' });
        }
        console.log(`🧪 Test orchestrator triggered for transaction: ${transactionId}`);
        const { OrchestratorService } = await Promise.resolve().then(() => __importStar(require('../services/orchestrator.service')));
        const orchestratorService = new OrchestratorService();
        // Trigger the main orchestration workflow
        await orchestratorService.handleSuccessfulPayment(transactionId);
        res.json({
            success: true,
            message: 'Orchestrator workflow completed successfully',
            transactionId: transactionId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Test orchestrator error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            transactionId: req.body.transactionId
        });
    }
});
// Get payment intent status
router.get('/payments/:paymentIntentId', security_middleware_1.generalRateLimit, async (req, res) => {
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
    }
    catch (error) {
        console.error('Payment intent retrieval error:', error);
        res.status(500).json({
            message: 'Could not fetch payment intent',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Transfer status endpoint - Task 4.3
router.get('/transfers/:id/status', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        // Validate request parameters
        const transferIdSchema = zod_1.z.object({
            id: zod_1.z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/)
        });
        const { id } = transferIdSchema.parse(req.params);
        // Import services
        const { TransferService } = await Promise.resolve().then(() => __importStar(require('../services/transfer.service')));
        const transferService = new TransferService();
        // Get transfer status from TransferService
        let transferStatus;
        try {
            transferStatus = await transferService.getTransferStatus(id);
        }
        catch (error) {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
// Transfer creation endpoint - Enhanced for multi-currency support
router.post('/transfers/create', security_middleware_1.transferCreationRateLimit, async (req, res) => {
    try {
        // Import currency configuration service
        const { CurrencyConfigService } = await Promise.resolve().then(() => __importStar(require('../services/currency-config.service')));
        // Enhanced validation schema for multi-currency support
        const createTransferSchema = zod_1.z.object({
            sendAmount: zod_1.z.number().min(0.01),
            sendCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/).default('USD'),
            receiveCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
            cardDetails: zod_1.z.object({
                number: zod_1.z.string().min(13).max(19),
                expiryMonth: zod_1.z.number().min(1).max(12),
                expiryYear: zod_1.z.number().min(new Date().getFullYear()).max(new Date().getFullYear() + 20),
                cvv: zod_1.z.string().min(3).max(4)
            }),
            recipientInfo: zod_1.z.object({
                name: zod_1.z.string().min(2).max(100),
                email: zod_1.z.string().email(),
                bankAccount: zod_1.z.union([
                    // European bank account (IBAN/BIC) - supports all EUR countries
                    zod_1.z.object({
                        iban: zod_1.z.string().min(15).max(34),
                        bic: zod_1.z.string().min(8).max(11),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.enum(['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'LU', 'SI', 'SK', 'EE', 'LV', 'LT', 'MT', 'CY']),
                        currency: zod_1.z.literal('EUR')
                    }),
                    // UK bank account
                    zod_1.z.object({
                        sortCode: zod_1.z.string().length(6),
                        accountNumber: zod_1.z.string().min(8).max(8),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('GB'),
                        currency: zod_1.z.literal('GBP')
                    }),
                    // Swiss bank account
                    zod_1.z.object({
                        iban: zod_1.z.string().min(21).max(21), // Swiss IBAN is always 21 characters
                        bic: zod_1.z.string().min(8).max(11),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('CH'),
                        currency: zod_1.z.literal('CHF')
                    }),
                    // Canadian bank account
                    zod_1.z.object({
                        transitNumber: zod_1.z.string().length(5),
                        institutionNumber: zod_1.z.string().length(3),
                        accountNumber: zod_1.z.string().min(7).max(12),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('CA'),
                        currency: zod_1.z.literal('CAD')
                    }),
                    // Australian bank account
                    zod_1.z.object({
                        bsb: zod_1.z.string().length(6),
                        accountNumber: zod_1.z.string().min(6).max(10),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('AU'),
                        currency: zod_1.z.literal('AUD')
                    }),
                    // Japanese bank account
                    zod_1.z.object({
                        bankCode: zod_1.z.string().length(4),
                        branchCode: zod_1.z.string().length(3),
                        accountNumber: zod_1.z.string().min(7).max(8),
                        accountType: zod_1.z.enum(['ordinary', 'current']),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('JP'),
                        currency: zod_1.z.literal('JPY')
                    }),
                    // Mexican bank account (CLABE)
                    zod_1.z.object({
                        clabe: zod_1.z.string().length(18),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('MX'),
                        currency: zod_1.z.literal('MXN')
                    }),
                    // Chilean bank account
                    zod_1.z.object({
                        rut: zod_1.z.string().min(8).max(12),
                        bankCode: zod_1.z.string().min(3).max(4),
                        accountNumber: zod_1.z.string().min(8).max(20),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('CL'),
                        currency: zod_1.z.literal('CLP')
                    }),
                    // Brazilian bank account
                    zod_1.z.object({
                        bankCode: zod_1.z.string().length(3),
                        agencyCode: zod_1.z.string().min(4).max(5),
                        accountNumber: zod_1.z.string().min(8).max(13),
                        accountType: zod_1.z.enum(['checking', 'savings']),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.literal('BR'),
                        currency: zod_1.z.literal('BRL')
                    }),
                    // Generic bank account for other currencies
                    zod_1.z.object({
                        accountNumber: zod_1.z.string().min(8).max(34),
                        routingNumber: zod_1.z.string().min(8).max(11).optional(),
                        swiftCode: zod_1.z.string().min(8).max(11).optional(),
                        bankName: zod_1.z.string().min(2).max(100),
                        accountHolderName: zod_1.z.string().min(2).max(100),
                        country: zod_1.z.string().length(2),
                        currency: zod_1.z.enum(['SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ARS', 'COP', 'PEN', 'CNY', 'INR', 'KRW', 'SGD', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'ZAR', 'TRY'])
                    })
                ])
            }),
            rateId: zod_1.z.string().optional() // Optional locked rate ID
        });
        const validatedData = createTransferSchema.parse(req.body);
        const { sendAmount, sendCurrency, receiveCurrency, cardDetails, recipientInfo, rateId } = validatedData;
        // Validate currencies using CurrencyConfigService
        if (!CurrencyConfigService.isSendCurrencySupported(sendCurrency)) {
            return res.status(400).json({
                error: 'UNSUPPORTED_SEND_CURRENCY',
                message: `Send currency ${sendCurrency} is not supported`,
                supportedSendCurrencies: CurrencyConfigService.getSendCurrencies()
            });
        }
        if (!CurrencyConfigService.isReceiveCurrencySupported(receiveCurrency)) {
            return res.status(400).json({
                error: 'UNSUPPORTED_RECEIVE_CURRENCY',
                message: `Receive currency ${receiveCurrency} is not supported`,
                supportedReceiveCurrencies: CurrencyConfigService.getReceiveCurrencies()
            });
        }
        // Validate currency pair and amount
        const validationError = CurrencyConfigService.validateCurrencyPair(sendCurrency, receiveCurrency, sendAmount);
        if (validationError) {
            return res.status(400).json({
                error: 'VALIDATION_FAILED',
                message: validationError,
                retryable: false
            });
        }
        // Validate that recipient bank account currency matches receive currency
        if (recipientInfo.bankAccount.currency !== receiveCurrency) {
            return res.status(400).json({
                error: 'CURRENCY_MISMATCH',
                message: `Recipient bank account currency (${recipientInfo.bankAccount.currency}) must match receive currency (${receiveCurrency})`,
                retryable: false
            });
        }
        // Get user ID from authenticated request (optional for now)
        const userId = req.userId || 'anonymous-user';
        // Import services
        const { FXService } = await Promise.resolve().then(() => __importStar(require('../services/fx.service')));
        const { CirclePaymentService } = await Promise.resolve().then(() => __importStar(require('../services/circle-payment.service')));
        const { CircleWalletService } = await Promise.resolve().then(() => __importStar(require('../services/circle-wallet.service')));
        const { CirclePayoutService } = await Promise.resolve().then(() => __importStar(require('../services/circle-payout.service')));
        const { TransferService } = await Promise.resolve().then(() => __importStar(require('../services/transfer.service')));
        const fxService = new FXService();
        const transferService = new TransferService();
        // Validate or get exchange rate
        let exchangeRate;
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
        }
        else {
            // Calculate fresh rate with proper currency support
            calculation = await fxService.calculateTransfer({
                sendAmount,
                sendCurrency,
                receiveCurrency
            });
            exchangeRate = calculation.exchangeRate;
        }
        // Prepare payout details based on bank account type
        let payoutDetails;
        const bankAccount = recipientInfo.bankAccount;
        if ('iban' in bankAccount) {
            // European bank account
            payoutDetails = {
                iban: bankAccount.iban,
                bic: bankAccount.bic,
                bankName: bankAccount.bankName,
                accountHolderName: bankAccount.accountHolderName,
                country: bankAccount.country
            };
        }
        else if ('sortCode' in bankAccount) {
            // UK bank account
            payoutDetails = {
                sortCode: bankAccount.sortCode,
                accountNumber: bankAccount.accountNumber,
                bankName: bankAccount.bankName,
                accountHolderName: bankAccount.accountHolderName,
                country: bankAccount.country
            };
        }
        else if ('clabe' in bankAccount) {
            // Mexican bank account
            payoutDetails = {
                clabe: bankAccount.clabe,
                bankName: bankAccount.bankName,
                accountHolderName: bankAccount.accountHolderName,
                country: bankAccount.country
            };
        }
        else if ('rut' in bankAccount) {
            // Chilean bank account
            payoutDetails = {
                rut: bankAccount.rut,
                bankCode: bankAccount.bankCode,
                accountNumber: bankAccount.accountNumber,
                bankName: bankAccount.bankName,
                accountHolderName: bankAccount.accountHolderName,
                country: bankAccount.country
            };
        }
        // Create transfer record in database with multi-currency support
        const transferRecord = await dbService.createTransaction({
            amount: sendAmount,
            sourceCurrency: sendCurrency,
            destCurrency: receiveCurrency,
            exchangeRate,
            recipientAmount: calculation.receiveAmount,
            recipientUserId: recipientInfo.email,
            userId,
            recipientEmail: recipientInfo.email,
            recipientName: recipientInfo.name,
            payoutMethod: 'bank_account',
            payoutDetails
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
        // Process the transfer using TransferService with proper currency support
        const result = await transferService.createTransfer({
            sendAmount,
            sendCurrency,
            receiveCurrency,
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
// Transfer calculation endpoint - Enhanced for multi-currency support
router.post('/transfers/calculate', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        // Import currency configuration service
        const { CurrencyConfigService } = await Promise.resolve().then(() => __importStar(require('../services/currency-config.service')));
        // Validate request body with dynamic currency support
        const calculateSchema = zod_1.z.object({
            sendAmount: zod_1.z.number().min(0.01),
            sendCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
            receiveCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
            calculatorMode: zod_1.z.enum(['send', 'receive']).optional().default('send')
        });
        const validatedData = calculateSchema.parse(req.body);
        const { sendAmount, sendCurrency, receiveCurrency, calculatorMode } = validatedData;
        // Validate currencies using CurrencyConfigService
        if (!CurrencyConfigService.isSendCurrencySupported(sendCurrency)) {
            return res.status(400).json({
                error: 'UNSUPPORTED_SEND_CURRENCY',
                message: `Send currency ${sendCurrency} is not supported`,
                supportedSendCurrencies: CurrencyConfigService.getSendCurrencies()
            });
        }
        if (!CurrencyConfigService.isReceiveCurrencySupported(receiveCurrency)) {
            return res.status(400).json({
                error: 'UNSUPPORTED_RECEIVE_CURRENCY',
                message: `Receive currency ${receiveCurrency} is not supported`,
                supportedReceiveCurrencies: CurrencyConfigService.getReceiveCurrencies()
            });
        }
        // Validate currency pair and amount
        const validationError = CurrencyConfigService.validateCurrencyPair(sendCurrency, receiveCurrency, sendAmount);
        if (validationError) {
            return res.status(400).json({
                error: 'VALIDATION_FAILED',
                message: validationError,
                retryable: false
            });
        }
        // Use the FXService instance
        const fxServiceInstance = new fx_service_1.FXService();
        // Calculate transfer using the FX service
        const calculation = await fxServiceInstance.calculateTransfer({
            sendAmount,
            sendCurrency,
            receiveCurrency
        });
        // Get currency pair configuration for additional metadata
        const currencyPair = CurrencyConfigService.getCurrencyPair(sendCurrency, receiveCurrency);
        // Format response according to design document
        const response = {
            sendAmount: calculation.sendAmount,
            receiveAmount: calculation.receiveAmount,
            sendCurrency: validatedData.sendCurrency,
            receiveCurrency: validatedData.receiveCurrency,
            calculatorMode: calculatorMode,
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
            rateId: calculation.rateId,
            currencyPair: currencyPair ? {
                minAmount: currencyPair.minAmount,
                maxAmount: currencyPair.maxAmount,
                estimatedArrival: currencyPair.estimatedArrival
            } : undefined
        };
        res.json(response);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
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
// Lock exchange rate for a specific duration
router.post('/rates/lock', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        // Validation schema for rate locking
        const lockRateSchema = zod_1.z.object({
            fromCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
            toCurrency: zod_1.z.string().length(3).regex(/^[A-Z]{3}$/),
            amount: zod_1.z.number().min(0.01),
            lockDurationMinutes: zod_1.z.number().min(1).max(60).optional().default(10)
        });
        const validatedData = lockRateSchema.parse(req.body);
        const { fromCurrency, toCurrency, amount, lockDurationMinutes } = validatedData;
        // Import currency configuration service
        const { CurrencyConfigService } = await Promise.resolve().then(() => __importStar(require('../services/currency-config.service')));
        // Validate currency pair
        const validationError = CurrencyConfigService.validateCurrencyPair(fromCurrency, toCurrency, amount);
        if (validationError) {
            return res.status(400).json({
                error: 'VALIDATION_FAILED',
                message: validationError,
                retryable: false
            });
        }
        // Lock the rate using FX service
        const fxServiceInstance = new fx_service_1.FXService();
        const lockedRate = await fxServiceInstance.lockExchangeRate({
            fromCurrency,
            toCurrency,
            amount,
            lockDurationMinutes
        });
        res.json({
            rateId: lockedRate.rateId,
            fromCurrency: lockedRate.fromCurrency,
            toCurrency: lockedRate.toCurrency,
            rate: lockedRate.rate,
            amount: lockedRate.amount,
            convertedAmount: lockedRate.convertedAmount,
            fees: lockedRate.fees,
            lockedAt: lockedRate.lockedAt.toISOString(),
            expiresAt: lockedRate.expiresAt.toISOString(),
            isLocked: lockedRate.isLocked
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
        console.error('Rate locking error:', error);
        res.status(500).json({
            error: 'RATE_LOCK_FAILED',
            message: 'Failed to lock exchange rate',
            details: error instanceof Error ? error.message : 'Unknown error',
            retryable: true
        });
    }
});
// Get locked rate by ID
router.get('/rates/locked/:rateId', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const { rateId } = req.params;
        if (!rateId || rateId.length < 10) {
            return res.status(400).json({
                error: 'INVALID_RATE_ID',
                message: 'Invalid rate ID format'
            });
        }
        const fxServiceInstance = new fx_service_1.FXService();
        const lockedRate = await fxServiceInstance.getLockedRate(rateId);
        if (!lockedRate) {
            return res.status(404).json({
                error: 'RATE_NOT_FOUND',
                message: 'Locked rate not found or has expired'
            });
        }
        res.json({
            rateId: lockedRate.rateId,
            fromCurrency: lockedRate.fromCurrency,
            toCurrency: lockedRate.toCurrency,
            rate: lockedRate.rate,
            amount: lockedRate.amount,
            convertedAmount: lockedRate.convertedAmount,
            fees: lockedRate.fees,
            lockedAt: lockedRate.lockedAt.toISOString(),
            expiresAt: lockedRate.expiresAt.toISOString(),
            isLocked: lockedRate.isLocked
        });
    }
    catch (error) {
        console.error('Get locked rate error:', error);
        res.status(500).json({
            error: 'RATE_FETCH_FAILED',
            message: 'Failed to fetch locked rate',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get rate history for analytics
router.get('/rates/history/:fromCurrency/:toCurrency', security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const { fromCurrency, toCurrency } = req.params;
        const hours = parseInt(req.query.hours) || 24;
        if (!fromCurrency || !toCurrency || fromCurrency.length !== 3 || toCurrency.length !== 3) {
            return res.status(400).json({
                error: 'INVALID_CURRENCIES',
                message: 'Invalid currency codes. Both must be 3 characters.'
            });
        }
        if (hours < 1 || hours > 168) { // Max 1 week
            return res.status(400).json({
                error: 'INVALID_HOURS',
                message: 'Hours must be between 1 and 168 (1 week)'
            });
        }
        const fxServiceInstance = new fx_service_1.FXService();
        const history = await fxServiceInstance.getRateHistory(fromCurrency.toUpperCase(), toCurrency.toUpperCase(), hours);
        res.json({
            fromCurrency: fromCurrency.toUpperCase(),
            toCurrency: toCurrency.toUpperCase(),
            hours,
            history: history.map(entry => ({
                rate: entry.rate,
                timestamp: entry.timestamp.toISOString()
            })),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Rate history error:', error);
        res.status(500).json({
            error: 'HISTORY_FETCH_FAILED',
            message: 'Failed to fetch rate history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test endpoint to check exchange rates
router.get('/exchange-rate/:from/:to', security_middleware_1.generalRateLimit, validation_middleware_1.validateExchangeRate, async (req, res) => {
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
    }
    catch (error) {
        console.error('❌ Exchange rate error:', error);
        res.status(500).json({
            message: 'Could not fetch exchange rate',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get transaction by ID
router.get('/transfers/:id', security_middleware_1.generalRateLimit, validation_middleware_1.validateTransactionId, async (req, res) => {
    try {
        const { id } = req.params;
        const transaction = await dbService.getTransaction(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    }
    catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            message: 'Could not fetch transaction',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Update transaction with recipient information
router.put('/transfers/:id/recipient', security_middleware_1.transferCreationRateLimit, validation_middleware_1.validateRecipientUpdate, async (req, res) => {
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
            const paymentResult = await paymentService.createPaymentIntent(amountInCents, existingTransaction.sourceCurrency, id);
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
    }
    catch (error) {
        console.error('Update recipient error:', error);
        res.status(500).json({
            message: 'Could not update recipient information',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get all transactions (now requires authentication and filters by user)
router.get('/transfers', auth_middleware_1.requireAuth, async (req, res) => {
    try {
        // Get user ID from authenticated request
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }
        // Get transactions for the authenticated user
        const transactions = await dbService.getTransactionsByUserId(userId);
        res.json(transactions);
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            message: 'Could not fetch transactions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/transfers', security_middleware_1.transferCreationRateLimit, validation_middleware_1.validateTransferCreation, async (req, res) => {
    try {
        const validatedData = createTransferSchema.parse(req.body);
        console.log('Transfer request validated:', validatedData);
        // Get user ID from authenticated request
        let senderUserId = req.userId;
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
        const { amount, sourceCurrency, destCurrency, recipientUserId } = validatedData;
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
            }
            else {
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
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
exports.default = router;
