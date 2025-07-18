"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, User, Mail, Phone, CreditCard } from "lucide-react";

// Form validation schema
const recipientSchema = z.object({
  recipientName: z.string().min(2, "Name must be at least 2 characters"),
  recipientEmail: z.string().email("Please enter a valid email address"),
  recipientPhone: z.string().min(10, "Please enter a valid phone number"),
  payoutMethod: z.enum(['bank_account', 'mobile_wallet', 'cash_pickup', 'debit_card'], {
    message: "Please select a payout method"
  }),
  payoutDetails: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    walletProvider: z.string().optional(),
    walletNumber: z.string().optional(),
    pickupLocation: z.string().optional(),
  }).optional(),
});

interface RecipientFormProps {
  transferData: {
    amount: number;
    sourceCurrency: string;
    destCurrency: string;
    rate: number;
    recipientAmount: number;
  };
  onBack: () => void;
}

export function RecipientForm({ transferData, onBack }: RecipientFormProps) {
  const router = useRouter();
  
  // Form state
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<string>('');
  
  // Payout details state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [walletProvider, setWalletProvider] = useState('');
  const [walletNumber, setWalletNumber] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    setError(null);

    // Prepare form data
    const formData = {
      recipientName,
      recipientEmail,
      recipientPhone,
      payoutMethod: payoutMethod as 'bank_account' | 'mobile_wallet' | 'cash_pickup' | 'debit_card',
      payoutDetails: {
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        routingNumber: routingNumber || undefined,
        walletProvider: walletProvider || undefined,
        walletNumber: walletNumber || undefined,
        pickupLocation: pickupLocation || undefined,
      }
    };

    // Validate form data
    try {
      recipientSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0] as string] = error.message;
          }
        });
        setValidationErrors(errors);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Create transfer with recipient information
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: transferData.amount,
          sourceCurrency: transferData.sourceCurrency,
          destCurrency: transferData.destCurrency,
          recipientName,
          recipientEmail,
          recipientPhone,
          payoutMethod,
          payoutDetails: formData.payoutDetails,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create transfer');
      }

      const result = await response.json();
      
      // Redirect to payment page with transaction data
      router.push(`/pay/${result.transactionId}?clientSecret=${result.clientSecret}`);
      
    } catch (err) {
      setError('Failed to create transfer. Please try again.');
      console.error('Transfer creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPayoutDetails = () => {
    switch (payoutMethod) {
      case 'bank_account':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Bank Name</Label>
              <Input
                id="bank-name"
                placeholder="e.g., Chase Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-number">Account Number</Label>
              <Input
                id="account-number"
                placeholder="Account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routing-number">Routing Number</Label>
              <Input
                id="routing-number"
                placeholder="Routing number"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
              />
            </div>
          </div>
        );
      
      case 'mobile_wallet':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-provider">Wallet Provider</Label>
              <Select value={walletProvider} onValueChange={setWalletProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="cashapp">Cash App</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="pix">PIX (Brazil)</SelectItem>
                  <SelectItem value="paym">Paym (UK)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-number">Wallet ID / Phone Number</Label>
              <Input
                id="wallet-number"
                placeholder="Wallet ID or phone number"
                value={walletNumber}
                onChange={(e) => setWalletNumber(e.target.value)}
              />
            </div>
          </div>
        );
      
      case 'cash_pickup':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-location">Pickup Location</Label>
              <Select value={pickupLocation} onValueChange={setPickupLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select pickup location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="western_union">Western Union</SelectItem>
                  <SelectItem value="moneygram">MoneyGram</SelectItem>
                  <SelectItem value="ria">Ria Money Transfer</SelectItem>
                  <SelectItem value="remitly">Remitly</SelectItem>
                  <SelectItem value="worldremit">WorldRemit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                The recipient will receive a pickup code via SMS and can collect cash at any {pickupLocation?.replace('_', ' ')} location.
              </p>
            </div>
          </div>
        );
      
      case 'debit_card':
        return (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-700">
              Funds will be sent directly to the recipient&apos;s debit card. No additional details required.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Recipient Information</span>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Who are you sending {transferData.amount} {transferData.sourceCurrency} to?
        </p>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Transfer Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Transfer Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">You Send:</span>
                <span className="font-medium">{transferData.amount} {transferData.sourceCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">They Receive:</span>
                <span className="font-medium">{transferData.recipientAmount} {transferData.destCurrency}</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-gray-600">Exchange Rate:</span>
                <span className="font-medium">1 {transferData.sourceCurrency} = {transferData.rate.toFixed(4)} {transferData.destCurrency}</span>
              </div>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Recipient Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="recipient-name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="recipient-name"
                  placeholder="Enter recipient's full name"
                  className="pl-10"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              {validationErrors.recipientName && (
                <p className="text-sm text-red-600">{validationErrors.recipientName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="recipient@example.com"
                  className="pl-10"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              {validationErrors.recipientEmail && (
                <p className="text-sm text-red-600">{validationErrors.recipientEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient-phone">Phone Number *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="recipient-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="pl-10"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
              {validationErrors.recipientPhone && (
                <p className="text-sm text-red-600">{validationErrors.recipientPhone}</p>
              )}
            </div>
          </div>

          {/* Payout Method */}
          <div className="space-y-4">
            <h3 className="font-semibold">How should they receive the money?</h3>
            
            <div className="space-y-2">
              <Label htmlFor="payout-method">Payout Method *</Label>
              <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_account">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Bank Account</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile_wallet">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>Mobile Wallet</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cash_pickup">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Cash Pickup</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="debit_card">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Debit Card</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.payoutMethod && (
                <p className="text-sm text-red-600">{validationErrors.payoutMethod}</p>
              )}
            </div>

            {/* Payout Details */}
            {payoutMethod && (
              <div className="space-y-4">
                <h4 className="font-medium">Payout Details</h4>
                {renderPayoutDetails()}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <Button
            type="submit"
            disabled={isLoading || !recipientName || !recipientEmail || !recipientPhone || !payoutMethod}
          >
            {isLoading ? (
              "Creating Transfer..."
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}