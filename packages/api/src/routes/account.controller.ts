// src/routes/account.controller.ts
import { Router, Request, Response } from 'express';
import { SimpleDatabaseService } from '../services/database-simple.service';
import { requireAuth } from '../middleware/auth.middleware';
import { generalRateLimit } from '../middleware/security.middleware';

const router = Router();
const dbService = new SimpleDatabaseService();

// Get user account balance and recent transactions
router.get('/account/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'User authentication required',
        error: 'No user ID found in request'
      });
    }

    // Get all transactions for the user (sent and received)
    const sentTransactions = await dbService.getTransactionsByUserId(userId);
    const receivedTransactions = await dbService.getTransactionsReceivedByUserId(userId);

    // Calculate totals
    const totalSent = sentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    const totalReceived = receivedTransactions.reduce((sum, tx) => sum + tx.recipientAmount, 0);
    const availableBalance = totalReceived - totalSent;

    // Get recent received transactions (money sent to this user)
    const recentReceived = receivedTransactions
      .filter(tx => tx.status === 'COMPLETED')
      .slice(0, 5)
      .map(tx => ({
        id: tx.id,
        amount: tx.recipientAmount,
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
  } catch (error) {
    console.error('Get account balance error:', error);
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