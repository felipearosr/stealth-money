// src/index.ts
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import transferRoutes from './routes/transfers.controller';
import webhookRoutes from './routes/webhooks.controller';
import accountRoutes from './routes/account.controller';
import currencyRoutes from './routes/currencies.controller';
import userRoutes from './routes/users.controller';
import verificationRoutes from './routes/verification.controller';
import cookathonRoutes from './routes/cookathon.routes';
import { SimpleDatabaseService } from './services/database-simple.service';
import { 
  helmetConfig, 
  generalRateLimit, 
  speedLimiter, 
  corsConfig, 
  requestId, 
  sanitizeInput 
} from './middleware/security.middleware';
import { requestLogger, errorLogger, logger } from './middleware/logging.middleware';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

logger.info('Starting Stealth Money API', {
  port: PORT,
  nodeEnv: process.env.NODE_ENV,
  blockchainMode: process.env.BLOCKCHAIN_MODE || 'mock'
});

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Security middleware (order matters!)
app.use(requestId);
app.use(helmetConfig);
app.use(speedLimiter);
app.use(generalRateLimit);
app.use(cors(corsConfig));

// Request logging middleware
app.use(requestLogger);

// Input sanitization middleware
app.use(sanitizeInput);

// CRITICAL: Raw body parsing for Stripe webhooks MUST come before express.json()
// Stripe requires the raw, unparsed body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' })); // Enable JSON body parsing with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Stealth Money API',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

// Email-based balance lookup (for Clerk integration)
app.get('/balance-by-email/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const dbService = new SimpleDatabaseService();
    
    // Find all transactions where this email is the recipient
    const receivedTransactions = await dbService.getTransactionsReceivedByEmail(email);
    
    // Calculate totals
    const totalReceived = receivedTransactions.reduce((sum: number, tx: any) => {
      const amount = typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0;
      return sum + amount;
    }, 0);
    
    // For now, assume no money sent (since we're just receiving)
    const totalSent = 0;
    const availableBalance = totalReceived - totalSent;

    // Get recent received transactions
    const recentReceived = receivedTransactions
      .filter((tx: any) => tx.status === 'COMPLETED')
      .slice(0, 5)
      .map((tx: any) => ({
        id: tx.id,
        amount: typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0,
        currency: tx.destCurrency,
        from: tx.userId,
        status: tx.status,
        date: tx.createdAt
      }));

    res.json({
      email,
      totalSent: parseFloat(totalSent.toFixed(2)),
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      recentReceived,
      message: "This balance will be available when you create your Clerk account with this email"
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get balance by email',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test account balance for any user
app.get('/test-balance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const dbService = new SimpleDatabaseService();
    
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
      return sum + amount;
    }, 0);
    
    const availableBalance = totalReceived - totalSent;

    // Get recent received transactions
    const recentReceived = receivedTransactions
      .filter(tx => tx.status === 'COMPLETED')
      .slice(0, 5)
      .map(tx => ({
        id: tx.id,
        amount: typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0,
        currency: tx.destCurrency,
        from: tx.userId,
        status: tx.status,
        date: tx.createdAt
      }));

    res.json({
      userId,
      totalSent: parseFloat(totalSent.toFixed(2)),
      totalReceived: parseFloat(totalReceived.toFixed(2)),
      availableBalance: parseFloat(availableBalance.toFixed(2)),
      recentReceived
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get account balance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Direct exchange rate test
app.get('/test-rate', async (req: Request, res: Response) => {
  try {
    const { FxService } = await import('./services/fx.service');
    const fxService = new FxService();
    const rate = await fxService.getRate('USD', 'EUR');
    res.json({ 
      success: true,
      rate,
      from: 'USD',
      to: 'EUR',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Direct rate test error:', error);
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Wire up the transfer routes with /api prefix
app.use('/api', transferRoutes);

// Wire up the webhook routes with /api prefix
app.use('/api/webhooks', webhookRoutes);

// Wire up the account routes with /api prefix
app.use('/api', accountRoutes);

// Wire up the currency routes with /api prefix
app.use('/api/currencies', currencyRoutes);

// Wire up the user routes with /api prefix
app.use('/api/users', userRoutes);
// Wire up the verification routes with /api prefix
app.use('/api', verificationRoutes);
// Wire up the cookathon routes with /api prefix
app.use('/api/cookathon', cookathonRoutes);

// Error logging middleware
app.use(errorLogger);

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  const requestId = req.headers['x-request-id'] as string;
  
  logger.error('Unhandled application error', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    requestId,
    ...(isDevelopment && { stack: err.stack })
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔧 Starting server initialization...');
    console.log('🔧 PORT:', PORT);
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    
    // Start the server immediately without waiting for database
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
      console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    });

    server.on('listening', () => {
      console.log('✅ Server is listening successfully');
    });

    // Initialize database in the background (non-blocking)
    initializeDatabase();

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Background database initialization
async function initializeDatabase() {
  try {
    const dbService = new SimpleDatabaseService();
    
    console.log('🔌 Testing database connection...');
    const connected = await dbService.testConnection();
    
    if (connected) {
      console.log('📊 Initializing database tables...');
      const initialized = await dbService.initialize();
      
      if (initialized) {
        console.log('✅ Database ready!');
      } else {
        console.log('⚠️  Database initialization failed, but server is running...');
      }
    } else {
      console.log('⚠️  Database connection failed, but server is running...');
    }
  } catch (error) {
    console.error('⚠️  Database initialization error:', error);
  }
}

startServer();