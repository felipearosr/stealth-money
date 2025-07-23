"use strict";
/**
 * Circle Webhook Service for handling Circle API webhook events
 * Maps Circle events to internal transfer statuses and triggers notifications
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircleWebhookService = exports.TransferStatus = exports.CircleEventType = void 0;
const database_simple_service_1 = require("./database-simple.service");
const notification_service_1 = require("./notification.service");
const logging_middleware_1 = require("../middleware/logging.middleware");
/**
 * Circle event types
 */
var CircleEventType;
(function (CircleEventType) {
    CircleEventType["PAYMENT_CONFIRMED"] = "payments.confirmed";
    CircleEventType["PAYMENT_FAILED"] = "payments.failed";
    CircleEventType["TRANSFER_COMPLETE"] = "transfers.complete";
    CircleEventType["TRANSFER_FAILED"] = "transfers.failed";
    CircleEventType["PAYOUT_COMPLETE"] = "payouts.complete";
    CircleEventType["PAYOUT_FAILED"] = "payouts.failed";
})(CircleEventType || (exports.CircleEventType = CircleEventType = {}));
/**
 * Internal transfer status mapping
 */
var TransferStatus;
(function (TransferStatus) {
    TransferStatus["PENDING"] = "PENDING";
    TransferStatus["PAYMENT_PROCESSING"] = "PAYMENT_PROCESSING";
    TransferStatus["PAYMENT_CONFIRMED"] = "PAYMENT_CONFIRMED";
    TransferStatus["TRANSFERRING"] = "TRANSFERRING";
    TransferStatus["PAYING_OUT"] = "PAYING_OUT";
    TransferStatus["COMPLETED"] = "COMPLETED";
    TransferStatus["FAILED"] = "FAILED";
})(TransferStatus || (exports.TransferStatus = TransferStatus = {}));
/**
 * Circle Webhook Service implementation
 */
