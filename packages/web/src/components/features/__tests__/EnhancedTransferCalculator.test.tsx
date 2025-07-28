import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedTransferCalculator } from '../EnhancedTransferCalculator';
import * as api from '@/lib/api';

// Mock the API functions
jest.mock('@/lib/api', () => ({
  getExchangeRate: jest.fn(),
  createTransferWithProcessor: jest.fn(),
  getAvailableProcessors: jest.fn(),
  selectOptimalProcessor: jest.fn(),
}));

// Mock the use-debounce hook
jest.mock('use-debounce', () => ({
  useDebounce: (value: any) => [value, jest.fn()]
}));

const mockProcessor = {
  id: 'stripe',
  name: 'Stripe',
  supportedCountries: ['US', 'CA', 'GB'],
  supportedCurrencies: ['USD', 'EUR', 'GBP'],
  fees: {
    fixedFee: 0.30,
    percentageFee: 2.9,
    currency: 'USD'
  },
  processingTime: '1-3 business days',
  userExperienceScore: 9.0,
  reliability: 99.9,
  isAvailable: true
};

const mockLocation = {
  country: 'US',
  region: 'North America',
  currency: 'USD',
  timezone: 'America/New_York'
};

const mockSelection = {
  selectedProcessor: mockProcessor,
  reason: 'Selected Stripe for excellent user experience (9/10)',
  alternatives: [],
  estimatedFees: 3.20
};

