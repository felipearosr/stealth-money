'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import StepIndicator from './components/StepIndicator';
import AmountStep from './components/AmountStep';
import RecipientStep from './components/RecipientStep';
import ReviewStep from './components/ReviewStep';
import PayStep from './components/PayStep';

const WiseFlowPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['Amount', 'Recipient', 'Review', 'Pay'];

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <AmountStep onNext={handleNextStep} />;
      case 1:
        return <RecipientStep onNext={handleNextStep} />;
      case 2:
        return <ReviewStep onNext={handleNextStep} />;
      case 3:
        return <PayStep onBack={handlePreviousStep} />;
      default:
        return <AmountStep onNext={handleNextStep} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-green-600 mr-8">7WISE</div>
              <StepIndicator currentStep={currentStep} steps={steps} />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium">FR</span>
              <button className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {renderCurrentStep()}
      </div>
    </div>
  );
};

export default WiseFlowPage;
