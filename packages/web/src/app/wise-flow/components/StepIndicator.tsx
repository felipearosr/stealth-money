import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={`text-sm font-medium mb-2 ${
                  index === currentStep
                    ? 'text-black'
                    : index < currentStep
                    ? 'text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {step}
              </div>
              <div
                className={`w-2 h-2 rounded-full ${
                  index === currentStep
                    ? 'bg-green-500'
                    : index < currentStep
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-16 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
