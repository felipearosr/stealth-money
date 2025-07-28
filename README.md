# Stealth Money - Global Money Transfer Platform

A modern, secure money transfer platform with blockchain integration, real-time exchange rates, and Stripe payments.

## 🚀 Features

- **Real-time Exchange Rates** - Live currency conversion using ExchangeRate API
- **Blockchain Integration** - Smart contract-based fund releases (with mock mode for testing)
- **Multi-Processor Payment System** - Intelligent payment processor selection (Stripe, Plaid, Circle)
- **Geographic Payment Optimization** - Automatic processor selection based on user location and preferences
- **Payment Requests** - Generate QR codes and shareable links for requesting payments
- **Multi-User Support** - Handle payments between registered and unregistered users
- **Fallback Processing** - Automatic failover between payment processors for reliability
- **Modern UI** - Built with Next.js, React, and Tailwind CSS
- **Database Integration** - PostgreSQL with Prisma ORM
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
│   │   │   ├── services/    # Business logic
│   │   │   │   ├── payment-request.service.ts  # Payment request management
│   │   │   │   ├── payment-processor.service.ts # Payment processor selection
│   │   │   │   └── __tests__/                  # Service unit tests
│   │   │   ├── routes/      # API endpoints
│   │   │   └── config/      # Configuration
│   │   ├── prisma/          # Database schema
│   │   │   └── schema.prisma # Includes PaymentRequest model
│   │   └── .env.example
│   └── contracts/           # Smart contracts
│       ├── contracts/       # Solidity files
│       └── scripts/         # Deployment scripts
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
```

## 🌐 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/exchange-rate/:from/:to` - Get exchange rate
- `POST /api/transfers` - Create transfer
- `GET /api/transfers/:id` - Get transfer details
- `POST /api/stripe/webhook` - Stripe webhook handler

### Payment Request Endpoints
- `POST /api/payment-requests` - Create a new payment request
- `GET /api/payment-requests/:id` - Get payment request details
- `GET /api/payment-requests/:id/qr-code` - Generate QR code for payment request
- `GET /api/payment-requests/:id/shareable-link` - Generate secure shareable link
- `POST /api/payment-requests/:id/process` - Process payment for a request
- `PUT /api/payment-requests/:id/cancel` - Cancel a payment request
- `GET /api/users/:userId/payment-requests` - Get user's payment requests
- `POST /api/payment-requests/validate-token` - Validate shareable link token

## 💳 Payment Request System

The platform includes a comprehensive payment request system that allows users to request payments from both registered and unregistered users:

### Key Features
- **QR Code Generation**: Automatically generate QR codes for payment requests
- **Shareable Links**: Create secure, time-limited shareable links with JWT tokens
- **Multi-User Support**: Handle payments from both registered and unregistered users
- **Request Lifecycle Management**: Track payment requests from creation to completion or expiration
- **Automatic Cleanup**: Expired payment requests are automatically marked and cleaned up

### Database Models
- **PaymentRequest**: Stores payment request details, status, and metadata
- **Payment**: Links completed payments to their originating requests
- **User**: Extended to support payment request relationships

### Service Architecture
- **PaymentRequestService**: Core service handling request creation, QR generation, and lifecycle management
- **Comprehensive Testing**: Full unit test coverage with mocked dependencies
- **Error Handling**: Robust error handling with specific error types and fallback strategies

## 🌍 Payment Processor Selection System

The platform features an intelligent payment processor selection system that automatically chooses the optimal payment processor based on geographic location, user preferences, and transaction requirements:

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
- [ ] **User Authentication & Authorization**
  - [ ] JWT-based authentication system
  - [ ] User registration and login
  - [ ] Protected routes and API endpoints
  - [ ] Password reset functionality

- [ ] **Enhanced Security**
  - [ ] Rate limiting for API endpoints
  - [ ] Input validation and sanitization
  - [ ] CORS configuration
  - [ ] API key rotation system

- [ ] **Real Blockchain Integration**
  - [ ] Deploy TransferManager smart contract to testnet
  - [ ] Integrate real contract ABI
  - [ ] Add contract interaction tests
  - [ ] Gas fee estimation and optimization

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
