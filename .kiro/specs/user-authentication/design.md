# Design Document

## Overview

The user authentication system will be implemented using Clerk, a modern authentication service that provides drop-in React components and secure user management. This approach minimizes development time while providing enterprise-grade security features. The system will integrate seamlessly with the existing Stealth Money platform, adding user-specific functionality without disrupting the current money transfer flow.

## Architecture

### Authentication Provider: Clerk
- **Service**: Clerk.dev for authentication and user management
- **Integration**: React components and API middleware
- **Session Management**: JWT tokens managed by Clerk
- **User Storage**: Clerk handles user data, profile information

### Frontend Architecture
```
┌─────────────────────────────────────────┐
│              Next.js App                │
├─────────────────────────────────────────┤
│  Public Routes (Landing, Demo)          │
│  ├─ / (homepage)                        │
│  ├─ /demo (public demo mode)            │
│  └─ /auth/* (sign-in/sign-up)           │
├─────────────────────────────────────────┤
│  Protected Routes (Authenticated)       │
│  ├─ /dashboard (user dashboard)         │
│  ├─ /transfers (transaction history)    │
│  ├─ /transfer/new (create transfer)     │
│  └─ /profile (user settings)            │
├─────────────────────────────────────────┤
│  Clerk Components                       │
│  ├─ <SignIn />                          │
│  ├─ <SignUp />                          │
│  ├─ <UserButton />                      │
│  └─ <RedirectToSignIn />                │
└─────────────────────────────────────────┘
```

### Backend Architecture
```
┌─────────────────────────────────────────┐
│           Express.js API                │
├─────────────────────────────────────────┤
│  Public Endpoints                       │
│  ├─ GET /health                         │
│  ├─ GET /api/exchange-rate/:from/:to    │
│  └─ POST /api/webhooks/stripe           │
├─────────────────────────────────────────┤
│  Protected Endpoints (Auth Required)    │
│  ├─ POST /api/transfers                 │
│  ├─ GET /api/transfers                  │
│  ├─ GET /api/transfers/:id              │
│  └─ GET /api/user/profile               │
├─────────────────────────────────────────┤
│  Clerk Middleware                       │
│  ├─ JWT Token Verification              │
│  ├─ User ID Extraction                  │
│  └─ Route Protection                    │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Authentication Components

#### SignInPage Component
```typescript
interface SignInPageProps {
  redirectUrl?: string;
}
```
- Renders Clerk's `<SignIn />` component
- Handles post-authentication redirects
- Provides fallback for authentication errors

#### SignUpPage Component
```typescript
interface SignUpPageProps {
  redirectUrl?: string;
}
```
- Renders Clerk's `<SignUp />` component
- Handles new user onboarding flow
- Redirects to dashboard after successful registration

#### UserButton Component
- Drop-in user menu with profile, settings, sign out
- Displays user avatar and name
- Handles session management

### 2. Protected Route Components

#### ProtectedLayout Component
```typescript
interface ProtectedLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}
```
- Wraps authenticated pages
- Redirects unauthenticated users to sign-in
- Provides loading states during auth checks

#### Dashboard Component
```typescript
interface DashboardProps {
  user: User;
  recentTransactions: Transaction[];
}
```
- User overview with quick stats
- Recent transaction summary
- Quick action buttons for new transfers

### 3. API Middleware

#### Clerk Authentication Middleware
```typescript
interface AuthenticatedRequest extends Request {
  userId: string;
  user: ClerkUser;
}
```
- Validates JWT tokens from Clerk
- Extracts user ID for database queries
- Provides user context to route handlers

## Data Models

### Updated Transaction Model
```prisma
model Transaction {
  id                    String   @id @default(cuid())
  userId                String   // NEW: Link to Clerk user ID
  amount                Float
  sourceCurrency        String
  destCurrency          String
  exchangeRate          Float
  recipientAmount       Float
  status                String   @default("PENDING")
  stripePaymentIntentId String?  @unique
  blockchainTxHash      String?  @unique
  
  // Recipient Information
  recipientName         String?
  recipientEmail        String?
  recipientPhone        String?
  payoutMethod          String?
  payoutDetails         Json?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@index([userId]) // NEW: Index for user queries
}
```

### User Profile Extension (Optional)
```prisma
model UserProfile {
  id                    String   @id @default(cuid())
  clerkUserId           String   @unique
  preferredCurrency     String?  @default("USD")
  notificationSettings  Json?
  kycStatus            String?  @default("PENDING")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

## Error Handling

### Authentication Errors
- **401 Unauthorized**: Invalid or missing JWT token
- **403 Forbidden**: Valid token but insufficient permissions
- **404 Not Found**: User-specific resource not found
- **429 Too Many Requests**: Rate limiting for auth endpoints

### Frontend Error Boundaries
```typescript
interface AuthErrorBoundaryState {
  hasError: boolean;
  errorType: 'network' | 'auth' | 'unknown';
}
```
- Catches authentication-related errors
- Provides user-friendly error messages
- Offers retry mechanisms for transient failures

### Fallback Mechanisms
- Graceful degradation to public demo mode
- Offline transaction queuing (future enhancement)
- Session recovery after network interruptions

## Testing Strategy

### Unit Tests
- Authentication middleware validation
- Protected route access control
- User-specific data filtering
- JWT token parsing and validation

### Integration Tests
- Complete sign-up and sign-in flows
- Transaction creation with user association
- User dashboard data loading
- Session persistence across page reloads

### End-to-End Tests
- New user registration and first transaction
- Returning user sign-in and transaction history
- Sign-out and session termination
- Cross-browser authentication compatibility

### Security Tests
- JWT token tampering attempts
- Unauthorized API access attempts
- User data isolation verification
- Session hijacking prevention

## Implementation Phases

### Phase 1: Basic Authentication (MVP)
- Clerk setup and configuration
- Sign-in/sign-up pages
- Protected route middleware
- User association with transactions

### Phase 2: User Dashboard
- Transaction history display
- User profile management
- Basic user preferences

### Phase 3: Enhanced Features
- Advanced user settings
- Notification preferences
- KYC/compliance integration
- Multi-factor authentication

## Security Considerations

### JWT Token Management
- Tokens handled entirely by Clerk
- Automatic token refresh
- Secure token storage in httpOnly cookies
- Token validation on every API request

### Data Privacy
- User transactions isolated by userId
- No cross-user data leakage
- Secure user profile information
- GDPR compliance through Clerk

### Session Security
- Automatic session expiration
- Secure session invalidation on sign-out
- Protection against session fixation
- CSRF protection through SameSite cookies

## Performance Considerations

### Caching Strategy
- User profile data caching
- Transaction list pagination
- Optimistic UI updates for better UX
- Background data prefetching

### Database Optimization
- Indexed queries on userId
- Efficient transaction filtering
- Connection pooling for user requests
- Query optimization for dashboard data

## Monitoring and Analytics

### Authentication Metrics
- Sign-up conversion rates
- Sign-in success rates
- Session duration analytics
- Authentication error tracking

### User Engagement
- Dashboard usage patterns
- Transaction frequency per user
- Feature adoption rates
- User retention metrics