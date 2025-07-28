import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProcessorSpecificForms } from '../ProcessorSpecificForms';

const mockStripeProcessor = {
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

const mockPlaidProcessor = {
  id: 'plaid',
  name: 'Plaid',
  supportedCountries: ['US', 'CA'],
  supportedCurrencies: ['USD', 'CAD'],
  fees: {
    fixedFee: 0.25,
    percentageFee: 1.5,
    currency: 'USD'
  },
  processingTime: '1-2 business days',
  userExperienceScore: 8.5,
  reliability: 99.5,
  isAvailable: true
};

const mockCircleProcessor = {
  id: 'circle',
  name: 'Circle',
  supportedCountries: ['US', 'CA', 'GB'],
  supportedCurrencies: ['USD', 'EUR', 'USDC'],
  fees: {
    fixedFee: 0.10,
    percentageFee: 1.0,
    currency: 'USD'
  },
  processingTime: '10-30 minutes',
  userExperienceScore: 7.5,
  reliability: 98.5,
  isAvailable: true
};

const mockUnavailableProcessor = {
  ...mockStripeProcessor,
  id: 'unavailable',
  name: 'Unavailable Processor',
  isAvailable: false
};

describe('ProcessorSpecificForms', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stripe Payment Form', () => {
    it('renders Stripe payment form correctly', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Stripe Payment')).toBeInTheDocument();
      expect(screen.getByText('Most Popular')).toBeInTheDocument();
      expect(screen.getByText('Secure card payment processing with instant confirmation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('MM/YY')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('123')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    });

    it('formats card number input correctly', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      const cardNumberInput = screen.getByPlaceholderText('1234 5678 9012 3456');
      fireEvent.change(cardNumberInput, { target: { value: '1234567890123456' } });

      expect(cardNumberInput).toHaveValue('1234 5678 9012 3456');
    });

    it('formats expiry date input correctly', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      const expiryInput = screen.getByPlaceholderText('MM/YY');
      fireEvent.change(expiryInput, { target: { value: '1225' } });

      expect(expiryInput).toHaveValue('12/25');
    });

    it('validates form and enables submit button', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByText('Pay $100');
      expect(submitButton).toBeDisabled();

      // Fill in required fields
      fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), {
        target: { value: '1234567890123456' }
      });
      fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
        target: { value: '1225' }
      });
      fireEvent.change(screen.getByPlaceholderText('123'), {
        target: { value: '123' }
      });
      fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { value: 'John Doe' }
      });

      expect(submitButton).toBeEnabled();
    });

    it('submits form with correct data', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      // Fill in form
      fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), {
        target: { value: '1234567890123456' }
      });
      fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
        target: { value: '1225' }
      });
      fireEvent.change(screen.getByPlaceholderText('123'), {
        target: { value: '123' }
      });
      fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByPlaceholderText('12345'), {
        target: { value: '12345' }
      });

      fireEvent.click(screen.getByText('Pay $100'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        processorId: 'stripe',
        paymentMethod: 'card',
        cardDetails: {
          number: '1234 5678 9012 3456',
          expiry: '12/25',
          cvv: '123',
          name: 'John Doe',
          billingZip: '12345'
        }
      });
    });

    it('displays correct fee calculation', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Processing Fee: 2.9% + $0.3')).toBeInTheDocument();
      expect(screen.getByText('Total: $103.20')).toBeInTheDocument();
    });
  });

  describe('Plaid Payment Form', () => {
    it('renders Plaid payment form correctly', () => {
      render(
        <ProcessorSpecificForms
          processor={mockPlaidProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Plaid Bank Transfer')).toBeInTheDocument();
      expect(screen.getByText('Lower Fees')).toBeInTheDocument();
      expect(screen.getByText('Connect your bank account for secure, low-cost transfers')).toBeInTheDocument();
      expect(screen.getByText('Connect Your Bank Account')).toBeInTheDocument();
    });

    it('handles bank connection flow', async () => {
      render(
        <ProcessorSpecificForms
          processor={mockPlaidProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      const connectButton = screen.getByText('Connect Bank Account');
      fireEvent.click(connectButton);

      expect(screen.getByText('Connecting to Plaid...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Bank Account Connected')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Select Bank')).toBeInTheDocument();
      expect(screen.getByText('Account Type')).toBeInTheDocument();
    });

    it('validates bank selection form', async () => {
      render(
        <ProcessorSpecificForms
          processor={mockPlaidProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      // Connect bank first
      fireEvent.click(screen.getByText('Connect Bank Account'));
      
      await waitFor(() => {
        expect(screen.getByText('Bank Account Connected')).toBeInTheDocument();
      }, { timeout: 3000 });

      const submitButton = screen.getByText('Transfer $100');
      expect(submitButton).toBeDisabled();

      // Select bank and account type
      fireEvent.click(screen.getByText('Choose your bank'));
      fireEvent.click(screen.getByText('Chase Bank'));
      
      fireEvent.click(screen.getByText('Select account type'));
      fireEvent.click(screen.getByText('Checking Account'));

      expect(submitButton).toBeEnabled();
    });
  });

  describe('Circle Payment Form', () => {
    it('renders Circle payment form correctly', () => {
      render(
        <ProcessorSpecificForms
          processor={mockCircleProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Circle Payment')).toBeInTheDocument();
      expect(screen.getByText('Crypto-Friendly')).toBeInTheDocument();
      expect(screen.getByText('Pay with USDC or traditional card through Circle\'s infrastructure')).toBeInTheDocument();
    });

    it('switches between USDC and card payment methods', () => {
      render(
        <ProcessorSpecificForms
          processor={mockCircleProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      // Default should be USDC
      expect(screen.getByPlaceholderText('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e')).toBeInTheDocument();

      // Switch to card
      fireEvent.click(screen.getByText('Credit Card'));
      expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();

      // Switch back to USDC
      fireEvent.click(screen.getByText('USDC Wallet'));
      expect(screen.getByPlaceholderText('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e')).toBeInTheDocument();
    });

    it('validates USDC wallet address', () => {
      render(
        <ProcessorSpecificForms
          processor={mockCircleProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByText('Pay $100');
      expect(submitButton).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e'), {
        target: { value: '0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e' }
      });

      expect(submitButton).toBeEnabled();
    });

    it('submits USDC payment correctly', () => {
      render(
        <ProcessorSpecificForms
          processor={mockCircleProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      const walletAddress = '0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e';
      fireEvent.change(screen.getByPlaceholderText('0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e'), {
        target: { value: walletAddress }
      });

      fireEvent.click(screen.getByText('Pay $100'));

      expect(mockOnSubmit).toHaveBeenCalledWith({
        processorId: 'circle',
        paymentMethod: 'usdc',
        walletDetails: { address: walletAddress }
      });
    });
  });

  describe('Unavailable Processor', () => {
    it('renders unavailable processor message', () => {
      render(
        <ProcessorSpecificForms
          processor={mockUnavailableProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Payment Method Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Unavailable Processor is currently not available. Please select a different payment method.')).toBeInTheDocument();
    });
  });

  describe('Unsupported Processor', () => {
    it('renders unsupported processor message', () => {
      const unsupportedProcessor = {
        ...mockStripeProcessor,
        id: 'unsupported',
        name: 'Unsupported Processor'
      };

      render(
        <ProcessorSpecificForms
          processor={unsupportedProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Unsupported Payment Method')).toBeInTheDocument();
      expect(screen.getByText('The selected payment processor (Unsupported Processor) is not yet supported.')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state when processing', () => {
      render(
        <ProcessorSpecificForms
          processor={mockStripeProcessor}
          amount={100}
          currency="USD"
          onSubmit={mockOnSubmit}
          isLoading={true}
        />
      );

      // Fill in form to enable button
      fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), {
        target: { value: '1234567890123456' }
      });
      fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
        target: { value: '1225' }
      });
      fireEvent.change(screen.getByPlaceholderText('123'), {
        target: { value: '123' }
      });
      fireEvent.change(screen.getByPlaceholderText('John Doe'), {
        target: { value: 'John Doe' }
      });

      const submitButton = screen.getByText('Processing...');
      expect(submitButton).toBeDisabled();
    });
  });
});