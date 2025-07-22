import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransferCalculator } from '../TransferCalculator'

// Mock the debounce hook to make tests synchronous
jest.mock('use-debounce', () => ({
  useDebounce: (value: any) => [value, false],
}))

describe('TransferCalculator', () => {
  const mockOnContinue = jest.fn()
  
  beforeEach(() => {
    mockOnContinue.mockClear()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders the calculator with initial state', () => {
    render(<TransferCalculator />)
    
    expect(screen.getByText('Transfer Calculator')).toBeInTheDocument()
    expect(screen.getByText('Calculate how much your recipient will receive')).toBeInTheDocument()
    expect(screen.getByText('You send')).toBeInTheDocument()
    expect(screen.getByText('Recipient gets')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')).toBeInTheDocument()
    // Check for currency selectors
    expect(screen.getByText('🇺🇸')).toBeInTheDocument() // USD flag
    expect(screen.getByText('🇪🇺')).toBeInTheDocument() // EUR flag
    // Should show helpful guidance text for recipient amount initially
    expect(screen.getByText('Amount recipient will receive')).toBeInTheDocument()
  })

  it('validates amount input correctly', async () => {
    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    
    // Test invalid amount (too small)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '0.001')
    
    await waitFor(() => {
      expect(screen.getByText('Amount must be at least $1.00')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Test invalid amount (too large)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '60000')
    
    await waitFor(() => {
      expect(screen.getByText('Amount cannot exceed $50,000.00')).toBeInTheDocument()
    })
  })

  it('formats number input correctly', async () => {
    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    
    // Test that non-numeric characters are removed
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, 'abc123.45def')
    
    expect(amountInput).toHaveValue('123.45')
    
    // Test that multiple decimal points are handled
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '123.45.67')
    
    expect(amountInput).toHaveValue('123.45')
    
    // Test decimal place limitation
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '123.456789')
    
    expect(amountInput).toHaveValue('123.45')
  })

  it('calls API to calculate transfer when amount changes', async () => {
    const mockResponse = {
      sendAmount: 100,
      receiveAmount: 85.50,
      sendCurrency: 'USD',
      receiveCurrency: 'EUR',
      exchangeRate: 0.855,
      fees: 5.50,
      rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      breakdown: {
        sendAmountUSD: 100,
        fees: {
          cardProcessing: 2.90,
          transfer: 1.50,
          payout: 1.10,
          total: 5.50
        },
        netAmountUSD: 94.50,
        exchangeRate: 0.855,
        receiveAmount: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '200') // Use a different amount to avoid conflicts with default

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/transfers/calculate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sendAmount: 200,
            sendCurrency: 'USD',
            receiveCurrency: 'EUR',
            calculatorMode: 'send'
          }),
        })
      )
    })

    // Check that results are displayed
    await waitFor(() => {
      expect(screen.getAllByText('€85.50')).toHaveLength(2) // One in recipient gets, one in breakdown
      expect(screen.getByText('1 USD = 0.8550 EUR')).toBeInTheDocument()
      expect(screen.getByText('$5.50')).toBeInTheDocument()
    })
  })

  it('displays loading state during calculation', async () => {
    // Mock a delayed response
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          sendAmount: 100,
          receiveAmount: 85.50,
          exchangeRate: 0.855,
          fees: 5.50,
          rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          breakdown: {
            sendAmountUSD: 100,
            fees: { cardProcessing: 2.90, transfer: 1.50, payout: 1.10, total: 5.50 },
            netAmountUSD: 94.50,
            exchangeRate: 0.855,
            receiveAmountEUR: 85.50
          },
          estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          rateId: 'rate_123'
        })
      }), 100))
    )

    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '200')

    // Should show loading state
    expect(screen.getByText('Calculating...')).toBeInTheDocument()
    const spinningIcon = screen.getByText('Calculating...').previousElementSibling
    expect(spinningIcon).toHaveClass('animate-spin')
  })

  it('displays error state when API call fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')

    await waitFor(() => {
      expect(screen.getByText('Calculation Error')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('displays API error message when server returns error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid currency pair' }),
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')

    await waitFor(() => {
      expect(screen.getByText('Calculation Error')).toBeInTheDocument()
      expect(screen.getByText('Invalid currency pair')).toBeInTheDocument()
    })
  })

  it('shows fee breakdown when calculation is successful', async () => {
    const mockResponse = {
      sendAmount: 100,
      receiveAmount: 85.50,
      sendCurrency: 'USD',
      receiveCurrency: 'EUR',
      exchangeRate: 0.855,
      fees: 5.50,
      rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      breakdown: {
        sendAmountUSD: 100,
        fees: {
          cardProcessing: 2.90,
          transfer: 1.50,
          payout: 1.10,
          total: 5.50
        },
        netAmountUSD: 94.50,
        exchangeRate: 0.855,
        receiveAmount: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')

    await waitFor(() => {
      expect(screen.getByText('$2.90')).toBeInTheDocument() // Card processing fee
      expect(screen.getByText('$1.50')).toBeInTheDocument() // Transfer fee
      expect(screen.getByText('$1.10')).toBeInTheDocument() // Payout fee
      expect(screen.getByText('$105.50')).toBeInTheDocument() // Total to pay
    })
  })

  it('calls onContinue with correct data when continue button is clicked', async () => {
    const mockResponse = {
      sendAmount: 100,
      receiveAmount: 85.50,
      sendCurrency: 'USD',
      receiveCurrency: 'EUR',
      exchangeRate: 0.855,
      fees: 5.50,
      rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      breakdown: {
        sendAmountUSD: 100,
        fees: {
          cardProcessing: 2.90,
          transfer: 1.50,
          payout: 1.10,
          total: 5.50
        },
        netAmountUSD: 94.50,
        exchangeRate: 0.855,
        receiveAmount: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator onContinue={mockOnContinue} />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')

    await waitFor(() => {
      expect(screen.getByText('Continue with this rate')).toBeInTheDocument()
    })

    const continueButton = screen.getByText('Continue with this rate')
    await userEvent.click(continueButton)

    expect(mockOnContinue).toHaveBeenCalledWith({
      sendAmount: 100,
      receiveAmount: 85.50,
      exchangeRate: 0.855,
      fees: 5.50,
      rateId: 'rate_123',
      calculatorMode: 'send'
    })
  })

  it('shows rate expiration warning when rate is about to expire', async () => {
    const mockResponse = {
      sendAmount: 100,
      receiveAmount: 85.50,
      sendCurrency: 'USD',
      receiveCurrency: 'EUR',
      exchangeRate: 0.855,
      fees: 5.50,
      rateValidUntil: new Date(Date.now() + 1 * 60 * 1000).toISOString(), // Expires in 1 minute
      breakdown: {
        sendAmountUSD: 100,
        fees: {
          cardProcessing: 2.90,
          transfer: 1.50,
          payout: 1.10,
          total: 5.50
        },
        netAmountUSD: 94.50,
        exchangeRate: 0.855,
        receiveAmount: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')

    await waitFor(() => {
      expect(screen.getByText('Rate expires soon')).toBeInTheDocument()
    })
  })

  it('does not call API for empty or zero amounts', async () => {
    render(<TransferCalculator />)
    
    const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
    
    // Clear the input (empty) - this should not trigger API call
    await userEvent.clear(amountInput)
    
    // Wait a bit to ensure debounce has time to process
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // Should not call API for empty input
    expect(global.fetch).not.toHaveBeenCalled()
    
    // Type zero - this should also not trigger API call
    await userEvent.type(amountInput, '0')
    
    // Wait a bit to ensure debounce has time to process
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // Should still not call API for zero amount
    expect(global.fetch).not.toHaveBeenCalled()
  })

  describe('Calculator Mode Switcher', () => {
    it('renders with "You Send" mode selected by default', () => {
      render(<TransferCalculator />)
      
      // Check that mode switcher is present
      expect(screen.getByText('You Send')).toBeInTheDocument()
      expect(screen.getByText('Recipient Gets')).toBeInTheDocument()
      
      // Check that "You Send" is active (has white background)
      const youSendButton = screen.getByText('You Send').closest('button')
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      
      expect(youSendButton).toHaveClass('bg-white')
      expect(recipientGetsButton).not.toHaveClass('bg-white')
      
      // Check that labels are correct for "You Send" mode
      expect(screen.getByText('You send')).toBeInTheDocument()
      expect(screen.getByText('Recipient gets')).toBeInTheDocument()
    })

    it('switches to "Recipient Gets" mode when clicked', async () => {
      render(<TransferCalculator />)
      
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      await userEvent.click(recipientGetsButton!)
      
      // Check that "Recipient Gets" is now active
      const youSendButton = screen.getByText('You Send').closest('button')
      
      expect(recipientGetsButton).toHaveClass('bg-white')
      expect(youSendButton).not.toHaveClass('bg-white')
      
      // Check that labels have switched
      expect(screen.getByText('Recipient gets')).toBeInTheDocument()
      expect(screen.getByText('You send')).toBeInTheDocument()
    })

    it('switches back to "You Send" mode when clicked again', async () => {
      render(<TransferCalculator />)
      
      // First switch to "Recipient Gets"
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      await userEvent.click(recipientGetsButton!)
      
      // Then switch back to "You Send"
      const youSendButton = screen.getByText('You Send').closest('button')
      await userEvent.click(youSendButton!)
      
      // Check that "You Send" is active again
      expect(youSendButton).toHaveClass('bg-white')
      expect(recipientGetsButton).not.toHaveClass('bg-white')
    })

    it('sends correct API request in "You Send" mode', async () => {
      const mockResponse = {
        sendAmount: 100,
        receiveAmount: 85.50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        exchangeRate: 0.855,
        fees: 5.50,
        rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        breakdown: {
          sendAmountUSD: 100,
          fees: { cardProcessing: 2.90, transfer: 1.50, payout: 1.10, total: 5.50 },
          netAmountUSD: 94.50,
          exchangeRate: 0.855,
          receiveAmount: 85.50
        },
        estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        rateId: 'rate_123'
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      render(<TransferCalculator />)
      
      const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
      await userEvent.clear(amountInput)
      await userEvent.type(amountInput, '100')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/transfers/calculate',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sendAmount: 100,
              sendCurrency: 'USD',
              receiveCurrency: 'EUR',
              calculatorMode: 'send'
            }),
          })
        )
      })
    })

    it('sends correct API request in "Recipient Gets" mode', async () => {
      const mockResponse = {
        sendAmount: 117.00,
        receiveAmount: 100,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        exchangeRate: 0.855,
        fees: 5.50,
        rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        breakdown: {
          sendAmountUSD: 117.00,
          fees: { cardProcessing: 2.90, transfer: 1.50, payout: 1.10, total: 5.50 },
          netAmountUSD: 111.50,
          exchangeRate: 0.855,
          receiveAmount: 100
        },
        estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        rateId: 'rate_123'
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      render(<TransferCalculator />)
      
      // Switch to "Recipient Gets" mode
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      await userEvent.click(recipientGetsButton!)
      
      const amountInput = screen.getByPlaceholderText('Enter amount recipient gets (e.g. 100.00)')
      await userEvent.clear(amountInput)
      await userEvent.type(amountInput, '100')

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4000/api/transfers/calculate',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              receiveAmount: 100,
              sendCurrency: 'USD',
              receiveCurrency: 'EUR',
              calculatorMode: 'receive'
            }),
          })
        )
      })
    })

    it('preserves amount when switching modes with existing calculation', async () => {
      const sendModeResponse = {
        sendAmount: 100,
        receiveAmount: 85.50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        exchangeRate: 0.855,
        fees: 5.50,
        rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        breakdown: {
          sendAmountUSD: 100,
          fees: { cardProcessing: 2.90, transfer: 1.50, payout: 1.10, total: 5.50 },
          netAmountUSD: 94.50,
          exchangeRate: 0.855,
          receiveAmount: 85.50
        },
        estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        rateId: 'rate_123'
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => sendModeResponse,
      })

      render(<TransferCalculator />)
      
      // Enter amount in "You Send" mode
      const amountInput = screen.getByPlaceholderText('Enter amount to send (e.g. 100.00)')
      await userEvent.clear(amountInput)
      await userEvent.type(amountInput, '100')

      // Wait for calculation to complete
      await waitFor(() => {
        expect(screen.getAllByText('€85.50')).toHaveLength(2) // One in output, one in breakdown
      })

      // Switch to "Recipient Gets" mode
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      await userEvent.click(recipientGetsButton!)

      // Check that the input now shows the receive amount
      await waitFor(() => {
        expect(amountInput).toHaveValue('85.5')
      })
    })

    it('includes calculator mode in onContinue callback', async () => {
      const mockResponse = {
        sendAmount: 100,
        receiveAmount: 85.50,
        sendCurrency: 'USD',
        receiveCurrency: 'EUR',
        exchangeRate: 0.855,
        fees: 5.50,
        rateValidUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        breakdown: {
          sendAmountUSD: 100,
          fees: { cardProcessing: 2.90, transfer: 1.50, payout: 1.10, total: 5.50 },
          netAmountUSD: 94.50,
          exchangeRate: 0.855,
          receiveAmount: 85.50
        },
        estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        rateId: 'rate_123'
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      render(<TransferCalculator onContinue={mockOnContinue} />)
      
      // Switch to "Recipient Gets" mode
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      await userEvent.click(recipientGetsButton!)
      
      const amountInput = screen.getByPlaceholderText('Enter amount recipient gets (e.g. 100.00)')
      await userEvent.clear(amountInput)
      await userEvent.type(amountInput, '85.50')

      await waitFor(() => {
        expect(screen.getByText('Continue with this rate')).toBeInTheDocument()
      })

      const continueButton = screen.getByText('Continue with this rate')
      await userEvent.click(continueButton)

      expect(mockOnContinue).toHaveBeenCalledWith({
        sendAmount: 100,
        receiveAmount: 85.50,
        exchangeRate: 0.855,
        fees: 5.50,
        rateId: 'rate_123',
        calculatorMode: 'receive'
      })
    })

    it('shows correct currency selectors based on mode', async () => {
      render(<TransferCalculator />)
      
      // In "You Send" mode, input should have USD selector, output should have EUR selector
      expect(screen.getByText('🇺🇸')).toBeInTheDocument() // USD flag in input
      expect(screen.getByText('🇪🇺')).toBeInTheDocument() // EUR flag in output
      
      // Switch to "Recipient Gets" mode
      const recipientGetsButton = screen.getByText('Recipient Gets').closest('button')
      await userEvent.click(recipientGetsButton!)
      
      // Currency selectors should still be present but in different positions
      expect(screen.getByText('🇺🇸')).toBeInTheDocument()
      expect(screen.getByText('🇪🇺')).toBeInTheDocument()
    })
  })
})