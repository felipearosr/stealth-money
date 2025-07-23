# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Install dependencies (from root)
npm install

# Start development servers
npm run dev:web      # Frontend (http://localhost:3000)
npm run dev:api      # Backend (http://localhost:4000)

# Database setup (from packages/api)
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema to database
npx prisma studio    # Open database GUI
```

### Testing
```bash
# Run tests (from respective package directories)
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Run specific test file
npx jest path/to/test.ts

# API-specific test commands
npm run test:blockchain  # Blockchain integration tests
npm run test:security    # Security tests
npm run test:circle      # Circle payment tests
```

### Build & Lint
```bash
# Build projects (from package directories)
npm run build

# Lint (web package only)
npm run lint
```

## Architecture Overview

### Project Structure
This is a monorepo with three main packages:
- `packages/web` - Next.js 15 frontend with App Router
- `packages/api` - Express.js backend API
- `packages/contracts` - Hardhat smart contracts

### Key Architectural Patterns

#### API Backend
- **Controller-Service Pattern**: Routes in `/src/routes/*.controller.ts` call services in `/src/services/`
- **Middleware Stack**: Security → RequestTracking → Authentication → Validation → Route Handler
- **Authentication**: Clerk JWT-based auth with `AuthenticatedRequest` interface
- **Error Handling**: Centralized error handler with structured responses including request IDs
- **Mock/Real Modes**: Services support both mock and real implementations (e.g., blockchain, payments)

#### Frontend
- **Component Organization**: Feature components in `/components/features/`, UI components in `/components/ui/`
- **API Integration**: Centralized client in `/lib/api.ts` with consistent error handling
- **State Management**: React hooks for local state, SWR for server state
- **Authentication**: Clerk integration with protected routes via middleware

#### Database
- **Prisma ORM**: Schema in `packages/api/prisma/schema.prisma`
- **Models**: User, BankAccount, SavedRecipient, Transaction
- **Multi-currency**: Support for USD, EUR, CLP, MXN, GBP
- **Relationships**: User owns BankAccounts and Transactions

#### Testing Strategy
- **Unit Tests**: Jest with mocks for external services
- **Integration Tests**: Supertest for API endpoints
- **Component Tests**: React Testing Library
- **Test Organization**: `__tests__` directories with `.test.ts` files

### Development Workflow

1. **Environment Setup**: Copy `.env.example` files and configure required services
2. **Database Changes**: Modify schema.prisma → run `prisma generate` → run `prisma db push`
3. **API Development**: Create controller → implement service → add tests → test with Postman/curl
4. **Frontend Development**: Create component → integrate with API → add to page → test UI
5. **Testing**: Write tests alongside code → run tests before committing

### Important Conventions

- **TypeScript**: Use proper types, avoid `any`
- **Error Handling**: Always return structured error responses with appropriate HTTP status codes
- **Validation**: Use Zod schemas for runtime validation of API inputs
- **Security**: Input sanitization, rate limiting, CORS configuration
- **Async Operations**: Use async/await pattern consistently
- **File Naming**: kebab-case for files, PascalCase for components
- **API Routes**: RESTful conventions with `/api` prefix
- **Mock Data**: Use realistic mock data that mirrors production structure

### External Services Integration

- **Stripe**: Payment processing (test mode available)
- **Circle**: USD Coin (USDC) payments
- **Clerk**: Authentication and user management
- **Exchange Rate API**: Real-time currency conversion
- **Ethereum**: Blockchain integration for fund management (mock mode available)

### Common Tasks

- **Add New API Endpoint**: Create controller method → add route → implement service logic → add tests
- **Add New Page**: Create page.tsx in app directory → add components → integrate with API
- **Update Database Schema**: Modify schema.prisma → generate → push → update related services
- **Debug API Issues**: Check logs → verify auth → validate input → check database state
- **Test Payment Flow**: Use Stripe test cards → monitor webhook events → check transaction records