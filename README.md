# Stealth Money - Global Money Transfer Platform

A modern, secure money transfer platform with blockchain integration, real-time exchange rates, and comprehensive payment processing capabilities.

## Features

- **Real-time Exchange Rates** - Live currency conversion using ExchangeRate API
- **Blockchain Integration** - Smart contract-based fund releases (with mock mode for testing)
- **Multi-Processor Payment System** - Intelligent payment processor selection (Stripe, Plaid, Circle)
- **Geographic Payment Optimization** - Automatic processor selection based on user location and preferences
- **Payment Request System** - Generate QR codes and shareable links for requesting payments from any user
- **Unregistered User Support** - Handle payments from users without accounts through onboarding flows
- **Multi-Channel Notifications** - Email, SMS, and push notifications with delivery tracking and retry mechanisms
- **Fallback Processing** - Automatic failover between payment processors for reliability
- **Modern UI** - Built with Next.js, React, and Tailwind CSS
- **Database Integration** - PostgreSQL with Prisma ORM including PaymentRequest model
- **Terminal Demo** - Interactive blockchain simulation for presentations

## 🏗️ Architecture

This is a monorepo with three main packages:

- **`packages/web`** - Next.js frontend application
- **`packages/api`** - Express.js backend API
- **`packages/contracts`** - Hardhat smart contracts

## 🛠️ Quick Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd stealth-money
npm install
```

### 2. Environment Configuration

Copy the example environment files and configure them:

```bash
# API Configuration
cp packages/api/.env.example packages/api/.env

# Frontend Configuration  
cp packages/web/.env.example packages/web/.env.local
```

### 3. Configure Required Services

#### Database (Required)
1. Create a free PostgreSQL database at [Neon](https://neon.tech)
2. Update `DATABASE_URL` and `DIRECT_URL` in `packages/api/.env`

#### Exchange Rate API (Required)
1. Get a free API key from [ExchangeRate API](https://app.exchangerate-api.com/sign-up)
2. Update `EXCHANGERATE_API_KEY` in `packages/api/.env`

#### Stripe (Required for payments)
1. Create account at [Stripe](https://dashboard.stripe.com)
2. Get your test API keys from the dashboard
3. Update Stripe keys in `packages/api/.env`

#### Blockchain (Optional - uses mock mode by default)
- Leave blockchain variables as placeholders for free demo mode
- Or configure with real Ethereum node for production

### 4. Database Setup

```bash
cd packages/api
npx prisma generate
npx prisma db push
```

### 5. Start Development Servers

```bash
# Start API server (Terminal 1)
cd packages/api
npm run dev

# Start frontend (Terminal 2)  
cd packages/web
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000
- **API Health**: http://localhost:4000/health

## 🎯 Demo Mode

The application runs in **demo mode** by default with:
- Mock blockchain transactions (no real costs)
- Stripe test mode
- Realistic terminal simulation for presentations
- All features work without real blockchain setup

Perfect for demonstrations and development!

## 📁 Project Structure

```
stealth-money/
├── packages/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App router pages
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities
│   │   └── .env.example
│   ├── api/                 # Express.js backend
│   │   ├── src/
│   │   │   ├── services/    # Business logic services
│   │   │   │   ├── payment-request.service.ts    # Payment request management
│   │   │   │   ├── payment-processor.service.ts  # Payment processor selection
│   │   │   │   ├── transfer.service.ts           # Enhanced transfer service
│   │   │   │   ├── notification.service.ts       # Multi-channel notifications
│   │   │   │   ├── *.service.example.ts          # Service usage examples
│   │   │   │   └── __tests__/                    # Comprehensive unit tests
│   │   │   │       ├── payment-request.service.test.ts
│   │   │   │       ├── payment-processor.service.test.ts
│   │   │   │       ├── transfer.service.test.ts
│   │   │   │       └── notification.service.test.ts
│   │   │   ├── routes/      # API endpoints (to be implemented)
│   │   │   └── config/      # Configuration
│   │   ├── prisma/          # Database schema
│   │   │   └── schema.prisma # Complete schema with PaymentRequest model
│   │   └── .env.example
│   └── contracts/           # Smart contracts
│       ├── contracts/       # Solidity files
│       └── scripts/         # Deployment scripts
├── .kiro/                   # Kiro IDE configuration
│   └── specs/               # Project specifications
│       └── peer-to-peer-payment-system/
├── README.md
└── package.json
```

