import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProcessorSelection } from '../ProcessorSelection';
import * as api from '@/lib/api';

// Mock the API functions
jest.mock('@/lib/api', () => ({
  getAvailableProcessors: jest.fn(),
  selectOptimalProcessor: jest.fn(),
}));

const mockProcessors = [
  {
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
  },
  {
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
  }
];

const mockLocation = {
  country: 'US',
  region: 'North America',
  currency: 'USD',
  timezone: 'America/New_York'
};

const mockSelection = {
  selectedProcessor: mockProcessors[0],
  reason: 'Selected Stripe for excellent user experience (9/10)',
  alternatives: [mockProcessors[1]],
  estimatedFees: 3.20
};

describe('ProcessorSelection', () => {
  const mockOnProcessorSelected = jest.fn();
  const mockOnLocationDetected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (api.getAvailableProcessors as jest.Mock).mockResolvedValue({
      location: mockLocation,
      processors: mockProcessors,
      count: mockProcessors.length
    });
    (api.selectOptimalProcessor as jest.Mock).mockResolvedValue({
      location: mockLocation,
      selection: mockSelection,
      criteria: { prioritizeCost: true, prioritizeSpeed: false, prioritizeReliability: true }
    });
  });

  it('renders loading state initially', () => {
    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    expect(screen.getByText('Detecting your location and available payment methods...')).toBeInTheDocument();
  });

  it('loads and displays available processors', async () => {
    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
        onLocationDetected={mockOnLocationDetected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
    });

    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('US • USD')).toBeInTheDocument();
    expect(mockOnLocationDetected).toHaveBeenCalledWith(mockLocation);
  });

  it('displays processor details correctly', async () => {
    render(
      <ProcessorSelection
        userId="test-user"
        amount={100}
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    expect(screen.getByText('2.9% + $0.3')).toBeInTheDocument();
    expect(screen.getByText('≈ $3.20 fee')).toBeInTheDocument();
    expect(screen.getByText('1-3 business days')).toBeInTheDocument();
    expect(screen.getByText('99.9% uptime')).toBeInTheDocument();
  });

  it('shows recommended processor badge', async () => {
    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    expect(screen.getByText('Selected Stripe for excellent user experience (9/10)')).toBeInTheDocument();
  });

  it('allows processor selection', async () => {
    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    const stripeOption = screen.getByText('Stripe').closest('div');
    fireEvent.click(stripeOption!);

    expect(mockOnProcessorSelected).toHaveBeenCalledWith(mockProcessors[0], mockSelection);
  });

  it('shows all processors when requested', async () => {
    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show 1 more payment method')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show 1 more payment method'));

    expect(screen.getByText('Plaid')).toBeInTheDocument();
    expect(screen.getByText('Show recommended only')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (api.getAvailableProcessors as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('shows no processors available message', async () => {
    (api.getAvailableProcessors as jest.Mock).mockResolvedValue({
      location: mockLocation,
      processors: [],
      count: 0
    });

    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No Payment Methods Available')).toBeInTheDocument();
    });

    expect(screen.getByText('We couldn\'t find any available payment processors for your location (US).')).toBeInTheDocument();
  });

  it('applies custom selection criteria', async () => {
    const customCriteria = {
      prioritizeCost: false,
      prioritizeSpeed: true,
      prioritizeReliability: false
    };

    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
        criteria={customCriteria}
      />
    );

    await waitFor(() => {
      expect(api.selectOptimalProcessor).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining(customCriteria)
      );
    });
  });

  it('handles processor selection failure gracefully', async () => {
    (api.selectOptimalProcessor as jest.Mock).mockRejectedValue(new Error('Selection failed'));

    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    // Should fallback to first available processor
    const stripeOption = screen.getByText('Stripe').closest('div');
    expect(stripeOption).toHaveClass('border-blue-500'); // Selected state
  });

  it('displays alternative processors information', async () => {
    render(
      <ProcessorSelection
        userId="test-user"
        onProcessorSelected={mockOnProcessorSelected}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Show 1 more payment method')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show 1 more payment method'));

    await waitFor(() => {
      expect(screen.getByText('Alternative Options:')).toBeInTheDocument();
    });

    expect(screen.getByText('Plaid')).toBeInTheDocument();
    expect(screen.getByText('1.5% + $0.25')).toBeInTheDocument();
  });
});