// src/index.ts
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import transferRoutes from './routes/transfers.controller';
import webhookRoutes from './routes/webhooks.controller';
import accountRoutes from './routes/account.controller';
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
    const dbService = new SimpleDatabaseService();
    
    // Test database connection and initialize tables
    console.log('🔌 Testing database connection...');
    const connected = await dbService.testConnection();
    
    if (connected) {
      console.log('📊 Initializing database tables...');
      const initialized = await dbService.initialize();
      
      if (initialized) {
        console.log('✅ Database ready!');
      } else {
        console.log('⚠️  Database initialization failed, but continuing...');
      }
    } else {
      console.log('⚠️  Database connection failed, but continuing...');
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
      console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();