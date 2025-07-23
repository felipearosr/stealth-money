// src/components/features/OnboardingGate.tsx
'use client';

import React, { useState, useEffect } from 'react';
import BankAccountOnboarding from './BankAccountOnboarding';

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
}

export default function OnboardingGate({ 
  children, 
  requireVerification = false,
  onOnboardingComplete,
  skipCheckOnPublicPages = false
}: OnboardingGateProps) {
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
      
      // Add a timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch(`${API_URL}/api/users/me/bank-accounts`, {
          headers: {
            'Content-Type': 'application/json',
            // Add authorization header if needed
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const accounts = data.bankAccounts || [];
          setBankAccounts(accounts);
          
          // Check if user needs onboarding
          const hasAccounts = accounts.length > 0;
          const hasVerifiedAccount = accounts.some((account: BankAccount) => account.isVerified);
          
          if (requireVerification) {
            setNeedsOnboarding(!hasVerifiedAccount);
          } else {
            setNeedsOnboarding(!hasAccounts);
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
    setNeedsOnboarding(false);
    if (onOnboardingComplete) {
      onOnboardingComplete();
    }
  };

  const handleSkip = () => {
    setNeedsOnboarding(false);
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
      <BankAccountOnboarding
        onComplete={handleOnboardingComplete}
        onSkip={!requireVerification ? handleSkip : undefined}
        requireVerification={requireVerification}
      />
    );
  }

  return <>{children}</>;
}