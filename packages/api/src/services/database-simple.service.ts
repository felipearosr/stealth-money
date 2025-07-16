// src/services/database-simple.service.ts
import { Pool } from 'pg';

interface Transaction {
  id: string;
  amount: number;
  sourceCurrency: string;
  destCurrency: string;
  exchangeRate: number;
  recipientAmount: number;
  status: string;
  stripePaymentIntentId?: string;
  blockchainTxHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SimpleDatabaseService {
  private pool: Pool | null = null;
  private isConfigured: boolean = false;

  constructor() {
    // Use the same DATABASE_URL from your .env
    const connectionString = process.env.DATABASE_URL;
    
    console.log('🔍 Database URL check:', connectionString ? 'configured' : 'undefined');
    
    if (!connectionString || connectionString === 'postgresql://user:password@host:port/dbname') {
      console.log('⚠️  No database URL configured - using mock mode');
      this.isConfigured = false;
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        max: 10
      });
      this.isConfigured = true;
      console.log('✅ Database pool initialized');
    } catch (error) {
      console.log('⚠️  Database initialization failed - using mock mode');
      this.isConfigured = false;
    }
  }

  async initialize() {
    if (!this.isConfigured || !this.pool) {
      console.log('⚠️  Database not configured - skipping table creation');
      return false;
    }

    try {
      // Create the transactions table if it doesn't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          amount DECIMAL(10,2) NOT NULL,
          source_currency VARCHAR(3) NOT NULL,
          dest_currency VARCHAR(3) NOT NULL,
          exchange_rate DECIMAL(10,6) NOT NULL,
          recipient_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'PENDING',
          stripe_payment_intent_id VARCHAR(255) UNIQUE,
          blockchain_tx_hash VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Database table created/verified');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return false;
    }
  }

  async createTransaction(data: {
    amount: number;
    sourceCurrency: string;
    destCurrency: string;
    exchangeRate: number;
    recipientAmount: number;
  }): Promise<Transaction> {
    if (!this.isConfigured || !this.pool) {
      // Return mock transaction for testing
      return {
        id: `mock_${Date.now()}`,
        amount: data.amount,
        sourceCurrency: data.sourceCurrency,
        destCurrency: data.destCurrency,
        exchangeRate: data.exchangeRate,
        recipientAmount: data.recipientAmount,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const query = `
      INSERT INTO transactions (amount, source_currency, dest_currency, exchange_rate, recipient_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.amount,
      data.sourceCurrency,
      data.destCurrency,
      data.exchangeRate,
      data.recipientAmount
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTransactionStatus(
    id: string,
    status: string,
    details: { paymentId?: string; txHash?: string }
  ): Promise<Transaction> {
    if (!this.isConfigured || !this.pool) {
      // Return mock updated transaction
      return {
        id,
        amount: 100,
        sourceCurrency: 'USD',
        destCurrency: 'EUR',
        exchangeRate: 0.85,
        recipientAmount: 85,
        status,
        stripePaymentIntentId: details.paymentId,
        blockchainTxHash: details.txHash,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const query = `
      UPDATE transactions 
      SET 
        status = $1,
        stripe_payment_intent_id = COALESCE($2, stripe_payment_intent_id),
        blockchain_tx_hash = COALESCE($3, blockchain_tx_hash),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING 
        id,
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [status, details.paymentId, details.txHash, id];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    if (!this.isConfigured || !this.pool) {
      // Return mock transaction for testing
      if (id.startsWith('mock_')) {
        return {
          id,
          amount: 100,
          sourceCurrency: 'USD',
          destCurrency: 'EUR',
          exchangeRate: 0.85,
          recipientAmount: 85,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      return null;
    }

    const query = `
      SELECT 
        id,
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    if (!this.isConfigured || !this.pool) {
      // Return empty array for mock mode
      return [];
    }

    const query = `
      SELECT 
        id,
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async testConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.pool) {
      console.log('⚠️  Database not configured - skipping connection test');
      return false;
    }

    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Database connection successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}