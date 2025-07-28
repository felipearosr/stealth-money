"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";

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
  paidAt?: Date;
  paymentId?: string;
}

interface PaymentRequestStatusProps {
  paymentRequest: PaymentRequest;
  onStatusUpdate?: (updatedRequest: PaymentRequest) => void;
}

export function PaymentRequestStatus({ paymentRequest, onStatusUpdate }: PaymentRequestStatusProps) {
  const [currentRequest, setCurrentRequest] = useState(paymentRequest);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment-requests/${currentRequest.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment request status');
      }

      const updatedRequest = await response.json();
      setCurrentRequest(updatedRequest);
      onStatusUpdate?.(updatedRequest);
    } catch (error) {
      console.error('Error refreshing status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh for pending requests
  useEffect(() => {
    if (!autoRefresh || currentRequest.status !== 'pending') return;

    const interval = setInterval(refreshStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, currentRequest.status]);

  const getStatusIcon = () => {
    switch (currentRequest.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (currentRequest.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'expired':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusMessage = () => {
    switch (currentRequest.status) {
      case 'pending':
        return 'Waiting for payment';
      case 'paid':
        return 'Payment received successfully';
      case 'expired':
        return 'Payment request has expired';
      case 'cancelled':
        return 'Payment request was cancelled';
      default:
        return 'Unknown status';
    }
  };

  const isExpired = new Date() > new Date(currentRequest.expiresAt);
  const timeUntilExpiry = new Date(currentRequest.expiresAt).getTime() - new Date().getTime();
  const hoursUntilExpiry = Math.max(0, Math.floor(timeUntilExpiry / (1000 * 60 * 60)));
  const minutesUntilExpiry = Math.max(0, Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60)));

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Status</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold">
            {currentRequest.currency} {currentRequest.amount.toFixed(2)}
          </div>
          {currentRequest.description && (
            <div className="text-sm text-gray-600">
              {currentRequest.description}
            </div>
          )}
        </div>

        <div className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor()}`}>
          {getStatusIcon()}
          <div className="flex-1">
            <div className="font-medium capitalize">{currentRequest.status}</div>
            <div className="text-sm">{getStatusMessage()}</div>
          </div>
        </div>

        {currentRequest.status === 'pending' && !isExpired && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Time Remaining:</div>
            <div className="text-lg font-mono">
              {hoursUntilExpiry}h {minutesUntilExpiry}m
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.max(0, Math.min(100, (timeUntilExpiry / (24 * 60 * 60 * 1000)) * 100))}%` 
                }}
              />
            </div>
          </div>
        )}

        {currentRequest.status === 'paid' && currentRequest.paidAt && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Payment Details:</div>
            <div className="text-sm text-gray-600">
              Paid on: {new Date(currentRequest.paidAt).toLocaleString()}
            </div>
            {currentRequest.paymentId && (
              <div className="text-xs text-gray-500">
                Payment ID: {currentRequest.paymentId}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1 text-xs text-gray-500">
          <div>Created: {new Date(currentRequest.createdAt).toLocaleString()}</div>
          <div>Expires: {new Date(currentRequest.expiresAt).toLocaleString()}</div>
          <div>Request ID: {currentRequest.id}</div>
        </div>

        {currentRequest.status === 'pending' && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="auto-refresh">Auto-refresh status</label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}