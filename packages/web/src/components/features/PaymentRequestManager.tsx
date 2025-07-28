"use client";

import { useState } from "react";
import { PaymentRequestCreator } from "./PaymentRequestCreator";
import { PaymentRequestQRCode } from "./PaymentRequestQRCode";
import { PaymentRequestStatus } from "./PaymentRequestStatus";
import { UserOnboarding } from "./UserOnboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";

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
  requesterId: string;
}

type ViewMode = 'list' | 'create' | 'view' | 'onboarding';

interface PaymentRequestManagerProps {
  initialRequests?: PaymentRequest[];
  showOnboarding?: boolean;
  onboardingRequest?: PaymentRequest;
}

export function PaymentRequestManager({ 
  initialRequests = [], 
  showOnboarding = false,
  onboardingRequest 
}: PaymentRequestManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    showOnboarding ? 'onboarding' : 'list'
  );
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  const handleRequestCreated = (newRequest: PaymentRequest) => {
    setPaymentRequests(prev => [newRequest, ...prev]);
    setSelectedRequest(newRequest);
    setViewMode('view');
  };

  const handleStatusUpdate = (updatedRequest: PaymentRequest) => {
    setPaymentRequests(prev => 
      prev.map(req => req.id === updatedRequest.id ? updatedRequest : req)
    );
    setSelectedRequest(updatedRequest);
  };

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed:', data);
    // Redirect to success page or dashboard
    window.location.href = '/dashboard';
  };

  const renderListView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Requests</h2>
        <Button onClick={() => setViewMode('create')}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {paymentRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500 mb-4">No payment requests yet</div>
            <Button onClick={() => setViewMode('create')}>
              Create Your First Request
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paymentRequests.map((request) => (
            <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent 
                className="p-4"
                onClick={() => {
                  setSelectedRequest(request);
                  setViewMode('view');
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {request.currency} {request.amount.toFixed(2)}
                    </div>
                    {request.description && (
                      <div className="text-sm text-gray-600">
                        {request.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Created {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'paid' ? 'bg-green-100 text-green-800' :
                      request.status === 'expired' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ID: {request.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateView = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => setViewMode('list')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h2 className="text-2xl font-bold">Create Payment Request</h2>
      </div>
      
      <div className="flex justify-center">
        <PaymentRequestCreator onRequestCreated={handleRequestCreated} />
      </div>
    </div>
  );

  const renderViewRequest = () => {
    if (!selectedRequest) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => setViewMode('list')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h2 className="text-2xl font-bold">Payment Request Details</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex justify-center">
            <PaymentRequestStatus 
              paymentRequest={selectedRequest}
              onStatusUpdate={handleStatusUpdate}
            />
          </div>
          <div className="flex justify-center">
            <PaymentRequestQRCode paymentRequest={selectedRequest} />
          </div>
        </div>
      </div>
    );
  };

  const renderOnboarding = () => {
    if (!onboardingRequest) return null;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Complete Your Payment</h2>
          <p className="text-gray-600">
            You're just a few steps away from completing your payment
          </p>
        </div>
        
        <div className="flex justify-center">
          <UserOnboarding 
            paymentRequest={onboardingRequest}
            onOnboardingComplete={handleOnboardingComplete}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {viewMode === 'list' && renderListView()}
      {viewMode === 'create' && renderCreateView()}
      {viewMode === 'view' && renderViewRequest()}
      {viewMode === 'onboarding' && renderOnboarding()}
    </div>
  );
}