"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, CreditCard, Loader2 } from "lucide-react";

interface TransferData {
  transactionId: string;
  amount: number;
  sourceCurrency: string;
  destCurrency: string;
  recipientAmount: number;
  rate: number;
  status: string;
  clientSecret: string;
}

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const transactionId = params.transactionId as string;
  const clientSecret = searchParams.get('clientSecret');
  
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

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

  const handlePayment = async () => {
    if (!transferData || !clientSecret) return;

    setPaymentStatus('processing');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, you would integrate with Stripe here
      // const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      // const result = await stripe.confirmCardPayment(clientSecret, {
      //   payment_method: {
      //     card: cardElement,
      //     billing_details: {
      //       name: 'Customer Name',
      //     },
      //   }
      // });

      setPaymentStatus('completed');
    } catch (err) {
      setPaymentStatus('failed');
      setError('Payment failed. Please try again.');
      console.error('Payment error:', err);
    }
  };

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

  if (error && !transferData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={() => window.location.href = '/'}>
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>Your transfer has been initiated successfully.</p>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Transaction ID:</span>
                <span className="font-mono text-sm">{transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Sent:</span>
                <span>{transferData?.amount} {transferData?.sourceCurrency}</span>
              </div>
              <div className="flex justify-between">
                <span>Recipient Gets:</span>
                <span>{transferData?.recipientAmount} {transferData?.destCurrency}</span>
              </div>
            </div>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Send Another Transfer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transfer Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-2">Transfer Summary</h3>
            <div className="flex justify-between text-sm">
              <span>You Send:</span>
              <span>{transferData?.amount} {transferData?.sourceCurrency}</span>
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
              <span>{((transferData?.amount || 0) * 0.029).toFixed(2)} {transferData?.sourceCurrency}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total to Pay:</span>
              <span>{((transferData?.amount || 0) * 1.029).toFixed(2)} {transferData?.sourceCurrency}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="font-semibold">Payment Method</h3>
            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-6 w-6 text-gray-400" />
                <div>
                  <div className="font-medium">Credit/Debit Card</div>
                  <div className="text-sm text-gray-500">Visa, Mastercard, American Express</div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <Button 
            onClick={handlePayment}
            disabled={paymentStatus === 'processing'}
            className="w-full"
          >
            {paymentStatus === 'processing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              `Pay ${((transferData?.amount || 0) * 1.029).toFixed(2)} ${transferData?.sourceCurrency}`
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Your payment is secured with bank-level encryption. 
            By continuing, you agree to our terms of service.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}