describe('EnhancedTransferCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.getExchangeRate as jest.Mock).mockResolvedValue({ rate: 0.85 });
    (api.getAvailableProcessors as jest.Mock).mockResolvedValue({
      location: mockLocation,
      processors: [mockProcessor],
      count: 1
    });
    (api.selectOptimalProcessor as jest.Mock).mockResolvedValue({
      location: mockLocation,
      selection: mockSelection,
      criteria: { prioritizeCost: true, prioritizeSpeed: false, prioritizeReliability: true }
    });
    (api.createTransferWithProcessor as jest.Mock).mockResolvedValue({
      transactionId: 'txn_123',
      sourceAmount: 1000,
      destCurrency: 'EUR',
      recipientAmount: 850,
      clientSecret: 'pi_test_123',
      rate: 0.85,
      status: 'PENDING_PAYMENT',
      processorId: 'stripe',
      fallbackUsed: false
    });
  });

  it('renders the enhanced transfer calculator', () => {
    render(<EnhancedTransferCalculator />);

    expect(screen.getByText('Send Money')).toBeInTheDocument();
    expect(screen.getByLabelText('You Send')).toBeInTheDocument();
    expect(screen.getByLabelText('Recipient Gets')).toBeInTheDocument();
  });

  it('displays location information when detected', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('US')).toBeInTheDocument();
    });
  });

  it('calculates exchange rates and amounts', async () => {
    render(<EnhancedTransferCalculator />);

    const sendAmountInput = screen.getByLabelText('You Send');
    fireEvent.change(sendAmountInput, { target: { value: '1000' } });

    await waitFor(() => {
      expect(api.getExchangeRate).toHaveBeenCalledWith('USD', 'EUR');
    });

    await waitFor(() => {
      const receiveAmountInput = screen.getByLabelText('Recipient Gets');
      expect(receiveAmountInput).toHaveValue('850.00');
    });

    expect(screen.getByText('1 USD = 0.8500 EUR')).toBeInTheDocument();
  });

  it('shows processor selection initially', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
    });

    expect(screen.getByText('Stripe')).toBeInTheDocument();
  });

  it('displays processor-specific fee calculations', async () => {
    render(<EnhancedTransferCalculator />);

    // Wait for processor to be selected
    await waitFor(() => {
      expect(screen.getByText('Payment Method:')).toBeInTheDocument();
    });

    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Fee (2.9% + $0.3):')).toBeInTheDocument();
    expect(screen.getByText('USD 29.30')).toBeInTheDocument();
    expect(screen.getByText('Total to pay:')).toBeInTheDocument();
    expect(screen.getByText('USD 1029.30')).toBeInTheDocument();
  });

  it('shows processing time for selected processor', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('Processing Time:')).toBeInTheDocument();
    });

    expect(screen.getByText('1-3 business days')).toBeInTheDocument();
  });

  it('disables continue button when no processor is selected', () => {
    // Mock no processor selected state
    (api.getAvailableProcessors as jest.Mock).mockResolvedValue({
      location: mockLocation,
      processors: [],
      count: 0
    });

    render(<EnhancedTransferCalculator />);

    const continueButton = screen.getByText('Continue');
    expect(continueButton).toBeDisabled();
  });

  it('enables continue button when processor is selected and form is valid', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeEnabled();
    });
  });

  it('shows processor selection warning when no processor selected', async () => {
    // Mock no processor selected state
    (api.getAvailableProcessors as jest.Mock).mockResolvedValue({
      location: mockLocation,
      processors: [],
      count: 0
    });

    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('Please select a payment method to continue')).toBeInTheDocument();
    });
  });

  it('allows changing payment method', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('Change Payment Method')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Change Payment Method'));

    expect(screen.getByText('Payment Method')).toBeInTheDocument();
  });

  it('shows selected processor summary', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('Stripe Selected')).toBeInTheDocument();
    });

    expect(screen.getByText('Selected Stripe for excellent user experience (9/10)')).toBeInTheDocument();
  });

  it('handles transfer creation and shows terminal', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeEnabled();
    });

    fireEvent.click(screen.getByText('Continue'));

    expect(api.createTransferWithProcessor).toHaveBeenCalledWith({
      amount: 1000,
      sourceCurrency: 'USD',
      destCurrency: 'EUR',
      userId: 'user-123',
      processorId: 'stripe'
    });

    await waitFor(() => {
      expect(screen.getByText('Enhanced Payment Terminal - Intelligent Processor Selection')).toBeInTheDocument();
    });
  });

  it('displays enhanced terminal logs with processor information', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeEnabled();
    });

    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('🏦 ENHANCED TRANSFER INITIATED')).toBeInTheDocument();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText('Selected Processor: Stripe')).toBeInTheDocument();
    }, { timeout: 5000 });

    await waitFor(() => {
      expect(screen.getByText('💳 PROCESSING WITH STRIPE')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('handles exchange rate API errors', async () => {
    (api.getExchangeRate as jest.Mock).mockRejectedValue(new Error('Rate fetch failed'));

    render(<EnhancedTransferCalculator />);

    const sendAmountInput = screen.getByLabelText('You Send');
    fireEvent.change(sendAmountInput, { target: { value: '1000' } });

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch exchange rate')).toBeInTheDocument();
    });

    expect(screen.getByText('Rate unavailable')).toBeInTheDocument();
  });

  it('handles transfer creation errors', async () => {
    (api.createTransferWithProcessor as jest.Mock).mockRejectedValue(new Error('Transfer failed'));

    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeEnabled();
    });

    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create transfer')).toBeInTheDocument();
    });
  });

  it('supports bidirectional amount calculation', async () => {
    render(<EnhancedTransferCalculator />);

    // Wait for initial rate to load
    await waitFor(() => {
      expect(screen.getByText('1 USD = 0.8500 EUR')).toBeInTheDocument();
    });

    // Change receive amount
    const receiveAmountInput = screen.getByLabelText('Recipient Gets');
    fireEvent.change(receiveAmountInput, { target: { value: '850' } });

    await waitFor(() => {
      const sendAmountInput = screen.getByLabelText('You Send');
      expect(sendAmountInput).toHaveValue('1000.00');
    });
  });

  it('updates fees when amount changes', async () => {
    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      expect(screen.getByText('USD 29.30')).toBeInTheDocument(); // Fee for $1000
    });

    const sendAmountInput = screen.getByLabelText('You Send');
    fireEvent.change(sendAmountInput, { target: { value: '500' } });

    await waitFor(() => {
      expect(screen.getByText('USD 14.80')).toBeInTheDocument(); // Fee for $500
    });
  });

  it('shows fallback information when processor fallback is used', async () => {
    (api.createTransferWithProcessor as jest.Mock).mockResolvedValue({
      transactionId: 'txn_123',
      sourceAmount: 1000,
      destCurrency: 'EUR',
      recipientAmount: 850,
      clientSecret: 'pi_test_123',
      rate: 0.85,
      status: 'PENDING_PAYMENT',
      processorId: 'plaid',
      fallbackUsed: true,
      processorInfo: {
        originalProcessor: 'stripe',
        actualProcessor: 'plaid'
      }
    });

    render(<EnhancedTransferCalculator />);

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      expect(continueButton).toBeEnabled();
    });

    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('⚠️ Fallback processor used')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});