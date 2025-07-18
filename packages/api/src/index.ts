// src/index.ts
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import transferRoutes from './routes/transfers.controller';
import webhookRoutes from './routes/webhooks.controller';
import { SimpleDatabaseService } from './services/database-simple.service';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
console.log(`🔧 Environment PORT: ${process.env.PORT}`);
console.log(`🔧 Using PORT: ${PORT}`);

app.use(cors()); // Enable Cross-Origin Resource Sharing

// CRITICAL: Raw body parsing for Stripe webhooks MUST come before express.json()
// Stripe requires the raw, unparsed body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json()); // Enable JSON body parsing for all other routes

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

// Simple test endpoint
app.get('/test', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      hasExchangeRateKey: !!process.env.EXCHANGERATE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
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

// Debug environment variables
app.get('/debug-env', (req: Request, res: Response) => {
  res.json({
    port: process.env.PORT,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    hasStripePublishable: !!process.env.STRIPE_PUBLISHABLE_KEY,
    stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 10),
    stripePublishablePrefix: process.env.STRIPE_PUBLISHABLE_KEY?.substring(0, 10),
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Wire up the transfer routes with /api prefix
app.use('/api', transferRoutes);

// Wire up the webhook routes with /api prefix
app.use('/api/webhooks', webhookRoutes);

// Add error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
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