import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentRequestCreator } from '../PaymentRequestCreator'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PaymentRequestCreator', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('renders the payment request creation form', () => {
    render(<PaymentRequestCreator />)
    
    expect(screen.getByText('Request Payment')).toBeInTheDocument()
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Payment Request' })).toBeInTheDocument()
  })

  it('validates amount input', async () => {
    const user = userEvent.setup()
    render(<PaymentRequestCreator />)
    
    const createButton = screen.getByRole('button', { name: 'Create Payment Request' })
    
    // Button should be disabled initially
    expect(createButton).toBeDisabled()
    
    // Enter invalid amount
    const amountInput = screen.getByLabelText('Amount')
    await user.type(amountInput, '0')
    
    // Button should still be disabled
    expect(createButton).toBeDisabled()
    
    // Enter valid amount
    await user.clear(amountInput)
    await user.type(amountInput, '100')
    
    // Button should be enabled
    expect(createButton).toBeEnabled()
  })

  it('creates a payment request successfully', async () => {
    const user = userEvent.setup()
    const mockOnRequestCreated = jest.fn()
    const mockResponse = {
      id: 'test-request-id',
      amount: 100,
      currency: 'USD',
      description: 'Test payment',
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    render(<PaymentRequestCreator onRequestCreated={mockOnRequestCreated} />)
    
    // Fill in the form
    await user.type(screen.getByLabelText('Amount'), '100')
    await user.type(screen.getByLabelText('Description (Optional)'), 'Test payment')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Create Payment Request' }))
    
    // Wait for the API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/payment-requests',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: 100,
            currency: 'USD',
            description: 'Test payment',
          }),
        })
      )
    })
    
    // Check that callback was called
    expect(mockOnRequestCreated).toHaveBeenCalledWith(mockResponse)
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(<PaymentRequestCreator />)
    
    // Fill in the form
    await user.type(screen.getByLabelText('Amount'), '100')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Create Payment Request' }))
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to create payment request. Please try again.')).toBeInTheDocument()
    })
  })

  it('allows currency selection', async () => {
    const user = userEvent.setup()
    render(<PaymentRequestCreator />)
    
    // Click on currency selector
    const currencySelect = screen.getByRole('combobox')
    await user.click(currencySelect)
    
    // Select EUR
    await user.click(screen.getByText('EUR'))
    
    // Verify EUR is selected
    expect(screen.getByDisplayValue('EUR')).toBeInTheDocument()
  })
})