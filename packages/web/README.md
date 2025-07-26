# Stealth Money Web Frontend

**Next.js Frontend for Mantle Hackathon Submission**

A modern, responsive web application that provides an intuitive interface for international money transfers powered by the Mantle Network. Built with Next.js 15, React 19, and Tailwind CSS.

## Overview

The frontend eliminates blockchain complexity for end users while providing a seamless money transfer experience. Users can send money internationally without creating wallets, managing private keys, or understanding blockchain mechanics.

## Key Features

**User Experience:**
- Intuitive transfer flow with step-by-step guidance
- Real-time exchange rate calculations
- Responsive design for all devices
- Accessible interface following WCAG guidelines
- Progressive loading states and error handling

**Payment Integration:**
- Stripe Elements for secure card processing
- Multiple payment method support
- Real-time payment status updates
- Automatic retry mechanisms for failed payments

**Transfer Management:**
- Transfer history and tracking
- Status updates with clear messaging
- Recipient management system
- Transaction receipt generation

**Mantle Network Benefits:**
- Fast transaction confirmations displayed to users
- Low-cost transfers with transparent fee structure
- Secure blockchain settlement without user complexity
- Real-time blockchain status monitoring

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom components
- **Authentication**: Clerk for user management
- **Payments**: Stripe React components
- **State Management**: SWR for data fetching
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Jest with React Testing Library

## Project Structure

```
packages/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # User dashboard
│   │   ├── transfer/          # Transfer flow pages
│   │   ├── pay/               # Payment processing
│   │   ├── status/            # Transfer status tracking
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── features/          # Feature-specific components
│   │   │   ├── TransferCalculator.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── RecipientForm.tsx
│   │   │   └── TransferStatus.tsx
│   │   └── ui/                # Reusable UI components
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── card.tsx
│   │       └── select.tsx
│   └── lib/
│       ├── api.ts             # API client functions
│       ├── currencies.ts      # Currency configurations
│       └── utils.ts           # Utility functions
├── public/                    # Static assets
├── .env.example              # Environment variables template
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Running API server (see `packages/api/README.md`)

### Installation

1. **Install dependencies:**
```bash
cd packages/web
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret

# Optional: Analytics and Monitoring
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

3. **Start development server:**
```bash
npm run dev
```

4. **Access the application:**
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Components

### TransferCalculator
Real-time currency conversion with Mantle Network fee calculation:
```typescript
// Calculates transfer amounts with live exchange rates
// Displays Mantle Network benefits (low fees, fast settlement)
// Provides transparent fee breakdown
```

### PaymentForm
Secure payment processing with Stripe integration:
```typescript
// Stripe Elements integration for card payments
// Real-time validation and error handling
// Support for multiple payment methods
// Automatic retry for failed transactions
```

### TransferStatus
Real-time transfer tracking with blockchain integration:
```typescript
// Live status updates from Mantle Network
// Clear progress indicators for users
// Automatic notifications for status changes
// Transaction receipt generation
```

### RecipientForm
Simplified recipient management:
```typescript
// Easy recipient selection and management
// Support for multiple recipient types
// Validation for international transfers
// Address book functionality
```

## User Flow

### 1. Transfer Initiation
```
User enters amount → Real-time rate calculation → Fee transparency
```

### 2. Recipient Selection
```
Choose recipient → Verify details → Confirm transfer parameters
```

### 3. Payment Processing
```
Secure card payment → Stripe processing → Payment confirmation
```

### 4. Blockchain Settlement
```
Mantle Network escrow → Smart contract execution → Fund release
```

### 5. Completion
```
Status updates → Receipt generation → Notification to recipient
```

## API Integration

The frontend communicates with the backend API for:

### Transfer Operations
```typescript
// Create new transfer
POST /api/transfers
{
  amount: number,
  sourceCurrency: string,
  destCurrency: string,
  recipientInfo: RecipientData
}

// Get transfer status
GET /api/transfers/:id

// Get transfer history
GET /api/transfers
```

### Exchange Rates
```typescript
// Real-time exchange rates
GET /api/exchange-rate/:from/:to

// Supported currencies
GET /api/currencies
```

### Payment Processing
```typescript
// Stripe configuration
GET /api/stripe/config

// Payment intent status
GET /api/payments/:paymentIntentId
```

## Styling and Theming

### Tailwind CSS Configuration
- Custom color palette reflecting Mantle branding
- Responsive breakpoints for all device sizes
- Dark mode support (optional)
- Accessibility-focused design tokens

### Component Library
- Consistent design system using Radix UI primitives
- Custom components built with class-variance-authority
- Reusable patterns for forms, cards, and navigation
- Animation library for smooth transitions

## Testing

### Unit Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
```

### Test Structure
```
src/components/features/__tests__/
├── TransferCalculator.test.tsx
├── PaymentForm.test.tsx
├── TransferStatus.test.tsx
└── RecipientForm.test.tsx
```

### Testing Strategy
- Component unit tests with React Testing Library
- API integration tests with MSW (Mock Service Worker)
- User interaction testing with user-event
- Accessibility testing with jest-axe

## Performance Optimization

### Next.js Features
- App Router for improved performance
- Server Components where applicable
- Image optimization with next/image
- Font optimization with next/font
- Bundle analysis and optimization

### Loading Strategies
- Skeleton loading states for better UX
- Progressive enhancement for JavaScript-disabled users
- Lazy loading for non-critical components
- Prefetching for anticipated user actions

## Security Considerations

### Client-Side Security
- Environment variable validation
- XSS protection through proper sanitization
- CSRF protection via SameSite cookies
- Content Security Policy headers

### Payment Security
- PCI DSS compliance through Stripe
- No sensitive payment data stored locally
- Secure token handling for authentication
- HTTPS enforcement in production

## Deployment

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_key
CLERK_SECRET_KEY=sk_live_your_clerk_secret
```

### Build Optimization
```bash
npm run build              # Production build
npm run start              # Start production server
npm run lint               # Code quality checks
```

## Development Guidelines

### Code Style
- TypeScript for type safety
- ESLint and Prettier for consistent formatting
- Conventional commits for clear history
- Component-driven development approach

### Best Practices
- Responsive design first
- Accessibility considerations in all components
- Performance monitoring and optimization
- Error boundary implementation for graceful failures

## Mantle Network Integration

### User Benefits Highlighted
- **Speed**: Fast transaction confirmations displayed prominently
- **Cost**: Low fees compared to traditional services
- **Security**: Blockchain security without complexity
- **Transparency**: Real-time transaction tracking

### Technical Implementation
- Mantle Network status monitoring
- Gas fee optimization display
- Transaction hash tracking for users
- Network health indicators

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the style guide
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Submit a pull request

## Troubleshooting

### Common Issues

**Build Errors:**
- Ensure Node.js version compatibility (18+)
- Clear `.next` cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

**API Connection Issues:**
- Verify API server is running on correct port
- Check CORS configuration in API
- Validate environment variables

**Payment Integration:**
- Confirm Stripe keys are correctly configured
- Check webhook endpoints are accessible
- Verify SSL certificates in production

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

## Support

For issues and questions:
1. Check the [main project documentation](../../README.md)
2. Review the [API documentation](../api/README.md)
3. Open an issue in the GitHub repository
4. Contact the development team

---

**Built for the Mantle Network Hackathon** - Simplifying blockchain-powered money transfers for everyone.