## 🔧 Available Scripts

```bash
# Install all dependencies
npm install

# Start development (all packages)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Database operations
cd packages/api
npx prisma studio      # Database GUI
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema changes

# Run specific service tests
cd packages/api
npm test payment-request.service.test.ts
npm test payment-processor.service.test.ts
npm test transfer.service.test.ts
npm test notification.service.test.ts

# Run service examples
cd packages/api
npm run dev:examples  # Run all service examples
node src/services/transfer.service.example.js
node src/services/notification.service.example.js
```

## 🧪 Testing

The project includes comprehensive testing for all core services with complete unit test coverage:

### Service Testing Coverage
- **PaymentRequestService**: Complete unit test suite with mocked Prisma, QRCode, and JWT dependencies
- **PaymentProcessorService**: Full test coverage for processor selection, geographic optimization, and fallback logic
- **TransferService**: Comprehensive testing for user-to-user transfers, unregistered user flows, and onboarding
- **NotificationService**: Complete test suite for multi-channel notifications, template rendering, and delivery tracking

### Test Features
- **Mocked Dependencies**: All external dependencies (Prisma, APIs, libraries) are properly mocked
- **Error Handling**: Tests cover both success and failure scenarios
- **Edge Cases**: Comprehensive coverage of edge cases and boundary conditions
- **Integration Scenarios**: Tests simulate real-world usage patterns and workflows
- **Service Examples**: Working example implementations for all core services

### Running Tests
```bash
# Run all tests
cd packages/api
npm test

# Run specific test files
npm test payment-request.service.test.ts
npm test payment-processor.service.test.ts
npm test transfer.service.test.ts
npm test notification.service.test.ts

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run service examples
npm run dev:examples  # Run all service examples
node src/services/transfer.service.example.js
node src/services/notification.service.example.js
node src/services/payment-request.example.js
```

## 🌐 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/exchange-rate/:from/:to` - Get exchange rate
- `POST /api/transfers` - Create transfer
- `GET /api/transfers/:id` - Get transfer details
- `GET /api/transfers` - Get all transfers
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Payment Processing Endpoints
- `GET /api/stripe/config` - Get Stripe publishable key for frontend
- `GET /api/payments/:paymentIntentId` - Get payment intent status
- `POST /api/payments/process` - Process payment with intelligent processor selection
- `GET /api/payments/processors/available` - Get available payment processors for user location
- `POST /api/payments/processors/select` - Select optimal processor based on criteria
- `GET /api/payments/processors/capabilities` - Get processor capabilities and fees

### Blockchain Integration Endpoints
- `GET /api/blockchain/health` - Check blockchain connection and wallet balance
- `GET /api/blockchain/contract-balance` - Get smart contract token balance

### Payment Request Endpoints
The following endpoints have complete service layer implementation with API integration:
- `POST /api/payment-requests` - Create a new payment request with QR code and shareable link generation
- `GET /api/payment-requests/:id` - Get payment request details and status
- `GET /api/payment-requests/:id/qr-code` - Generate QR code for payment request
- `GET /api/payment-requests/:id/shareable-link` - Generate secure shareable link with JWT token
- `POST /api/payment-requests/:id/pay` - Process payment for a request with intelligent processor selection
- `PUT /api/payment-requests/:id/cancel` - Cancel a payment request
- `GET /api/payment-requests/user/:userId` - Get user's payment requests with optional status filtering
- `GET /api/payment-requests/validate-token/:token` - Validate shareable link token
- `POST /api/payment-requests/onboard-user` - Onboard new users accessing payment requests
- `GET /api/payment-requests/:id/history` - Get payment request history and timeline

### Transfer Service Endpoints (Service Layer Complete)
Enhanced transfer endpoints with unregistered user support:
- `POST /api/transfers/user-to-user` - Create standard user-to-user transfer
- `POST /api/transfers/unregistered-access` - Handle unregistered user payment request access
- `POST /api/transfers/complete-onboarding` - Complete user onboarding and process payment
- `POST /api/transfers/fulfill-request` - Direct payment request fulfillment
- `GET /api/transfers/validate-request/:id` - Validate payment request access
- `GET /api/transfers/history/:userId` - Get comprehensive transfer history
- `PUT /api/transfers/payment-status/:id` - Update payment status with notifications

