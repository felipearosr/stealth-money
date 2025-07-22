import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define status type based on Transaction model
type TransferStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/**
 * Interface for notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Interface for notification payload
 */
export interface NotificationPayload {
  type: 'transfer_status' | 'payment_confirmed' | 'transfer_completed' | 'transfer_failed';
  transferId: string;
  userId: string;
  recipientEmail?: string;
  data: {
    sendAmount: number;
    sendCurrency: string;
    receiveAmount: number;
    receiveCurrency: string;
    status: TransferStatus;
    estimatedCompletion?: string;
    errorMessage?: string;
  };
}

/**
 * Service for handling real-time notifications and status updates
 */
export class NotificationService {
  
  /**
   * Send notification for transfer status update
   */
  async sendTransferNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Update the transaction with the new status
      await this.storeNotification(payload);
      
      // Send email notification if enabled
      if (payload.recipientEmail) {
        await this.sendEmailNotification(payload);
      }
      
      // Send real-time update via WebSocket (if connected)
      await this.sendRealtimeUpdate(payload);
      
      console.log(`Notification sent for transfer ${payload.transferId}: ${payload.type}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't throw - notifications should not break the transfer flow
    }
  }

  /**
   * Store notification in database for audit trail
   * Uses Transaction model to track status changes
   */
  private async storeNotification(payload: NotificationPayload): Promise<void> {
    // Update the transaction with the new status
    await prisma.transaction.update({
      where: { id: payload.transferId },
      data: {
        status: payload.data.status,
        updatedAt: new Date()
      }
    });
    
    // In production, you might want to create a separate audit log
    console.log(`Notification stored: ${payload.type} for transfer ${payload.transferId}`);
  }

  /**
   * Send email notification (mock implementation)
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    // In production, integrate with email service like SendGrid, AWS SES, etc.
    const emailContent = this.generateEmailContent(payload);
    
    console.log(`Email notification would be sent to: ${payload.recipientEmail}`);
    console.log(`Subject: ${emailContent.subject}`);
    console.log(`Body: ${emailContent.body}`);
    
    // Mock email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send real-time update via WebSocket
   */
  private async sendRealtimeUpdate(payload: NotificationPayload): Promise<void> {
    // In production, integrate with WebSocket server or real-time service
    // For now, we'll just log the update
    console.log(`Real-time update for transfer ${payload.transferId}:`, {
      type: payload.type,
      status: payload.data.status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate email content based on notification type
   */
  private generateEmailContent(payload: NotificationPayload): { subject: string; body: string } {
    const { type, data } = payload;
    
    switch (type) {
      case 'transfer_status':
        return {
          subject: `Transfer ${data.status}: ${data.sendAmount} ${data.sendCurrency} → ${data.receiveAmount} ${data.receiveCurrency}`,
          body: `
            <h2>Transfer Status Update</h2>
            <p>Your transfer of ${data.sendAmount} ${data.sendCurrency} is now ${data.status}.</p>
            <p>Recipient will receive: ${data.receiveAmount} ${data.receiveCurrency}</p>
            ${data.estimatedCompletion ? `<p>Estimated completion: ${new Date(data.estimatedCompletion).toLocaleString()}</p>` : ''}
            <p>Transfer ID: ${payload.transferId}</p>
          `
        };
      
      case 'payment_confirmed':
        return {
          subject: `Payment confirmed: ${data.sendAmount} ${data.sendCurrency}`,
          body: `
            <h2>Payment Confirmed</h2>
            <p>Your payment of ${data.sendAmount} ${data.sendCurrency} has been confirmed.</p>
            <p>Processing your transfer to recipient...</p>
            <p>Transfer ID: ${payload.transferId}</p>
          `
        };
      
      case 'transfer_completed':
        return {
          subject: `Transfer completed: ${data.sendAmount} ${data.sendCurrency} → ${data.receiveAmount} ${data.receiveCurrency}`,
          body: `
            <h2>Transfer Completed Successfully</h2>
            <p>Your transfer has been completed!</p>
            <p>Sent: ${data.sendAmount} ${data.sendCurrency}</p>
            <p>Received: ${data.receiveAmount} ${data.receiveCurrency}</p>
            <p>Transfer ID: ${payload.transferId}</p>
            <p>Thank you for using our service!</p>
          `
        };
      
      case 'transfer_failed':
        return {
          subject: `Transfer failed: ${data.sendAmount} ${data.sendCurrency}`,
          body: `
            <h2>Transfer Failed</h2>
            <p>We regret to inform you that your transfer of ${data.sendAmount} ${data.sendCurrency} has failed.</p>
            ${data.errorMessage ? `<p>Error: ${data.errorMessage}</p>` : ''}
            <p>Transfer ID: ${payload.transferId}</p>
            <p>Please contact support if you need assistance.</p>
          `
        };
      
      default:
        return {
          subject: 'Transfer Update',
          body: `<p>Your transfer status has been updated.</p>`
        };
    }
  }

  /**
   * Get notification history for a user
   * Returns transaction history for the user
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
    return await prisma.transaction.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get notification history for a transfer
   * Returns the specific transaction
   */
  async getTransferNotifications(transferId: string): Promise<any[]> {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transferId }
    });
    return transaction ? [transaction] : [];
  }

  /**
   * Mark notification as read (placeholder - could implement read receipts)
   */
  async markAsRead(notificationId: string): Promise<void> {
    // Placeholder - in a real implementation, this could track read receipts
    console.log(`Marking notification ${notificationId} as read`);
  }

  /**
   * Send bulk notifications for multiple transfers
   */
  async sendBulkNotifications(notifications: NotificationPayload[]): Promise<void> {
    const promises = notifications.map(notification => this.sendTransferNotification(notification));
    await Promise.allSettled(promises);
  }
}

/**
 * WebSocket notification service for real-time updates
 */
export class WebSocketNotificationService {
  private clients: Map<string, any> = new Map();

  /**
   * Register a client for real-time updates
   */
  registerClient(userId: string, client: any): void {
    this.clients.set(userId, client);
    console.log(`Client registered for user ${userId}`);
  }

  /**
   * Unregister a client
   */
  unregisterClient(userId: string): void {
    this.clients.delete(userId);
    console.log(`Client unregistered for user ${userId}`);
  }

  /**
   * Send real-time update to specific user
   */
  sendToUser(userId: string, data: any): void {
    const client = this.clients.get(userId);
    if (client && client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(data));
    }
  }

  /**
   * Broadcast update to all connected clients
   */
  broadcast(data: any): void {
    this.clients.forEach((client, userId) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

// Export singleton instances
export const notificationService = new NotificationService();
export const webSocketNotificationService = new WebSocketNotificationService();
