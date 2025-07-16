"use strict";
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
    // Future fields: recipientDetails, etc.
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
        const { amount, sourceCurrency, destCurrency } = validatedData;
        // Fetch exchange rate using FxService
        const exchangeRate = yield fxService.getRate(sourceCurrency, destCurrency);
        const recipientAmount = amount * exchangeRate;
        // Create transaction record in database
        const newTransaction = yield dbService.createTransaction({
            amount,
            sourceCurrency,
            destCurrency,
            exchangeRate,
            recipientAmount: parseFloat(recipientAmount.toFixed(2)),
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
// Stripe webhook endpoint (requires raw body parser)
// Note: This endpoint needs express.raw() middleware for proper signature verification
router.post('/webhooks/stripe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sig = req.headers['stripe-signature'];
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
                    yield dbService.updateTransactionStatus(transactionId, 'PAID', {
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
                    yield dbService.updateTransactionStatus(failedTransactionId, 'FAILED', {
                        paymentId: failedPayment.id
                    });
                    console.log(`Payment failed for transaction: ${failedTransactionId}`);
                }
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(400).json({
            message: 'Webhook error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;
