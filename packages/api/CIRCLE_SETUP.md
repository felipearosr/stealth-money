# Circle API Integration Setup

This document explains how to set up Circle API integration for the zero-friction international transfer system.

## Overview

Circle provides regulated financial infrastructure for payments, programmable wallets, and payouts. This integration enables:

- **Payments API**: Convert card payments to USDC stablecoin
- **Programmable Wallets**: Secure custody and transfer of digital assets
- **Payouts API**: Convert USDC to fiat currency and deposit to bank accounts

## Setup Instructions

### 1. Create Circle Developer Account

1. Visit [Circle Console](https://console.circle.com)
2. Sign up for a developer account
3. Complete the verification process
4. Access your sandbox environment

### 2. Get API Keys

1. In Circle Console, navigate to "API Keys"
2. Create a new API key for sandbox environment
3. Copy the API key (starts with `SAND_API_KEY:`)
4. Store securely - this key provides access to your Circle account

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Circle API Configuration
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_ENVIRONMENT=sandbox
```

For production deployment, change:
- `CIRCLE_ENVIRONMENT=production`
- Use production API key from Circle Console

### 4. Test Integration

Run the Circle API test to verify setup:

```bash
npm run test:circle
```

Expected output:
```
✅ Circle API integration test completed successfully!
```

## Architecture

### Base Service (`CircleService`)

- Provides configured Circle API client
- Handles authentication and environment management
- Common error handling and utilities
- Health check functionality

### Configuration Management (`CircleConfigManager`)

- Centralizes Circle API configuration
- Validates environment variables
- Provides singleton access to configuration
- Environment-specific logging

### Payment Service (`CirclePaymentService`)

- Foundation for card payment processing
- Will be extended in task 2.1 for full payment functionality
- Currently provides connection testing

## Environment Configuration

### Sandbox Environment
- Used for development and testing
- No real money transactions
- Test cards and bank accounts available
- API endpoint: `https://api-sandbox.circle.com`

### Production Environment
- Real money transactions
- Requires additional compliance verification
- API endpoint: `https://api.circle.com`
- ⚠️ **Use with caution**

## Security Considerations

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables for configuration
   - Rotate keys regularly in production

2. **Environment Isolation**
   - Keep sandbox and production environments separate
   - Use different API keys for each environment
   - Clear logging to identify current environment

3. **Error Handling**
   - Sensitive information not exposed in error messages
   - Proper logging for debugging without data leakage
   - Graceful degradation on API failures

## Next Steps

This foundation enables the following upcoming tasks:

- **Task 2.1**: Implement full Circle Payment Service
- **Task 2.2**: Create Circle Wallet Service for programmable wallets
- **Task 2.3**: Build Circle Payout Service for bank deposits
- **Task 7.1**: Add webhook handling for Circle events

## Troubleshooting

### Common Issues

1. **"CIRCLE_API_KEY environment variable is required"**
   - Add `CIRCLE_API_KEY` to your `.env` file
   - Ensure the key starts with `SAND_API_KEY:` for sandbox

2. **"Circle API connection failed"**
   - Verify API key is correct
   - Check internet connectivity
   - Ensure Circle Console account is active

3. **Environment mismatch**
   - Verify `CIRCLE_ENVIRONMENT` matches your API key type
   - Sandbox keys only work with sandbox environment

### Getting Help

- [Circle Developer Documentation](https://developers.circle.com/)
- [Circle API Reference](https://developers.circle.com/reference)
- [Circle Console](https://console.circle.com) for account management