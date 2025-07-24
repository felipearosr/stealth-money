import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import OnboardingGate from '../OnboardingGate';

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
      <div data-testid="bank-account-onboarding">
        <div data-testid="require-chilean">{requireChileanVerification ? 'true' : 'false'}</div>
        <div data-testid="require-verification">{requireVerification ? 'true' : 'false'}</div>
        <button onClick={onComplete}>Complete Onboarding</button>
      </div>
    );
  };
});

const mockGetToken = jest.fn();
const mockFetch = jest.fn();

// Mock global fetch
global.fetch = mockFetch;

describe('OnboardingGate Chilean Requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      getToken: mockGetToken,
    });
    mockGetToken.mockResolvedValue('mock-token');
  });

  it('should enforce Chilean verification when requireChileanVerification is true', async () => {
    // Mock API response with no Chilean accounts
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
      <OnboardingGate requireChileanVerification={true}>
        <div data-testid="protected-content">Protected Content</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bank-account-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('require-chilean')).toHaveTextContent('true');
      expect(screen.getByTestId('require-verification')).toHaveTextContent('true');
    });

    // Protected content should not be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should allow access when user has verified Chilean account', async () => {
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
      <OnboardingGate requireChileanVerification={true}>
        <div data-testid="protected-content">Protected Content</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    // Onboarding should not be shown
    expect(screen.queryByTestId('bank-account-onboarding')).not.toBeInTheDocument();
  });

  it('should not enforce Chilean verification when requireChileanVerification is false', async () => {
    // Mock API response with verified non-Chilean account
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
      <OnboardingGate requireChileanVerification={false} requireVerification={true}>
        <div data-testid="protected-content">Protected Content</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    // Onboarding should not be shown since user has verified account
    expect(screen.queryByTestId('bank-account-onboarding')).not.toBeInTheDocument();
  });

  it('should require onboarding when user has unverified Chilean account', async () => {
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
      <OnboardingGate requireChileanVerification={true}>
        <div data-testid="protected-content">Protected Content</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bank-account-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('require-chilean')).toHaveTextContent('true');
    });

    // Protected content should not be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should handle mixed accounts correctly for Chilean verification', async () => {
    // Mock API response with mixed accounts (verified US, unverified Chilean)
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
          },
          {
            id: '2',
            currency: 'CLP',
            country: 'CL',
            isVerified: false,
            isActive: true
          }
        ]
      })
    });

    render(
      <OnboardingGate requireChileanVerification={true}>
        <div data-testid="protected-content">Protected Content</div>
      </OnboardingGate>
    );

    await waitFor(() => {
      expect(screen.getByTestId('bank-account-onboarding')).toBeInTheDocument();
      expect(screen.getByTestId('require-chilean')).toHaveTextContent('true');
    });

    // Protected content should not be visible because Chilean account is not verified
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});