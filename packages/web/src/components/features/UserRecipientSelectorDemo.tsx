"use client";

import { useState } from "react";
import { UserRecipientSelector, UserProfile, VerifiedPaymentMethod } from "./UserRecipientSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, User, CreditCard } from "lucide-react";

/**
 * Demo component showing how UserRecipientSelector integrates with the transfer flow
 * This demonstrates the user-to-user transfer functionality
 */
export function UserRecipientSelectorDemo() {
  const [currentStep, setCurrentStep] = useState<'selector' | 'confirmation'>('selector');
  const [selectedRecipient, setSelectedRecipient] = useState<UserProfile | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<VerifiedPaymentMethod | null>(null);

  // Mock transfer data
  const mockTransferData = {
    sendAmount: 100,
    receiveAmount: 85,
    sendCurrency: 'USD',
    receiveCurrency: 'EUR',
    exchangeRate: 0.85,
    fees: 5,
  };

  const handleRecipientSelected = (recipient: UserProfile, paymentMethod: VerifiedPaymentMethod) => {
    setSelectedRecipient(recipient);
    setSelectedPaymentMethod(paymentMethod);
    setCurrentStep('confirmation');
  };

  const handleBack = () => {
    if (currentStep === 'confirmation') {
      setCurrentStep('selector');
    } else {
      // Would navigate back to calculator in real flow
      console.log('Navigate back to calculator');
    }
  };

  const handleContinueToPayment = () => {
    // Would navigate to payment step in real flow
    console.log('Continue to payment with:', {
      recipient: selectedRecipient,
      paymentMethod: selectedPaymentMethod,
      transferData: mockTransferData
    });
    alert('In a real app, this would navigate to the payment step');
  };

  if (currentStep === 'confirmation') {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Recipient Selected</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Transfer Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Transfer Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">You Send:</span>
                  <span className="font-medium">{mockTransferData.sendAmount} {mockTransferData.sendCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">They Receive:</span>
                  <span className="font-medium">{mockTransferData.receiveAmount} {mockTransferData.receiveCurrency}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-gray-600">Exchange Rate:</span>
                  <span className="font-medium">1 {mockTransferData.sendCurrency} = {mockTransferData.exchangeRate.toFixed(4)} {mockTransferData.receiveCurrency}</span>
                </div>
              </div>
            </div>

            {/* Selected Recipient */}
            {selectedRecipient && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {selectedRecipient.profileImageUrl ? (
                        <img
                          src={selectedRecipient.profileImageUrl}
                          alt={selectedRecipient.fullName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedRecipient.fullName}
                        </h3>
                        {selectedRecipient.isVerified && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-2">{selectedRecipient.email}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {selectedRecipient.supportedCurrencies.map(currency => (
                          <Badge 
                            key={currency} 
                            variant={currency === mockTransferData.receiveCurrency ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {currency}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Payment Method */}
            {selectedPaymentMethod && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {selectedPaymentMethod.bankName || `${selectedPaymentMethod.type.replace('_', ' ')}`}
                        </span>
                        {selectedPaymentMethod.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {selectedPaymentMethod.accountType} • {selectedPaymentMethod.currency} • {selectedPaymentMethod.country}
                        {selectedPaymentMethod.lastFourDigits && ` • ****${selectedPaymentMethod.lastFourDigits}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        Verified {new Date(selectedPaymentMethod.verifiedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack}>
                Back to Selection
              </Button>
              <Button onClick={handleContinueToPayment}>
                Continue to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <UserRecipientSelector
      transferData={mockTransferData}
      onRecipientSelected={handleRecipientSelected}
      onBack={handleBack}
      currentUserId="current-user-123"
    />
  );
}

export default UserRecipientSelectorDemo;