# Database Setup Guide

## Quick Start

1. **Get a PostgreSQL Database**
   - **Supabase** (Recommended): Go to [supabase.com/database](https://supabase.com/database)
   - **Neon**: Go to [neon.tech](https://neon.tech)
   - Both offer free tiers with connection strings

2. **Configure Database URL**
   Update your `.env` file with your database connection string:
   ```env
   DATABASE_URL="postgresql://username:password@host:port/database"
   ```

3. **Run Database Migration**
   ```bash
   npm run db:migrate -- --name init
   ```

4. **Generate Prisma Client**
   ```bash
   npm run db:generate
   ```

## Available Scripts

- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Database Schema

The `Transaction` model tracks:
- Amount and currencies (source/destination)
- Exchange rate and recipient amount
- Status (PENDING, PROCESSING, COMPLETED, FAILED)
- Payment integration IDs (Stripe, blockchain)
- Timestamps

## Testing

Once set up, test the API:
```bash
# Create a transfer (creates DB record)
curl -X POST http://localhost:4000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "sourceCurrency": "USD", "destCurrency": "EUR"}'

# Get all transactions
curl http://localhost:4000/api/transfers

# Get specific transaction
curl http://localhost:4000/api/transfers/{transaction-id}
```