// src/routes/transfers.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { FxService } from '../services/fx.service';

const router = Router();
const fxService = new FxService();

// Zod schema for validation
const createTransferSchema = z.object({
    amount: z.number().positive(),
    sourceCurrency: z.string().length(3),
    destCurrency: z.string().length(3),
    // Future fields: recipientDetails, etc.
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

router.post('/transfers', async (req: Request, res: Response) => {
    try {
        const validatedData = createTransferSchema.parse(req.body);
        console.log('Transfer request validated:', validatedData);

        const { amount, sourceCurrency, destCurrency } = validatedData;

        // Fetch exchange rate using FxService
        const exchangeRate = await fxService.getRate(sourceCurrency, destCurrency);
        const convertedAmount = amount * exchangeRate;

        // Placeholder for business logic
        const transactionId = `txn_${Date.now()}`;

        console.log(`Exchange rate ${sourceCurrency} to ${destCurrency}: ${exchangeRate}`);
        console.log(`${amount} ${sourceCurrency} = ${convertedAmount.toFixed(2)} ${destCurrency}`);

        res.status(201).json({
            message: 'Transfer initiated',
            transactionId,
            data: {
                ...validatedData,
                exchangeRate,
                convertedAmount: parseFloat(convertedAmount.toFixed(2)),
            },
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

export default router;