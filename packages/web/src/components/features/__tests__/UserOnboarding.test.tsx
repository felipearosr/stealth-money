import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserOnboarding } from '../UserOnboarding'

const mockPaymentRequest = {
  id: 'test-request-id',
  amount: 100,
  currency: 'USD',
  description: 'Test payment',
  requesterId: 'requester-123',
}

const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock window.location.href
delete (window as any).location
window.location = { href: '' } as any

describe('UserOnboarding', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    window.location.href = ''
  })

  it('renders welcome step initially', () => {
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText('Welcome!')).toBeInTheDocument()
    expect(screen.getByText('USD 100.00')).toBeInTheDocument()
    expect(screen.getByText('Test payment')).toBeInTheDocument()
    expect(screen.getByText('Create your account')).toBeInTheDocument()
    expect(screen.getByText('Add payment method')).toBeInTheDocument()
    expect(screen.getByText('Verify and complete')).toBeInTheDocument()
  })

  it('progresses through onboarding steps', async () => {
    const user = userEvent.setup()
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Start onboarding
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    
    // Should be on account step
    expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Last Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Email *')).toBeInTheDocument()
  })

  it('validates account information', async () => {
    const user = userEvent.setup()
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Go to account step
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    
    // Try to continue without filling required fields
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    // Should show validation error
    expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument()
  })

  it('validates email format', async () => {
    const user = userEvent.setup()
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Go to account step
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    
    // Fill in form with invalid email
    await user.type(screen.getByLabelText('First Name *'), 'John')
    await user.type(screen.getByLabelText('Last Name *'), 'Doe')
    await user.type(screen.getByLabelText('Email *'), 'invalid-email')
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('United States'))
    
    // Try to continue
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    // Should show email validation error
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
  })

  it('progresses to payment step with valid account info', async () => {
    const user = userEvent.setup()
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Go to account step
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    
    // Fill in valid account information
    await user.type(screen.getByLabelText('First Name *'), 'John')
    await user.type(screen.getByLabelText('Last Name *'), 'Doe')
    await user.type(screen.getByLabelText('Email *'), 'john@example.com')
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('United States'))
    
    // Continue to payment step
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    // Should be on payment step
    expect(screen.getByText('Payment Method')).toBeInTheDocument()
    expect(screen.getByLabelText('Cardholder Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Card Number *')).toBeInTheDocument()
  })

  it('formats card number input', async () => {
    const user = userEvent.setup()
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Navigate to payment step
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    await user.type(screen.getByLabelText('First Name *'), 'John')
    await user.type(screen.getByLabelText('Last Name *'), 'Doe')
    await user.type(screen.getByLabelText('Email *'), 'john@example.com')
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('United States'))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    // Type card number
    const cardNumberInput = screen.getByLabelText('Card Number *')
    await user.type(cardNumberInput, '1234567890123456')
    
    // Should be formatted with spaces
    expect(cardNumberInput).toHaveValue('1234 5678 9012 3456')
  })

  it('formats expiry date input', async () => {
    const user = userEvent.setup()
    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Navigate to payment step
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    await user.type(screen.getByLabelText('First Name *'), 'John')
    await user.type(screen.getByLabelText('Last Name *'), 'Doe')
    await user.type(screen.getByLabelText('Email *'), 'john@example.com')
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('United States'))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    // Type expiry date
    const expiryInput = screen.getByLabelText('Expiry Date *')
    await user.type(expiryInput, '1225')
    
    // Should be formatted as MM/YY
    expect(expiryInput).toHaveValue('12/25')
  })

  it('completes onboarding successfully', async () => {
    const user = userEvent.setup()
    const mockOnOnboardingComplete = jest.fn()
    
    const mockUserResponse = { id: 'user-123', email: 'john@example.com' }
    const mockPaymentResponse = { id: 'payment-123', status: 'completed' }
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPaymentResponse),
      })

    render(
      <UserOnboarding 
        paymentRequest={mockPaymentRequest} 
        onOnboardingComplete={mockOnOnboardingComplete}
      />
    )
    
    // Complete all steps
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    
    // Account step
    await user.type(screen.getByLabelText('First Name *'), 'John')
    await user.type(screen.getByLabelText('Last Name *'), 'Doe')
    await user.type(screen.getByLabelText('Email *'), 'john@example.com')
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('United States'))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    // Payment step
    await user.type(screen.getByLabelText('Cardholder Name *'), 'John Doe')
    await user.type(screen.getByLabelText('Card Number *'), '1234567890123456')
    await user.type(screen.getByLabelText('Expiry Date *'), '1225')
    await user.type(screen.getByLabelText('CVV *'), '123')
    await user.click(screen.getByRole('button', { name: /Review Payment/i }))
    
    // Verification step
    expect(screen.getByText('Review & Confirm')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Complete Payment/i }))
    
    // Wait for API calls
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '',
            country: 'US',
            currency: 'USD',
          }),
        })
      )
    })
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/payment-requests/test-request-id/pay',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: 'user-123',
            paymentMethod: {
              type: 'card',
              cardholderName: 'John Doe',
              cardNumber: '1234 5678 9012 3456',
              expiryDate: '12/25',
              cvv: '123',
            },
          }),
        })
      )
    })
    
    // Should show completion step
    await waitFor(() => {
      expect(screen.getByText('Payment Complete!')).toBeInTheDocument()
    })
    
    expect(mockOnOnboardingComplete).toHaveBeenCalledWith({
      user: mockUserResponse,
      payment: mockPaymentResponse,
    })
  })

  it('handles onboarding errors', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(<UserOnboarding paymentRequest={mockPaymentRequest} />)
    
    // Complete steps up to verification
    await user.click(screen.getByRole('button', { name: /Get Started/i }))
    await user.type(screen.getByLabelText('First Name *'), 'John')
    await user.type(screen.getByLabelText('Last Name *'), 'Doe')
    await user.type(screen.getByLabelText('Email *'), 'john@example.com')
    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByText('United States'))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    
    await user.type(screen.getByLabelText('Cardholder Name *'), 'John Doe')
    await user.type(screen.getByLabelText('Card Number *'), '1234567890123456')
    await user.type(screen.getByLabelText('Expiry Date *'), '1225')
    await user.type(screen.getByLabelText('CVV *'), '123')
    await user.click(screen.getByRole('button', { name: /Review Payment/i }))
    
    // Try to complete payment
    await user.click(screen.getByRole('button', { name: /Complete Payment/i }))
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to complete onboarding. Please try again.')).toBeInTheDocument()
    })
  })
})