### Notification Service Endpoints (Service Layer Complete)
Multi-channel notification management:
- `GET /api/notifications/preferences/:userId` - Get user notification preferences
- `PUT /api/notifications/preferences/:userId` - Update user notification preferences
- `GET /api/notifications/stats` - Get notification delivery statistics
- `POST /api/notifications/test` - Test notification delivery (development only)

## 💳 Payment Request System

The platform includes a comprehensive payment request system that allows users to request payments from both registered and unregistered users:

### Key Features
- **QR Code Generation**: Automatically generate QR codes for payment requests using the qrcode library
- **Shareable Links**: Create secure, time-limited shareable links with JWT tokens and UUID-based access
- **Multi-User Support**: Handle payments from both registered and unregistered users
- **Request Lifecycle Management**: Track payment requests from creation to completion or expiration
- **Automatic Cleanup**: Expired payment requests are automatically marked and cleaned up every 5 minutes

### Database Models
- **PaymentRequest**: Stores payment request details, status, metadata, QR codes, and shareable links
- **Payment**: Links completed payments to their originating requests with full transaction details
- **User**: Extended to support payment request relationships with proper foreign key constraints

### Service Architecture
- **PaymentRequestService**: Core service handling request creation, QR generation, JWT token validation, and lifecycle management
- **Comprehensive Testing**: Full unit test coverage with mocked dependencies for Prisma, QRCode, and JWT
- **Error Handling**: Robust error handling with specific error types and fallback strategies
- **Security**: JWT-based secure links with expiration validation and request status checking

## 🔄 Transfer Service with Unregistered User Support

The enhanced TransferService provides comprehensive support for both registered and unregistered users accessing payment requests:

### Core Capabilities
- **User-to-User Transfers**: Standard transfers between registered users with processor selection
- **Unregistered User Onboarding**: Automatic user account creation when unregistered users access payment links
- **Payment Request Fulfillment**: Process payments from payment requests with automatic user creation
- **Onboarding Token Management**: Secure token-based onboarding flow with expiration handling
- **Transfer History**: Combined view of sent and received payments with detailed metadata

### Unregistered User Flow
1. **Access Payment Request**: Unregistered user clicks payment link or scans QR code
2. **Onboarding Token Creation**: System generates secure token for onboarding process
3. **User Account Creation**: Complete registration and create user account
4. **Payment Processing**: Process payment request with optimal processor selection
5. **Notification Delivery**: Send welcome and confirmation notifications

### Key Methods
- `handleUnregisteredUserAccess()`: Manages payment request access for unregistered users
- `completeOnboardingAndProcessPayment()`: Finalizes user creation and processes payment
- `fulfillPaymentRequest()`: Direct payment request processing with user creation
- `validatePaymentRequestAccess()`: Validates payment request availability and status
- `getUserTransferHistory()`: Retrieves comprehensive transfer history

## 📧 Multi-Channel Notification System

The NotificationService provides comprehensive multi-channel notification capabilities with delivery tracking and retry mechanisms:

### Notification Channels
- **Email**: Rich HTML templates with subject lines and detailed content
- **SMS**: Concise text messages optimized for mobile delivery
- **Push Notifications**: Real-time app notifications with titles and action buttons

### Notification Types
- **Payment Requests**: Notify recipients of incoming payment requests with QR codes and links
- **Payment Confirmations**: Confirm successful payments to both sender and recipient
- **Status Updates**: Real-time updates on payment processing status changes
- **Onboarding Welcome**: Welcome new users with account setup information
- **Security Alerts**: Important security-related notifications

### Advanced Features
- **Template System**: Customizable templates with variable substitution for personalized messages
- **User Preferences**: Granular control over notification types and channels per user
- **Delivery Tracking**: Monitor delivery status with success/failure tracking and retry attempts
- **Retry Mechanism**: Automatic retry with exponential backoff for failed deliveries
- **Delivery Statistics**: Comprehensive analytics on notification delivery performance
- **Graceful Degradation**: Continue operation even when specific channels fail

### Template Variables
Templates support dynamic content with variables like:
- `{senderName}`, `{recipientName}` - User names
- `{amount}`, `{currency}` - Payment amounts and currencies
- `{paymentLink}`, `{expirationDate}` - Payment request details
- `{status}`, `{statusMessage}` - Payment status information
- `{completedAt}`, `{estimatedCompletion}` - Timing information

### Integration with Transfer Service
- **Real-time Status Updates**: Automatic notifications when payment status changes
- **Onboarding Integration**: Welcome notifications for new users created through payment requests
- **Preference Management**: User notification preferences accessible through transfer service
- **Delivery Statistics**: Monitor notification performance through transfer service interface

