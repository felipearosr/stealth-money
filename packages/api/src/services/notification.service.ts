import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push';
  enabled: boolean;
  address?: string; // email address, phone number, or push token
  verified?: boolean;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  paymentRequests: boolean;
  paymentConfirmations: boolean;
  statusUpdates: boolean;
  securityAlerts: boolean;
  marketing: boolean;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  type: 'payment_request' | 'payment_confirmation' | 'status_update' | 'security_alert' | 'onboarding_welcome';
  channel: 'email' | 'sms' | 'push';
  subject?: string; // For email
  title?: string; // For push notifications
  body: string;
  variables: string[]; // List of template variables like {amount}, {currency}, etc.
}

export interface NotificationData {
  userId: string;
  type: 'payment_request' | 'payment_confirmation' | 'status_update' | 'security_alert' | 'onboarding_welcome';
  channels: ('email' | 'sms' | 'push')[];
  variables: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  userId: string;
  channel: 'email' | 'sms' | 'push';
  address: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentStatus {
  paymentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  senderId: string;
  recipientId: string;
  processorId?: string;
  settlementMethod?: string;
  estimatedCompletion?: Date;
  completedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

export interface RecipientData {
  userId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  preferredChannel?: 'email' | 'sms' | 'push';
}

export interface PaymentRequest {
  id: string;
  requesterId: string;
  amount: number;
  currency: string;
  description?: string;
  qrCode?: string;
  shareableLink?: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  paymentId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: string;
  processorId: string;
  settlementMethod: string;
  fees: number;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export class NotificationService {
  private prisma: PrismaClient;
  private templates: Map<string, NotificationTemplate>;
  private deliveryQueue: Map<string, NotificationDelivery>;
  private retryIntervals: number[] = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

  constructor() {
    this.prisma = new PrismaClient();
    this.templates = new Map();
    this.deliveryQueue = new Map();
    this.initializeTemplates();
    this.startDeliveryProcessor();
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      // Payment Request Templates
      {
        id: 'payment_request_email',
        type: 'payment_request',
        channel: 'email',
        subject: 'Payment Request from {senderName}',
        body: `Hi {recipientName},

{senderName} has requested a payment of {amount} {currency}.

{description}

To pay this request, click the link below:
{paymentLink}

This request expires on {expirationDate}.

Best regards,
Payment System Team`,
        variables: ['senderName', 'recipientName', 'amount', 'currency', 'description', 'paymentLink', 'expirationDate']
      },
      {
        id: 'payment_request_sms',
        type: 'payment_request',
        channel: 'sms',
        body: 'Payment request from {senderName}: {amount} {currency}. Pay here: {paymentLink} (expires {expirationDate})',
        variables: ['senderName', 'amount', 'currency', 'paymentLink', 'expirationDate']
      },
      {
        id: 'payment_request_push',
        type: 'payment_request',
        channel: 'push',
        title: 'Payment Request',
        body: '{senderName} requested {amount} {currency}',
        variables: ['senderName', 'amount', 'currency']
      },

      // Payment Confirmation Templates
      {
        id: 'payment_confirmation_email',
        type: 'payment_confirmation',
        channel: 'email',
        subject: 'Payment Confirmation - {amount} {currency}',
        body: `Hi {recipientName},

Great news! You've received a payment of {amount} {currency} from {senderName}.

Payment Details:
- Amount: {amount} {currency}
- From: {senderName}
- Payment ID: {paymentId}
- Completed: {completedAt}
- Settlement Method: {settlementMethod}

The funds will be deposited to your linked {currency} account.

Best regards,
Payment System Team`,
        variables: ['recipientName', 'amount', 'currency', 'senderName', 'paymentId', 'completedAt', 'settlementMethod']
      },
      {
        id: 'payment_confirmation_sms',
        type: 'payment_confirmation',
        channel: 'sms',
        body: 'Payment received: {amount} {currency} from {senderName}. Payment ID: {paymentId}',
        variables: ['amount', 'currency', 'senderName', 'paymentId']
      },
      {
        id: 'payment_confirmation_push',
        type: 'payment_confirmation',
        channel: 'push',
        title: 'Payment Received',
        body: 'You received {amount} {currency} from {senderName}',
        variables: ['amount', 'currency', 'senderName']
      },

      // Status Update Templates
      {
        id: 'status_update_email',
        type: 'status_update',
        channel: 'email',
        subject: 'Payment Status Update - {paymentId}',
        body: `Hi {userName},

Your payment status has been updated:

Payment ID: {paymentId}
Status: {status}
Amount: {amount} {currency}
{statusMessage}

{additionalInfo}

Best regards,
Payment System Team`,
        variables: ['userName', 'paymentId', 'status', 'amount', 'currency', 'statusMessage', 'additionalInfo']
      },
      {
        id: 'status_update_sms',
        type: 'status_update',
        channel: 'sms',
        body: 'Payment {paymentId} status: {status}. {statusMessage}',
        variables: ['paymentId', 'status', 'statusMessage']
      },
      {
        id: 'status_update_push',
        type: 'status_update',
        channel: 'push',
        title: 'Payment Update',
        body: 'Payment {status}: {amount} {currency}',
        variables: ['status', 'amount', 'currency']
      },

      // Onboarding Welcome Templates
      {
        id: 'onboarding_welcome_email',
        type: 'onboarding_welcome',
        channel: 'email',
        subject: 'Welcome to Our Payment System!',
        body: `Hi {firstName},

Welcome to our payment system! Your account has been successfully created.

Account Details:
- Email: {email}
- Country: {country}
- Primary Currency: {currency}

You can now:
- Send and receive international payments
- Create payment requests with QR codes
- Link your bank accounts for direct deposits

Get started by linking your bank account in the app.

Best regards,
Payment System Team`,
        variables: ['firstName', 'email', 'country', 'currency']
      },
      {
        id: 'onboarding_welcome_sms',
        type: 'onboarding_welcome',
        channel: 'sms',
        body: 'Welcome {firstName}! Your payment account is ready. Link your bank account to start receiving payments.',
        variables: ['firstName']
      },
      {
        id: 'onboarding_welcome_push',
        type: 'onboarding_welcome',
        channel: 'push',
        title: 'Welcome!',
        body: 'Your account is ready. Start sending and receiving payments!',
        variables: []
      }
    ];

    templates.forEach(template => {
      this.templates.set(`${template.type}_${template.channel}`, template);
    });
  }

  /**
   * Send payment status update notification
   */
  async sendPaymentStatusUpdate(userId: string, status: PaymentStatus): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const preferences = await this.getNotificationPreferences(userId);
      
      if (!preferences.statusUpdates) {
        console.log(`Status updates disabled for user ${userId}`);
        return;
      }

      const enabledChannels = preferences.channels
        .filter(channel => channel.enabled)
        .map(channel => channel.type);

      if (enabledChannels.length === 0) {
        console.log(`No enabled notification channels for user ${userId}`);
        return;
      }

      const statusMessage = this.getStatusMessage(status.status, status.failureReason);
      const additionalInfo = this.getAdditionalStatusInfo(status);

      const notificationData: NotificationData = {
        userId,
        type: 'status_update',
        channels: enabledChannels,
        priority: status.status === 'failed' ? 'high' : 'normal',
        variables: {
          userName: `${user.firstName} ${user.lastName}`,
          paymentId: status.paymentId,
          status: status.status.toUpperCase(),
          amount: status.amount.toFixed(2),
          currency: status.currency,
          statusMessage,
          additionalInfo
        },
        metadata: {
          paymentId: status.paymentId,
          originalStatus: status.status
        }
      };

      await this.sendNotification(notificationData);
    } catch (error) {
      console.error('Error sending payment status update:', error);
      throw error;
    }
  }

