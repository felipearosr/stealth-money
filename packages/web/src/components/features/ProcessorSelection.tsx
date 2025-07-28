"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock, DollarSign, Shield, Zap } from "lucide-react";
import { ProcessorOption, LocationData, SelectionCriteria, ProcessorSelection, getAvailableProcessors, selectOptimalProcessor } from "@/lib/api";

interface ProcessorSelectionProps {
  userId: string;
  amount?: number;
  currency?: string;
  onProcessorSelected: (processor: ProcessorOption, selection?: ProcessorSelection) => void;
  onLocationDetected?: (location: LocationData) => void;
  criteria?: Partial<SelectionCriteria>;
}

export function ProcessorSelection({ 
  userId, 
  amount, 
  currency, 
  onProcessorSelected, 
  onLocationDetected,
  criteria = {}
}: ProcessorSelectionProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [processors, setProcessors] = useState<ProcessorOption[]>([]);
  const [selectedProcessor, setSelectedProcessor] = useState<ProcessorOption | null>(null);
  const [optimalSelection, setOptimalSelection] = useState<ProcessorSelection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllProcessors, setShowAllProcessors] = useState(false);

  // Default selection criteria
  const defaultCriteria: SelectionCriteria = {
    prioritizeCost: true,
    prioritizeSpeed: false,
    prioritizeReliability: true,
    ...criteria
  };

  useEffect(() => {
    loadAvailableProcessors();
  }, [userId]);

  useEffect(() => {
    if (processors.length > 0 && !selectedProcessor) {
      selectOptimalProcessorAutomatically();
    }
  }, [processors]);

  const loadAvailableProcessors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await getAvailableProcessors(userId);
      setLocation(data.location);
      setProcessors(data.processors);
      
      if (onLocationDetected) {
        onLocationDetected(data.location);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load processors');
    } finally {
      setIsLoading(false);
    }
  };

  const selectOptimalProcessorAutomatically = async () => {
    try {
      setIsSelecting(true);
      
      const data = await selectOptimalProcessor(userId, defaultCriteria);
      setOptimalSelection(data.selection);
      setSelectedProcessor(data.selection.selectedProcessor);
    } catch (err) {
      console.warn('Failed to auto-select processor:', err);
      // Fallback to first available processor
      if (processors.length > 0) {
        setSelectedProcessor(processors[0]);
      }
    } finally {
      setIsSelecting(false);
    }
  };

  const handleProcessorSelect = (processor: ProcessorOption) => {
    setSelectedProcessor(processor);
    onProcessorSelected(processor, optimalSelection || undefined);
  };

  const handleConfirmSelection = () => {
    if (selectedProcessor) {
      onProcessorSelected(selectedProcessor, optimalSelection);
    }
  };

  const getProcessorIcon = (processorId: string) => {
    switch (processorId) {
      case 'stripe':
        return <DollarSign className="h-5 w-5" />;
      case 'plaid':
        return <Shield className="h-5 w-5" />;
      case 'circle':
        return <Zap className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 99) return 'text-green-600';
    if (reliability >= 95) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatFees = (processor: ProcessorOption, amount?: number) => {
    const baseAmount = amount || 100; // Default to $100 for calculation
    const totalFee = processor.fees.fixedFee + (baseAmount * processor.fees.percentageFee / 100);
    return {
      percentage: processor.fees.percentageFee,
      fixed: processor.fees.fixedFee,
      total: totalFee,
      currency: processor.fees.currency
    };
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Detecting your location and available payment methods...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button 
            onClick={loadAvailableProcessors} 
            variant="outline" 
            className="mt-4"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (processors.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-semibold mb-2">No Payment Methods Available</h3>
            <p className="text-sm text-gray-600 mb-4">
              We couldn't find any available payment processors for your location ({location?.country}).
            </p>
            <Button onClick={loadAvailableProcessors} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayProcessors = showAllProcessors ? processors : processors.slice(0, 1);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Method</span>
          {location && (
            <Badge variant="outline" className="text-xs">
              {location.country} • {location.currency}
            </Badge>
          )}
        </CardTitle>
        {optimalSelection && (
          <p className="text-sm text-gray-600">
            {optimalSelection.reason}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isSelecting && (
          <div className="flex items-center space-x-2 text-blue-600 bg-blue-50 p-3 rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Selecting optimal payment method...</span>
          </div>
        )}

        <div className="space-y-3">
          {displayProcessors.map((processor) => {
            const fees = formatFees(processor, amount);
            const isSelected = selectedProcessor?.id === processor.id;
            const isRecommended = optimalSelection?.selectedProcessor.id === processor.id;

            return (
              <div
                key={processor.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleProcessorSelect(processor)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {getProcessorIcon(processor.id)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{processor.name}</h3>
                        {isRecommended && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            Recommended
                          </Badge>
                        )}
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{processor.processingTime}</span>
                        </span>
                        <span className={`flex items-center space-x-1 ${getReliabilityColor(processor.reliability)}`}>
                          <Shield className="h-3 w-3" />
                          <span>{processor.reliability}% uptime</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {fees.percentage}% + ${fees.fixed}
                    </div>
                    {amount && (
                      <div className="text-sm text-gray-600">
                        ≈ ${fees.total.toFixed(2)} fee
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {processors.length > 1 && !showAllProcessors && (
          <Button
            variant="outline"
            onClick={() => setShowAllProcessors(true)}
            className="w-full"
          >
            Show {processors.length - 1} more payment method{processors.length > 2 ? 's' : ''}
          </Button>
        )}

        {showAllProcessors && processors.length > 1 && (
          <Button
            variant="outline"
            onClick={() => setShowAllProcessors(false)}
            className="w-full"
          >
            Show recommended only
          </Button>
        )}

        {optimalSelection?.alternatives && optimalSelection.alternatives.length > 0 && showAllProcessors && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Alternative Options:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              {optimalSelection.alternatives.slice(0, 2).map((alt) => (
                <div key={alt.id} className="flex justify-between">
                  <span>{alt.name}</span>
                  <span>{alt.fees.percentageFee}% + ${alt.fees.fixedFee}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}