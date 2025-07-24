/**
 * Integration test for Chilean CLP-to-CLP transfer calculator
 */

// Mock fetch for testing
global.fetch = jest.fn();

import { TransferCalculator } from './components/features/TransferCalculator';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock API response for CLP-to-CLP transfer
const mockCLPCalculationResponse = {
  sendAmount: 10000,
  receiveAmount: 8970,
  sendCurrency: 'CLP',
  receiveCurrency: 'CLP',
  exchangeRate: 1,
  fees: 1030,
  rateValidUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  breakdown: {
    sendAmountUSD: 10000,
    fees: {
      cardProcessing: 0,
      transfer: 30,
      payout: 1000,
      total: 1030
    },
    netAmountUSD: 10000,
    exchangeRate: 1,
    receiveAmount: 8970
  },
  estimatedArrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  rateId: 'rate-test-123'
};

describe('Chilean CLP-to-CLP Transfer Calculator', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test('should default to CLP for both send and receive currencies', () => {
    render(<TransferCalculator />);
    
    // Should show CLP flags in both currency selectors
    const clpFlags = screen.getAllByText('🇨🇱');
    expect(clpFlags).toHaveLength(2); // One for send, one for receive
  });

  test('should show correct placeholder for CLP (no decimals)', () => {
    render(<TransferCalculator />);
    
    // Should show placeholder with no decimal places for CLP
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 1000)');
    expect(amountInput).toBeInTheDocument();
  });

  test('should calculate CLP-to-CLP transfer correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCLPCalculationResponse
    });

    render(<TransferCalculator />);
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 1000)');
    
    // Enter CLP amount (no decimals)
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '10000');
    
    // Wait for API call and calculation
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transfers/calculate'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sendAmount: 10000,
            sendCurrency: 'CLP',
            receiveCurrency: 'CLP',
            calculatorMode: 'send'
          })
        })
      );
    });

    // Should show the calculated receive amount
    await waitFor(() => {
      expect(screen.getByText('CLP 8,970')).toBeInTheDocument();
    });

    // Should show 1:1 exchange rate for domestic transfer
    await waitFor(() => {
      expect(screen.getByText('1 CLP = 1.0000 CLP')).toBeInTheDocument();
    });

    // Should show Chilean domestic fees
    await waitFor(() => {
      expect(screen.getByText('CLP 1,030')).toBeInTheDocument(); // Total fees
    });
  });

  test('should switch to "recipient gets" mode correctly', async () => {
    render(<TransferCalculator />);
    
    // Click "Recipient Gets" button
    const recipientGetsButton = screen.getByText('Recipient Gets');
    await userEvent.click(recipientGetsButton);
    
    // Should show correct placeholder for receive mode
    const amountInput = screen.getByPlaceholderText('Enter amount recipient gets (e.g. 1000)');
    expect(amountInput).toBeInTheDocument();
  });

  test('should validate CLP minimum amount (800 CLP)', async () => {
    render(<TransferCalculator />);
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 1000)');
    
    // Enter amount below minimum
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '500');
    
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/Amount must be at least/)).toBeInTheDocument();
    });
  });

  test('should handle CLP amounts without decimals correctly', async () => {
    render(<TransferCalculator />);
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 1000)');
    
    // Try to enter decimal amount (should be stripped)
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '1000.50');
    
    // Should only show whole number (CLP has 0 decimal places)
    expect(amountInput).toHaveValue('1000');
  });
});

console.log('✅ Chilean CLP-to-CLP integration test created successfully!');