## 🌍 Payment Processor Selection System

The platform features an intelligent payment processor selection system that automatically chooses the optimal payment processor based on geographic location, user preferences, and transaction requirements. The UI components are currently being integrated into the main transfer flow:

### Supported Payment Processors

#### Stripe
- **Coverage**: Global (45+ countries)
- **Currencies**: 30+ including USD, EUR, GBP, CAD, AUD, JPY, and more
- **Fees**: 2.9% + $0.30 per transaction
- **Processing Time**: 1-3 business days
- **Best For**: Global coverage, excellent user experience

#### Plaid (In Development)
- **Coverage**: US, CA, GB, FR, ES, IE, NL
- **Currencies**: USD, CAD, GBP, EUR
- **Fees**: 1.5% + $0.25 per transaction
- **Processing Time**: 1-2 business days
- **Best For**: Lower fees, bank-to-bank transfers

#### Circle (In Development)
- **Coverage**: US, Asia-Pacific, Middle East, Africa
- **Currencies**: USD, EUR, GBP, USDC, USDT
- **Fees**: 1.0% + $0.10 per transaction
- **Processing Time**: 10-30 minutes
- **Best For**: Cryptocurrency integration, fast processing

### Geographic Optimization

The system automatically selects processors based on regional preferences:

- **United States & Canada**: Plaid → Stripe → Circle
- **Europe**: Stripe → Circle → Plaid
- **Asia-Pacific**: Circle → Stripe
- **Latin America**: Stripe → Circle
- **Africa & Middle East**: Circle → Stripe
- **Default**: Stripe → Circle → Plaid

### Selection Criteria

Users and the system can prioritize different factors:

- **Cost Optimization**: Selects processor with lowest fees
- **Speed Priority**: Chooses fastest processing times
- **Reliability Focus**: Prioritizes highest uptime processors
- **Geographic Preference**: Uses regional optimization
- **Fallback Support**: Automatic failover if primary processor fails

### Service Architecture

- **PaymentProcessorService**: Core service for processor selection and management
- **Adapter Pattern**: Consistent interface across different payment processors
- **Availability Checking**: Real-time processor availability validation
- **Fallback Processing**: Automatic retry with alternative processors
- **Comprehensive Testing**: Full unit test coverage for all processors and selection logic

### UI Components (In Progress)

The payment processor selection system includes comprehensive React components that are currently being integrated:

#### ProcessorSelection Component
- **Location Detection**: Automatically detects user location and displays available processors
- **Intelligent Recommendations**: Shows optimal processor based on geographic location and user criteria
- **Interactive Selection**: Click-to-select interface with processor details and fee calculations
- **Fallback Handling**: Graceful handling of processor unavailability with alternative options
- **Real-time Updates**: Dynamic fee calculations based on transfer amount

#### ProcessorSpecificForms Component
- **Stripe Integration**: Complete card payment form with validation and security features
- **Plaid Bank Transfer**: Bank account connection flow with Plaid Link integration
- **Circle Payments**: Support for both USDC wallet and traditional card payments
- **Form Validation**: Real-time validation with user-friendly error messages
- **Security Indicators**: Visual security badges and encryption information

#### EnhancedTransferCalculator Component
- **Integrated Flow**: Seamless integration of processor selection with transfer calculation
- **Bidirectional Calculation**: Support for both send and receive amount calculations
- **Fee Transparency**: Clear display of processor-specific fees and total costs
- **Processing Time**: Shows estimated processing times for selected processors
- **Terminal Simulation**: Enhanced demo mode with processor-specific transaction flows

#### Testing Coverage
- **Unit Tests**: Comprehensive test suites for all processor selection components
- **Mock Integration**: Proper mocking of API calls and external dependencies
- **User Interactions**: Tests for user selection flows and form validations
- **Error Scenarios**: Coverage of API failures and processor unavailability
- **Accessibility**: Tests for keyboard navigation and screen reader compatibility

### Configuration

Payment processors can be configured via environment variables:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Plaid Configuration (Optional)
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret

