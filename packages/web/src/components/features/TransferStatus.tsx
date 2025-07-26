"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Clock, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Types based on design document
export enum TransferStatusEnum {
  INITIATED = 'initiated',
  PAYMENT_PROCESSING = 'payment_processing',
  TRANSFERRING = 'transferring',
  PAYING_OUT = 'paying_out',
  COMPLETED = 'completed',
  FAILED = 'failed',
  // Chilean-specific statuses
  CHILEAN_BANK_PROCESSING = 'chilean_bank_processing',
  CHILEAN_VERIFICATION_PENDING = 'chilean_verification_pending',
  CHILEAN_MICRODEPOSIT_SENT = 'chilean_microdeposit_sent'
}

export interface TransferEvent {
  id: string;
  transferId: string;
  type: 'payment_created' | 'payment_confirmed' | 'transfer_initiated' | 'payout_created' | 'payout_completed';
  status: 'success' | 'pending' | 'failed';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TransferStatusData {
  transferId: string;
  status: TransferStatusEnum;
  timeline: TransferEvent[];
  sendAmount: number;
  receiveAmount: number;
  exchangeRate: number;
  fees: number;
  sendCurrency?: string;
  receiveCurrency?: string;
  estimatedCompletion?: string;
  completedAt?: string;
  lastUpdated: string;
}

interface TransferStatusProps {
  transferId: string;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function TransferStatus({ 
  transferId, 
  onRefresh,
  autoRefresh = true,
  refreshInterval = 5000 
}: TransferStatusProps) {
  const [transferData, setTransferData] = useState<TransferStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  void lastRefresh; // Used via setter
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);