class CircleWebhookService {
    constructor() {
        this.dbService = new database_simple_service_1.SimpleDatabaseService();
        this.notificationService = new notification_service_1.NotificationService();
    }
    /**
     * Process Circle webhook event and update transfer status
     */
    async processWebhookEvent(event) {
        try {
            const eventType = event.Type;
            const eventData = event.Data;
            (0, logging_middleware_1.logTransactionEvent)(eventData.id, 'circle_webhook_processing', {
                eventType,
                eventId: event.Id,
                status: eventData.status
            });
            switch (eventType) {
                case 'payments':
                    return await this.handlePaymentEvent(event);
                case 'transfers':
                    return await this.handleTransferEvent(event);
                case 'payouts':
                    return await this.handlePayoutEvent(event);
                default:
                    return {
                        success: false,
                        error: `Unhandled event type: ${eventType}`
                    };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            (0, logging_middleware_1.logTransactionEvent)(event.Data?.id || 'unknown', 'circle_webhook_error', {
                eventType: event.Type,
                eventId: event.Id,
                error: errorMessage
            });
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    /**
     * Handle Circle payment webhook events
     */
    async handlePaymentEvent(event) {
        const payment = event.Data;
        const paymentId = payment.id;
        const paymentStatus = payment.status;
        // Find transaction by Circle payment ID
        const transaction = await this.dbService.getTransactionByCirclePaymentId(paymentId);
        if (!transaction) {
            return {
                success: false,
                error: `Transaction not found for Circle payment ID: ${paymentId}`
            };
        }
        const oldStatus = transaction.status;
        let newStatus;
        let notificationType;
        // Map Circle payment status to internal status
        switch (paymentStatus.toLowerCase()) {
            case 'confirmed':
                newStatus = TransferStatus.PAYMENT_CONFIRMED;
                notificationType = notification_service_1.NotificationType.PAYMENT_CONFIRMED;
                break;
            case 'failed':
            case 'canceled':
                newStatus = TransferStatus.FAILED;
                notificationType = notification_service_1.NotificationType.TRANSFER_FAILED;
                break;
            default:
                newStatus = TransferStatus.PAYMENT_PROCESSING;
                notificationType = notification_service_1.NotificationType.TRANSFER_PROCESSING;
        }
        // Update transaction status in database
        const updatedTransaction = await this.dbService.updateTransactionStatus(transaction.id, newStatus, { circlePaymentId: paymentId });
        // Send notifications
        const notificationsSent = await this.sendStatusNotifications(updatedTransaction, notificationType);
        (0, logging_middleware_1.logTransactionEvent)(transaction.id, 'payment_status_updated', {
            paymentId,
            oldStatus,
            newStatus,
            notificationsSent
        });
        return {
            success: true,
            transactionId: transaction.id,
            oldStatus,
            newStatus,
            notificationsSent
        };
    }
    /**
     * Handle Circle transfer webhook events
     */
    async handleTransferEvent(event) {
        const transfer = event.Data;
        const transferId = transfer.id;
        const transferStatus = transfer.status;
        // Find transaction by Circle transfer ID
        const transaction = await this.dbService.getTransactionByCircleTransferId(transferId);
        if (!transaction) {
            return {
                success: false,
                error: `Transaction not found for Circle transfer ID: ${transferId}`
            };
        }
        const oldStatus = transaction.status;
        let newStatus;
        let notificationType;
        // Map Circle transfer status to internal status
        switch (transferStatus.toLowerCase()) {
            case 'complete':
                newStatus = TransferStatus.TRANSFERRING;
                notificationType = notification_service_1.NotificationType.TRANSFER_PROCESSING;
                break;
            case 'failed':
                newStatus = TransferStatus.FAILED;
                notificationType = notification_service_1.NotificationType.TRANSFER_FAILED;
                break;
            default:
                newStatus = TransferStatus.TRANSFERRING;
                notificationType = notification_service_1.NotificationType.TRANSFER_PROCESSING;
        }
        // Update transaction status in database
        const updatedTransaction = await this.dbService.updateTransactionStatus(transaction.id, newStatus, { circleTransferId: transferId });
        // Send notifications
        const notificationsSent = await this.sendStatusNotifications(updatedTransaction, notificationType);
        (0, logging_middleware_1.logTransactionEvent)(transaction.id, 'transfer_status_updated', {
            transferId,
            oldStatus,
            newStatus,
            notificationsSent
        });
        return {
            success: true,
            transactionId: transaction.id,
            oldStatus,
            newStatus,
            notificationsSent
        };
    }
    /**
     * Handle Circle payout webhook events
     */
    async handlePayoutEvent(event) {
        const payout = event.Data;
        const payoutId = payout.id;
        const payoutStatus = payout.status;
        // Find transaction by Circle payout ID
        const transaction = await this.dbService.getTransactionByCirclePayoutId(payoutId);
        if (!transaction) {
            return {
                success: false,
                error: `Transaction not found for Circle payout ID: ${payoutId}`
            };
        }
        const oldStatus = transaction.status;
        let newStatus;
        let notificationType;
        // Map Circle payout status to internal status
        switch (payoutStatus.toLowerCase()) {
            case 'complete':
                newStatus = TransferStatus.COMPLETED;
                notificationType = notification_service_1.NotificationType.TRANSFER_COMPLETED;
                break;
            case 'failed':
                newStatus = TransferStatus.FAILED;
                notificationType = notification_service_1.NotificationType.TRANSFER_FAILED;
                break;
            case 'pending':
                newStatus = TransferStatus.PAYING_OUT;
                notificationType = notification_service_1.NotificationType.PAYOUT_INITIATED;
                break;
            default:
                newStatus = TransferStatus.PAYING_OUT;
                notificationType = notification_service_1.NotificationType.PAYOUT_INITIATED;
        }
        // Update transaction status in database
        const updatedTransaction = await this.dbService.updateTransactionStatus(transaction.id, newStatus, { circlePayoutId: payoutId });
        // Send notifications
        const notificationsSent = await this.sendStatusNotifications(updatedTransaction, notificationType);
        (0, logging_middleware_1.logTransactionEvent)(transaction.id, 'payout_status_updated', {
            payoutId,
            oldStatus,
            newStatus,
            notificationsSent
        });
        return {
            success: true,
            transactionId: transaction.id,
            oldStatus,
            newStatus,
            notificationsSent
        };
    }
    /**
     * Send status update notifications to sender and recipient
     */
    async sendStatusNotifications(transaction, notificationType) {
        try {
            const recipients = [];
            // Add sender to recipients if user ID exists
            if (transaction.userId) {
                recipients.push({
                    id: transaction.userId,
                    email: transaction.senderEmail, // Would need to be added to transaction
                    name: transaction.senderName // Would need to be added to transaction
                });
            }
            // Add recipient to recipients
            if (transaction.recipientEmail) {
                recipients.push({
                    id: transaction.recipientUserId || `recipient-${transaction.id}`,
                    email: transaction.recipientEmail,
                    name: transaction.recipientName
                });
            }
            if (recipients.length === 0) {
                return 0;
            }
            // Create transfer context for notifications
            const transferContext = {
                transferId: transaction.id,
                sendAmount: transaction.amount,
                sendCurrency: transaction.sourceCurrency,
                receiveAmount: transaction.recipientAmount,
                receiveCurrency: transaction.destCurrency,
                senderName: transaction.senderName,
                recipientName: transaction.recipientName,
                trackingUrl: `${process.env.BASE_URL || 'https://stealthmoney.com'}/status/${transaction.id}`,
                actualCompletion: notificationType === notification_service_1.NotificationType.TRANSFER_COMPLETED ? new Date() : undefined
            };
            // Send notifications
            const results = await this.notificationService.notifyTransferEvent(notificationType, transferContext, recipients, [notification_service_1.NotificationChannel.EMAIL, notification_service_1.NotificationChannel.BROWSER]);
            // Count successful notifications
            return results.filter(result => result.status === 'sent').length;
        }
        catch (error) {
            console.error('Failed to send status notifications:', error);
            return 0;
        }
    }
    /**
     * Map Circle status to internal transfer status
     */
    mapCircleStatusToInternal(circleStatus, eventType) {
        const status = circleStatus.toLowerCase();
        switch (eventType) {
            case 'payments':
                switch (status) {
                    case 'confirmed': return TransferStatus.PAYMENT_CONFIRMED;
                    case 'failed':
                    case 'canceled': return TransferStatus.FAILED;
                    default: return TransferStatus.PAYMENT_PROCESSING;
                }
            case 'transfers':
                switch (status) {
                    case 'complete': return TransferStatus.TRANSFERRING;
                    case 'failed': return TransferStatus.FAILED;
                    default: return TransferStatus.TRANSFERRING;
                }
            case 'payouts':
                switch (status) {
                    case 'complete': return TransferStatus.COMPLETED;
                    case 'failed': return TransferStatus.FAILED;
                    case 'pending': return TransferStatus.PAYING_OUT;
                    default: return TransferStatus.PAYING_OUT;
                }
            default:
                return TransferStatus.PENDING;
        }
    }
    /**
     * Get notification type for status change
     */
    getNotificationTypeForStatus(status) {
        switch (status) {
            case TransferStatus.PAYMENT_CONFIRMED:
                return notification_service_1.NotificationType.PAYMENT_CONFIRMED;
            case TransferStatus.TRANSFERRING:
                return notification_service_1.NotificationType.TRANSFER_PROCESSING;
            case TransferStatus.PAYING_OUT:
                return notification_service_1.NotificationType.PAYOUT_INITIATED;
            case TransferStatus.COMPLETED:
                return notification_service_1.NotificationType.TRANSFER_COMPLETED;
            case TransferStatus.FAILED:
                return notification_service_1.NotificationType.TRANSFER_FAILED;
            default:
                return notification_service_1.NotificationType.TRANSFER_PROCESSING;
        }
    }
}
exports.CircleWebhookService = CircleWebhookService;
