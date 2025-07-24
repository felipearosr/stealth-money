// src/app/test-chilean-onboarding/page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ChileanOnboardingGate from '@/components/features/ChileanOnboardingGate';

export default function TestChileanOnboardingPage() {
  const handleOnboardingComplete = () => {
    console.log('Chilean onboarding completed successfully!');
    // In a real app, this might redirect to the transfer flow or show a success message
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Chilean Onboarding Test</h1>
          <p className="text-gray-600">
            This page demonstrates the Chilean onboarding requirements enforcement.
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700">How it works</CardTitle>
            <CardDescription className="text-blue-600">
              The Chilean onboarding gate will check if you have a verified Chilean bank account.
              If not, you&apos;ll be required to add and verify one before accessing the protected content below.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-blue-600">
            <ul className="list-disc list-inside space-y-1">
              <li>Requires at least one verified Chilean bank account (CLP currency)</li>
              <li>Blocks access until verification is complete</li>
              <li>Does not allow skipping the onboarding process</li>
              <li>Automatically defaults to Chile when adding accounts</li>
            </ul>
          </CardContent>
        </Card>

        {/* This content will only be shown if the user has a verified Chilean bank account */}
        <ChileanOnboardingGate onOnboardingComplete={handleOnboardingComplete}>
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-700">🎉 Chilean Transfer Flow Unlocked!</CardTitle>
              <CardDescription className="text-green-600">
                Congratulations! You have successfully completed Chilean bank account verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-green-600">
                <h3 className="font-semibold mb-2">You can now:</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Send money to other Chilean users by username</li>
                  <li>Receive money from other Chilean users</li>
                  <li>Calculate transfer amounts in Chilean pesos (CLP)</li>
                  <li>Track your transfer status in real-time</li>
                </ul>
              </div>

              <div className="p-4 bg-white rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-700 mb-2">Next Steps:</h4>
                <p className="text-green-600 text-sm">
                  In a real application, this would redirect you to the Chilean transfer flow 
                  where you can search for recipients and send money.
                </p>
              </div>
            </CardContent>
          </Card>
        </ChileanOnboardingGate>
      </div>
    </div>
  );
}