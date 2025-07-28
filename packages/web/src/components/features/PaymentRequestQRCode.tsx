"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy, Download, Share2 } from "lucide-react";

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
}

interface PaymentRequestQRCodeProps {
  paymentRequest: PaymentRequest;
}

export function PaymentRequestQRCode({ paymentRequest }: PaymentRequestQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(paymentRequest.qrCode || null);
  const [shareableLink, setShareableLink] = useState<string | null>(paymentRequest.shareableLink || null);

  const generateQRCode = async () => {
    if (qrCodeData) return; // Already generated
    
    setIsGeneratingQR(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/payment-requests/${paymentRequest.id}/qr-code`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQrCodeData(data.qrCode);
      setShareableLink(data.shareableLink);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeData) return;
    
    const svg = document.getElementById('payment-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `payment-request-${paymentRequest.id}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const sharePaymentRequest = async () => {
    if (!shareableLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: `Payment request for ${paymentRequest.currency} ${paymentRequest.amount}${paymentRequest.description ? ` - ${paymentRequest.description}` : ''}`,
          url: shareableLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        copyToClipboard(shareableLink);
      }
    } else {
      copyToClipboard(shareableLink);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">Payment Request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold">
            {paymentRequest.currency} {paymentRequest.amount.toFixed(2)}
          </div>
          {paymentRequest.description && (
            <div className="text-sm text-gray-600">
              {paymentRequest.description}
            </div>
          )}
          <div className="text-xs text-gray-500">
            Request ID: {paymentRequest.id.slice(0, 8)}...
          </div>
        </div>

        {!qrCodeData ? (
          <div className="text-center space-y-4">
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-gray-500">QR Code not generated</div>
            </div>
            <Button 
              onClick={generateQRCode} 
              disabled={isGeneratingQR}
              className="w-full"
            >
              {isGeneratingQR ? "Generating QR Code..." : "Generate QR Code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <QRCode
                id="payment-qr-code"
                value={qrCodeData}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
              />
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">Shareable Link:</div>
              <div className="flex space-x-2">
                <Input
                  value={shareableLink || ''}
                  readOnly
                  className="flex-1 text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => shareableLink && copyToClipboard(shareableLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <div className="text-xs text-green-600">Copied to clipboard!</div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={sharePaymentRequest}
                className="flex-1"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          Status: <span className="capitalize font-medium">{paymentRequest.status}</span>
          <br />
          Expires: {new Date(paymentRequest.expiresAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}