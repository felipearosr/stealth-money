"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { PaymentForm } from "@/components/features/PaymentForm";

interface TransferData {
  transactionId: string;
  sourceAmount: number;
  sourceCurrency: string;
  destCurrency: string;
  recipientAmount: number;
  rate: number;
  status: string;
  clientSecret: string;
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const transactionId = params.transactionId as string;
  const clientSecret = searchParams.get('clientSecret');
  
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransferData = async () => {
      if (!transactionId) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers/${transactionId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch transfer data');
        }

        const data = await response.json();
        setTransferData(data);
      } catch (err) {
        setError('Failed to load transfer details');
        console.error('Transfer fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransferData();
  }, [transactionId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading transfer details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && !transferData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Error Loading Payment</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <Button onClick={() => window.location.href = '/'}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Missing client secret
  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-yellow-600">Invalid Payment Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">This payment link is invalid or has expired.</p>
            <Button onClick={() => window.location.href = '/'}>
              Start New Transfer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Stripe Elements options
  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
          <p className="text-sm text-gray-600">
            You are sending <span className="font-semibold">${transferData?.sourceAmount}</span> to your recipient
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-2">Transfer Summary</h3>
            <div className="flex justify-between text-sm">
              <span>You Send:</span>
              <span>{transferData?.sourceAmount} {transferData?.sourceCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>They Receive:</span>
              <span>{transferData?.recipientAmount} {transferData?.destCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Exchange Rate:</span>
              <span>1 {transferData?.sourceCurrency} = {transferData?.rate?.toFixed(4)} {transferData?.destCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Fee (2.9%):</span>
              <span>{((transferData?.sourceAmount || 0) * 0.029).toFixed(2)} {transferData?.sourceCurrency}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total to Pay:</span>
              <span>{((transferData?.sourceAmount || 0) * 1.029).toFixed(2)} {transferData?.sourceCurrency}</span>
            </div>
          </div>

          {/* Stripe Payment Form */}
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm 
              transactionId={transactionId}
              amount={((transferData?.sourceAmount || 0) * 1.029).toFixed(2)}
              currency={transferData?.sourceCurrency || 'USD'}
            />
          </Elements>

          <p className="text-xs text-gray-500 text-center">
            Your payment is secured with bank-level encryption. 
            By continuing, you agree to our terms of service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}