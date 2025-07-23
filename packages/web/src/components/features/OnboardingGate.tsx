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
}

export default function OnboardingGate({ 
  children, 
  requireVerification = false,
  onOnboardingComplete 
}: OnboardingGateProps) {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users/me/bank-accounts', {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
        }
      });

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
        console.error('Failed to check onboarding status');
        setNeedsOnboarding(false); // Don't block if we can't check
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setNeedsOnboarding(false); // Don't block if we can't check
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