  /**
   * Send payment request notification
   */
  async sendPaymentRequest(recipientData: RecipientData, request: PaymentRequest): Promise<void> {
    try {
      const requester = await this.prisma.user.findUnique({
        where: { id: request.requesterId }
      });

      if (!requester) {
        throw new Error(`Requester not found: ${request.requesterId}`);
      }

      // Determine channels based on recipient data and preferences
      let channels: ('email' | 'sms' | 'push')[] = [];
      let userId = recipientData.userId;

      if (userId) {
        // Registered user - use their preferences
        const preferences = await this.getNotificationPreferences(userId);
        if (preferences.paymentRequests) {
          channels = preferences.channels
            .filter(channel => channel.enabled)
            .map(channel => channel.type);
        }
      } else {
        // Unregistered user - use available contact methods
        if (recipientData.email) channels.push('email');
        if (recipientData.phone) channels.push('sms');
        if (recipientData.preferredChannel && !channels.includes(recipientData.preferredChannel)) {
          channels.push(recipientData.preferredChannel);
        }
      }

      if (channels.length === 0) {
        console.log('No available notification channels for payment request');
        return;
      }

      const notificationData: NotificationData = {
        userId: userId || 'unregistered',
        type: 'payment_request',
        channels,
        priority: 'normal',
        variables: {
          senderName: `${requester.firstName} ${requester.lastName}`,
          recipientName: recipientData.firstName ? `${recipientData.firstName} ${recipientData.lastName}` : 'there',
          amount: request.amount.toFixed(2),
          currency: request.currency,
          description: request.description || 'No description provided',
          paymentLink: request.shareableLink || `Payment request: ${request.id}`,
          expirationDate: request.expiresAt.toLocaleDateString()
        },
        metadata: {
          paymentRequestId: request.id,
          requesterId: request.requesterId,
          recipientEmail: recipientData.email,
          recipientPhone: recipientData.phone
        }
      };

      await this.sendNotification(notificationData);
    } catch (error) {
      console.error('Error sending payment request notification:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(senderId: string, recipientId: string, payment: PaymentResult): Promise<void> {
    try {
      const [sender, recipient] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: senderId } }),
        this.prisma.user.findUnique({ where: { id: recipientId } })
      ]);

      if (!sender || !recipient) {
        throw new Error('Sender or recipient not found');
      }

      // Send confirmation to recipient
      const recipientPreferences = await this.getNotificationPreferences(recipientId);
      if (recipientPreferences.paymentConfirmations) {
        const recipientChannels = recipientPreferences.channels
          .filter(channel => channel.enabled)
          .map(channel => channel.type);

        if (recipientChannels.length > 0) {
          const recipientNotification: NotificationData = {
            userId: recipientId,
            type: 'payment_confirmation',
            channels: recipientChannels,
            priority: 'high',
            variables: {
              recipientName: `${recipient.firstName} ${recipient.lastName}`,
              senderName: `${sender.firstName} ${sender.lastName}`,
              amount: payment.amount.toFixed(2),
              currency: payment.currency,
              paymentId: payment.paymentId,
              completedAt: payment.completedAt ? new Date(payment.completedAt).toLocaleString() : 'Processing',
              settlementMethod: payment.settlementMethod.toUpperCase()
            },
            metadata: {
              paymentId: payment.paymentId,
              type: 'recipient_confirmation'
            }
          };

          await this.sendNotification(recipientNotification);
        }
      }

      // Send confirmation to sender
      const senderPreferences = await this.getNotificationPreferences(senderId);
      if (senderPreferences.paymentConfirmations) {
        const senderChannels = senderPreferences.channels
          .filter(channel => channel.enabled)
          .map(channel => channel.type);

        if (senderChannels.length > 0) {
          const senderNotification: NotificationData = {
            userId: senderId,
            type: 'payment_confirmation',
            channels: senderChannels,
            priority: 'normal',
            variables: {
              recipientName: `${sender.firstName} ${sender.lastName}`, // Sender sees their own name as recipient in confirmation
              senderName: `${recipient.firstName} ${recipient.lastName}`, // Recipient name as sender for sender's confirmation
              amount: payment.amount.toFixed(2),
              currency: payment.currency,
              paymentId: payment.paymentId,
              completedAt: payment.completedAt ? new Date(payment.completedAt).toLocaleString() : 'Processing',
              settlementMethod: payment.settlementMethod.toUpperCase()
            },
            metadata: {
              paymentId: payment.paymentId,
              type: 'sender_confirmation'
            }
          };

          await this.sendNotification(senderNotification);
        }
      }
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send onboarding welcome notification
   */
  async sendOnboardingWelcome(userId: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // For new users, enable all notification channels by default
      const defaultChannels: ('email' | 'sms' | 'push')[] = ['email'];
      if (user.phone) {
        defaultChannels.push('sms');
      }

      const notificationData: NotificationData = {
        userId,
        type: 'onboarding_welcome',
        channels: defaultChannels,
        priority: 'normal',
        variables: {
          firstName: user.firstName,
          email: user.email,
          country: user.country,
          currency: user.currency
        },
        metadata: {
          onboardingDate: new Date().toISOString()
        }
      };

      await this.sendNotification(notificationData);
    } catch (error) {
      console.error('Error sending onboarding welcome notification:', error);
      throw error;
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      // This would typically be stored in a database table
      // For now, we'll use a simple in-memory approach with fallback to defaults
      const currentPreferences = await this.getNotificationPreferences(userId);
      
      const updatedPreferences: NotificationPreferences = {
        ...currentPreferences,
        ...preferences,
        userId,
        updatedAt: new Date()
      };

      // In a real implementation, this would be stored in the database
      console.log(`Updated notification preferences for user ${userId}:`, updatedPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Default preferences for all users
      // In a real implementation, this would be retrieved from a database table
      const defaultPreferences: NotificationPreferences = {
        userId,
        channels: [
          {
            type: 'email',
            enabled: true,
            address: user.email,
            verified: true
          },
          ...(user.phone ? [{
            type: 'sms' as const,
            enabled: true,
            address: user.phone,
            verified: false
          }] : []),
          {
            type: 'push',
            enabled: false,
            verified: false
          }
        ],
        paymentRequests: true,
        paymentConfirmations: true,
        statusUpdates: true,
        securityAlerts: true,
        marketing: false,
        updatedAt: new Date()
      };

      return defaultPreferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send notification through multiple channels
   */
  private async sendNotification(data: NotificationData): Promise<void> {
    try {
      const notificationId = uuidv4();
      
      for (const channel of data.channels) {
        const templateKey = `${data.type}_${channel}`;
        const template = this.templates.get(templateKey);
        
        if (!template) {
          console.warn(`Template not found for ${templateKey}`);
          continue;
        }

        const delivery: NotificationDelivery = {
          id: uuidv4(),
          notificationId,
          userId: data.userId,
          channel,
          address: await this.getChannelAddress(data.userId, channel),
          status: 'pending',
          attempts: 0,
          maxAttempts: 3,
          metadata: {
            template: templateKey,
            variables: data.variables,
            priority: data.priority,
            ...data.metadata
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.deliveryQueue.set(delivery.id, delivery);
      }

      console.log(`Queued ${data.channels.length} notifications for user ${data.userId}`);
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Get channel address for a user
   */
  private async getChannelAddress(userId: string, channel: 'email' | 'sms' | 'push'): Promise<string> {
    if (userId === 'unregistered') {
      return 'unregistered@example.com'; // Placeholder for unregistered users
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    switch (channel) {
      case 'email':
        return user.email;
      case 'sms':
        return user.phone || '';
      case 'push':
        return 'push_token_placeholder'; // Would be retrieved from user's device registration
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Process delivery queue with retry logic
   */
  private async processDeliveryQueue(): Promise<void> {
    const pendingDeliveries = Array.from(this.deliveryQueue.values())
      .filter(delivery => delivery.status === 'pending' || 
                         (delivery.status === 'failed' && delivery.attempts < delivery.maxAttempts));

    for (const delivery of pendingDeliveries) {
      try {
        await this.attemptDelivery(delivery);
      } catch (error) {
        console.error(`Error processing delivery ${delivery.id}:`, error);
      }
    }
  }

  /**
   * Attempt to deliver a notification
   */
  private async attemptDelivery(delivery: NotificationDelivery): Promise<void> {
    try {
      delivery.attempts++;
      delivery.lastAttemptAt = new Date();
      delivery.updatedAt = new Date();

      const template = this.templates.get(delivery.metadata?.template as string);
      if (!template) {
        delivery.status = 'failed';
        delivery.failureReason = 'Template not found';
        return;
      }

      const renderedContent = this.renderTemplate(template, delivery.metadata?.variables || {});
      
      // Simulate delivery based on channel
      const success = await this.deliverToChannel(delivery.channel, delivery.address, renderedContent);
      
      if (success) {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        console.log(`✅ Delivered ${delivery.channel} notification to ${delivery.address}`);
      } else {
        delivery.status = 'failed';
        delivery.failureReason = 'Delivery failed';
        
        if (delivery.attempts < delivery.maxAttempts) {
          // Schedule retry
          setTimeout(() => {
            delivery.status = 'pending';
          }, this.retryIntervals[Math.min(delivery.attempts - 1, this.retryIntervals.length - 1)]);
        }
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.failureReason = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to deliver notification ${delivery.id}:`, error);
    }
  }

  /**
   * Render template with variables
   */
  private renderTemplate(template: NotificationTemplate, variables: Record<string, any>): {
    subject?: string;
    title?: string;
    body: string;
  } {
    const renderText = (text: string): string => {
      return text.replace(/\{(\w+)\}/g, (match, key) => {
        return variables[key] !== undefined ? String(variables[key]) : match;
      });
    };

    return {
      subject: template.subject ? renderText(template.subject) : undefined,
      title: template.title ? renderText(template.title) : undefined,
      body: renderText(template.body)
    };
  }

  /**
   * Simulate delivery to different channels
   */
  private async deliverToChannel(
    channel: 'email' | 'sms' | 'push',
    address: string,
    content: { subject?: string; title?: string; body: string }
  ): Promise<boolean> {
    // Simulate delivery with random success/failure for testing
    const success = Math.random() > 0.1; // 90% success rate
    
    console.log(`📧 ${channel.toUpperCase()} to ${address}:`);
    if (content.subject) console.log(`Subject: ${content.subject}`);
    if (content.title) console.log(`Title: ${content.title}`);
    console.log(`Body: ${content.body}`);
    console.log(`Status: ${success ? 'SUCCESS' : 'FAILED'}`);
    console.log('---');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return success;
  }

  /**
   * Get status message for different payment statuses
   */
  private getStatusMessage(status: string, failureReason?: string): string {
    switch (status) {
      case 'pending':
        return 'Your payment is being processed.';
      case 'processing':
        return 'Your payment is currently being processed by our payment network.';
      case 'completed':
        return 'Your payment has been completed successfully.';
      case 'failed':
        return failureReason ? `Your payment failed: ${failureReason}` : 'Your payment failed. Please try again.';
      case 'cancelled':
        return 'Your payment has been cancelled.';
      default:
        return 'Your payment status has been updated.';
    }
  }

  /**
   * Get additional status information
   */
  private getAdditionalStatusInfo(status: PaymentStatus): string {
    const info: string[] = [];
    
    if (status.estimatedCompletion && status.status === 'processing') {
      info.push(`Estimated completion: ${new Date(status.estimatedCompletion).toLocaleString()}`);
    }
    
    if (status.processorId) {
      info.push(`Payment processor: ${status.processorId}`);
    }
    
    if (status.settlementMethod) {
      info.push(`Settlement method: ${status.settlementMethod.toUpperCase()}`);
    }

    return info.join('\n');
  }

  /**
   * Get delivery statistics for monitoring
   */
  async getDeliveryStats(): Promise<{
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    byChannel: Record<string, number>;
  }> {
    const deliveries = Array.from(this.deliveryQueue.values());
    
    const stats = {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'pending').length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed' && d.attempts >= d.maxAttempts).length,
      byChannel: {} as Record<string, number>
    };

    deliveries.forEach(delivery => {
      stats.byChannel[delivery.channel] = (stats.byChannel[delivery.channel] || 0) + 1;
    });

    return stats;
  }

  /**
   * Start the delivery processor
   */
  private startDeliveryProcessor(): void {
    // Process delivery queue every 5 seconds
    setInterval(() => {
      this.processDeliveryQueue();
    }, 5000);

    // Clean up old delivered notifications every hour
    setInterval(() => {
      this.cleanupDeliveredNotifications();
    }, 60 * 60 * 1000);
  }

  /**
   * Clean up old delivered notifications
   */
  private cleanupDeliveredNotifications(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const toDelete: string[] = [];

    for (const [id, delivery] of this.deliveryQueue.entries()) {
      if (delivery.status === 'delivered' && delivery.deliveredAt && delivery.deliveredAt < cutoffTime) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => {
      this.deliveryQueue.delete(id);
    });

    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} old delivered notifications`);
    }
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}