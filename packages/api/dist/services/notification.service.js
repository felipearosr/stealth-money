"use strict";
/**
 * Notification Service for sending email/SMS notifications and real-time browser notifications
 * Handles transfer event notifications and status updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = exports.NotificationChannel = exports.NotificationType = void 0;
/**
 * Notification types for different events
 */
var NotificationType;
(function (NotificationType) {
    NotificationType["TRANSFER_INITIATED"] = "transfer_initiated";
    NotificationType["PAYMENT_CONFIRMED"] = "payment_confirmed";
    NotificationType["TRANSFER_PROCESSING"] = "transfer_processing";
    NotificationType["PAYOUT_INITIATED"] = "payout_initiated";
    NotificationType["TRANSFER_COMPLETED"] = "transfer_completed";
    NotificationType["TRANSFER_FAILED"] = "transfer_failed";
    NotificationType["COMPLIANCE_HOLD"] = "compliance_hold";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/**
 * Notification channels
 */
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "email";
    NotificationChannel["SMS"] = "sms";
    NotificationChannel["BROWSER"] = "browser";
    NotificationChannel["WEBHOOK"] = "webhook";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
/**
 * Notification Service implementation
 */
class NotificationService {
    constructor(config) {
        this.connectedClients = new Map();
        this.config = {
            email: {
                provider: 'sendgrid',
                fromEmail: process.env.NOTIFICATION_FROM_EMAIL || 'noreply@stealthmoney.com',
                fromName: process.env.NOTIFICATION_FROM_NAME || 'Stealth Money',
                apiKey: process.env.SENDGRID_API_KEY
            },
            sms: {
                provider: 'twilio',
                apiKey: process.env.TWILIO_ACCOUNT_SID,
                apiSecret: process.env.TWILIO_AUTH_TOKEN,
                fromNumber: process.env.TWILIO_FROM_NUMBER || '+1234567890'
            },
            websocket: {
                enabled: true,
                port: parseInt(process.env.WEBSOCKET_PORT || '3001'),
                path: '/notifications'
            },
            templates: {
                baseUrl: process.env.BASE_URL || 'https://stealthmoney.com',
                supportEmail: process.env.SUPPORT_EMAIL || 'support@stealthmoney.com',
                supportPhone: process.env.SUPPORT_PHONE || '+1-800-STEALTH',
                companyName: 'Stealth Money',
                logoUrl: process.env.LOGO_URL || 'https://stealthmoney.com/logo.png'
            },
            ...config
        };
        this.initializeProviders();
    }
    /**
     * Initialize notification providers
     */
    initializeProviders() {
        // Initialize email provider
        if (this.config.email.provider === 'sendgrid' && this.config.email.apiKey) {
            // In a real implementation, this would initialize SendGrid
            this.emailProvider = {
                send: this.mockSendEmail.bind(this)
            };
        }
        // Initialize SMS provider
        if (this.config.sms.provider === 'twilio' && this.config.sms.apiKey) {
            // In a real implementation, this would initialize Twilio
            this.smsProvider = {
                send: this.mockSendSms.bind(this)
            };
        }
        // Initialize WebSocket server for real-time notifications
        if (this.config.websocket.enabled) {
            this.initializeWebSocket();
        }
    }
    /**
     * Initialize WebSocket server for real-time notifications
     */
    initializeWebSocket() {
        // In a real implementation, this would set up a WebSocket server
        // For now, we'll mock the WebSocket functionality
        this.websocketServer = {
            broadcast: this.mockBroadcastWebSocket.bind(this),
            sendToClient: this.mockSendToClient.bind(this)
        };
    }
    /**
     * Send notification through specified channels
     */
    async sendNotification(request) {
        const results = [];
        const template = this.getNotificationTemplate(request.type, request.context);
        for (const channel of request.channels) {
            try {
                let result;
                switch (channel) {
                    case NotificationChannel.EMAIL:
                        result = await this.sendEmailNotification(request, template);
                        break;
                    case NotificationChannel.SMS:
                        result = await this.sendSmsNotification(request, template);
                        break;
                    case NotificationChannel.BROWSER:
                        result = await this.sendBrowserNotification(request, template);
                        break;
                    case NotificationChannel.WEBHOOK:
                        result = await this.sendWebhookNotification(request);
                        break;
                    default:
                        throw new Error(`Unsupported notification channel: ${channel}`);
                }
                results.push(result);
            }
            catch (error) {
                console.error(`Failed to send ${channel} notification:`, error);
                results.push({
                    id: `${request.context.transferId}-${channel}-${Date.now()}`,
                    status: 'failed',
                    channel,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return results;
    }
    /**
     * Send email notification
     */
    async sendEmailNotification(request, template) {
        if (!request.recipient.email) {
            throw new Error('Email address is required for email notifications');
        }
        if (!this.emailProvider) {
            throw new Error('Email provider not configured');
        }
        const emailData = {
            to: request.recipient.email,
            from: {
                email: this.config.email.fromEmail,
                name: this.config.email.fromName
            },
            subject: template.subject,
            html: template.htmlBody,
            text: template.textBody,
            replyTo: this.config.email.replyTo
        };
        await this.emailProvider.send(emailData);
        return {
            id: `${request.context.transferId}-email-${Date.now()}`,
            status: 'sent',
            channel: NotificationChannel.EMAIL,
            sentAt: new Date()
        };
    }
    /**
     * Send SMS notification
     */
    async sendSmsNotification(request, template) {
        if (!request.recipient.phone) {
            throw new Error('Phone number is required for SMS notifications');
        }
        if (!this.smsProvider) {
            throw new Error('SMS provider not configured');
        }
        if (!template.smsBody) {
            throw new Error('SMS template not available for this notification type');
        }
        const smsData = {
            to: request.recipient.phone,
            from: this.config.sms.fromNumber,
            body: template.smsBody
        };
        await this.smsProvider.send(smsData);
        return {
            id: `${request.context.transferId}-sms-${Date.now()}`,
            status: 'sent',
            channel: NotificationChannel.SMS,
            sentAt: new Date()
        };
    }
    /**
     * Send browser notification via WebSocket
     */
    async sendBrowserNotification(request, template) {
        if (!this.websocketServer) {
            throw new Error('WebSocket server not configured');
        }
        const payload = {
            title: template.browserTitle || template.subject,
            body: template.browserBody || template.textBody,
            icon: template.browserIcon || this.config.templates.logoUrl,
            tag: `transfer-${request.context.transferId}`,
            data: {
                transferId: request.context.transferId,
                type: request.type,
                url: request.context.trackingUrl
            },
            actions: [
                {
                    action: 'view',
                    title: 'View Transfer',
                    icon: '/icons/view.png'
                }
            ]
        };
        // Send to specific client if recipient ID is available
        if (request.recipient.id) {
            await this.websocketServer.sendToClient(request.recipient.id, {
                type: 'notification',
                payload
            });
        }
        else {
            // Broadcast to all connected clients
            await this.websocketServer.broadcast({
                type: 'notification',
                payload
            });
        }
        return {
            id: `${request.context.transferId}-browser-${Date.now()}`,
            status: 'sent',
            channel: NotificationChannel.BROWSER,
            sentAt: new Date()
        };
    }
    /**
     * Send webhook notification
     */
    async sendWebhookNotification(request) {
        // In a real implementation, this would send HTTP POST to configured webhook URLs
        // For now, we'll just log the webhook data
        console.log('Webhook notification:', {
            type: request.type,
            transferId: request.context.transferId,
            timestamp: new Date().toISOString(),
            data: request.context
        });
        return {
            id: `${request.context.transferId}-webhook-${Date.now()}`,
            status: 'sent',
            channel: NotificationChannel.WEBHOOK,
            sentAt: new Date()
        };
    }
    /**
     * Get notification template for specific type and context
     */
    getNotificationTemplate(type, context) {
        const templates = {
            [NotificationType.TRANSFER_INITIATED]: {
                subject: `Transfer Initiated - $${context.sendAmount} ${context.sendCurrency}`,
                htmlBody: this.generateHtmlTemplate('transfer_initiated', context),
                textBody: `Your transfer of $${context.sendAmount} ${context.sendCurrency} has been initiated. Track your transfer: ${context.trackingUrl}`,
                smsBody: `Transfer initiated: $${context.sendAmount} ${context.sendCurrency}. Track: ${context.trackingUrl}`,
                browserTitle: 'Transfer Initiated',
                browserBody: `Your $${context.sendAmount} ${context.sendCurrency} transfer has been initiated`,
                browserIcon: '/icons/transfer-initiated.png'
            },
            [NotificationType.PAYMENT_CONFIRMED]: {
                subject: `Payment Confirmed - $${context.sendAmount} ${context.sendCurrency}`,
                htmlBody: this.generateHtmlTemplate('payment_confirmed', context),
                textBody: `Your payment of $${context.sendAmount} ${context.sendCurrency} has been confirmed and is being processed.`,
                smsBody: `Payment confirmed: $${context.sendAmount} ${context.sendCurrency}. Processing now.`,
                browserTitle: 'Payment Confirmed',
                browserBody: `Your $${context.sendAmount} ${context.sendCurrency} payment has been confirmed`,
                browserIcon: '/icons/payment-confirmed.png'
            },
            [NotificationType.TRANSFER_PROCESSING]: {
                subject: `Transfer Processing - $${context.sendAmount} ${context.sendCurrency}`,
                htmlBody: this.generateHtmlTemplate('transfer_processing', context),
                textBody: `Your transfer is being processed. The recipient will receive ${context.receiveAmount} ${context.receiveCurrency}.`,
                smsBody: `Transfer processing. Recipient will receive ${context.receiveAmount} ${context.receiveCurrency}.`,
                browserTitle: 'Transfer Processing',
                browserBody: `Your transfer is being processed`,
                browserIcon: '/icons/transfer-processing.png'
            },
            [NotificationType.PAYOUT_INITIATED]: {
                subject: `Payout Initiated - ${context.receiveAmount} ${context.receiveCurrency}`,
                htmlBody: this.generateHtmlTemplate('payout_initiated', context),
                textBody: `Payout of ${context.receiveAmount} ${context.receiveCurrency} has been initiated to the recipient's bank account.`,
                smsBody: `Payout initiated: ${context.receiveAmount} ${context.receiveCurrency} to bank account.`,
                browserTitle: 'Payout Initiated',
                browserBody: `Payout of ${context.receiveAmount} ${context.receiveCurrency} initiated`,
                browserIcon: '/icons/payout-initiated.png'
            },
            [NotificationType.TRANSFER_COMPLETED]: {
                subject: `Transfer Completed - ${context.receiveAmount} ${context.receiveCurrency} Delivered`,
                htmlBody: this.generateHtmlTemplate('transfer_completed', context),
                textBody: `Great news! Your transfer is complete. ${context.recipientName || 'The recipient'} has received ${context.receiveAmount} ${context.receiveCurrency}.`,
                smsBody: `Transfer complete! ${context.receiveAmount} ${context.receiveCurrency} delivered to ${context.recipientName || 'recipient'}.`,
                browserTitle: 'Transfer Completed',
                browserBody: `${context.receiveAmount} ${context.receiveCurrency} delivered successfully`,
                browserIcon: '/icons/transfer-completed.png'
            },
            [NotificationType.TRANSFER_FAILED]: {
                subject: `Transfer Failed - $${context.sendAmount} ${context.sendCurrency}`,
                htmlBody: this.generateHtmlTemplate('transfer_failed', context),
                textBody: `Your transfer of $${context.sendAmount} ${context.sendCurrency} has failed. ${context.errorMessage || 'Please contact support for assistance.'}`,
                smsBody: `Transfer failed: $${context.sendAmount} ${context.sendCurrency}. Contact support: ${this.config.templates.supportPhone}`,
                browserTitle: 'Transfer Failed',
                browserBody: `Your $${context.sendAmount} ${context.sendCurrency} transfer has failed`,
                browserIcon: '/icons/transfer-failed.png'
            },
            [NotificationType.COMPLIANCE_HOLD]: {
                subject: `Transfer Under Review - $${context.sendAmount} ${context.sendCurrency}`,
                htmlBody: this.generateHtmlTemplate('compliance_hold', context),
                textBody: `Your transfer of $${context.sendAmount} ${context.sendCurrency} is under compliance review. You will be notified once the review is complete.`,
                smsBody: `Transfer under review: $${context.sendAmount} ${context.sendCurrency}. You'll be notified when complete.`,
                browserTitle: 'Transfer Under Review',
                browserBody: `Your transfer is under compliance review`,
                browserIcon: '/icons/compliance-hold.png'
            }
        };
        return templates[type];
    }
    /**
     * Generate HTML email template
     */
    generateHtmlTemplate(templateType, context) {
        const baseTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{subject}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { max-width: 200px; height: auto; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 8px; }
          .transfer-details { background: white; padding: 20px; border-radius: 4px; margin: 20px 0; }
          .amount { font-size: 24px; font-weight: bold; color: #2563eb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${this.config.templates.logoUrl}" alt="${this.config.templates.companyName}" class="logo">
          </div>
          <div class="content">
            {{content}}
          </div>
          <div class="footer">
            <p>Need help? Contact us at ${this.config.templates.supportEmail} or ${this.config.templates.supportPhone}</p>
            <p>&copy; ${new Date().getFullYear()} ${this.config.templates.companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const contentTemplates = {
            transfer_initiated: `
        <h2>Transfer Initiated</h2>
        <p>Your international transfer has been successfully initiated.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Send Amount:</strong> <span class="amount">$${context.sendAmount} ${context.sendCurrency}</span></p>
          <p><strong>Recipient Amount:</strong> <span class="amount">${context.receiveAmount} ${context.receiveCurrency}</span></p>
          ${context.recipientName ? `<p><strong>Recipient:</strong> ${context.recipientName}</p>` : ''}
          ${context.estimatedCompletion ? `<p><strong>Estimated Completion:</strong> ${context.estimatedCompletion.toLocaleDateString()}</p>` : ''}
        </div>
        <p>We'll keep you updated on the progress of your transfer.</p>
        ${context.trackingUrl ? `<a href="${context.trackingUrl}" class="button">Track Your Transfer</a>` : ''}
      `,
            payment_confirmed: `
        <h2>Payment Confirmed</h2>
        <p>Great! Your payment has been confirmed and your transfer is now being processed.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Amount Paid:</strong> <span class="amount">$${context.sendAmount} ${context.sendCurrency}</span></p>
        </div>
        <p>Your funds are now being converted and prepared for transfer to the recipient.</p>
      `,
            transfer_processing: `
        <h2>Transfer Processing</h2>
        <p>Your transfer is currently being processed and will be delivered soon.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Recipient Amount:</strong> <span class="amount">${context.receiveAmount} ${context.receiveCurrency}</span></p>
        </div>
        <p>The recipient will receive the funds directly in their bank account.</p>
      `,
            payout_initiated: `
        <h2>Payout Initiated</h2>
        <p>The payout to the recipient's bank account has been initiated.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Payout Amount:</strong> <span class="amount">${context.receiveAmount} ${context.receiveCurrency}</span></p>
        </div>
        <p>The funds are being transferred to the recipient's bank account and should arrive within 1-2 business days.</p>
      `,
            transfer_completed: `
        <h2>Transfer Completed! 🎉</h2>
        <p>Excellent news! Your international transfer has been completed successfully.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Amount Delivered:</strong> <span class="amount">${context.receiveAmount} ${context.receiveCurrency}</span></p>
          ${context.recipientName ? `<p><strong>Recipient:</strong> ${context.recipientName}</p>` : ''}
          ${context.actualCompletion ? `<p><strong>Completed:</strong> ${context.actualCompletion.toLocaleDateString()}</p>` : ''}
        </div>
        <p>The recipient has successfully received the funds in their bank account.</p>
      `,
            transfer_failed: `
        <h2>Transfer Failed</h2>
        <p>Unfortunately, your transfer could not be completed.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Amount:</strong> <span class="amount">$${context.sendAmount} ${context.sendCurrency}</span></p>
          ${context.errorMessage ? `<p><strong>Reason:</strong> ${context.errorMessage}</p>` : ''}
        </div>
        <p>Your payment will be refunded to your original payment method within 3-5 business days.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
      `,
            compliance_hold: `
        <h2>Transfer Under Review</h2>
        <p>Your transfer is currently under compliance review as part of our security procedures.</p>
        <div class="transfer-details">
          <p><strong>Transfer ID:</strong> ${context.transferId}</p>
          <p><strong>Amount:</strong> <span class="amount">$${context.sendAmount} ${context.sendCurrency}</span></p>
        </div>
        <p>This is a routine security check and typically takes 1-2 business days to complete.</p>
        <p>We'll notify you as soon as the review is finished and your transfer can proceed.</p>
      `
        };
        const content = contentTemplates[templateType] || '<p>Transfer update notification</p>';
        return baseTemplate.replace('{{content}}', content);
    }
    /**
     * Register WebSocket client for real-time notifications
     */
    registerClient(clientId, websocket) {
        this.connectedClients.set(clientId, websocket);
        console.log(`Client ${clientId} connected for notifications`);
    }
    /**
     * Unregister WebSocket client
     */
    unregisterClient(clientId) {
        this.connectedClients.delete(clientId);
        console.log(`Client ${clientId} disconnected from notifications`);
    }
    /**
     * Send notification for transfer events
     */
    async notifyTransferEvent(type, context, recipients, channels = [NotificationChannel.EMAIL, NotificationChannel.BROWSER]) {
        const allResults = [];
        for (const recipient of recipients) {
            const request = {
                type,
                channels,
                recipient,
                context,
                priority: type === NotificationType.TRANSFER_FAILED ? 'high' : 'normal'
            };
            const results = await this.sendNotification(request);
            allResults.push(...results);
        }
        return allResults;
    }
    /**
     * Mock email sending for testing
     */
    async mockSendEmail(emailData) {
        console.log('Mock email sent:', {
            to: emailData.to,
            subject: emailData.subject,
            timestamp: new Date().toISOString()
        });
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    /**
     * Mock SMS sending for testing
     */
    async mockSendSms(smsData) {
        console.log('Mock SMS sent:', {
            to: smsData.to,
            body: smsData.body.substring(0, 50) + '...',
            timestamp: new Date().toISOString()
        });
        // Simulate SMS sending delay
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    /**
     * Mock WebSocket broadcast for testing
     */
    async mockBroadcastWebSocket(message) {
        console.log('Mock WebSocket broadcast:', {
            type: message.type,
            clientCount: this.connectedClients.size,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Mock WebSocket send to specific client for testing
     */
    async mockSendToClient(clientId, message) {
        console.log('Mock WebSocket send to client:', {
            clientId,
            type: message.type,
            timestamp: new Date().toISOString()
        });
    }
}
exports.NotificationService = NotificationService;
