import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

export interface AuditEvent {
  id?: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTHENTICATION' | 'PAYMENT' | 'COMPLIANCE' | 'SECURITY' | 'SYSTEM' | 'USER_ACTION';
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AuditQuery {
  userId?: string;
  action?: string;
  resource?: string;
  category?: string;
  severity?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  successRate: number;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topActions: Array<{ action: string; eventCount: number }>;
  recentCriticalEvents: AuditEvent[];
}

export class AuditService {
  private prisma: PrismaClient;
  private auditBuffer: AuditEvent[];
  private bufferSize: number;
  private flushInterval: NodeJS.Timeout;

  constructor(bufferSize: number = 100) {
    this.prisma = new PrismaClient();
    this.auditBuffer = [];
    this.bufferSize = bufferSize;
    
    // Flush audit buffer every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 30 * 1000);
  }

  /**
   * Log payment request creation
   */
  async logPaymentRequestCreation(
    userId: string,
    paymentRequestId: string,
    amount: number,
    currency: string,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'CREATE_PAYMENT_REQUEST',
      resource: 'PaymentRequest',
      resourceId: paymentRequestId,
      details: {
        amount,
        currency,
        paymentRequestId,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: 'MEDIUM',
      category: 'PAYMENT',
      success: true,
    });
  }

