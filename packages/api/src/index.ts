// src/index.ts
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import transferRoutes from './routes/transfers.controller';
import { SimpleDatabaseService } from './services/database-simple.service';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable JSON body parsing

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

// Wire up the transfer routes with /api prefix
app.use('/api', transferRoutes);

// Initialize database and start server
async function startServer() {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);