  // Fetch transfer status
  const fetchTransferStatus = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/transfers/${transferId}/status`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch transfer status');
      }

      const data: TransferStatusData = await response.json();
      setTransferData(data);
      setLastRefresh(new Date());
      setIsRealTimeConnected(true);
    } catch (err) {
      console.error('Transfer status fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transfer status');
      setIsRealTimeConnected(false);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [transferId]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchTransferStatus(true);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Initial fetch and auto-refresh setup with improved real-time behavior
  useEffect(() => {
    fetchTransferStatus(true);
  }, [transferId, fetchTransferStatus]);

  // Separate effect for auto-refresh to avoid infinite loops
  useEffect(() => {
    if (!autoRefresh || !transferData) return;
    
    const shouldAutoRefresh = 
      transferData.status !== TransferStatusEnum.COMPLETED && 
      transferData.status !== TransferStatusEnum.FAILED;

    if (shouldAutoRefresh) {
      const interval = setInterval(() => {
        fetchTransferStatus(false); // Don't show loading spinner for background updates
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, transferData?.status, fetchTransferStatus, transferData]);

  // Format currency display
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get status color and icon
  const getStatusDisplay = (status: TransferStatusEnum) => {
    switch (status) {
      case TransferStatusEnum.INITIATED:
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Clock, label: 'Initiated' };
      case TransferStatusEnum.PAYMENT_PROCESSING:
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: RefreshCw, label: 'Processing Payment' };
      case TransferStatusEnum.TRANSFERRING:
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: ArrowRight, label: 'Transferring' };
      case TransferStatusEnum.PAYING_OUT:
        return { color: 'text-purple-600', bgColor: 'bg-purple-50', icon: RefreshCw, label: 'Paying Out' };
      case TransferStatusEnum.COMPLETED:
        return { color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle, label: 'Completed' };
      case TransferStatusEnum.FAILED:
        return { color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertCircle, label: 'Failed' };
      // Chilean-specific statuses
      case TransferStatusEnum.CHILEAN_BANK_PROCESSING:
        return { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: RefreshCw, label: 'Processing Chilean Bank Transfer' };
      case TransferStatusEnum.CHILEAN_VERIFICATION_PENDING:
        return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Clock, label: 'Awaiting Bank Verification' };
      case TransferStatusEnum.CHILEAN_MICRODEPOSIT_SENT:
        return { color: 'text-purple-600', bgColor: 'bg-purple-50', icon: ArrowRight, label: 'Microdeposits Sent' };
      default:
        return { color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Clock, label: 'Unknown' };
    }
  };

  // Get event status display
  const getEventStatusDisplay = (status: 'success' | 'pending' | 'failed') => {
    switch (status) {
      case 'success':
        return { color: 'text-green-600', icon: CheckCircle };
      case 'pending':
        return { color: 'text-yellow-600', icon: Clock };
      case 'failed':
        return { color: 'text-red-600', icon: AlertCircle };
      default:
        return { color: 'text-gray-600', icon: Clock };
    }
  };

  // Calculate progress percentage
  const getProgressPercentage = (status: TransferStatusEnum) => {
    switch (status) {
      case TransferStatusEnum.INITIATED:
        return 20;
      case TransferStatusEnum.PAYMENT_PROCESSING:
        return 40;
      case TransferStatusEnum.TRANSFERRING:
        return 60;
      case TransferStatusEnum.PAYING_OUT:
        return 80;
      case TransferStatusEnum.COMPLETED:
        return 100;
      case TransferStatusEnum.FAILED:
        return 0;
      // Chilean-specific progress
      case TransferStatusEnum.CHILEAN_BANK_PROCESSING:
        return 50;
      case TransferStatusEnum.CHILEAN_VERIFICATION_PENDING:
        return 30;
      case TransferStatusEnum.CHILEAN_MICRODEPOSIT_SENT:
        return 70;
      default:
        return 0;
    }
  };

  if (isLoading && !transferData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-muted-foreground">Loading transfer status...</span>
        </CardContent>
      </Card>
    );
  }

  if (error && !transferData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Transfer</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transferData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Transfer Not Found</h3>
            <p className="text-gray-600">No transfer data available for ID: {transferId}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusDisplay = getStatusDisplay(transferData.status);
  const StatusIcon = statusDisplay.icon;
  const progressPercentage = getProgressPercentage(transferData.status);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <StatusIcon className={`h-5 w-5 ${statusDisplay.color}`} />
            <span className="hidden sm:inline">Transfer Status</span>
            <span className="sm:hidden">Status</span>
          </CardTitle>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Update</span>
          </Button>
        </div>
        <div className="text-sm text-muted-foreground break-all sm:break-normal">
          ID: {transferData.transferId}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className={`rounded-lg p-4 ${statusDisplay.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-6 w-6 ${statusDisplay.color}`} />
              <div>
                <h3 className={`font-semibold ${statusDisplay.color}`}>
                  {statusDisplay.label}
                </h3>
                {transferData.estimatedCompletion && transferData.status !== TransferStatusEnum.COMPLETED && (
                  <p className="text-sm text-muted-foreground">
                    Estimated completion: {formatTimestamp(transferData.estimatedCompletion)}
                  </p>
                )}
                {transferData.completedAt && (
                  <p className="text-sm text-muted-foreground">
                    Completed: {formatTimestamp(transferData.completedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                transferData.status === TransferStatusEnum.FAILED ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Transfer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">You sent</p>
            <p className="font-semibold">{formatCurrency(transferData.sendAmount, transferData.sendCurrency || 'USD')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Recipient gets</p>
            <p className="font-semibold text-green-600">{formatCurrency(transferData.receiveAmount, transferData.receiveCurrency || 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Exchange rate</p>
            <p className="font-semibold">
              {transferData.sendCurrency === transferData.receiveCurrency ? 
                '1:1 (Same currency)' : 
                `1 ${transferData.sendCurrency || 'USD'} = ${transferData.exchangeRate.toFixed(4)} ${transferData.receiveCurrency || 'EUR'}`
              }
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fees</p>
            <p className="font-semibold">{formatCurrency(transferData.fees, transferData.sendCurrency || 'USD')}</p>
          </div>
        </div>

        {/* Enhanced Timeline with better visualization */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Timeline</h3>
            {isRealTimeConnected && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live updates
              </div>
            )}
          </div>
          <div className="relative">
            {transferData.timeline.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No timeline events yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transferData.timeline.map((event, index) => {
                  const eventStatusDisplay = getEventStatusDisplay(event.status);
                  const EventIcon = eventStatusDisplay.icon;
                  const isLast = index === transferData.timeline.length - 1;
                  const isRecent = new Date(event.timestamp) > new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes

                  return (
                    <div 
                      key={event.id} 
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                        isRecent ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center relative">
                        <div className={`p-1 rounded-full ${
                          event.status === 'success' ? 'bg-green-100' :
                          event.status === 'pending' ? 'bg-yellow-100' :
                          'bg-red-100'
                        }`}>
                          <EventIcon className={`h-4 w-4 ${eventStatusDisplay.color}`} />
                        </div>
                        {!isLast && (
                          <div className={`w-px h-8 mt-2 ${
                            event.status === 'success' ? 'bg-green-300' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <p className="font-medium text-sm sm:text-base">{event.message}</p>
                          <div className="flex items-center gap-2">
                            {isRecent && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                New
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className={`text-xs capitalize font-medium ${eventStatusDisplay.color}`}>
                            {event.status}
                          </p>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              • Additional details available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          Last updated: {formatTimestamp(transferData.lastUpdated)}
          {autoRefresh && transferData.status !== TransferStatusEnum.COMPLETED && transferData.status !== TransferStatusEnum.FAILED && (
            <span className="ml-2">• Auto-refreshing every {refreshInterval / 1000}s</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}