  /**
   * Log payment request fulfillment
   */
  async logPaymentRequestFulfillment(
    senderId: string,
    recipientId: string,
    paymentRequestId: string,
    paymentId: string,
    amount: number,
    currency: string,
    processorId: string,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      userId: senderId,
      action: 'FULFILL_PAYMENT_REQUEST',
      resource: 'PaymentRequest',
      resourceId: paymentRequestId,
      details: {
        senderId,
        recipientId,
        paymentRequestId,
        paymentId,
        amount,
        currency,
        processorId,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: 'HIGH',
      category: 'PAYMENT',
      success: true,
    });
  }

  /**
   * Log user authentication events
   */
  async logAuthentication(
    userId: string,
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET',
    success: boolean,
    req?: Request,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: 'User',
      resourceId: userId,
      details: {
        authAction: action,
        success,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: success ? 'LOW' : 'MEDIUM',
      category: 'AUTHENTICATION',
      success,
      errorMessage,
    });
  }

  /**
   * Log compliance check events
   */
  async logComplianceCheck(
    userId: string,
    checkType: 'KYC' | 'AML' | 'SANCTIONS' | 'COUNTRY_RESTRICTION',
    result: 'PASSED' | 'FAILED' | 'REQUIRES_REVIEW',
    details: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: `COMPLIANCE_CHECK_${checkType}`,
      resource: 'ComplianceCheck',
      resourceId: `${userId}_${checkType}_${Date.now()}`,
      details: {
        checkType,
        result,
        ...details,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: result === 'FAILED' ? 'HIGH' : 'MEDIUM',
      category: 'COMPLIANCE',
      success: result !== 'FAILED',
    });
  }

  /**
   * Log fraud detection events
   */
  async logFraudDetection(
    userId: string,
    riskScore: number,
    riskLevel: string,
    fraudulent: boolean,
    flags: string[],
    transactionId?: string,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'FRAUD_DETECTION_CHECK',
      resource: 'FraudCheck',
      resourceId: transactionId || `${userId}_fraud_${Date.now()}`,
      details: {
        riskScore,
        riskLevel,
        fraudulent,
        flags,
        transactionId,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: fraudulent ? 'CRITICAL' : (riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'),
      category: 'SECURITY',
      success: !fraudulent,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    action: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>,
    userId?: string,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: 'Security',
      details,
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity,
      category: 'SECURITY',
      success: true,
    });
  }

  /**
   * Log rate limiting violations
   */
  async logRateLimitViolation(
    limitType: string,
    key: string,
    count: number,
    limit: number,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      action: 'RATE_LIMIT_VIOLATION',
      resource: 'RateLimit',
      resourceId: key,
      details: {
        limitType,
        key,
        count,
        limit,
        path: req?.path,
        method: req?.method,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: 'MEDIUM',
      category: 'SECURITY',
      success: false,
    });
  }

  /**
   * Log user account changes
   */
  async logUserAccountChange(
    userId: string,
    action: 'ACCOUNT_CREATED' | 'ACCOUNT_UPDATED' | 'ACCOUNT_DELETED' | 'KYC_STATUS_CHANGED',
    changes: Record<string, any>,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resource: 'User',
      resourceId: userId,
      details: {
        changes,
      },
      ipAddress: req ? this.getClientIP(req) : undefined,
      userAgent: req?.headers['user-agent'],
      timestamp: new Date(),
      severity: 'MEDIUM',
      category: 'USER_ACTION',
      success: true,
    });
  }

  /**
   * Log payment status changes
   */
  async logPaymentStatusChange(
    paymentId: string,
    oldStatus: string,
    newStatus: string,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action: 'PAYMENT_STATUS_CHANGE',
      resource: 'Payment',
      resourceId: paymentId,
      details: {
        paymentId,
        oldStatus,
        newStatus,
        ...details,
      },
      timestamp: new Date(),
      severity: newStatus === 'FAILED' ? 'HIGH' : 'MEDIUM',
      category: 'PAYMENT',
      success: newStatus !== 'FAILED',
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logEvent({
      action,
      resource: 'System',
      details,
      timestamp: new Date(),
      severity,
      category: 'SYSTEM',
      success,
      errorMessage,
    });
  }

  /**
   * Core method to log an audit event
   */
  private async logEvent(event: AuditEvent): Promise<void> {
    try {
      // Add to buffer for batch processing
      this.auditBuffer.push(event);

      // If buffer is full or event is critical, flush immediately
      if (this.auditBuffer.length >= this.bufferSize || event.severity === 'CRITICAL') {
        await this.flushBuffer();
      }

      // Log critical events immediately to console
      if (event.severity === 'CRITICAL') {
        console.log('🚨 CRITICAL AUDIT EVENT:', {
          action: event.action,
          userId: event.userId,
          resource: event.resource,
          details: event.details,
          timestamp: event.timestamp.toISOString(),
        });
      }
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error as audit logging shouldn't break application flow
    }
  }

  /**
   * Flush audit buffer to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return;

    try {
      const eventsToFlush = [...this.auditBuffer];
      this.auditBuffer = [];

      // In production, this would insert into a dedicated audit_events table
      console.log(`📝 Flushing ${eventsToFlush.length} audit events to database`);
      
      // For now, just log to console (in production, use proper database storage)
      eventsToFlush.forEach(event => {
        console.log('AUDIT:', {
          timestamp: event.timestamp.toISOString(),
          userId: event.userId,
          action: event.action,
          resource: event.resource,
          severity: event.severity,
          category: event.category,
          success: event.success,
          details: event.details,
        });
      });

      // In production, uncomment and implement proper database storage:
      // await this.prisma.auditEvent.createMany({
      //   data: eventsToFlush.map(event => ({
      //     userId: event.userId,
      //     action: event.action,
      //     resource: event.resource,
      //     resourceId: event.resourceId,
      //     details: event.details,
      //     ipAddress: event.ipAddress,
      //     userAgent: event.userAgent,
      //     timestamp: event.timestamp,
      //     severity: event.severity,
      //     category: event.category,
      //     success: event.success,
      //     errorMessage: event.errorMessage,
      //     metadata: event.metadata,
      //   })),
      // });

    } catch (error) {
      console.error('Error flushing audit buffer:', error);
      // Re-add events to buffer if flush failed
      this.auditBuffer.unshift(...this.auditBuffer);
    }
  }

  /**
   * Query audit events
   */
  async queryAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
    try {
      // In production, this would query the audit_events table
      console.log('🔍 Querying audit events:', query);
      
      // For now, return empty array (implement with proper database)
      return [];

      // In production, implement proper querying:
      // const where: any = {};
      // 
      // if (query.userId) where.userId = query.userId;
      // if (query.action) where.action = query.action;
      // if (query.resource) where.resource = query.resource;
      // if (query.category) where.category = query.category;
      // if (query.severity) where.severity = query.severity;
      // if (query.success !== undefined) where.success = query.success;
      // if (query.startDate || query.endDate) {
      //   where.timestamp = {};
      //   if (query.startDate) where.timestamp.gte = query.startDate;
      //   if (query.endDate) where.timestamp.lte = query.endDate;
      // }
      // 
      // return await this.prisma.auditEvent.findMany({
      //   where,
      //   orderBy: { timestamp: 'desc' },
      //   take: query.limit || 100,
      //   skip: query.offset || 0,
      // });

    } catch (error) {
      console.error('Error querying audit events:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate?: Date, endDate?: Date): Promise<AuditStats> {
    try {
      // In production, this would query the audit_events table for statistics
      console.log('📊 Getting audit statistics');
      
      // For now, return mock data (implement with proper database)
      return {
        totalEvents: 0,
        eventsByCategory: {
          AUTHENTICATION: 0,
          PAYMENT: 0,
          COMPLIANCE: 0,
          SECURITY: 0,
          SYSTEM: 0,
          USER_ACTION: 0,
        },
        eventsBySeverity: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0,
        },
        successRate: 0,
        topUsers: [],
        topActions: [],
        recentCriticalEvents: [],
      };

    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent critical events
   */
  async getRecentCriticalEvents(limit: number = 10): Promise<AuditEvent[]> {
    try {
      return await this.queryAuditEvents({
        severity: 'CRITICAL',
        limit,
      });
    } catch (error) {
      console.error('Error getting recent critical events:', error);
      return [];
    }
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    recentEvents: AuditEvent[];
    riskScore: number;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const events = await this.queryAuditEvents({
        userId,
        startDate,
      });

      const eventsByCategory: Record<string, number> = {};
      let riskScore = 0;

      events.forEach(event => {
        eventsByCategory[event.category] = (eventsByCategory[event.category] || 0) + 1;
        
        // Calculate risk score based on event severity and success
        if (!event.success) {
          switch (event.severity) {
            case 'CRITICAL': riskScore += 10; break;
            case 'HIGH': riskScore += 5; break;
            case 'MEDIUM': riskScore += 2; break;
            case 'LOW': riskScore += 1; break;
          }
        }
      });

      return {
        totalEvents: events.length,
        eventsByCategory,
        recentEvents: events.slice(0, 10),
        riskScore: Math.min(riskScore, 100), // Cap at 100
      };
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      throw error;
    }
  }

  /**
   * Export audit events for compliance reporting
   */
  async exportAuditEvents(
    query: AuditQuery,
    format: 'JSON' | 'CSV' = 'JSON'
  ): Promise<string> {
    try {
      const events = await this.queryAuditEvents(query);
      
      if (format === 'CSV') {
        return this.convertToCSV(events);
      } else {
        return JSON.stringify(events, null, 2);
      }
    } catch (error) {
      console.error('Error exporting audit events:', error);
      throw error;
    }
  }

  /**
   * Convert audit events to CSV format
   */
  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'timestamp',
      'userId',
      'action',
      'resource',
      'resourceId',
      'severity',
      'category',
      'success',
      'ipAddress',
      'userAgent',
      'details',
    ];

    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        event.timestamp.toISOString(),
        event.userId || '',
        event.action,
        event.resource,
        event.resourceId || '',
        event.severity,
        event.category,
        event.success.toString(),
        event.ipAddress || '',
        event.userAgent || '',
        JSON.stringify(event.details).replace(/"/g, '""'), // Escape quotes
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    ).split(',')[0].trim();
  }

  /**
   * Create audit middleware for Express routes
   */
  createAuditMiddleware(action: string, resource: string) {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      // Capture original res.json to log response
      const originalJson = res.json;
      let responseData: any;
      
      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };

      // Continue with request
      next();

      // Log after response is sent
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        await this.logEvent({
          userId: req.user?.id || req.body?.userId,
          action,
          resource,
          resourceId: req.params?.id,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            requestBody: req.body,
            responseData: success ? undefined : responseData, // Only log response on errors
          },
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          timestamp: new Date(),
          severity: success ? 'LOW' : 'MEDIUM',
          category: 'USER_ACTION',
          success,
        });
      });
    };
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    // Flush any remaining events
    await this.flushBuffer();
    
    // Clear interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this.prisma.$disconnect();
    console.log('🔌 Audit service disconnected');
  }
}