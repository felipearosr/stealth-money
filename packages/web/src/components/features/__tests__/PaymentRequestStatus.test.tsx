import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentRequestStatus } from '../PaymentRequestStatus'

const mockPaymentRequest = {
  id: 'test-request-id',
  amount: 100,
  currency: 'USD',
  description: 'Test payment',
  status: 'pending' as const,
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
  createdAt: new Date(),
}

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PaymentRequestStatus', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders payment request status information', () => {
    render(<PaymentRequestStatus paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText('Payment Status')).toBeInTheDocument()
    expect(screen.getByText('USD 100.00')).toBeInTheDocument()
    expect(screen.getByText('Test payment')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('Waiting for payment')).toBeInTheDocument()
  })

  it('shows time remaining for pending requests', () => {
    render(<PaymentRequestStatus paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText('Time Remaining:')).toBeInTheDocument()
    // Time display might vary slightly due to timing, so use a more flexible matcher
    expect(screen.getByText(/\d+h \d+m/)).toBeInTheDocument()
  })

  it('refreshes status when refresh button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnStatusUpdate = jest.fn()
    const updatedRequest = { ...mockPaymentRequest, status: 'paid' as const }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(updatedRequest),
    })

    render(
      <PaymentRequestStatus 
        paymentRequest={mockPaymentRequest} 
        onStatusUpdate={mockOnStatusUpdate}
      />
    )
    
    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: '' }) // Refresh button with icon only
    await user.click(refreshButton)
    
    // Wait for API call
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/payment-requests/test-request-id'
      )
    })
    
    expect(mockOnStatusUpdate).toHaveBeenCalledWith(updatedRequest)
  })

  it('shows paid status with payment details', () => {
    const paidRequest = {
      ...mockPaymentRequest,
      status: 'paid' as const,
      paidAt: new Date(),
      paymentId: 'payment-123',
    }

    render(<PaymentRequestStatus paymentRequest={paidRequest} />)
    
    expect(screen.getByText('paid')).toBeInTheDocument()
    expect(screen.getByText('Payment received successfully')).toBeInTheDocument()
    expect(screen.getByText('Payment Details:')).toBeInTheDocument()
    expect(screen.getByText(/Paid on:/)).toBeInTheDocument()
    expect(screen.getByText(/Payment ID: payment-123/)).toBeInTheDocument()
  })

  it('shows expired status', () => {
    const expiredRequest = {
      ...mockPaymentRequest,
      status: 'expired' as const,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    }

    render(<PaymentRequestStatus paymentRequest={expiredRequest} />)
    
    expect(screen.getByText('expired')).toBeInTheDocument()
    expect(screen.getByText('Payment request has expired')).toBeInTheDocument()
  })

  it('shows cancelled status', () => {
    const cancelledRequest = {
      ...mockPaymentRequest,
      status: 'cancelled' as const,
    }

    render(<PaymentRequestStatus paymentRequest={cancelledRequest} />)
    
    expect(screen.getByText('cancelled')).toBeInTheDocument()
    expect(screen.getByText('Payment request was cancelled')).toBeInTheDocument()
  })

  it('auto-refreshes for pending requests', async () => {
    const mockOnStatusUpdate = jest.fn()
    const updatedRequest = { ...mockPaymentRequest, status: 'paid' as const }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedRequest),
    })

    render(
      <PaymentRequestStatus 
        paymentRequest={mockPaymentRequest} 
        onStatusUpdate={mockOnStatusUpdate}
      />
    )
    
    // Fast-forward time to trigger auto-refresh
    jest.advanceTimersByTime(5000)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/payment-requests/test-request-id'
      )
    })
  })

  it('allows toggling auto-refresh', async () => {
    const user = userEvent.setup()
    
    render(<PaymentRequestStatus paymentRequest={mockPaymentRequest} />)
    
    // Find and uncheck auto-refresh checkbox
    const autoRefreshCheckbox = screen.getByLabelText('Auto-refresh status')
    expect(autoRefreshCheckbox).toBeChecked()
    
    await user.click(autoRefreshCheckbox)
    expect(autoRefreshCheckbox).not.toBeChecked()
  })

  it('displays request metadata', () => {
    render(<PaymentRequestStatus paymentRequest={mockPaymentRequest} />)
    
    expect(screen.getByText(/Created:/)).toBeInTheDocument()
    expect(screen.getByText(/Expires:/)).toBeInTheDocument()
    expect(screen.getByText(/Request ID: test-request-id/)).toBeInTheDocument()
  })
})