import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentRequestQRCode } from '../PaymentRequestQRCode'

// Mock react-qr-code
jest.mock('react-qr-code', () => {
  return function MockQRCode({ value, ...props }: any) {
    return <div data-testid="qr-code" data-value={value} {...props}>QR Code</div>
  }
})

const mockPaymentRequest = {
  id: 'test-request-id',
  amount: 100,
  currency: 'USD',
  description: 'Test payment',
  status: 'pending' as const,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
}

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PaymentRequestQRCode', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    // Reset clipboard mock
    ;(navigator.clipboard.writeText as jest.Mock).mockClear()
  })

  it('renders payment request details', () => {
    render(<PaymentRequestQRCode paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText('Payment Request')).toBeInTheDocument()
    expect(screen.getByText('USD 100.00')).toBeInTheDocument()
    expect(screen.getByText('Test payment')).toBeInTheDocument()
    expect(screen.getByText(/Request ID:/)).toBeInTheDocument()
  })

  it('shows generate QR code button when no QR code exists', () => {
    render(<PaymentRequestQRCode paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText('QR Code not generated')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate QR Code' })).toBeInTheDocument()
  })

  it('generates QR code when button is clicked', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      qrCode: 'https://example.com/pay/test-request-id',
      shareableLink: 'https://example.com/pay/test-request-id',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    render(<PaymentRequestQRCode paymentRequest={mockPaymentRequest} />)
    
    // Click generate QR code button
    await user.click(screen.getByRole('button', { name: 'Generate QR Code' }))
    
    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/payment-requests/test-request-id/qr-code',
        { method: 'POST' }
      )
    })
    
    // Check that QR code is displayed
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
      expect(screen.getByDisplayValue(mockResponse.shareableLink)).toBeInTheDocument()
    })
  })

  it('displays existing QR code if provided', () => {
    const paymentRequestWithQR = {
      ...mockPaymentRequest,
      qrCode: 'https://example.com/pay/test-request-id',
      shareableLink: 'https://example.com/pay/test-request-id',
    }

    render(<PaymentRequestQRCode paymentRequest={paymentRequestWithQR} />)
    
    expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://example.com/pay/test-request-id')).toBeInTheDocument()
  })

  it('copies shareable link to clipboard', async () => {
    const user = userEvent.setup()
    const paymentRequestWithQR = {
      ...mockPaymentRequest,
      qrCode: 'https://example.com/pay/test-request-id',
      shareableLink: 'https://example.com/pay/test-request-id',
    }

    render(<PaymentRequestQRCode paymentRequest={paymentRequestWithQR} />)
    
    // Click copy button
    const copyButton = screen.getByRole('button', { name: '' }) // Copy button with icon only
    await user.click(copyButton)
    
    // Check clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/pay/test-request-id')
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument()
    })
  })

  it('shows payment status and expiry', () => {
    render(<PaymentRequestQRCode paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText(/Status:/)).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText(/Expires:/)).toBeInTheDocument()
  })

  it('handles QR code generation error', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    mockFetch.mockRejectedValueOnce(new Error('API Error'))

    render(<PaymentRequestQRCode paymentRequest={mockPaymentRequest} />)
    
    // Click generate QR code button
    await user.click(screen.getByRole('button', { name: 'Generate QR Code' }))
    
    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error generating QR code:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })
})