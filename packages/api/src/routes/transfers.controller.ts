// src/routes/transfers.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// Zod schema for validation
const createTransferSchema = z.object({
  amount: z.number().positive(),
  sourceCurrency: z.string().length(3),
  destCurrency: z.string().length(3),
  // Future fields: recipientDetails, etc.
});

router.post('/transfers', (req: Request, res: Response) => {
  try {
    const validatedData = createTransferSchema.parse(req.body);
    console.log('Transfer request validated:', validatedData);

    // Placeholder for business logic
    const transactionId = `txn_${Date.now()}`;

    res.status(201).json({
      message: 'Transfer initiated',
      transactionId,
      data: validatedData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;