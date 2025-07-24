import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import ChileanOnboardingGate from '../ChileanOnboardingGate';

// Mock the useAuth hook
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

// Mock the BankAccountOnboardingV2 component
jest.mock('../BankAccountOnboardingV2', () => {
  return function MockBankAccountOnboardingV2({ 
    requireChileanVerification, 
    requireVerification,
    onComplete 
  }: {
    requireChileanVerification?: boolean;
    requireVerification?: boolean;
    onComplete?: () => void;
  }) {
    return (
      <div data-testid="chilean-onboarding">
        <h2>Chilean Bank Account Setup Required</h2>
        <p>You need to add and verify a Chilean bank account to continue.</p>
        <div data-testid="require-chilean">{requireChileanVerification ? 'true' : 'false'}</div>
        <div data-testid="require-verification">{requireVerification ? 'true' : 'false'}</div>
        <button onClick={onComplete}>Complete Chilean Onboarding</button>
      </div>
    );
  };
});

const mockGetToken = jest.fn();
const mockFetch = jest.fn();

// Mock global fetch
global.fetch = mockFetch;

describe('ChileanOnboardingGate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getToken: mockGetToken,
    });
    mockGetToken.mockResolvedValue('mock-token');
  });

  it('should always enforce Chilean verification requirements', async () => {
    // Mock API response with no accounts
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bankAccounts: []
      })
    });

    render(
      <ChileanOnboardingGate>
        <div data-testid="chilean-transfer-content">Chilean Transfer Flow</div>
      </ChileanOnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('chilean-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('require-chilean')).toHaveTextContent('true');
      expect(screen.getByTestId('require-verification')).toHaveTextContent('true');
    });

    // Protected content should not be visible
    expect(screen.queryByTestId('chilean-transfer-content')).not.toBeInTheDocument();
  });

  it('should allow access only when user has verified Chilean account', async () => {
    // Mock API response with verified Chilean account
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bankAccounts: [
          {
            id: '1',
            currency: 'CLP',
            country: 'CL',
            isVerified: true,
            isActive: true
          }
        ]
      })
    });

    render(
      <ChileanOnboardingGate>
        <div data-testid="chilean-transfer-content">Chilean Transfer Flow</div>
      </ChileanOnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('chilean-transfer-content')).toBeInTheDocument();
    });

    // Onboarding should not be shown
    expect(screen.queryByTestId('chilean-onboarding')).not.toBeInTheDocument();
  });

  it('should block access even with verified non-Chilean accounts', async () => {
    // Mock API response with verified US account but no Chilean account
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bankAccounts: [
          {
            id: '1',
            currency: 'USD',
            country: 'US',
            isVerified: true,
            isActive: true
          }
        ]
      })
    });

    render(
      <ChileanOnboardingGate>
        <div data-testid="chilean-transfer-content">Chilean Transfer Flow</div>
      </ChileanOnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('chilean-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('require-chilean')).toHaveTextContent('true');
    });

    // Protected content should not be visible
    expect(screen.queryByTestId('chilean-transfer-content')).not.toBeInTheDocument();
  });

  it('should block access with unverified Chilean account', async () => {
    // Mock API response with unverified Chilean account
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bankAccounts: [
          {
            id: '1',
            currency: 'CLP',
            country: 'CL',
            isVerified: false,
            isActive: true
          }
        ]
      })
    });

    render(
      <ChileanOnboardingGate>
        <div data-testid="chilean-transfer-content">Chilean Transfer Flow</div>
      </ChileanOnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('chilean-onboarding')).toBeInTheDocument();
    });

    // Protected content should not be visible
    expect(screen.queryByTestId('chilean-transfer-content')).not.toBeInTheDocument();
  });
});