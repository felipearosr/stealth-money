// src/components/features/ChileanOnboardingGate.tsx
'use client';

import React from 'react';
import OnboardingGate from './OnboardingGate';

interface ChileanOnboardingGateProps {
  children: React.ReactNode;
  onOnboardingComplete?: () => void;
}

/**
 * Chilean-specific onboarding gate that enforces Chilean bank account verification
 * This component is specifically designed for Chilean user-to-user transfers
 */
export default function ChileanOnboardingGate({ 
  children, 
  onOnboardingComplete 
}: ChileanOnboardingGateProps) {
  return (
    <OnboardingGate
      requireChileanVerification={true}
      requireVerification={true}
      blockTransfersUntilVerified={true}
      onOnboardingComplete={onOnboardingComplete}
      skipCheckOnPublicPages={false}
    >
      {children}
    </OnboardingGate>
  );
}