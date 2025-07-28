"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle, User, CreditCard, Shield } from "lucide-react";

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  requesterId: string;
}

interface UserOnboardingProps {
  paymentRequest: PaymentRequest;
  onOnboardingComplete?: (userData: any) => void;
}

type OnboardingStep = 'welcome' | 'account' | 'payment' | 'verification' | 'complete';

export function UserOnboarding({ paymentRequest, onOnboardingComplete }: UserOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    currency: paymentRequest.currency,
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const handleNext = () => {
    setError(null);
    
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('account');
        break;
      case 'account':
        if (validateAccountData()) {
          setCurrentStep('payment');
        }
        break;
      case 'payment':
        if (validatePaymentData()) {
          setCurrentStep('verification');
        }
        break;
      case 'verification':
        handleCompleteOnboarding();
        break;
    }
  };

  const validateAccountData = () => {
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.country) {
      setError('Please fill in all required fields');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const validatePaymentData = () => {
    if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardholderName) {
      setError('Please fill in all payment details');
      return false;
    }
    
    // Basic card number validation (remove spaces and check length)
    const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
    if (cardNumber.length < 13 || cardNumber.length > 19) {
      setError('Please enter a valid card number');
      return false;
    }
    
    return true;
  };

  const handleCompleteOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create user account
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create user account');
      }

      const newUser = await userResponse.json();

      // Process payment for the payment request
      const paymentResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment-requests/${paymentRequest.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: newUser.id,
          paymentMethod: {
            type: 'card',
            ...paymentData,
          },
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Failed to process payment');
      }

      const paymentResult = await paymentResponse.json();
      
      setCurrentStep('complete');
      onOnboardingComplete?.({ user: newUser, payment: paymentResult });
      
    } catch (err) {
      setError('Failed to complete onboarding. Please try again.');
      console.error('Onboarding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcomeStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Welcome!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="text-lg font-semibold">
          You've been requested to pay:
        </div>
        <div className="text-3xl font-bold text-blue-600">
          {paymentRequest.currency} {paymentRequest.amount.toFixed(2)}
        </div>
        {paymentRequest.description && (
          <div className="text-gray-600">
            {paymentRequest.description}
          </div>
        )}
        <div className="space-y-2 text-sm text-gray-500">
          <p>To complete this payment, you'll need to:</p>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Create your account</span>
          </div>
          <div className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Add payment method</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Verify and complete</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleNext} className="w-full">
          Get Started
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderAccountStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Your Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={userData.firstName}
              onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={userData.lastName}
              onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={userData.email}
            onChange={(e) => setUserData({ ...userData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={userData.phone}
            onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Select value={userData.country} onValueChange={(value) => setUserData({ ...userData, country: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="CA">Canada</SelectItem>
              <SelectItem value="DE">Germany</SelectItem>
              <SelectItem value="FR">France</SelectItem>
              <SelectItem value="CL">Chile</SelectItem>
              <SelectItem value="MX">Mexico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleNext} className="w-full">
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderPaymentStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cardholderName">Cardholder Name *</Label>
          <Input
            id="cardholderName"
            value={paymentData.cardholderName}
            onChange={(e) => setPaymentData({ ...paymentData, cardholderName: e.target.value })}
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number *</Label>
          <Input
            id="cardNumber"
            value={paymentData.cardNumber}
            onChange={(e) => {
              // Format card number with spaces
              const value = e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
              setPaymentData({ ...paymentData, cardNumber: value });
            }}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date *</Label>
            <Input
              id="expiryDate"
              value={paymentData.expiryDate}
              onChange={(e) => {
                // Format as MM/YY
                const value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                setPaymentData({ ...paymentData, expiryDate: value });
              }}
              placeholder="MM/YY"
              maxLength={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV *</Label>
            <Input
              id="cvv"
              value={paymentData.cvv}
              onChange={(e) => setPaymentData({ ...paymentData, cvv: e.target.value.replace(/\D/g, '') })}
              placeholder="123"
              maxLength={4}
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-md">
          <Shield className="h-4 w-4 inline mr-1" />
          Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleNext} className="w-full">
          Review Payment
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderVerificationStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Review & Confirm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {paymentRequest.currency} {paymentRequest.amount.toFixed(2)}
            </div>
            {paymentRequest.description && (
              <div className="text-sm text-gray-600 mt-1">
                {paymentRequest.description}
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Name:</span>
              <span>{userData.firstName} {userData.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{userData.email}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span>**** **** **** {paymentData.cardNumber.slice(-4)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-md">
          By completing this payment, you agree to create an account and our terms of service. 
          You'll receive a confirmation email once the payment is processed.
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleNext} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Complete Payment"}
          {!isLoading && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderCompleteStep = () => (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <span>Payment Complete!</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <div className="text-lg">
          Your payment of <strong>{paymentRequest.currency} {paymentRequest.amount.toFixed(2)}</strong> has been processed successfully.
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <p>✅ Account created</p>
          <p>✅ Payment processed</p>
          <p>✅ Confirmation email sent</p>
        </div>

        <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-md">
          Welcome to our platform! You can now use your account to send and receive payments worldwide.
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => window.location.href = '/dashboard'} 
          className="w-full"
        >
          Go to Dashboard
        </Button>
      </CardFooter>
    </Card>
  );

  const renderProgressIndicator = () => {
    const steps = ['welcome', 'account', 'payment', 'verification', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    
    return (
      <div className="flex justify-center mb-6">
        <div className="flex space-x-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`w-3 h-3 rounded-full ${
                index <= currentIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {currentStep !== 'welcome' && renderProgressIndicator()}
      
      {currentStep === 'welcome' && renderWelcomeStep()}
      {currentStep === 'account' && renderAccountStep()}
      {currentStep === 'payment' && renderPaymentStep()}
      {currentStep === 'verification' && renderVerificationStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
}