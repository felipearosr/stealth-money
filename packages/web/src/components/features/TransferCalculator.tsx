"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import { z } from "zod";
import { Lock, LockOpen } from "lucide-react";
import { useUser, useAuth } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getExchangeRate } from "@/lib/api";

// Form validation schema
const transferSchema = z.object({
  amountToSend: z.string().min(1, 'Amount is required'),
  amountToReceive: z.string().min(1, 'Amount is required'),
  sourceCurrency: z.string().min(3, 'Source currency is required'),
  destCurrency: z.string().min(3, 'Destination currency is required'),
  recipientUserId: z.string().min(1, 'Recipient is required'),
});

interface TransferCalculatorProps {
  onContinue?: (data: {
    amount: number;
    sourceCurrency: string;
    destCurrency: string;
    rate: number;
    recipientAmount: number;
  }) => void;
}

export function TransferCalculator({ onContinue }: TransferCalculatorProps) {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  
  // Form state
  const [amountToSend, setAmountToSend] = useState('1000');
  const [amountToReceive, setAmountToReceive] = useState('');
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [destCurrency, setDestCurrency] = useState('EUR');
  const [recipientUserId, setRecipientUserId] = useState(''); // Add recipient user ID state
  const [lockedField, setLockedField] = useState<'send' | 'receive'>('send');
  
  // API state
  const [rate, setRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Debounced values to avoid excessive API calls
  const [debouncedAmountToSend] = useDebounce(amountToSend, 500);
  const [debouncedAmountToReceive] = useDebounce(amountToReceive, 500);
  const [debouncedSourceCurrency] = useDebounce(sourceCurrency, 300);
  const [debouncedDestCurrency] = useDebounce(destCurrency, 300);

  // Fetch exchange rate from API
  useEffect(() => {
    const fetchRate = async () => {
      if (!debouncedSourceCurrency || !debouncedDestCurrency) return;
      if (debouncedSourceCurrency === debouncedDestCurrency) {
        setRate(1);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await getExchangeRate(debouncedSourceCurrency, debouncedDestCurrency);
        setRate(response.rate);
      } catch (err) {
        setError('Failed to fetch exchange rate');
        console.error('Exchange rate fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
  }, [debouncedSourceCurrency, debouncedDestCurrency]);

  // Calculate amounts based on locked field
  useEffect(() => {
    if (!rate) return;

    if (lockedField === 'send' && amountToSend && !isNaN(parseFloat(amountToSend))) {
      const sendAmount = parseFloat(amountToSend);
      const receiveAmount = sendAmount * rate;
      setAmountToReceive(receiveAmount.toFixed(2));
    } else if (lockedField === 'receive' && amountToReceive && !isNaN(parseFloat(amountToReceive))) {
      const receiveAmount = parseFloat(amountToReceive);
      const sendAmount = receiveAmount / rate;
      setAmountToSend(sendAmount.toFixed(2));
    }
  }, [rate, lockedField, amountToSend, amountToReceive]);

  const toggleLock = (field: 'send' | 'receive') => {
    setLockedField(field === 'send' ? 'receive' : 'send');
  };

  // Calculate fee and total
  const fee = parseFloat(amountToSend) * 0.029;
  const total = parseFloat(amountToSend) + fee;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated first
    if (!isLoaded) {
      setError('Loading user information...');
      return;
    }

    if (!isSignedIn) {
      // Immediately redirect to sign-in page
      router.push('/auth/sign-in');
      return;
    }
    
    // Clear previous validation errors
    setValidationErrors({});
    setError(null);

    // Validate form data
    const formData = {
      amountToSend,
      amountToReceive,
      sourceCurrency,
      destCurrency,
      recipientUserId,
    };

    try {
      transferSchema.parse(formData);
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
      // For now, we'll use a placeholder recipient user ID
      // In a real implementation, you'd have a user search/selection interface
      if (!recipientUserId.trim()) {
        setError('Please enter a recipient user ID or email');
        return;
      }

      const token = await getToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amountToSend),
          sourceCurrency,
          destCurrency,
          recipientUserId: recipientUserId.trim(), // Use the form value
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create transfer');
      }

      const transferData = await response.json();
      
      // Show success message for internal transfer
      setSuccess(`Successfully sent ${amountToSend} ${sourceCurrency} to ${recipientUserId}!`);
      
      // Reset form
      setAmountToSend('');
      setAmountToReceive('');
      setRecipientUserId('');
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Transfer creation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create transfer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send Money</CardTitle>
        {user && (
          <p className="text-sm text-gray-600">
            Sending as {user.firstName || user.emailAddresses[0]?.emailAddress}
          </p>
        )}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* You Send Section */}
          <div className="space-y-4">
              {/* Recipient User ID */}
              <div>
                <Label htmlFor="recipientUserId">Send to (User ID or Email)</Label>
                <Input
                  id="recipientUserId"
                  type="text"
                  placeholder="Enter recipient's user ID or email"
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                  className={validationErrors.recipientUserId ? 'border-red-500' : ''}
                />
                {validationErrors.recipientUserId && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.recipientUserId}</p>
                )}
              </div>

              {/* Amount to Send */}
              <div>
                <Label htmlFor="amountToSend">Amount to Send</Label>
                <div className="relative">
                  <Input
                    id="amountToSend"
                    type="number"
                    placeholder="0.00"
                    value={amountToSend}
                    onChange={(e) => setAmountToSend(e.target.value)}
                    className={validationErrors.amountToSend ? 'border-red-500' : ''}
                    disabled={lockedField === 'receive'}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Select value={sourceCurrency} onValueChange={setSourceCurrency}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {validationErrors.amountToSend && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.amountToSend}</p>
                )}
              </div>
            </div>

          {/* They Receive Section */}
          <div className="space-y-2">
            <Label htmlFor="receive-amount">They Receive</Label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                  id="receive-amount"
                  type="number"
                  placeholder="0.00"
                  className="pr-10"
                  value={amountToReceive}
                  onChange={(e) => setAmountToReceive(e.target.value)}
                  disabled={lockedField === 'receive'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleLock('receive')}
                >
                  {lockedField === 'receive' ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <LockOpen className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Select value={destCurrency} onValueChange={setDestCurrency}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {validationErrors.amountToReceive && (
              <p className="text-sm text-red-600">{validationErrors.amountToReceive}</p>
            )}
          </div>

          {/* Fee and Rate Details */}
          <div className="space-y-2 pt-4 border-t">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                {success}
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Exchange Rate:</span>
              <span>
                {isLoading ? (
                  "Loading..."
                ) : rate ? (
                  `1 ${sourceCurrency} = ${rate.toFixed(4)} ${destCurrency}`
                ) : (
                  "Rate unavailable"
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Fee (2.9%):</span>
              <span>{sourceCurrency} {fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total to pay:</span>
              <span className="font-semibold">{sourceCurrency} {total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit"
            className="w-full" 
            disabled={isLoading || !rate || !amountToSend || !amountToReceive || !recipientUserId.trim() || parseFloat(amountToSend) <= 0}
          >
            {isLoading ? "Processing..." : isSignedIn ? "Send Money" : "Sign In to Continue"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}