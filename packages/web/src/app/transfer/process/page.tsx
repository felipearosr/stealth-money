"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from "next/navigation";
import { TransferCalculator } from "@/components/features/TransferCalculator";
import { UserRecipientSelector } from "@/components/features/UserRecipientSelector";
import { EnhancedPaymentForm } from "@/components/features/PaymentForm";
import { TransferStatus } from "@/components/features/TransferStatus";
import { ProgressIndicator } from "@/components/features/ProgressIndicator";
import OnboardingGate from "@/components/features/OnboardingGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Calculator } from "lucide-react";

// Types for the transfer process
export type TransferStep = 'calculator' | 'recipient' | 'payment' | 'status';

interface UserProfile {
  id: string;
  email: string;
  username?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  profileImageUrl?: string;
  isVerified: boolean;
  verifiedPaymentMethods: VerifiedPaymentMethod[];
  supportedCurrencies: string[];
  lastActiveAt?: string;
  createdAt: string;
}

interface VerifiedPaymentMethod {
  id: string;
  type: 'bank_account' | 'mobile_wallet' | 'debit_card';
  currency: string;
  bankName?: string;
  accountType?: string;
  lastFourDigits?: string;
  isDefault: boolean;
  verifiedAt: string;
  country: string;
}

interface TransferCalculationData {
  sendAmount: number;
  receiveAmount: number;
  sendCurrency: string;
  receiveCurrency: string;
  exchangeRate: number;
  fees: number;
  rateId: string;
  rateValidUntil: string;
  calculatorMode: 'send' | 'receive';
  breakdown: {
    sendAmountUSD: number;
    fees: {
      cardProcessing: number;
      transfer: number;
      payout: number;
      total: number;
    };
    netAmountUSD: number;
    exchangeRate: number;
    receiveAmount: number;
  };
  estimatedArrival: string;
}

interface TransferProcessState {
  currentStep: TransferStep;
  transferData: TransferCalculationData | null;
  recipientUser: UserProfile | null;
  selectedPaymentMethod: VerifiedPaymentMethod | null;
  transferId: string | null;
  completedSteps: TransferStep[];
  canGoBack: boolean;
  isLoading: boolean;
  error: string | null;
}

