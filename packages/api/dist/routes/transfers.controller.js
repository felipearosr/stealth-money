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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/transfers.controller.ts
const express_1 = require("express");
const zod_1 = require("zod");
const fx_service_1 = require("../services/fx.service");
const database_simple_service_1 = require("../services/database-simple.service");
const blockchain_service_1 = require("../services/blockchain.service");
const payment_service_1 = require("../services/payment.service");
const router = (0, express_1.Router)();
const fxService = new fx_service_1.FxService();
const dbService = new database_simple_service_1.SimpleDatabaseService();
const blockchainService = new blockchain_service_1.BlockchainService();
const paymentService = new payment_service_1.PaymentService();
// Zod schema for validation
const createTransferSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    sourceCurrency: zod_1.z.string().length(3),
    destCurrency: zod_1.z.string().length(3),
    // Recipient information (optional for now to maintain backward compatibility)
    recipientName: zod_1.z.string().min(1).optional(),
    recipientEmail: zod_1.z.string().email().optional(),
    recipientPhone: zod_1.z.string().min(1).optional(),
    payoutMethod: zod_1.z.enum(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card']).optional(),
    payoutDetails: zod_1.z.object({
        bankName: zod_1.z.string().optional(),
        accountNumber: zod_1.z.string().optional(),
        routingNumber: zod_1.z.string().optional(),
        walletProvider: zod_1.z.string().optional(),
        walletNumber: zod_1.z.string().optional(),
        pickupLocation: zod_1.z.string().optional(),
    }).optional(),
});
// Test endpoint to check blockchain connection and wallet balance
router.get('/blockchain/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const healthCheck = yield blockchainService.healthCheck();
        const walletBalance = yield blockchainService.getWalletBalance();
        res.json(Object.assign(Object.assign({}, healthCheck), { walletBalance: `${walletBalance} ETH`, timestamp: new Date().toISOString() }));
    }
    catch (error) {
        console.error('Blockchain health check error:', error);
        res.status(500).json({
            message: 'Blockchain connection failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Test endpoint to check contract token balance
router.get('/blockchain/contract-balance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tokenBalance = yield blockchainService.getContractTokenBalance();
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
}));
// Get Stripe publishable key for frontend
router.get('/stripe/config', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
}));
// Health check for orchestrator service
router.get('/orchestrator/health', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { OrchestratorService } = yield Promise.resolve().then(() => __importStar(require('../services/orchestrator.service')));
        const orchestratorService = new OrchestratorService();
        const health = yield orchestratorService.healthCheck();
        res.json(Object.assign(Object.assign({}, health), { timestamp: new Date().toISOString() }));
    }
    catch (error) {
        console.error('Orchestrator health check error:', error);
        res.status(500).json({
            message: 'Orchestrator health check failed',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Test endpoint to directly trigger orchestrator workflow
router.post('/test-orchestrator', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { transactionId } = req.body;
        if (!transactionId) {
            return res.status(400).json({ error: 'transactionId is required' });
        }
        console.log(`🧪 Test orchestrator triggered for transaction: ${transactionId}`);
        const { OrchestratorService } = yield Promise.resolve().then(() => __importStar(require('../services/orchestrator.service')));
        const orchestratorService = new OrchestratorService();
        // Trigger the main orchestration workflow
        yield orchestratorService.handleSuccessfulPayment(transactionId);
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
}));
// Get payment intent status
router.get('/payments/:paymentIntentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paymentIntentId } = req.params;
        const paymentIntent = yield paymentService.getPaymentIntent(paymentIntentId);
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
}));
// Test endpoint to check exchange rates
router.get('/exchange-rate/:from/:to', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const rate = yield fxService.getRate(from.toUpperCase(), to.toUpperCase());
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
}));
// Get transaction by ID
router.get('/transfers/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const transaction = yield dbService.getTransaction(id);
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
}));
// Get all transactions
router.get('/transfers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transactions = yield dbService.getAllTransactions();
        res.json(transactions);
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            message: 'Could not fetch transactions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
router.post('/transfers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = createTransferSchema.parse(req.body);
        console.log('Transfer request validated:', validatedData);
        const { amount, sourceCurrency, destCurrency, recipientName, recipientEmail, recipientPhone, payoutMethod, payoutDetails } = validatedData;
        // Fetch exchange rate using FxService
        const exchangeRate = yield fxService.getRate(sourceCurrency, destCurrency);
        const recipientAmount = amount * exchangeRate;
        // Create transaction record in database with recipient information
        const newTransaction = yield dbService.createTransaction({
            amount,
            sourceCurrency,
            destCurrency,
            exchangeRate,
            recipientAmount: parseFloat(recipientAmount.toFixed(2)),
            recipientName,
            recipientEmail,
            recipientPhone,
            payoutMethod,
            payoutDetails,
        });
        // Create Stripe Payment Intent
        // Stripe requires the amount in cents, so we multiply by 100
        const amountInCents = Math.round(amount * 100);
        const { clientSecret, paymentIntentId } = yield paymentService.createPaymentIntent(amountInCents, sourceCurrency, newTransaction.id);
        // Update our DB record with the Stripe Payment Intent ID for tracking
        yield dbService.updateTransactionStatus(newTransaction.id, 'PENDING_PAYMENT', {
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
}));
// Note: Stripe webhook handling has been moved to /routes/webhooks.controller.ts
// This provides better separation of concerns and proper raw body parsing
exports.default = router;
