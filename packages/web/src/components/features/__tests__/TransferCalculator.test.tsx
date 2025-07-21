import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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
    expect(screen.getByLabelText(/You send \(USD\)/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('validates amount input correctly', async () => {
    render(<TransferCalculator />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
    
    // Test invalid amount (too small)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '0.001')
    
    await waitFor(() => {
      expect(screen.getByText('Invalid amount')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Test invalid amount (too large)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '60000')
    
    await waitFor(() => {
      expect(screen.getByText('Invalid amount')).toBeInTheDocument()
    })
  })

  it('formats number input correctly', async () => {
    render(<TransferCalculator />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
    
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
        receiveAmountEUR: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
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
            receiveCurrency: 'EUR'
          }),
        })
      )
    })

    // Check that results are displayed
    await waitFor(() => {
      expect(screen.getByText('€85.50')).toBeInTheDocument()
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
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
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
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
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
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
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
        receiveAmountEUR: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
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
        receiveAmountEUR: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator onContinue={mockOnContinue} />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
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
      rateId: 'rate_123'
    })
  })

  it('shows rate expiration warning when rate is about to expire', async () => {
    const mockResponse = {
      sendAmount: 100,
      receiveAmount: 85.50,
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
        receiveAmountEUR: 85.50
      },
      estimatedArrival: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      rateId: 'rate_123'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    })

    render(<TransferCalculator />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')

    await waitFor(() => {
      expect(screen.getByText('Rate expires soon')).toBeInTheDocument()
    })
  })

  it('does not call API for empty or zero amounts', async () => {
    render(<TransferCalculator />)
    
    const amountInput = screen.getByLabelText(/You send \(USD\)/)
    
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
})