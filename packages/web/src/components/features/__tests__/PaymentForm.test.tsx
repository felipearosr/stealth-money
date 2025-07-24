import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentForm } from '../PaymentForm'

describe('PaymentForm', () => {
  const mockOnSubmit = jest.fn()
  const defaultProps = {
    sendAmount: 100,
    receiveAmount: 85.50,
    exchangeRate: 0.855,
    fees: 5.50,
    rateId: 'rate_123',
    onSubmit: mockOnSubmit,
    isLoading: false
  }
  
  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders the payment form with transfer summary', () => {
    render(<PaymentForm {...defaultProps} />)
    
    expect(screen.getByText('Complete Your Transfer')).toBeInTheDocument()
    expect(screen.getByText('$100.00 USD')).toBeInTheDocument()
    expect(screen.getByText('$5.50 USD')).toBeInTheDocument()
    expect(screen.getByText('$105.50 USD')).toBeInTheDocument() // Total
    expect(screen.getByText('€85.50 EUR')).toBeInTheDocument()
  })

  it('renders all form sections', () => {
    render(<PaymentForm {...defaultProps} />)
    
    expect(screen.getByText('Payment Details')).toBeInTheDocument()
    expect(screen.getByText('Recipient Information')).toBeInTheDocument()
    expect(screen.getByText('Bank Account Details (Germany)')).toBeInTheDocument()
  })

  it('formats card number with spaces', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const cardNumberInput = screen.getByLabelText('Card Number')
    await userEvent.type(cardNumberInput, '1234567890123456')
    
    expect(cardNumberInput).toHaveValue('1234 5678 9012 3456')
  })

  it('formats IBAN with spaces', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const ibanInput = screen.getByLabelText('IBAN')
    await userEvent.type(ibanInput, 'DE89370400440532013000')
    
    expect(ibanInput).toHaveValue('DE89 3704 0044 0532 0130 00')
  })

  it('converts BIC to uppercase', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const bicInput = screen.getByLabelText('BIC/SWIFT Code')
    await userEvent.type(bicInput, 'cobadeffxxx')
    
    expect(bicInput).toHaveValue('COBADEFFXXX')
  })

  it('validates card details correctly', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Card number must be at least 13 digits')).toBeInTheDocument()
      expect(screen.getByText('CVV must be at least 3 digits')).toBeInTheDocument()
    })
  })

  it('validates recipient information correctly', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument()
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('validates bank account details correctly', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('IBAN must be at least 15 characters')).toBeInTheDocument()
      expect(screen.getByText('BIC must be at least 8 characters')).toBeInTheDocument()
      expect(screen.getByText('Bank name must be at least 2 characters')).toBeInTheDocument()
      expect(screen.getByText('Account holder name must be at least 2 characters')).toBeInTheDocument()
    })
  })

  it('clears validation errors when user starts typing', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    // Trigger validation errors
    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Card number must be at least 13 digits')).toBeInTheDocument()
    })

    // Start typing in card number field
    const cardNumberInput = screen.getByLabelText('Card Number')
    await userEvent.type(cardNumberInput, '1234567890123456')

    // Error should be cleared
    expect(screen.queryByText('Card number must be at least 13 digits')).not.toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    // Fill in card details
    await userEvent.type(screen.getByLabelText('Card Number'), '1234567890123456')
    await userEvent.clear(screen.getByLabelText('Month'))
    await userEvent.type(screen.getByLabelText('Month'), '12')
    await userEvent.clear(screen.getByLabelText('Year'))
    await userEvent.type(screen.getByLabelText('Year'), '2025')
    await userEvent.type(screen.getByLabelText('CVV'), '123')

    // Fill in recipient info
    await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe')
    await userEvent.type(screen.getByLabelText('Email Address'), 'john@example.com')

    // Fill in bank details
    await userEvent.type(screen.getByLabelText('IBAN'), 'DE89370400440532013000')
    await userEvent.type(screen.getByLabelText('BIC/SWIFT Code'), 'COBADEFFXXX')
    await userEvent.type(screen.getByLabelText('Bank Name'), 'Deutsche Bank')
    await userEvent.type(screen.getByLabelText('Account Holder Name'), 'John Doe')

    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        cardDetails: {
          number: '1234567890123456',
          expiryMonth: 12,
          expiryYear: 2025,
          cvv: '123'
        },
        recipientInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          bankAccount: {
            iban: 'DE89370400440532013000',
            bic: 'COBADEFFXXX',
            bankName: 'Deutsche Bank',
            accountHolderName: 'John Doe',
            country: 'DE'
          }
        }
      })
    })
  })

  it('shows loading state when isLoading is true', () => {
    render(<PaymentForm {...defaultProps} isLoading={true} />)
    
    const submitButton = screen.getByRole('button')
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Processing Transfer...')).toBeInTheDocument()
  })

  it('shows processing state during form submission', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    // Fill in minimal valid data
    await userEvent.type(screen.getByLabelText('Card Number'), '1234567890123456')
    await userEvent.type(screen.getByLabelText('CVV'), '123')
    await userEvent.type(screen.getByLabelText('Full Name'), 'John Doe')
    await userEvent.type(screen.getByLabelText('Email Address'), 'john@example.com')
    await userEvent.type(screen.getByLabelText('IBAN'), 'DE89370400440532013000')
    await userEvent.type(screen.getByLabelText('BIC/SWIFT Code'), 'COBADEFFXXX')
    await userEvent.type(screen.getByLabelText('Bank Name'), 'Deutsche Bank')
    await userEvent.type(screen.getByLabelText('Account Holder Name'), 'John Doe')

    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    
    // The component shows processing state internally, so we just need to check the button is disabled
    await userEvent.click(submitButton)

    // Should show that the button is disabled during processing
    expect(submitButton).toBeDisabled()
  })

  it('validates card expiry date correctly', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    // Set expired year
    const yearInput = screen.getByLabelText('Year')
    await userEvent.clear(yearInput)
    await userEvent.type(yearInput, '2020')

    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Card has expired')).toBeInTheDocument()
    })
  })

  it('limits CVV input to numbers only', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const cvvInput = screen.getByLabelText('CVV')
    await userEvent.type(cvvInput, 'abc123def')
    
    expect(cvvInput).toHaveValue('123')
  })

  it('limits card number input to numbers only', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const cardNumberInput = screen.getByLabelText('Card Number')
    await userEvent.type(cardNumberInput, 'abc1234def5678ghi9012jkl3456')
    
    expect(cardNumberInput).toHaveValue('1234 5678 9012 3456')
  })

  it('shows security notice', () => {
    render(<PaymentForm {...defaultProps} />)
    
    expect(screen.getByText('Secured by Circle • PCI DSS Compliant')).toBeInTheDocument()
  })

  it('validates email format correctly', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    await userEvent.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument()
    })
  })

  it('validates IBAN length correctly', async () => {
    render(<PaymentForm {...defaultProps} />)
    
    const ibanInput = screen.getByLabelText('IBAN')
    await userEvent.type(ibanInput, 'DE123') // Too short

    const submitButton = screen.getByRole('button', { name: /Send 100\.00 USD/ })
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('IBAN must be at least 15 characters')).toBeInTheDocument()
    })
  })
})