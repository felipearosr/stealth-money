"use client";

import { Calculator, User, CreditCard, CheckCircle } from "lucide-react";
import { TransferFlowStep } from "./TransferFlowContainer";

interface ProgressIndicatorProps {
  currentStep: TransferFlowStep;
  completedSteps: TransferFlowStep[];
  onStepClick?: (step: TransferFlowStep) => void;
}

interface StepConfig {
  key: TransferFlowStep;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    key: 'calculator',
    label: 'Calculate',
    shortLabel: 'Calc',
    icon: Calculator,
    description: 'Enter transfer amount'
  },
  {
    key: 'recipient',
    label: 'Recipient',
    shortLabel: 'Recipient',
    icon: User,
    description: 'Add recipient details'
  },
  {
    key: 'payment',
    label: 'Payment',
    shortLabel: 'Pay',
    icon: CreditCard,
    description: 'Complete payment'
  },
  {
    key: 'status',
    label: 'Status',
    shortLabel: 'Status',
    icon: CheckCircle,
    description: 'Track transfer'
  }
];

export function ProgressIndicator({ 
  currentStep, 
  completedSteps, 
  onStepClick 
}: ProgressIndicatorProps) {
  const currentStepIndex = STEPS.findIndex(step => step.key === currentStep);
  
  const getStepStatus = (step: StepConfig, index: number) => {
    if (completedSteps.includes(step.key)) {
      return 'completed';
    } else if (step.key === currentStep) {
      return 'current';
    } else if (index < currentStepIndex) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  };

  const getStepStyles = (status: string, isClickable: boolean) => {
    const baseStyles = "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200";
    const clickableStyles = isClickable ? "cursor-pointer hover:scale-105" : "";
    
    switch (status) {
      case 'completed':
        return `${baseStyles} ${clickableStyles} bg-green-500 border-green-500 text-white`;
      case 'current':
        return `${baseStyles} ${clickableStyles} bg-blue-500 border-blue-500 text-white ring-4 ring-blue-100`;
      case 'upcoming':
        return `${baseStyles} bg-gray-100 border-gray-300 text-gray-400`;
      default:
        return `${baseStyles} bg-gray-100 border-gray-300 text-gray-400`;
    }
  };

  const getConnectorStyles = (index: number) => {
    const isCompleted = index < currentStepIndex || completedSteps.includes(STEPS[index].key);
    return `flex-1 h-0.5 mx-2 transition-colors duration-300 ${
      isCompleted ? 'bg-green-500' : 'bg-gray-300'
    }`;
  };

  const handleStepClick = (step: StepConfig) => {
    if (!onStepClick) return;
    
    // Allow clicking on completed steps or current step
    const isClickable = completedSteps.includes(step.key) || step.key === currentStep;
    if (isClickable) {
      onStepClick(step.key);
    }
  };

  return (
    <div className="w-full">
      {/* Desktop Progress Indicator */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step, index);
            const isClickable = completedSteps.includes(step.key) || step.key === currentStep;
            const Icon = step.icon;
            
            return (
              <div key={step.key} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={getStepStyles(status, isClickable)}
                    onClick={() => handleStepClick(step)}
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleStepClick(step);
                      }
                    }}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <div className="mt-2 text-center">
                    <div className={`text-sm font-medium ${
                      status === 'current' ? 'text-blue-600' :
                      status === 'completed' ? 'text-green-600' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </div>
                  </div>
                </div>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className={getConnectorStyles(index)} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Mobile Progress Indicator */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step, index);
            const isClickable = completedSteps.includes(step.key) || step.key === currentStep;
            const Icon = step.icon;
            
            return (
              <div key={step.key} className="flex items-center flex-1">
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={getStepStyles(status, isClickable)}
                    onClick={() => handleStepClick(step)}
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleStepClick(step);
                      }
                    }}
                  >
                    {status === 'completed' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  
                  {/* Step Label - Shorter for mobile */}
                  <div className="mt-1 text-center">
                    <div className={`text-xs font-medium ${
                      status === 'current' ? 'text-blue-600' :
                      status === 'completed' ? 'text-green-600' :
                      'text-gray-500'
                    }`}>
                      {step.shortLabel}
                    </div>
                  </div>
                </div>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    index < currentStepIndex || completedSteps.includes(STEPS[index].key)
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Current Step Description for Mobile */}
        <div className="text-center">
          <div className="text-sm text-gray-600">
            Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex]?.description}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}