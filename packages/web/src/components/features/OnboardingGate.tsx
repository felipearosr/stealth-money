// src/components/features/OnboardingGate.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import BankAccountOnboardingV2 from './BankAccountOnboardingV2';

interface BankAccount {
  id: string;
  currency: string;
  isVerified: boolean;
  isActive: boolean;
}

interface OnboardingGateProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  onOnboardingComplete?: () => void;
  skipCheckOnPublicPages?: boolean;
  blockTransfersUntilVerified?: boolean; // New prop to enforce verification for transfers
}

export default function OnboardingGate({ 
  children, 
  requireVerification = false,
  onOnboardingComplete,
  skipCheckOnPublicPages = false,
  blockTransfersUntilVerified = false
}: OnboardingGateProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    if (skipCheckOnPublicPages) {
      setLoading(false);
      setNeedsOnboarding(false);
    } else {
      checkOnboardingStatus();
    }
  }, [skipCheckOnPublicPages]);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      
      // Check if API is available and if we're on the client side
      if (typeof window === 'undefined') {
        setNeedsOnboarding(false);
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Get authentication token
      const token = await getToken();
      if (!token) {
        // User not authenticated, let them proceed (auth will be handled elsewhere)
        setNeedsOnboarding(false);
        return;
      }
      
      // Add a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      try {
        const response = await fetch(`${API_URL}/api/users/me/bank-accounts`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const responseData = await response.json();
          console.log('OnboardingGate: Fetched response:', responseData);
          
          // Handle both response formats: array or { bankAccounts: [...] }
          const accounts = responseData.bankAccounts || responseData;
          const accountsArray = Array.isArray(accounts) ? accounts : [];
          setBankAccounts(accountsArray);
          
          // Check if user needs onboarding
          const hasAccounts = accountsArray.length > 0;
          const hasVerifiedAccount = accountsArray.some((account: BankAccount) => account.isVerified);
          
          console.log('OnboardingGate: Has accounts:', hasAccounts, 'Has verified:', hasVerifiedAccount);
          
          // For transfer flows, always require verified accounts
          if (requireVerification || blockTransfersUntilVerified) {
            const needsOnboarding = !hasVerifiedAccount;
            console.log('OnboardingGate: Transfer flow - needs onboarding:', needsOnboarding);
            setNeedsOnboarding(needsOnboarding);
          } else {
            const needsOnboarding = !hasAccounts;
            console.log('OnboardingGate: Regular flow - needs onboarding:', needsOnboarding);
            setNeedsOnboarding(needsOnboarding);
          }
        } else if (response.status === 401) {
          // User not authenticated, let them proceed (auth will be handled elsewhere)
          setNeedsOnboarding(false);
        } else {
          // API error - don't block user, just log the issue
          console.warn('Onboarding status check failed:', response.status, response.statusText);
          setNeedsOnboarding(false);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // Network error or API not available - don't block user
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Onboarding status check timed out (API may be slow or unavailable)');
      } else {
        console.warn('Onboarding status check error (API may not be running):', error);
      }
      setNeedsOnboarding(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    console.log('OnboardingGate: Onboarding completed, refreshing status...');
    // Refresh the onboarding status
    checkOnboardingStatus();
    if (onOnboardingComplete) {
      onOnboardingComplete();
    }
  };

  const handleAccountAdded = () => {
    console.log('OnboardingGate: Account added, refreshing status...');
    // Refresh the onboarding status when an account is added
    checkOnboardingStatus();
  };

  const handleSkip = () => {
    // Only allow skipping if not required for transfers
    if (!blockTransfersUntilVerified) {
      setNeedsOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Checking account status...</p>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <BankAccountOnboardingV2
        onComplete={handleOnboardingComplete}
        onSkip={(!requireVerification && !blockTransfersUntilVerified) ? handleSkip : undefined}
        requireVerification={requireVerification || blockTransfersUntilVerified}
        onAccountAdded={handleAccountAdded}
      />
    );
  }

  return <>{children}</>;
}