// src/index.ts
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import transferRoutes from './routes/transfers.controller';
import { SimpleDatabaseService } from './services/database-simple.service';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable JSON body parsing

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
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

  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);