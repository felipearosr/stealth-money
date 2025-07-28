"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProcessorOption } from "@/lib/api";
import { CreditCard, Building, Wallet, Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface ProcessorFormProps {
  processor: ProcessorOption;
  amount: number;
  currency: string;
  onSubmit: (paymentData: any) => void;
  isLoading?: boolean;
}

// Stripe-specific payment form
function StripePaymentForm({ processor, amount, currency, onSubmit, isLoading }: ProcessorFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingZip, setBillingZip] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      processorId: 'stripe',
      paymentMethod: 'card',
      cardDetails: {
        number: cardNumber,
        expiry: expiryDate,
        cvv,
        name: cardholderName,
        billingZip
      }
    });
  };

  const isFormValid = cardNumber.length >= 16 && expiryDate.length >= 5 && cvv.length >= 3 && cardholderName.trim();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Stripe Payment</span>
          <Badge variant="outline" className="text-xs">
            Most Popular
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Secure card payment processing with instant confirmation
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-number">Card Number</Label>
            <Input
              id="card-number"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim())}
              maxLength={19}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const formatted = value.replace(/(\d{2})(\d{2})/, '$1/$2');
                  setExpiryDate(formatted);
                }}
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardholder-name">Cardholder Name</Label>
            <Input
              id="cardholder-name"
              placeholder="John Doe"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing-zip">Billing ZIP Code</Label>
            <Input
              id="billing-zip"
              placeholder="12345"
              value={billingZip}
              onChange={(e) => setBillingZip(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-md text-sm">
            <div className="flex items-center space-x-2 text-blue-700">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Secure Payment</span>
            </div>
            <p className="text-blue-600 mt-1">
              Your payment information is encrypted and processed securely by Stripe.
            </p>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm text-gray-600">
              <div>Processing Fee: {processor.fees.percentageFee}% + ${processor.fees.fixedFee}</div>
              <div className="font-semibold">Total: ${(amount + processor.fees.fixedFee + (amount * processor.fees.percentageFee / 100)).toFixed(2)}</div>
            </div>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                `Pay $${amount}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Plaid-specific payment form
function PlaidPaymentForm({ processor, amount, currency, onSubmit, isLoading }: ProcessorFormProps) {
  const [selectedBank, setSelectedBank] = useState('');
  const [accountType, setAccountType] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleBankConnection = async () => {
    setIsConnecting(true);
    // Simulate Plaid Link flow
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsConnected(true);
    setIsConnecting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      processorId: 'plaid',
      paymentMethod: 'bank_transfer',
      bankDetails: {
        bank: selectedBank,
        accountType,
        connected: isConnected
      }
    });
  };

  const isFormValid = isConnected && selectedBank && accountType;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5" />
          <span>Plaid Bank Transfer</span>
          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
            Lower Fees
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Connect your bank account for secure, low-cost transfers
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isConnected ? (
            <div className="text-center py-6">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Connect Your Bank Account</h3>
              <p className="text-sm text-gray-600 mb-4">
                Securely link your bank account through Plaid to enable direct transfers
              </p>
              <Button 
                onClick={handleBankConnection} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Connecting to Plaid...</span>
                  </div>
                ) : (
                  "Connect Bank Account"
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Bank Account Connected</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-select">Select Bank</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chase">Chase Bank</SelectItem>
                    <SelectItem value="bofa">Bank of America</SelectItem>
                    <SelectItem value="wells">Wells Fargo</SelectItem>
                    <SelectItem value="citi">Citibank</SelectItem>
                    <SelectItem value="other">Other Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account-type">Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking Account</SelectItem>
                    <SelectItem value="savings">Savings Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-3 rounded-md text-sm">
                <div className="flex items-center space-x-2 text-blue-700">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Bank-Grade Security</span>
                </div>
                <p className="text-blue-600 mt-1">
                  Plaid uses bank-level security and never stores your login credentials.
                </p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-sm text-gray-600">
                  <div>Processing Fee: {processor.fees.percentageFee}% + ${processor.fees.fixedFee}</div>
                  <div className="font-semibold">Total: ${(amount + processor.fees.fixedFee + (amount * processor.fees.percentageFee / 100)).toFixed(2)}</div>
                </div>
                <Button type="submit" disabled={!isFormValid || isLoading}>
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    `Transfer $${amount}`
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// Circle-specific payment form
function CirclePaymentForm({ processor, amount, currency, onSubmit, isLoading }: ProcessorFormProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'card'>('usdc');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      processorId: 'circle',
      paymentMethod,
      ...(paymentMethod === 'usdc' ? {
        walletDetails: { address: walletAddress }
      } : {
        cardDetails: { number: cardNumber, expiry: expiryDate, cvv }
      })
    });
  };

  const isFormValid = paymentMethod === 'usdc' ? 
    walletAddress.length > 0 : 
    cardNumber.length >= 16 && expiryDate.length >= 5 && cvv.length >= 3;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Wallet className="h-5 w-5" />
          <span>Circle Payment</span>
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
            Crypto-Friendly
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">
          Pay with USDC or traditional card through Circle's infrastructure
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={paymentMethod === 'usdc' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('usdc')}
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                USDC Wallet
              </Button>
              <Button
                type="button"
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Credit Card
              </Button>
            </div>
          </div>

          {paymentMethod === 'usdc' ? (
            <div className="space-y-2">
              <Label htmlFor="wallet-address">USDC Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590b5c8e"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter your USDC wallet address on Ethereum or Polygon
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="circle-card-number">Card Number</Label>
                <Input
                  id="circle-card-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim())}
                  maxLength={19}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="circle-expiry">Expiry Date</Label>
                  <Input
                    id="circle-expiry"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const formatted = value.replace(/(\d{2})(\d{2})/, '$1/$2');
                      setExpiryDate(formatted);
                    }}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="circle-cvv">CVV</Label>
                  <Input
                    id="circle-cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    maxLength={4}
                  />
                </div>
              </div>
            </>
          )}

          <div className="bg-purple-50 p-3 rounded-md text-sm">
            <div className="flex items-center space-x-2 text-purple-700">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Circle Security</span>
            </div>
            <p className="text-purple-600 mt-1">
              {paymentMethod === 'usdc' 
                ? 'Direct USDC transfers with blockchain-level security and transparency.'
                : 'Card payments processed through Circle\'s regulated infrastructure.'
              }
            </p>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm text-gray-600">
              <div>Processing Fee: {processor.fees.percentageFee}% + ${processor.fees.fixedFee}</div>
              <div className="font-semibold">Total: ${(amount + processor.fees.fixedFee + (amount * processor.fees.percentageFee / 100)).toFixed(2)}</div>
            </div>
            <Button type="submit" disabled={!isFormValid || isLoading}>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                `Pay $${amount}`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Main component that renders the appropriate form based on processor
interface ProcessorSpecificFormsProps {
  processor: ProcessorOption;
  amount: number;
  currency: string;
  onSubmit: (paymentData: any) => void;
  isLoading?: boolean;
}

export function ProcessorSpecificForms({ processor, amount, currency, onSubmit, isLoading }: ProcessorSpecificFormsProps) {
  if (!processor.isAvailable) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="font-semibold mb-2">Payment Method Unavailable</h3>
            <p className="text-sm text-gray-600">
              {processor.name} is currently not available. Please select a different payment method.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  switch (processor.id) {
    case 'stripe':
      return <StripePaymentForm processor={processor} amount={amount} currency={currency} onSubmit={onSubmit} isLoading={isLoading} />;
    case 'plaid':
      return <PlaidPaymentForm processor={processor} amount={amount} currency={currency} onSubmit={onSubmit} isLoading={isLoading} />;
    case 'circle':
      return <CirclePaymentForm processor={processor} amount={amount} currency={currency} onSubmit={onSubmit} isLoading={isLoading} />;
    default:
      return (
        <Card className="w-full">
          <CardContent className="py-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">Unsupported Payment Method</h3>
              <p className="text-sm text-gray-600">
                The selected payment processor ({processor.name}) is not yet supported.
              </p>
            </div>
          </CardContent>
        </Card>
      );
  }
}