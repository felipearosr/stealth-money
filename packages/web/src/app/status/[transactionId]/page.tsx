"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TransferData {
  id: string;
  amount: string;
  sourceCurrency: string;
  destCurrency: string;
  exchangeRate: string;
  recipientAmount: string;
  status: string;
  stripePaymentIntentId: string | null;
  blockchainTxHash: string | null;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  payoutMethod?: string;
  payoutDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch transaction');
  }
  return res.json();
});

const getStatusTimeline = (currentStatus: string) => {
  const steps = [
    {
      id: 'payment',
      title: 'Payment Received',
      description: 'Your payment has been confirmed',
      statuses: ['PAID', 'PROCESSING', 'FUNDS_SENT_TO_PARTNER', 'COMPLETED']
    },
    {
      id: 'processing',
      title: 'Processing',
      description: 'We are processing your transfer',
      statuses: ['PROCESSING', 'FUNDS_SENT_TO_PARTNER', 'COMPLETED']
    },
    {
      id: 'blockchain',
      title: 'Funds Released',
      description: 'Funds have been sent to our partner',
      statuses: ['FUNDS_SENT_TO_PARTNER', 'COMPLETED']
    },
    {
      id: 'completed',
      title: 'Completed',
      description: 'Transfer completed successfully',
      statuses: ['COMPLETED']
    }
  ];

  return steps.map(step => ({
    ...step,
    completed: step.statuses.includes(currentStatus),
    active: step.statuses.includes(currentStatus) && !steps.find(s => s.statuses.includes(currentStatus) && steps.indexOf(s) > steps.indexOf(step))
  }));
};

const getStatusInfo = (status: string) => {
  const statusMap: { [key: string]: { color: string; icon: React.ComponentType<{ className?: string }>; message: string } } = {
    'PENDING_PAYMENT': {
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      icon: Clock,
      message: 'Waiting for payment confirmation'
    },
    'PAID': {
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: CheckCircle,
      message: 'Payment confirmed, processing transfer'
    },
    'PROCESSING': {
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      icon: RefreshCw,
      message: 'Processing your transfer'
    },
    'FUNDS_SENT_TO_PARTNER': {
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: CheckCircle,
      message: 'Funds sent to our payout partner'
    },
    'COMPLETED': {
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: CheckCircle,
      message: 'Transfer completed successfully'
    },
    'FAILED': {
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: AlertCircle,
      message: 'Transfer failed - manual intervention required'
    }
  };

  return statusMap[status] || {
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    icon: Clock,
    message: 'Processing...'
  };
};

export default function TransferStatusPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const transactionId = params.transactionId as string;
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'confirmed' | 'failed' | 'completed'>('completed');

  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');

  useEffect(() => {
    const confirmStripePayment = async () => {
      if (!paymentIntent || !paymentIntentClientSecret || !redirectStatus) {
        return;
      }

      console.log('🔄 Handling Stripe redirect:', { paymentIntent, redirectStatus });
      setPaymentStatus('checking');

      try {
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe not loaded');
        }

        const { paymentIntent: retrievedPaymentIntent, error } = await stripe.retrievePaymentIntent(
          paymentIntentClientSecret
        );

        if (error) {
          console.error('❌ Error retrieving payment intent:', error);
          setPaymentStatus('failed');
          return;
        }

        if (retrievedPaymentIntent.status === 'succeeded') {
          console.log('✅ Payment confirmed by Stripe');
          setPaymentStatus('confirmed');
        } else {
          console.log('❌ Payment failed or was canceled');
          setPaymentStatus('failed');
        }
      } catch (error) {
        console.error('❌ Error confirming payment:', error);
        setPaymentStatus('failed');
      }
    };

    confirmStripePayment();
  }, [paymentIntent, paymentIntentClientSecret, redirectStatus, transactionId]);

  const { data: transfer, error, isLoading, mutate } = useSWR<TransferData>(
    transactionId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers/${transactionId}` : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const handleManualRefresh = async () => {
    setIsManualRefresh(true);
    await mutate();
    setTimeout(() => setIsManualRefresh(false), 1000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin mr-3" />
            <span>Loading transfer details...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Transfer Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              We couldn&apos;t find a transfer with ID: {transactionId}
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Start New Transfer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(transfer.status);
  const timeline = getStatusTimeline(transfer.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Transfer Status</h1>
          <p className="text-gray-600">Track your money transfer in real-time</p>
        </div>

        {paymentStatus === 'confirmed' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center p-4">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <div className="font-medium text-green-800">Payment Confirmed!</div>
                <div className="text-sm text-green-600">Your payment was successful. Processing your transfer...</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                Sending {transfer.amount} {transfer.sourceCurrency} → {transfer.recipientAmount} {transfer.destCurrency}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isManualRefresh}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isManualRefresh ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`flex items-center p-4 rounded-lg border ${statusInfo.color}`}>
              <StatusIcon className="h-6 w-6 mr-3" />
              <div>
                <div className="font-semibold">{transfer.status.replace(/_/g, ' ')}</div>
                <div className="text-sm opacity-75">{statusInfo.message}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Progress Timeline</h3>
              <div className="space-y-4">
                {timeline.map((step, index) => (
                  <div key={step.id} className="flex items-start">
                    <div className="flex flex-col items-center mr-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-green-500 text-white' 
                          : step.active 
                            ? 'bg-blue-500 text-white animate-pulse' 
                            : 'bg-gray-200 text-gray-400'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : step.active ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className={`w-0.5 h-8 mt-2 ${
                          step.completed ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>

                    <div className="flex-1 pb-8">
                      <div className={`font-medium ${
                        step.completed ? 'text-green-700' : step.active ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className={`text-sm ${
                        step.completed ? 'text-green-600' : step.active ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {step.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipient Information */}
            {transfer.recipientName && (
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-blue-800">Recipient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Name:</span>
                    <span className="font-medium">{transfer.recipientName}</span>
                  </div>
                  {transfer.recipientEmail && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Email:</span>
                      <span className="font-medium">{transfer.recipientEmail}</span>
                    </div>
                  )}
                  {transfer.recipientPhone && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Phone:</span>
                      <span className="font-medium">{transfer.recipientPhone}</span>
                    </div>
                  )}
                  {transfer.payoutMethod && (
                    <div className="flex justify-between">
                      <span className="text-blue-600">Payout Method:</span>
                      <span className="font-medium capitalize">{transfer.payoutMethod.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Transaction Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs">{transfer.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Exchange Rate:</span>
                  <span>1 {transfer.sourceCurrency} = {parseFloat(transfer.exchangeRate).toFixed(4)} {transfer.destCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(transfer.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated:</span>
                  <span>{new Date(transfer.updatedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 inline mr-1" />
              Updates automatically every 5 seconds
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={() => window.location.href = '/'} className="flex-1">
                Send Another Transfer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}