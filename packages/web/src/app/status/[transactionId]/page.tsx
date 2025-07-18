"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) {
    throw new Error('Failed to fetch transaction');
  }
  return res.json();
});

// Status timeline configuration
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

// Get status display info
const getStatusInfo = (status: string) => {
  const statusMap: { [key: string]: { color: string; icon: any; message: string } } = {
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
    },
    'CANCELED': {
      color: 'text-gray-600 bg-gray-50 border-gray-200',
      icon: AlertCircle,
      message: 'Transfer was canceled'
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
  const transactionId = params.transactionId as string;
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // Use SWR for data fetching with polling every 5 seconds
  const { data: transfer, error, isLoading, mutate } = useSWR<TransferData>(
    transactionId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/transfers/${transactionId}` : null,
    fetcher,
    {
      refreshInterval: 5000, // Poll every 5 seconds
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
              We couldn't find a transfer with ID: {transactionId}
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
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Transfer Status</h1>
          <p className="text-gray-600">Track your money transfer in real-time</p>
        </div>

        {/* Main Status Card */}
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
            {/* Current Status */}
            <div className={`flex items-center p-4 rounded-lg border ${statusInfo.color}`}>
              <StatusIcon className="h-6 w-6 mr-3" />
              <div>
                <div className="font-semibold">{transfer.status.replace(/_/g, ' ')}</div>
                <div className="text-sm opacity-75">{statusInfo.message}</div>
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Progress Timeline</h3>
              <div className="space-y-4">
                {timeline.map((step, index) => (
                  <div key={step.id} className="flex items-start">
                    {/* Timeline Icon */}
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

                    {/* Timeline Content */}
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

            {/* Transaction Details */}
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
                {transfer.stripePaymentIntentId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID:</span>
                    <span className="font-mono text-xs">{transfer.stripePaymentIntentId}</span>
                  </div>
                )}
                {transfer.blockchainTxHash && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blockchain TX:</span>
                    <span className="font-mono text-xs">{transfer.blockchainTxHash}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-refresh indicator */}
            <div className="text-center text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 inline mr-1" />
              Updates automatically every 5 seconds
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={() => window.location.href = '/'} className="flex-1">
                Send Another Transfer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {(transfer.status === 'COMPLETED' || transfer.status === 'FUNDS_SENT_TO_PARTNER') && (
                <Button variant="outline" onClick={() => window.print()} className="flex-1">
                  Print Receipt
                </Button>
              )}
              {transfer.status === 'FAILED' && (
                <Button variant="outline" className="flex-1">
                  Contact Support
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}