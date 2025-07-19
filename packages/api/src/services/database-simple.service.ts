// src/services/database-simple.service.ts
import { Pool } from 'pg';

interface Transaction {
  id: string;
  userId?: string; // Sender user ID
  recipientUserId?: string; // Recipient user ID for internal transfers
  amount: number;
  sourceCurrency: string;
  destCurrency: string;
  exchangeRate: number;
  recipientAmount: number;
  status: string;
  stripePaymentIntentId?: string;
  blockchainTxHash?: string;
  // Recipient Information (for external transfers - keeping for backward compatibility)
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  payoutMethod?: string;
  payoutDetails?: any;
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
          user_id VARCHAR(255),
          recipient_user_id VARCHAR(255),
          amount DECIMAL(10,2) NOT NULL,
          source_currency VARCHAR(3) NOT NULL,
          dest_currency VARCHAR(3) NOT NULL,
          exchange_rate DECIMAL(10,6) NOT NULL,
          recipient_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'PENDING',
          stripe_payment_intent_id VARCHAR(255) UNIQUE,
          blockchain_tx_hash VARCHAR(255) UNIQUE,
          
          -- Recipient Information (for external transfers - keeping for backward compatibility)
          recipient_name VARCHAR(255),
          recipient_email VARCHAR(255),
          recipient_phone VARCHAR(50),
          payout_method VARCHAR(50),
          payout_details JSONB,
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Add user_id column if it doesn't exist (migration)
      try {
        await this.pool.query(`
          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);
        `);
        console.log('✅ Added user_id column to transactions table');
      } catch (migrationError) {
        console.log('⚠️  user_id column migration skipped (may already exist)');
      }
      
      // Add recipient_user_id column if it doesn't exist (migration)
      try {
        await this.pool.query(`
          ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recipient_user_id VARCHAR(255);
        `);
        console.log('✅ Added recipient_user_id column to transactions table');
      } catch (migrationError) {
        console.log('⚠️  recipient_user_id column migration skipped (may already exist)');
      }
      
      // Add user_id index if it doesn't exist
      try {
        await this.pool.query(`
          CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        `);
      } catch (indexError) {
        console.log('Index creation skipped (may already exist)');
      }
      
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
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    payoutMethod?: string;
    payoutDetails?: any;
    userId?: string; // Sender user ID
    recipientUserId?: string; // Recipient user ID for internal transfers
  }): Promise<Transaction> {
    if (!this.isConfigured || !this.pool) {
      // Return mock transaction for testing
      return {
        id: `mock_${Date.now()}`,
        userId: data.userId,
        recipientUserId: data.recipientUserId,
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
      INSERT INTO transactions (
        user_id, recipient_user_id, amount, source_currency, dest_currency, exchange_rate, recipient_amount,
        recipient_name, recipient_email, recipient_phone, payout_method, payout_details
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING 
        id,
        user_id as "userId",
        recipient_user_id as "recipientUserId",
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        recipient_name as "recipientName",
        recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone",
        payout_method as "payoutMethod",
        payout_details as "payoutDetails",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      data.userId || null,
      data.recipientUserId || null,
      data.amount,
      data.sourceCurrency,
      data.destCurrency,
      data.exchangeRate,
      data.recipientAmount,
      data.recipientName || null,
      data.recipientEmail || null,
      data.recipientPhone || null,
      data.payoutMethod || null,
      data.payoutDetails ? JSON.stringify(data.payoutDetails) : null
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTransactionStatus(
    id: string,
    status: string,
    details: { paymentId?: string; txHash?: string; [key: string]: any }
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
        recipient_name as "recipientName",
        recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone",
        payout_method as "payoutMethod",
        payout_details as "payoutDetails",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [status, details.paymentId, details.txHash, id];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateTransactionRecipient(
    id: string,
    recipientData: {
      recipientName: string;
      recipientEmail: string;
      recipientPhone: string;
      payoutMethod: string;
      payoutDetails?: any;
    }
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
        status: 'PENDING',
        recipientName: recipientData.recipientName,
        recipientEmail: recipientData.recipientEmail,
        recipientPhone: recipientData.recipientPhone,
        payoutMethod: recipientData.payoutMethod,
        payoutDetails: recipientData.payoutDetails,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    const query = `
      UPDATE transactions 
      SET 
        recipient_name = $1,
        recipient_email = $2,
        recipient_phone = $3,
        payout_method = $4,
        payout_details = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
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
        recipient_name as "recipientName",
        recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone",
        payout_method as "payoutMethod",
        payout_details as "payoutDetails",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const values = [
      recipientData.recipientName,
      recipientData.recipientEmail,
      recipientData.recipientPhone,
      recipientData.payoutMethod,
      recipientData.payoutDetails ? JSON.stringify(recipientData.payoutDetails) : null,
      id
    ];

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
        recipient_name as "recipientName",
        recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone",
        payout_method as "payoutMethod",
        payout_details as "payoutDetails",
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

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    if (!this.isConfigured || !this.pool) {
      // Return empty array for mock mode
      return [];
    }

    const query = `
      SELECT 
        id,
        user_id as "userId",
        recipient_user_id as "recipientUserId",
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        recipient_name as "recipientName",
        recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone",
        payout_method as "payoutMethod",
        payout_details as "payoutDetails",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async getTransactionsReceivedByUserId(userId: string): Promise<Transaction[]> {
    if (!this.isConfigured || !this.pool) {
      // Return empty array for mock mode
      return [];
    }

    const query = `
      SELECT 
        id,
        user_id as "userId",
        recipient_user_id as "recipientUserId",
        amount,
        source_currency as "sourceCurrency",
        dest_currency as "destCurrency",
        exchange_rate as "exchangeRate",
        recipient_amount as "recipientAmount",
        status,
        stripe_payment_intent_id as "stripePaymentIntentId",
        blockchain_tx_hash as "blockchainTxHash",
        recipient_name as "recipientName",
        recipient_email as "recipientEmail",
        recipient_phone as "recipientPhone",
        payout_method as "payoutMethod",
        payout_details as "payoutDetails",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM transactions 
      WHERE recipient_user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
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