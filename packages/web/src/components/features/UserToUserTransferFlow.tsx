"use client";

import { useState, useCallback } from "react";
import { TransferCalculator } from "./TransferCalculator";
import { UserRecipientSelector, UserProfile, VerifiedPaymentMethod } from "./UserRecipientSelector";
import { EnhancedPaymentForm } from "./PaymentForm";
import { TransferStatus } from "./TransferStatus";
import { ProgressIndicator } from "./ProgressIndicator";
import OnboardingGate from "./OnboardingGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";

// Types for user-to-user transfer flow
export type UserToUserTransferStep = 'calculator' | 'recipient' | 'payment' | 'status';

export interface UserToUserTransferData {
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

export interface UserToUserFlowState {
  currentStep: UserToUserTransferStep;
  transferData: UserToUserTransferData | null;
  recipientUser: UserProfile | null;
  selectedPaymentMethod: VerifiedPaymentMethod | null;
  transferId: string | null;
  completedSteps: UserToUserTransferStep[];
  canGoBack: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UserToUserTransferFlowProps {
  initialStep?: UserToUserTransferStep;
  onComplete?: (transferId: string) => void;
  className?: string;
  currentUserId: string;
}

export function UserToUserTransferFlow({
  initialStep = 'calculator',
  onComplete,
  className = "",
  currentUserId
}: UserToUserTransferFlowProps) {

  // Transfer flow state
  const [state, setState] = useState<UserToUserFlowState>({
    currentStep: initialStep,
    transferData: null,
    recipientUser: null,
    selectedPaymentMethod: null,
    transferId: null,
    completedSteps: [],
    canGoBack: false,
    isLoading: false,
    error: null,
  });

  // Helper function to update state
  const updateState = useCallback((updates: Partial<UserToUserFlowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Navigation helpers
  const goToStep = useCallback((step: UserToUserTransferStep) => {
    updateState({
      currentStep: step,
      canGoBack: step !== 'calculator',
      error: null
    });
  }, [updateState]);

  const goBack = useCallback(() => {
    const stepOrder: UserToUserTransferStep[] = ['calculator', 'recipient', 'payment', 'status'];
    const currentIndex = stepOrder.indexOf(state.currentStep);

    if (currentIndex > 0) {
      const previousStep = stepOrder[currentIndex - 1];
      goToStep(previousStep);
    }
  }, [state.currentStep, goToStep]);

  const markStepCompleted = useCallback((step: UserToUserTransferStep) => {
    setState(prev => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step]
    }));
  }, []);

  // Step handlers
  const handleCalculatorContinue = useCallback((data: {
    sendAmount: number;
    receiveAmount: number;
    exchangeRate: number;
    fees: number;
    rateId: string;
    calculatorMode: 'send' | 'receive';
  }) => {
    // Convert the calculator data to our full transfer data format
    const transferData: UserToUserTransferData = {
      sendAmount: data.sendAmount,
      receiveAmount: data.receiveAmount,
      sendCurrency: 'USD', // Default for now
      receiveCurrency: 'EUR', // Default for now
      exchangeRate: data.exchangeRate,
      fees: data.fees,
      rateId: data.rateId,
      rateValidUntil: '', // Will be populated by calculator
      calculatorMode: data.calculatorMode,
      breakdown: {
        sendAmountUSD: data.sendAmount,
        fees: {
          cardProcessing: 0,
          transfer: 0,
          payout: 0,
          total: data.fees,
        },
        netAmountUSD: data.sendAmount - data.fees,
        exchangeRate: data.exchangeRate,
        receiveAmount: data.receiveAmount,
      },
      estimatedArrival: '',
    };

    updateState({
      transferData: transferData,
      isLoading: true
    });

    // Mark calculator step as completed
    markStepCompleted('calculator');

    // Simulate brief loading before moving to next step
    setTimeout(() => {
      updateState({ isLoading: false });
      goToStep('recipient');
    }, 500);
  }, [updateState, markStepCompleted, goToStep]);

  const handleRecipientSelected = useCallback((recipientUser: UserProfile, paymentMethod: VerifiedPaymentMethod) => {
    updateState({
      recipientUser,
      selectedPaymentMethod: paymentMethod,
      isLoading: true
    });

    // Mark recipient step as completed
    markStepCompleted('recipient');

    // Simulate brief loading before moving to payment
    setTimeout(() => {
      updateState({ isLoading: false });
      goToStep('payment');
    }, 500);
  }, [updateState, markStepCompleted, goToStep]);

  const handleRecipientBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handlePaymentSuccess = useCallback((transferId: string) => {
    // Mark payment step as completed
    markStepCompleted('payment');

    // Update state with transfer ID and move to status
    updateState({
      transferId,
      isLoading: false
    });

    goToStep('status');

    // Call completion callback if provided
    if (onComplete) {
      onComplete(transferId);
    }
  }, [markStepCompleted, updateState, goToStep, onComplete]);

  const handlePaymentError = useCallback((error: string) => {
    updateState({
      error,
      isLoading: false
    });
  }, [updateState]);

  const handlePaymentBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleStatusRefresh = useCallback(() => {
    // Status refresh is handled by the TransferStatus component itself
    console.log('Status refresh requested');
  }, []);

  const resetFlow = useCallback(() => {
    setState({
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
  }, []);

  // Render current step content
  const renderStepContent = () => {
    switch (state.currentStep) {
      case 'calculator':
        return (
          <TransferCalculator
            onContinue={handleCalculatorContinue}
            isNavigating={state.isLoading}
          />
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
            onBack={handleRecipientBack}
            currentUserId={currentUserId}
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
                  Please complete the calculator and recipient steps first.
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
            onBack={handlePaymentBack}
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
                <Button onClick={resetFlow} variant="outline">
                  Start New Transfer
                </Button>
              </CardContent>
            </Card>
          );
        }

        return (
          <TransferStatus
            transferId={state.transferId}
            onRefresh={handleStatusRefresh}
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
              <Button onClick={resetFlow} variant="outline">
                Start Over
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <OnboardingGate requireVerification={false} skipCheckOnPublicPages={true}>
      <div className={`w-full max-w-4xl mx-auto space-y-6 ${className}`}>
        {/* Progress Indicator */}
        <ProgressIndicator
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          onStepClick={(step) => {
            // Only allow navigation to completed steps or the current step
            if (state.completedSteps.includes(step as UserToUserTransferStep) || step === state.currentStep) {
              goToStep(step as UserToUserTransferStep);
            }
          }}
        />

        {/* Back Button (except for calculator and status steps) */}
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

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="py-4">
              <h4 className="font-medium text-gray-700 mb-2">Debug Info</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Current Step: {state.currentStep}</div>
                <div>Completed Steps: {state.completedSteps.join(', ') || 'None'}</div>
                <div>Has Transfer Data: {state.transferData ? 'Yes' : 'No'}</div>
                <div>Has Recipient User: {state.recipientUser ? 'Yes' : 'No'}</div>
                <div>Has Payment Method: {state.selectedPaymentMethod ? 'Yes' : 'No'}</div>
                <div>Transfer ID: {state.transferId || 'None'}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OnboardingGate>
  );
}