# Circle Configuration (Optional)
CIRCLE_API_KEY=your_api_key
```

## 🔒 Security Features

- Environment variable validation
- Secure API key management
- Stripe webhook signature verification
- Database connection encryption
- Private key protection (when using real blockchain)
- JWT-based secure shareable links for payment requests
- Request expiration and automatic cleanup mechanisms

## 📋 Todo List

### 🔥 High Priority
- [ ] **API Route Implementation**
  - [ ] Implement REST API endpoints for payment request system
  - [ ] Add API routes for payment processor selection
  - [ ] Create notification management endpoints
  - [ ] Build transfer service API routes with unregistered user support

- [ ] **Frontend UI Components**
  - [ ] Build React components for payment request creation and management
  - [ ] Implement QR code display and shareable link generation UI
  - [ ] Create payment processor selection interface
  - [ ] Add user onboarding flow for unregistered users

- [ ] **User Authentication & Authorization**
  - [ ] JWT-based authentication system
  - [ ] User registration and login
  - [ ] Protected routes and API endpoints
  - [ ] Password reset functionality

- [ ] **Enhanced Security & Compliance**
  - [ ] Rate limiting for API endpoints and payment request generation
  - [ ] Enhanced KYC/AML compliance checks for cross-border transfers
  - [ ] Fraud detection for payment requests and unusual patterns
  - [ ] Audit trails for payment request and fulfillment activities

### 🚀 Medium Priority
- [ ] **Advanced Features**
  - [ ] Transaction history and tracking
  - [ ] Email notifications for transfers
  - [ ] Multi-currency wallet support
  - [ ] Recurring transfers
  - [ ] Transfer limits and compliance

- [ ] **UI/UX Improvements**
  - [ ] Mobile-responsive design optimization
  - [ ] Dark mode support
  - [ ] Loading states and error handling
  - [ ] Accessibility improvements (WCAG compliance)
  - [ ] Progressive Web App (PWA) features

- [ ] **Performance & Monitoring**
  - [ ] API response caching
  - [ ] Database query optimization
  - [ ] Error tracking (Sentry integration)
  - [ ] Performance monitoring
  - [ ] Health check endpoints

### 🔧 Technical Debt
- [ ] **Code Quality**
  - [ ] Comprehensive unit tests (>80% coverage)
  - [ ] Integration tests for API endpoints
  - [ ] E2E tests with Playwright/Cypress
  - [ ] Code documentation and JSDoc comments
  - [ ] ESLint and Prettier configuration

- [ ] **Infrastructure**
  - [ ] Docker containerization
  - [ ] CI/CD pipeline setup
  - [ ] Environment-specific configurations
  - [ ] Database migrations system
  - [ ] Backup and recovery procedures

### 🌟 Nice to Have
- [ ] **Advanced Blockchain Features**
  - [ ] Multi-chain support (Polygon, BSC, etc.)
  - [ ] DeFi integration for better rates
  - [ ] Staking rewards for users
  - [ ] NFT-based loyalty program

- [ ] **Business Features**
  - [ ] Admin dashboard
  - [ ] Analytics and reporting
  - [ ] KYC/AML compliance integration
  - [ ] Multi-language support (i18n)
  - [ ] Customer support chat

- [ ] **Integrations**
  - [ ] Additional payment providers
  - [ ] Bank account verification
  - [ ] SMS verification service
  - [ ] Social media login options

### 🐛 Known Issues
- [ ] Fix compilation warnings in React components
- [ ] Optimize bundle size for production
- [ ] Handle edge cases in currency conversion
- [ ] Improve error messages for failed transactions

### 📱 Mobile App (Future)
- [ ] React Native mobile application
- [ ] Biometric authentication
- [ ] Push notifications
- [ ] Offline transaction queuing

---

**Priority Legend:**
- 🔥 High Priority: Essential for production
- 🚀 Medium Priority: Important for user experience
- 🔧 Technical Debt: Code quality and maintainability
- 🌟 Nice to Have: Future enhancements
- 🐛 Known Issues: Bugs to fix
- 📱 Mobile App: Future mobile development

## 📚 Documentation

- [API Setup Guide](packages/api/COMPLETE_SETUP_GUIDE.md)
- [Blockchain Setup](packages/api/BLOCKCHAIN_SETUP.md)
- [Stripe Configuration](packages/api/STRIPE_SETUP.md)
- [Testing Guide](packages/api/TESTING_GUIDE.md)

## 🚀 Deployment

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Backend (Railway/Render)
1. Connect your GitHub repo
2. Set environment variables
3. Deploy the `packages/api` directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Check the documentation in `packages/api/`
- Review the test checklist in `TEST_CHECKLIST.md`
- Open an issue for bugs or feature requests
