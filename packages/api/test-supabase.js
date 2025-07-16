// Simple Supabase connection test
const { Pool } = require('pg');
require('dotenv').config();

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  const connectionString = process.env.DATABASE_URL;
  console.log('Connection string configured:', !!connectionString);
  
  if (!connectionString) {
    console.log('❌ No DATABASE_URL found');
    return;
  }

  // Try different connection configurations
  const configs = [
    {
      name: 'Current config (with SSL)',
      config: {
        connectionString,
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Without SSL',
      config: {
        connectionString: connectionString.replace('?sslmode=require', '')
      }
    },
    {
      name: 'Force IPv4',
      config: {
        connectionString,
        ssl: { rejectUnauthorized: false },
        host: 'db.vradxugwllymezpjijfn.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres.vradxugwllymezpjijfn',
        password: 'KeH2hAcLQaEg9GF8'
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🧪 Testing: ${name}`);
    const pool = new Pool(config);
    
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Success!', result.rows[0]);
      client.release();
      await pool.end();
      break; // Stop on first success
    } catch (error) {
      console.log('❌ Failed:', error.message);
      await pool.end();
    }
  }
}

testSupabaseConnection().catch(console.error);