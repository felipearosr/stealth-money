import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors()); // Allow requests from your Next.js frontend
app.use(express.json()); // Allow the server to accept JSON in request bodies

// --- API Endpoints ---

// A simple health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'API is running' });
});

// THIS IS A PLACEHOLDER for your core financial endpoint
// In the real app, this would be protected by authentication middleware
app.post('/v1/transfers', (req: Request, res: Response) => {
  const { amount, sourceCurrency, destCurrency, recipientDetails } = req.body;

  console.log('Received transfer request:', req.body);

  // TODO:
  // 1. Validate the input
  // 2. Perform business logic (calculate fees, etc.)
  // 3. Initiate the payment flow (Stripe/Plaid)
  // 4. On success, interact with the smart contract
  // 5. Save transaction to the database

  // For now, just send a success response
  res.status(201).json({ 
    message: 'Transfer initiated successfully',
    transactionId: `txn_${Date.now()}` 
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Stealth Money API listening on port ${PORT}`);
});