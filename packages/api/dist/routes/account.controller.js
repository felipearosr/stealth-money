"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/account.controller.ts
const express_1 = require("express");
const database_simple_service_1 = require("../services/database-simple.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const security_middleware_1 = require("../middleware/security.middleware");
const router = (0, express_1.Router)();
const dbService = new database_simple_service_1.SimpleDatabaseService();
// Get user account balance and recent transactions
router.get('/account/balance', async (req, res) => {
    try {
        let userId = req.userId;
        // If no user ID is provided, use a fallback for testing
        if (!userId) {
            userId = 'felipe-test-user';
        }
        // Allow checking other user balances for demo purposes
        const queryUserId = req.query.userId;
        if (queryUserId) {
            userId = queryUserId;
        }
        if (!userId) {
            return res.status(401).json({
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }
        // Get all transactions for the user (sent and received)
        const sentTransactions = await dbService.getTransactionsByUserId(userId);
        const receivedTransactions = await dbService.getTransactionsReceivedByUserId(userId);
        // Calculate totals with safety checks
        const totalSent = sentTransactions.reduce((sum, tx) => {
            const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0;
            return sum + amount;
        }, 0);
        const totalReceived = receivedTransactions.reduce((sum, tx) => {
            const amount = typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0;
            // Only count USD amounts for balance calculation to avoid currency mixing
            if (tx.destCurrency === 'USD') {
                return sum + amount;
            }
            return sum;
        }, 0);
        const availableBalance = totalReceived - totalSent;
        // Get recent received transactions (money sent to this user)
        const recentReceived = receivedTransactions
            .filter(tx => tx.status === 'COMPLETED')
            .slice(0, 5)
            .map(tx => ({
            id: tx.id,
            amount: typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0,
            currency: tx.destCurrency,
            from: tx.userId, // Sender's user ID
            status: tx.status,
            date: tx.createdAt
        }));
        res.json({
            totalSent: parseFloat(totalSent.toFixed(2)),
            totalReceived: parseFloat(totalReceived.toFixed(2)),
            availableBalance: parseFloat(availableBalance.toFixed(2)),
            recentReceived
        });
    }
    catch (error) {
        console.error('Get account balance error:', error);
        res.status(500).json({
            message: 'Could not fetch account balance',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get user's transaction history
router.get('/account/transactions', auth_middleware_1.requireAuth, security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }
        const transactions = await dbService.getTransactionsByUserId(userId);
        // Format transactions for frontend
        const formattedTransactions = transactions.map(transaction => ({
            id: transaction.id,
            type: 'received', // For now, all transactions are considered "received"
            amount: transaction.recipientAmount,
            currency: transaction.destCurrency,
            status: transaction.status,
            senderName: transaction.recipientName || 'Unknown Sender',
            senderEmail: transaction.recipientEmail,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
        }));
        res.json({
            transactions: formattedTransactions,
            total: formattedTransactions.length
        });
    }
    catch (error) {
        console.error('Account transactions error:', error);
        res.status(500).json({
            message: 'Could not fetch transaction history',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get user's account summary
router.get('/account/summary', auth_middleware_1.requireAuth, security_middleware_1.generalRateLimit, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }
        const transactions = await dbService.getTransactionsByUserId(userId);
        // Calculate summary statistics
        const summary = {
            totalTransactions: transactions.length,
            completedTransactions: transactions.filter(t => t.status === 'COMPLETED').length,
            pendingTransactions: transactions.filter(t => t.status === 'PENDING_PAYMENT' || t.status === 'PROCESSING').length,
            totalAmountReceived: transactions
                .filter(t => t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.recipientAmount, 0),
            currencies: [...new Set(transactions.map(t => t.destCurrency))],
            lastTransactionDate: transactions.length > 0
                ? new Date(Math.max(...transactions.map(t => new Date(t.createdAt).getTime())))
                : null
        };
        res.json(summary);
    }
    catch (error) {
        console.error('Account summary error:', error);
        res.status(500).json({
            message: 'Could not fetch account summary',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
