# Stealth Money - Global Money Transfer Platform

A modern, secure money transfer platform with blockchain integration, real-time exchange rates, and Stripe payments.

## 🚀 Features

- **Real-time Exchange Rates** - Live currency conversion using ExchangeRate API
- **Blockchain Integration** - Smart contract-based fund releases (with mock mode for testing)
- **Stripe Payments** - Secure payment processing
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
│   │   │   ├── routes/      # API endpoints
│   │   │   └── config/      # Configuration
│   │   ├── prisma/          # Database schema
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

- `GET /health` - Health check
- `GET /api/exchange-rate/:from/:to` - Get exchange rate
- `POST /api/transfers` - Create transfer
- `GET /api/transfers/:id` - Get transfer details
- `POST /api/stripe/webhook` - Stripe webhook handler

## 🔒 Security Features

- Environment variable validation
- Secure API key management
- Stripe webhook signature verification
- Database connection encryption
- Private key protection (when using real blockchain)

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
