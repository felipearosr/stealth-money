"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe } from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TransferData {
  transactionId: string;
  sourceAmount: number;
  sourceCurrency: string;
  destCurrency: string;
  recipientAmount: number;
  rate: number;
  status: string;
}

function PaymentStatusContent() {
  const stripe = useStripe();
  const params = useParams();
  const searchParams = useSearchParams();
  const transactionId = params.transactionId as string;
  const clientSecret = searchParams.get('payment_intent_client_secret');
  
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'loading' | 'succeeded' | 'processing' | 'requires_payment_method' | 'failed'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe || !clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (paymentIntent) {
        setPaymentStatus(paymentIntent.status as any);
        
        if (paymentIntent.status === 'succeeded') {
          fetchTransferData();
        }
      }
    });
  }, [stripe, clientSecret]);

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
      setErrorMessage('Failed to load transfer details');
      console.error('Transfer fetch error:', err);
    }
  };

  if (paymentStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Checking payment status...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'succeeded') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Payment Successful!</CardTitle>
            <p className="text-sm text-gray-600">Your transfer is being processed</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Your payment has been confirmed</li>
                <li>• Funds are being released via blockchain</li>
                <li>• Recipient will receive money within minutes</li>
                <li>• You will get an email confirmation shortly</li>
              </ul>
            </div>

            {transferData && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold mb-2">Transfer Details</h3>
                <div className="flex justify-between text-sm">
                  <span>Transaction ID:</span>
                  <span className="font-mono text-xs">{transactionId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Amount Sent:</span>
                  <span>{transferData.sourceAmount} {transferData.sourceCurrency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Recipient Gets:</span>
                  <span>{transferData.recipientAmount} {transferData.destCurrency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <span className="text-green-600 font-medium">{transferData.status}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button onClick={() => window.location.href = '/'} className="w-full">
                Send Another Transfer
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.print()} 
                className="w-full"
              >
                Print Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-blue-600">Payment Processing</CardTitle>
            <p className="text-sm text-gray-600">Please wait while we process your payment</p>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700">
                Your payment is being processed. This may take a few moments.
                Please do not close this window.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Status
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-red-600">Payment Failed</CardTitle>
          <p className="text-sm text-gray-600">
            {paymentStatus === 'requires_payment_method' 
              ? 'Your payment method was declined' 
              : 'There was an issue processing your payment'
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What you can do:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Try a different payment method</li>
              <li>• Check your card details are correct</li>
              <li>• Contact your bank if the issue persists</li>
              <li>• Reach out to our support team</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Start New Transfer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Elements stripe={stripePromise}>
      <PaymentStatusContent />
    </Elements>
  );
}