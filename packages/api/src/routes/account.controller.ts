// src/routes/account.controller.ts
import { Router, Request, Response } from 'express';
import { SimpleDatabaseService } from '../services/database-simple.service';
import { requireAuth } from '../middleware/auth.middleware';
import { generalRateLimit } from '../middleware/security.middleware';

const router = Router();
const dbService = new SimpleDatabaseService();

// Get user's account balance and received money
router.get('/account/balance', requireAuth, generalRateLimit, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        
        if (!userId) {
            return res.status(401).json({ 
                message: 'User authentication required',
                error: 'No user ID found in request'
            });
        }

        // Get all transactions for the user
        const transactions = await dbService.getTransactionsByUserId(userId);
        
        // Calculate balance metrics
        let totalReceived = 0;
        let availableBalance = 0;
        let pendingAmount = 0;
        const recentTransactions: any[] = [];
        let primaryCurrency = 'USD'; // Default currency

        transactions.forEach(transaction => {
            // For now, we'll consider all completed transactions as "received money"
            // In a real implementation, you'd distinguish between sent and received
            if (transaction.status === 'COMPLETED') {
                totalReceived += transaction.recipientAmount;
                availableBalance += transaction.recipientAmount;
                primaryCurrency = transaction.destCurrency;
                
                // Add to recent transactions (last 10)
                if (recentTransactions.length < 10) {
                    recentTransactions.push({
                        id: transaction.id,
                        amount: transaction.recipientAmount,
                        currency: transaction.destCurrency,
                        status: transaction.status,
                        senderName: transaction.recipientName || 'Unknown Sender',
                        createdAt: transaction.createdAt
                    });
                }
            } else if (transaction.status === 'PROCESSING' || transaction.status === 'PENDING_PAYMENT') {
                pendingAmount += transaction.recipientAmount;
                primaryCurrency = transaction.destCurrency;
            }
        });

        // Sort recent transactions by date (newest first)
        recentTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        res.json({
            totalReceived: parseFloat(totalReceived.toFixed(2)),
            availableBalance: parseFloat(availableBalance.toFixed(2)),
            pendingAmount: parseFloat(pendingAmount.toFixed(2)),
            currency: primaryCurrency,
            recentTransactions
        });

    } catch (error) {
        console.error('Account balance error:', error);
        res.status(500).json({
            message: 'Could not fetch account balance',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get user's transaction history
router.get('/account/transactions', requireAuth, generalRateLimit, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        
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

    } catch (error) {
        console.error('Account transactions error:', error);
        res.status(500).json({
            message: 'Could not fetch transaction history',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get user's account summary
router.get('/account/summary', requireAuth, generalRateLimit, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        
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

    } catch (error) {
        console.error('Account summary error:', error);
        res.status(500).json({
            message: 'Could not fetch account summary',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router; 