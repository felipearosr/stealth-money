"use client";

import { useState } from "react";
import { TransferCalculator } from "./TransferCalculator";

export function TransferCalculatorDemo() {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleContinue = (data: any) => {
    console.log('Continue clicked with data:', data);
    setIsNavigating(true);
    
    // Simulate navigation delay
    setTimeout(() => {
      setIsNavigating(false);
      alert(`Transfer calculation complete!\nSend: $${data.sendAmount}\nReceive: ${data.receiveAmount}\nMode: ${data.calculatorMode}`);
    }, 2000);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8 text-center">Transfer Calculator Demo</h1>
      <TransferCalculator 
        onContinue={handleContinue}
        isNavigating={isNavigating}
      />
    </div>
  );
}