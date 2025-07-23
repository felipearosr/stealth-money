"use client";

import { UserToUserTransferFlow } from "@/components/features/UserToUserTransferFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, ArrowRight, Shield, Clock } from "lucide-react";

/**
 * Complete user-to-user transfer flow page
 * This demonstrates the enhanced PaymentForm integration with the full transfer flow
 */
export default function UserTransferPage() {
  const handleTransferComplete = (transferId: string) => {
    console.log('Transfer completed successfully:', transferId);
    // In a real app, you might redirect to a success page or update global state
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Send Money to Anyone
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Fast, secure, and affordable transfers to users worldwide
          </p>
          
          {/* Feature highlights */}
          <div className="flex justify-center space-x-8 mb-8">
            <div className="flex items-center space-x-2 text-gray-700">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="font-medium">Secure & Encrypted</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <Clock className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Instant Transfers</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-700">
              <User className="w-5 h-5 text-purple-500" />
              <span className="font-medium">Verified Recipients</span>
            </div>
          </div>
        </div>

        {/* How it works */}
        <Card className="mb-8 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">How User-to-User Transfers Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="font-semibold mb-2">Enter Amount</h3>
                <p className="text-sm text-gray-600">
                  Choose how much to send and the currency
                </p>
              </div>
              
              <div className="flex justify-center items-center">
                <ArrowRight className="w-6 h-6 text-gray-400 hidden md:block" />
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-green-600">2</span>
                </div>
                <h3 className="font-semibold mb-2">Select Recipient</h3>
                <p className="text-sm text-gray-600">
                  Find a verified user and their payment method
                </p>
              </div>
              
              <div className="flex justify-center items-center">
                <ArrowRight className="w-6 h-6 text-gray-400 hidden md:block" />
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-purple-600">3</span>
                </div>
                <h3 className="font-semibold mb-2">Complete Payment</h3>
                <p className="text-sm text-gray-600">
                  Pay with your card and track the transfer
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Transfer Flow */}
        <UserToUserTransferFlow
          onComplete={handleTransferComplete}
          currentUserId="current-user-123" // In a real app, this would come from auth
          className="max-w-6xl mx-auto"
        />

        {/* Benefits */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">Why Choose Our Platform?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Bank-Level Security</h3>
                <p className="text-gray-600 text-sm">
                  All transfers are protected with enterprise-grade encryption and fraud detection
                </p>
                <Badge variant="secondary" className="mt-2">PCI DSS Compliant</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-gray-600 text-sm">
                  Most transfers arrive within minutes, not days like traditional banks
                </p>
                <Badge variant="secondary" className="mt-2">Real-time Processing</Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <User className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Verified Users</h3>
                <p className="text-gray-600 text-sm">
                  All recipients are identity-verified with confirmed bank accounts
                </p>
                <Badge variant="secondary" className="mt-2">KYC Verified</Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support info */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            Need help? Contact our support team 24/7 at{" "}
            <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}