export default function TransferProcessPage() {
  const { user, isLoaded } = useUser();
  const { } = useAuth();
  const router = useRouter();

  // Transfer process state
  const [state, setState] = useState<TransferProcessState>({
    currentStep: 'calculator',
    transferData: null,
    recipientUser: null,
    selectedPaymentMethod: null,
    transferId: null,
    completedSteps: [],
    canGoBack: false,
    isLoading: false,
    error: null,
  });

  // Load transfer data from sessionStorage on mount
  useEffect(() => {
    const savedCalculation = sessionStorage.getItem('transferCalculation');
    if (savedCalculation) {
      try {
        const calculationData = JSON.parse(savedCalculation);
        setState(prev => ({
          ...prev,
          transferData: calculationData,
          completedSteps: ['calculator'],
          currentStep: 'recipient',
          canGoBack: true
        }));
        // Clear from sessionStorage since we've loaded it
        sessionStorage.removeItem('transferCalculation');
      } catch (error) {
        console.error('Failed to parse saved calculation:', error);
      }
    }
  }, []);

  // Helper function to update state
  const updateState = useCallback((updates: Partial<TransferProcessState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation helpers
  const goToStep = useCallback((step: TransferStep) => {
    updateState({ 
      currentStep: step,
      canGoBack: step !== 'calculator',
      error: null 
    });
  }, [updateState]);

  const goBack = useCallback(() => {
    const stepOrder: TransferStep[] = ['calculator', 'recipient', 'payment', 'status'];
    const currentIndex = stepOrder.indexOf(state.currentStep);
    
    if (currentIndex > 0) {
      const previousStep = stepOrder[currentIndex - 1];
      goToStep(previousStep);
    } else {
      // Go back to main landing page
      router.push('/');
    }
  }, [state.currentStep, goToStep, router]);

  const markStepCompleted = useCallback((step: TransferStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step) 
        ? prev.completedSteps 
        : [...prev.completedSteps, step]
    }));
  }, []);

  // Step 1: Calculator completion
  const handleCalculatorContinue = useCallback((data: {
    sendAmount: number;
    receiveAmount: number;
    sendCurrency: string;
    receiveCurrency: string;
    exchangeRate: number;
    fees: number;
    rateId: string;
    rateValidUntil: string;
    calculatorMode: 'send' | 'receive';
    breakdown: Record<string, unknown>;
    estimatedArrival: string;
  }) => {
    const transferData: TransferCalculationData = {
      sendAmount: data.sendAmount,
      receiveAmount: data.receiveAmount,
      sendCurrency: data.sendCurrency,
      receiveCurrency: data.receiveCurrency,
      exchangeRate: data.exchangeRate,
      fees: data.fees,
      rateId: data.rateId,
      rateValidUntil: data.rateValidUntil,
      calculatorMode: data.calculatorMode,
      breakdown: data.breakdown as {
        sendAmountUSD: number;
        fees: {
          cardProcessing: number;
          transfer: number;
          payout: number;
          total: number;
        };
        netAmountUSD: number;
        exchangeRate: number;
        receiveAmount: number;
      },
      estimatedArrival: data.estimatedArrival,
    };

    updateState({ 
      transferData: transferData,
      isLoading: true 
    });
    
    markStepCompleted('calculator');
    
    setTimeout(() => {
      updateState({ isLoading: false });
      goToStep('recipient');
    }, 500);
  }, [updateState, markStepCompleted, goToStep]);

  // Step 2: Recipient selection
  const handleRecipientSelected = useCallback((recipient: UserProfile, paymentMethod: VerifiedPaymentMethod) => {
    updateState({ 
      recipientUser: recipient,
      selectedPaymentMethod: paymentMethod,
      isLoading: true 
    });
    
    markStepCompleted('recipient');
    
    setTimeout(() => {
      updateState({ isLoading: false });
      goToStep('payment');
    }, 500);
  }, [updateState, markStepCompleted, goToStep]);

  // Step 3: Payment completion
  const handlePaymentSuccess = useCallback(async (transferId: string) => {
    markStepCompleted('payment');
    
    updateState({ 
      transferId,
      isLoading: false 
    });
    
    goToStep('status');
  }, [markStepCompleted, updateState, goToStep]);

  // Payment error handler
  const handlePaymentError = useCallback((error: string) => {
    updateState({ 
      error,
      isLoading: false 
    });
  }, [updateState]);

  // Render step content based on current step
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'calculator':
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Calculator className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold">Calculate Your Transfer</h2>
                </div>
                <p className="text-gray-600">
                  Enter the amount you want to send and see the real-time exchange rate and fees.
                </p>
              </CardContent>
            </Card>
            <TransferCalculator
              onContinue={handleCalculatorContinue}
              isNavigating={state.isLoading}
            />
          </div>
        );
      
      case 'recipient':
        if (!state.transferData) {
          return (
            <Card className="w-full max-w-lg mx-auto">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Missing Transfer Data</h3>
                <p className="text-red-600 mb-4">Please complete the calculator step first.</p>
                <Button onClick={() => goToStep('calculator')} variant="outline">
                  Go to Calculator
                </Button>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <UserRecipientSelector
            transferData={{
              sendAmount: state.transferData.sendAmount,
              receiveAmount: state.transferData.receiveAmount,
              sendCurrency: state.transferData.sendCurrency,
              receiveCurrency: state.transferData.receiveCurrency,
              exchangeRate: state.transferData.exchangeRate,
              fees: state.transferData.fees,
            }}
            onRecipientSelected={handleRecipientSelected}
            onBack={goBack}
            currentUserId={user?.id}
            isLoading={state.isLoading}
          />
        );
      
      case 'payment':
        if (!state.transferData || !state.recipientUser || !state.selectedPaymentMethod) {
          return (
            <Card className="w-full max-w-lg mx-auto">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Missing Required Data</h3>
                <p className="text-red-600 mb-4">
                  Please complete the previous steps first.
                </p>
                <Button onClick={() => goToStep('calculator')} variant="outline">
                  Start Over
                </Button>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <EnhancedPaymentForm
            transferData={state.transferData}
            recipientUser={state.recipientUser}
            selectedPaymentMethod={state.selectedPaymentMethod}
            onSuccess={handlePaymentSuccess}
            onBack={goBack}
            onError={handlePaymentError}
            isLoading={state.isLoading}
          />
        );
      
      case 'status':
        if (!state.transferId) {
          return (
            <Card className="w-full max-w-lg mx-auto">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">No Transfer Found</h3>
                <p className="text-red-600 mb-4">Transfer ID is missing.</p>
                <Button onClick={() => goToStep('calculator')} variant="outline">
                  Start New Transfer
                </Button>
              </CardContent>
            </Card>
          );
        }
        
        return (
          <TransferStatus
            transferId={state.transferId}
            onRefresh={() => {}}
            autoRefresh={true}
          />
        );
      
      default:
        return (
          <Card className="w-full max-w-lg mx-auto">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Unknown Step</h3>
              <p className="text-gray-600 mb-4">Invalid step: {state.currentStep}</p>
              <Button onClick={() => goToStep('calculator')} variant="outline">
                Start Over
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <OnboardingGate 
      requireVerification={false} 
      skipCheckOnPublicPages={false}
      blockTransfersUntilVerified={true}
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Complete Your Transfer
              </h1>
              <p className="text-gray-600">
                {!user ? 'Sign in to continue with your transfer' : 
                 'Follow the steps below to send your money securely'}
              </p>
            </div>

            {/* Progress Indicator */}
            <ProgressIndicator
              currentStep={state.currentStep}
              completedSteps={state.completedSteps}
              onStepClick={(step) => {
                if (state.completedSteps.includes(step as TransferStep) || step === state.currentStep) {
                  goToStep(step as TransferStep);
                }
              }}
            />
            
            {/* Back Button (except for status step) */}
            {state.canGoBack && state.currentStep !== 'status' && (
              <div className="flex justify-start">
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={state.isLoading}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            )}
            
            {/* Global Error Display */}
            {state.error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Error</span>
                  </div>
                  <p className="text-red-600 mt-1">{state.error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateState({ error: null })}
                    className="mt-2"
                  >
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Step Content */}
            <div className="relative">
              {state.isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Processing...</p>
                  </div>
                </div>
              )}
              
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </OnboardingGate>
  );
}