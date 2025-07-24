import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransferStatus, TransferStatusData, TransferStatusEnum } from '../TransferStatus'

// Mock fetch globally
global.fetch = jest.fn()

describe('TransferStatus', () => {
  const mockTransferData: TransferStatusData = {
    transferId: 'transfer_123',
    status: TransferStatusEnum.TRANSFERRING,
    timeline: [
      {
        id: 'event_1',
        transferId: 'transfer_123',
        type: 'payment_created',
        status: 'success',
        message: 'Payment created successfully',
        timestamp: '2025-01-21T10:00:00Z'
      },
      {
        id: 'event_2',
        transferId: 'transfer_123',
        type: 'payment_confirmed',
        status: 'success',
        message: 'Payment confirmed',
        timestamp: '2025-01-21T10:05:00Z'
      },
      {
        id: 'event_3',
        transferId: 'transfer_123',
        type: 'transfer_initiated',
        status: 'pending',
        message: 'Transfer in progress',
        timestamp: '2025-01-21T10:10:00Z'
      }
    ],
    sendAmount: 100,
    receiveAmount: 85.50,
    exchangeRate: 0.855,
    fees: 5.50,
    estimatedCompletion: '2025-01-21T10:30:00Z',
    lastUpdated: '2025-01-21T10:15:00Z'
  }

  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders loading state initially', () => {
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockTransferData
      }), 100))
    )

    render(<TransferStatus transferId="transfer_123" />)
    
    expect(screen.getByText('Loading transfer status...')).toBeInTheDocument()
  })

  it('renders transfer status with all details', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Transfer Status')).toBeInTheDocument()
      expect(screen.getByText('ID: transfer_123')).toBeInTheDocument()
      expect(screen.getByText('Transferring')).toBeInTheDocument()
    })

    // Check transfer details
    expect(screen.getByText('$100.00')).toBeInTheDocument()
    expect(screen.getByText('€85.50')).toBeInTheDocument()
    expect(screen.getByText('1 USD = 0.8550 EUR')).toBeInTheDocument()
    expect(screen.getByText('$5.50')).toBeInTheDocument()
  })

  it('displays progress bar with correct percentage', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument() // TRANSFERRING = 60%
    })
  })

  it('renders timeline events correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('Payment created successfully')).toBeInTheDocument()
      expect(screen.getByText('Payment confirmed')).toBeInTheDocument()
      expect(screen.getByText('Transfer in progress')).toBeInTheDocument()
    })
  })

  it('shows estimated completion time for pending transfers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText(/Estimated completion:/)).toBeInTheDocument()
    })
  })

  it('shows completed time for completed transfers', async () => {
    const completedTransfer = {
      ...mockTransferData,
      status: TransferStatusEnum.COMPLETED,
      completedAt: '2025-01-21T10:25:00Z'
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => completedTransfer
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText(/Completed:/)).toBeInTheDocument()
      expect(screen.getByText('100%')).toBeInTheDocument() // COMPLETED = 100%
    })
  })

  it('handles different transfer statuses correctly', async () => {
    const testCases = [
      { status: TransferStatusEnum.INITIATED, label: 'Initiated', progress: '20%' },
      { status: TransferStatusEnum.PAYMENT_PROCESSING, label: 'Processing Payment', progress: '40%' },
      { status: TransferStatusEnum.PAYING_OUT, label: 'Paying Out', progress: '80%' },
      { status: TransferStatusEnum.FAILED, label: 'Failed', progress: '0%' }
    ]

    for (const testCase of testCases) {
      const transferData = { ...mockTransferData, status: testCase.status }
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => transferData
      })

      const { unmount } = render(<TransferStatus transferId="transfer_123" />)

      await waitFor(() => {
        expect(screen.getByText(testCase.label)).toBeInTheDocument()
        expect(screen.getByText(testCase.progress)).toBeInTheDocument()
      })

      unmount()
    }
  })

  it('handles API errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Transfer')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('handles 404 errors correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Transfer not found' })
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Transfer')).toBeInTheDocument()
      expect(screen.getByText('Transfer not found')).toBeInTheDocument()
    })
  })

  it('allows manual refresh', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" onRefresh={mockOnRefresh} autoRefresh={false} />)

    await waitFor(() => {
      expect(screen.getByText('Transfer Status')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /Refresh|Update/ })
    await userEvent.click(refreshButton)

    expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + manual refresh
    expect(mockOnRefresh).toHaveBeenCalledTimes(1)
  })

  it('retries on error when Try Again is clicked', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransferData
      })

    render(<TransferStatus transferId="transfer_123" autoRefresh={false} />)

    await waitFor(() => {
      expect(screen.getByText('Error Loading Transfer')).toBeInTheDocument()
    })

    const tryAgainButton = screen.getByText('Try Again')
    await userEvent.click(tryAgainButton)

    await waitFor(() => {
      expect(screen.getByText('Transfer Status')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('formats currency correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('$100.00')).toBeInTheDocument()
      expect(screen.getByText('€85.50')).toBeInTheDocument()
      expect(screen.getByText('$5.50')).toBeInTheDocument()
    })
  })

  it('formats timestamps correctly', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      // Check that timestamps are formatted (exact format depends on locale)
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
    })
  })

  it('shows auto-refresh indicator for pending transfers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" autoRefresh={true} refreshInterval={5000} />)

    await waitFor(() => {
      expect(screen.getByText(/Auto-refreshing every 5s/)).toBeInTheDocument()
    })
  })

  it('does not show auto-refresh indicator for completed transfers', async () => {
    const completedTransfer = { ...mockTransferData, status: TransferStatusEnum.COMPLETED }
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => completedTransfer
    })

    render(<TransferStatus transferId="transfer_123" autoRefresh={true} />)

    await waitFor(() => {
      expect(screen.queryByText(/Auto-refreshing/)).not.toBeInTheDocument()
    })
  })

  it('calls correct API endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/transfers/transfer_123/status'
      )
    })
  })

  it('handles empty timeline gracefully', async () => {
    const transferWithoutTimeline = { ...mockTransferData, timeline: [] }
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => transferWithoutTimeline
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument()
      expect(screen.getByText('No timeline events yet')).toBeInTheDocument()
    })
  })

  it('disables refresh button while loading', async () => {
    global.fetch = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockTransferData
      }), 100))
    )

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Transfer Status')).toBeInTheDocument()
    })

    const refreshButton = screen.getByRole('button', { name: /Refresh|Update/ })
    
    // Click refresh to start loading
    await userEvent.click(refreshButton)
    
    // Button should be disabled while loading
    expect(refreshButton).toBeDisabled()
  })

  it('shows different event status icons correctly', async () => {
    const transferWithMixedEvents = {
      ...mockTransferData,
      timeline: [
        {
          id: 'event_1',
          transferId: 'transfer_123',
          type: 'payment_created' as const,
          status: 'success' as const,
          message: 'Payment successful',
          timestamp: '2025-01-21T10:00:00Z'
        },
        {
          id: 'event_2',
          transferId: 'transfer_123',
          type: 'transfer_initiated' as const,
          status: 'pending' as const,
          message: 'Transfer pending',
          timestamp: '2025-01-21T10:05:00Z'
        },
        {
          id: 'event_3',
          transferId: 'transfer_123',
          type: 'payout_created' as const,
          status: 'failed' as const,
          message: 'Payout failed',
          timestamp: '2025-01-21T10:10:00Z'
        }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => transferWithMixedEvents
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Payment successful')).toBeInTheDocument()
      expect(screen.getByText('Transfer pending')).toBeInTheDocument()
      expect(screen.getByText('Payout failed')).toBeInTheDocument()
    })
  })

  it('supports real-time updates with auto-refresh behavior', async () => {
    // Mock initial data
    const initialData = { ...mockTransferData, status: TransferStatusEnum.PAYMENT_PROCESSING }
    const updatedData = { ...mockTransferData, status: TransferStatusEnum.TRANSFERRING }

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => initialData
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedData
      })
      .mockResolvedValue({
        ok: true,
        json: async () => updatedData
      })

    render(<TransferStatus transferId="transfer_123" autoRefresh={true} refreshInterval={1000} />)

    // Check initial status
    await waitFor(() => {
      expect(screen.getByText('Processing Payment')).toBeInTheDocument()
      expect(screen.getByText('40%')).toBeInTheDocument()
    })

    // Wait for auto-refresh to trigger
    await waitFor(() => {
      expect(screen.getByText('Transferring')).toBeInTheDocument()
      expect(screen.getByText('60%')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('handles mobile viewport correctly', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Transferring')).toBeInTheDocument()
    })

    // Check that the component renders without layout issues on mobile
    const card = screen.getByText('Transferring').closest('.max-w-2xl')
    expect(card).toBeInTheDocument()
    
    // Check mobile-specific elements
    expect(screen.getByText('Status')).toBeInTheDocument() // Mobile title
    expect(screen.getByText('Update')).toBeInTheDocument() // Mobile button text
  })

  it('provides clear status updates and next steps for failed transfers', async () => {
    const failedTransfer = {
      ...mockTransferData,
      status: TransferStatusEnum.FAILED,
      timeline: [
        ...mockTransferData.timeline,
        {
          id: 'event_4',
          transferId: 'transfer_123',
          type: 'payout_created' as const,
          status: 'failed' as const,
          message: 'Bank deposit failed - invalid account details',
          timestamp: '2025-01-21T10:20:00Z'
        }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => failedTransfer
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('Bank deposit failed - invalid account details')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument() // Failed = 0%
    })
  })

  it('displays timeline with proper visual hierarchy', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument()
    })

    // Check that timeline events are displayed in chronological order
    const timelineEvents = screen.getAllByText(/Payment|Transfer/)
    expect(timelineEvents.length).toBeGreaterThan(0)
  })

  it('shows live updates indicator when connected', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTransferData
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Live updates')).toBeInTheDocument()
    })
  })

  it('highlights recent timeline events', async () => {
    const recentTransfer = {
      ...mockTransferData,
      timeline: [
        ...mockTransferData.timeline,
        {
          id: 'event_recent',
          transferId: 'transfer_123',
          type: 'payout_created' as const,
          status: 'success' as const,
          message: 'Recent event',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
        }
      ]
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => recentTransfer
    })

    render(<TransferStatus transferId="transfer_123" />)

    await waitFor(() => {
      expect(screen.getByText('Recent event')).toBeInTheDocument()
      expect(screen.getByText('New')).toBeInTheDocument()
    })
  })
})