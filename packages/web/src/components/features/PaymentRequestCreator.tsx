"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentRequest {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  qrCode?: string;
  shareableLink?: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
}

interface PaymentRequestCreatorProps {
  onRequestCreated?: (request: PaymentRequest) => void;
}

export function PaymentRequestCreator({ onRequestCreated }: PaymentRequestCreatorProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRequest = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency,
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment request');
      }

      const paymentRequest = await response.json();
      onRequestCreated?.(paymentRequest);
      
      // Reset form
      setAmount('');
      setDescription('');
      
    } catch (err) {
      setError('Failed to create payment request. Please try again.');
      console.error('Payment request creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Request Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <div className="flex space-x-2">
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              className="flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CLP">CLP</SelectItem>
                <SelectItem value="MXN">MXN</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Input
            id="description"
            placeholder="What's this payment for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleCreateRequest}
          disabled={isLoading || !amount || parseFloat(amount) <= 0}
        >
          {isLoading ? "Creating Request..." : "Create Payment Request"}
        </Button>
      </CardFooter>
    </Card>
  );
}