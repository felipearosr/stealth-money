/**
 * Example usage of PaymentRequestService
 * This file demonstrates how to use the PaymentRequestService
 */

import { PaymentRequestService } from './payment-request.service';

async function exampleUsage() {
  const service = new PaymentRequestService();

  try {
    // 1. Create a payment request
    console.log('1. Creating payment request...');
    const paymentRequest = await service.createPaymentRequest({
      requesterId: 'user-123',
      amount: 100.50,
      currency: 'USD',
      description: 'Payment for dinner',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
    console.log('Payment request created:', paymentRequest.id);

    // 2. Generate QR code
    console.log('2. Generating QR code...');
    const qrData = await service.generateQRCode(paymentRequest.id);
    console.log('QR code generated:', qrData.shareableLink);

    // 3. Generate secure shareable link
    console.log('3. Generating secure shareable link...');
    const secureLink = await service.generateShareableLink(paymentRequest.id);
    console.log('Secure link generated:', secureLink);

    // 4. Check request status
    console.log('4. Checking request status...');
    const status = await service.getRequestStatus(paymentRequest.id);
    console.log('Request status:', status?.status);

    // 5. Get user's payment requests
    console.log('5. Getting user payment requests...');
    const userRequests = await service.getUserPaymentRequests('user-123');
    console.log('User has', userRequests.length, 'payment requests');

    // 6. Process payment (simulate payment)
    console.log('6. Processing payment...');
    const paymentResult = await service.processPaymentRequest(paymentRequest.id, {
      senderId: 'user-456',
      processorId: 'stripe',
      settlementMethod: 'circle',
    });
    console.log('Payment processed:', paymentResult.success);

    // 7. Check final status
    const finalStatus = await service.getRequestStatus(paymentRequest.id);
    console.log('Final status:', finalStatus?.status);

  } catch (error) {
    console.error('Error in example:', error);
  } finally {
    await service.disconnect();
  }
}

// Uncomment to run the example
// exampleUsage();

export { exampleUsage };