# Clerk Authentication Setup Guide

## Quick Setup (5 minutes)

### 1. Create Clerk Account
1. Go to [https://dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up for a free account
3. Create a new application
4. Choose "Next.js" as your framework

### 2. Get Your API Keys
From your Clerk dashboard:
1. Go to "API Keys" in the sidebar
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

### 3. Update Environment Variables

**Frontend (`packages/web/.env.local`):**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here
```

**Backend (`packages/api/.env`):**
```env
CLERK_SECRET_KEY=sk_test_your_actual_key_here
```

### 4. Configure Clerk Settings
In your Clerk dashboard:
1. Go to "User & Authentication" → "Email, Phone, Username"
2. Enable "Email address" as a required field
3. Go to "Paths" and set:
   - Sign-in URL: `/auth/sign-in`
   - Sign-up URL: `/auth/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

### 5. Test the Setup
1. Start your development servers
2. Visit your app and try signing up
3. Check that authentication works properly

## Important Notes
- Keep your secret keys secure and never commit them to version control
- The placeholder keys in the environment files will not work - you need real Clerk keys
- Clerk provides 10,000 monthly active users for free
- All user data is managed by Clerk, including passwords and profiles

## Troubleshooting
- If you see "Invalid publishable key" errors, double-check your keys
- Make sure environment variables are properly loaded by restarting your dev servers
- Check the Clerk dashboard logs for authentication errors