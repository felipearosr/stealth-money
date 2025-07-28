import { PrismaClient } from '@prisma/client';

export interface FraudCheckRequest {
  userId: string;
  transactionType: 'payment_request' | 'direct_transfer' | 'settlement';
  amount: number;
  currency: string;
  recipientId?: string;
  recipientEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  metadata?: Record<string, any>;
}

export interface FraudCheckResult {
  riskScore: number; // 0-100, higher is riskier
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  fraudulent: boolean;
  flags: string[];
  reasons: string[];
  recommendations: string[];
  requiresManualReview: boolean;
  blockedUntil?: Date;
}

export interface TransactionPattern {
  userId: string;
  averageAmount: number;
  transactionFrequency: number;
  commonRecipients: string[];
  commonCurrencies: string[];
  typicalHours: number[];
  typicalDays: number[];
  deviceFingerprints: string[];
  ipAddresses: string[];
}

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  riskScore: number;
  condition: (request: FraudCheckRequest, pattern: TransactionPattern) => boolean;
}

export class FraudDetectionService {
  private prisma: PrismaClient;
  private fraudRules: FraudRule[];
  private blockedUsers: Map<string, Date>;
  private suspiciousIPs: Set<string>;
  private knownFraudPatterns: Set<string>;

  constructor() {
    this.prisma = new PrismaClient();
    this.blockedUsers = new Map();
    this.suspiciousIPs = new Set();
    this.knownFraudPatterns = new Set();
    this.initializeFraudRules();
    this.loadFraudData();
  }

  /**
   * Initialize fraud detection rules
   */
  private initializeFraudRules(): void {
    this.fraudRules = [
      {
        id: 'unusual_amount',
        name: 'Unusual Transaction Amount',
        description: 'Transaction amount significantly higher than user\'s typical pattern',
        enabled: true,
        riskScore: 25,
        condition: (request, pattern) => {
          const usdAmount = this.convertToUSD(request.amount, request.currency);
          return usdAmount > pattern.averageAmount * 5; // 5x higher than average
        },
      },
      {
        id: 'high_frequency',
        name: 'High Transaction Frequency',
        description: 'User making transactions at unusually high frequency',
        enabled: true,
        riskScore: 20,
        condition: (request, pattern) => {
          return pattern.transactionFrequency > 20; // More than 20 transactions in recent period
        },
      },
      {
        id: 'new_recipient_large_amount',
        name: 'Large Amount to New Recipient',
        description: 'Large transaction to a recipient user has never sent money to before',
        enabled: true,
        riskScore: 30,
        condition: (request, pattern) => {
          const usdAmount = this.convertToUSD(request.amount, request.currency);
          const isNewRecipient = request.recipientId && 
            !pattern.commonRecipients.includes(request.recipientId);
          return isNewRecipient && usdAmount > 1000;
        },
      },
      {
        id: 'unusual_time',
        name: 'Unusual Transaction Time',
        description: 'Transaction made at unusual hours for this user',
        enabled: true,
        riskScore: 10,
        condition: (request, pattern) => {
          const currentHour = new Date().getHours();
          return !pattern.typicalHours.includes(currentHour);
        },
      },
      {
        id: 'suspicious_ip',
        name: 'Suspicious IP Address',
        description: 'Transaction from known suspicious IP address',
        enabled: true,
        riskScore: 40,
        condition: (request, pattern) => {
          return request.ipAddress ? this.suspiciousIPs.has(request.ipAddress) : false;
        },
      },
      {
        id: 'device_mismatch',
        name: 'Unknown Device',
        description: 'Transaction from device not previously used by user',
        enabled: true,
        riskScore: 15,
        condition: (request, pattern) => {
          return request.deviceFingerprint && 
            !pattern.deviceFingerprints.includes(request.deviceFingerprint);
        },
      },
      {
        id: 'rapid_succession',
        name: 'Rapid Successive Transactions',
        description: 'Multiple transactions in very short time period',
        enabled: true,
        riskScore: 35,
        condition: async (request, pattern) => {
          // Check for transactions in last 5 minutes
          const recentTransactions = await this.getRecentTransactions(request.userId, 5);
          return recentTransactions.length >= 3;
        },
      },
      {
        id: 'round_number_pattern',
        name: 'Round Number Pattern',
        description: 'Suspicious pattern of round number transactions',
        enabled: true,
        riskScore: 15,
        condition: (request, pattern) => {
          // Check if amount is a round number (potential money laundering pattern)
          return request.amount % 100 === 0 && request.amount >= 1000;
        },
      },
      {
        id: 'currency_switching',
        name: 'Unusual Currency Switching',
        description: 'User suddenly using currencies they don\'t typically use',
        enabled: true,
        riskScore: 20,
        condition: (request, pattern) => {
          return !pattern.commonCurrencies.includes(request.currency) && 
            pattern.commonCurrencies.length > 0;
        },
      },
      {
        id: 'velocity_check',
        name: 'Transaction Velocity Check',
        description: 'Total transaction volume in short period exceeds normal patterns',
        enabled: true,
        riskScore: 30,
        condition: async (request, pattern) => {
          const dailyVolume = await this.getDailyTransactionVolume(request.userId);
          const usdAmount = this.convertToUSD(request.amount, request.currency);
          return dailyVolume + usdAmount > pattern.averageAmount * 10;
        },
      },
    ];
  }

  /**
   * Load fraud data from external sources or database
   */
  private loadFraudData(): void {
    // In production, load from external fraud databases
    this.suspiciousIPs.add('192.168.1.100'); // Example suspicious IP
    this.suspiciousIPs.add('10.0.0.1'); // Example suspicious IP
    
    this.knownFraudPatterns.add('rapid_small_amounts');
    this.knownFraudPatterns.add('structuring_pattern');
  }

  /**
   * Perform comprehensive fraud detection check
   */
  async detectFraud(request: FraudCheckRequest): Promise<FraudCheckResult> {
    try {
      console.log(`🕵️ Performing fraud detection for user ${request.userId}`);

      // Get user's transaction pattern
      const pattern = await this.getUserTransactionPattern(request.userId);

      // Apply fraud detection rules
      let totalRiskScore = 0;
      const flags: string[] = [];
      const reasons: string[] = [];
      const recommendations: string[] = [];

      for (const rule of this.fraudRules) {
        if (!rule.enabled) continue;

        try {
          const ruleTriggered = await this.evaluateRule(rule, request, pattern);
          
          if (ruleTriggered) {
            totalRiskScore += rule.riskScore;
            flags.push(rule.id);
            reasons.push(rule.description);
            
            console.log(`⚠️ Fraud rule triggered: ${rule.name}`);
          }
        } catch (error) {
          console.error(`Error evaluating fraud rule ${rule.id}:`, error);
          // Continue with other rules
        }
      }

      // Additional pattern-based checks
      const patternRisk = await this.checkKnownFraudPatterns(request, pattern);
      totalRiskScore += patternRisk.riskScore;
      flags.push(...patternRisk.flags);
      reasons.push(...patternRisk.reasons);

      // Determine risk level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (totalRiskScore >= 80) {
        riskLevel = 'CRITICAL';
      } else if (totalRiskScore >= 60) {
        riskLevel = 'HIGH';
      } else if (totalRiskScore >= 30) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      // Determine if transaction is fraudulent
      const fraudulent = riskLevel === 'CRITICAL' || totalRiskScore >= 75;

      // Generate recommendations
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        recommendations.push('Manual review required');
        recommendations.push('Additional identity verification recommended');
      }

      if (flags.includes('suspicious_ip')) {
        recommendations.push('Block IP address');
      }

      if (flags.includes('rapid_succession')) {
        recommendations.push('Implement temporary transaction cooldown');
      }

      // Determine if manual review is required
      const requiresManualReview = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

      // Set temporary block if critical risk
      let blockedUntil: Date | undefined;
      if (riskLevel === 'CRITICAL') {
        blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        this.blockedUsers.set(request.userId, blockedUntil);
        recommendations.push('User temporarily blocked for 24 hours');
      }

      const result: FraudCheckResult = {
        riskScore: Math.min(totalRiskScore, 100), // Cap at 100
        riskLevel,
        fraudulent,
        flags,
        reasons,
        recommendations,
        requiresManualReview,
        blockedUntil,
      };

      // Log fraud check result
      await this.logFraudCheck(request, result);

      return result;
    } catch (error) {
      console.error('Error performing fraud detection:', error);
      
      // Return safe default in case of error
      return {
        riskScore: 50, // Medium risk as default
        riskLevel: 'MEDIUM',
        fraudulent: false,
        flags: ['FRAUD_CHECK_ERROR'],
        reasons: ['Fraud detection system error'],
        recommendations: ['Manual review recommended due to system error'],
        requiresManualReview: true,
      };
    }
  }

  /**
   * Get user's transaction pattern for analysis
   */
  private async getUserTransactionPattern(userId: string): Promise<TransactionPattern> {
    try {
      // Get transactions from last 90 days
      const transactions = await this.prisma.payment.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate pattern metrics
      const amounts = transactions.map(t => this.convertToUSD(t.amount, t.currency));
      const averageAmount = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;

      const recipients = transactions
        .filter(t => t.senderId === userId)
        .map(t => t.recipientId);
      const commonRecipients = [...new Set(recipients)];

      const currencies = [...new Set(transactions.map(t => t.currency))];

      const hours = transactions.map(t => new Date(t.createdAt).getHours());
      const typicalHours = this.findCommonValues(hours);

      const days = transactions.map(t => new Date(t.createdAt).getDay());
      const typicalDays = this.findCommonValues(days);

      return {
        userId,
        averageAmount,
        transactionFrequency: transactions.length,
        commonRecipients,
        commonCurrencies: currencies,
        typicalHours,
        typicalDays,
        deviceFingerprints: [], // Would be populated from device tracking
        ipAddresses: [], // Would be populated from IP tracking
      };
    } catch (error) {
      console.error('Error getting user transaction pattern:', error);
      
      // Return default pattern
      return {
        userId,
        averageAmount: 0,
        transactionFrequency: 0,
        commonRecipients: [],
        commonCurrencies: [],
        typicalHours: [],
        typicalDays: [],
        deviceFingerprints: [],
        ipAddresses: [],
      };
    }
  }

  /**
   * Evaluate a specific fraud rule
   */
  private async evaluateRule(
    rule: FraudRule,
    request: FraudCheckRequest,
    pattern: TransactionPattern
  ): Promise<boolean> {
    try {
      // Handle async rules
      if (rule.condition.constructor.name === 'AsyncFunction') {
        return await (rule.condition as any)(request, pattern);
      } else {
        return rule.condition(request, pattern);
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
      return false;
    }
  }

  /**
   * Check for known fraud patterns
   */
  private async checkKnownFraudPatterns(
    request: FraudCheckRequest,
    pattern: TransactionPattern
  ): Promise<{ riskScore: number; flags: string[]; reasons: string[] }> {
    let riskScore = 0;
    const flags: string[] = [];
    const reasons: string[] = [];

    // Check for structuring pattern (multiple transactions just under reporting threshold)
    const recentTransactions = await this.getRecentTransactions(request.userId, 24 * 60); // 24 hours
    const structuringPattern = recentTransactions.filter(t => {
      const usdAmount = this.convertToUSD(t.amount, t.currency);
      return usdAmount >= 9000 && usdAmount < 10000; // Just under $10k reporting threshold
    });

    if (structuringPattern.length >= 2) {
      riskScore += 40;
      flags.push('STRUCTURING_PATTERN');
      reasons.push('Potential structuring to avoid reporting thresholds');
    }

    // Check for rapid small amounts pattern (potential money laundering)
    const smallAmountTransactions = recentTransactions.filter(t => {
      const usdAmount = this.convertToUSD(t.amount, t.currency);
      return usdAmount < 100;
    });

    if (smallAmountTransactions.length >= 10) {
      riskScore += 25;
      flags.push('RAPID_SMALL_AMOUNTS');
      reasons.push('Unusual pattern of many small transactions');
    }

    return { riskScore, flags, reasons };
  }

  /**
   * Get recent transactions for a user
   */
  private async getRecentTransactions(userId: string, minutes: number): Promise<any[]> {
    try {
      const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
      
      return await this.prisma.payment.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
          createdAt: {
            gte: cutoffTime,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  /**
   * Get daily transaction volume for a user
   */
  private async getDailyTransactionVolume(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTransactions = await this.prisma.payment.findMany({
        where: {
          senderId: userId,
          createdAt: {
            gte: today,
          },
        },
      });

      return todayTransactions.reduce((total, tx) => {
        return total + this.convertToUSD(tx.amount, tx.currency);
      }, 0);
    } catch (error) {
      console.error('Error getting daily transaction volume:', error);
      return 0;
    }
  }

  /**
   * Find common values in an array (for pattern analysis)
   */
  private findCommonValues(values: number[]): number[] {
    const frequency: Record<number, number> = {};
    
    values.forEach(value => {
      frequency[value] = (frequency[value] || 0) + 1;
    });

    // Return values that appear more than 20% of the time
    const threshold = values.length * 0.2;
    return Object.entries(frequency)
      .filter(([_, count]) => count >= threshold)
      .map(([value, _]) => parseInt(value));
  }

  /**
   * Convert amount to USD for consistent analysis
   */
  private convertToUSD(amount: number, currency: string): number {
    // Simplified conversion - in production, use real-time exchange rates
    const exchangeRates: Record<string, number> = {
      'USD': 1.0,
      'EUR': 1.1,
      'GBP': 1.25,
      'CLP': 0.001,
      'MXN': 0.05,
    };

    return amount * (exchangeRates[currency] || 1.0);
  }

  /**
   * Check if user is currently blocked
   */
  isUserBlocked(userId: string): boolean {
    const blockedUntil = this.blockedUsers.get(userId);
    if (!blockedUntil) return false;

    if (new Date() > blockedUntil) {
      this.blockedUsers.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Manually block a user
   */
  blockUser(userId: string, duration: number = 24): void {
    const blockedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
    this.blockedUsers.set(userId, blockedUntil);
    console.log(`🚫 User ${userId} blocked until ${blockedUntil.toISOString()}`);
  }

  /**
   * Unblock a user
   */
  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId);
    console.log(`✅ User ${userId} unblocked`);
  }

  /**
   * Add IP to suspicious list
   */
  addSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.add(ipAddress);
    console.log(`🚨 Added suspicious IP: ${ipAddress}`);
  }

  /**
   * Remove IP from suspicious list
   */
  removeSuspiciousIP(ipAddress: string): void {
    this.suspiciousIPs.delete(ipAddress);
    console.log(`✅ Removed IP from suspicious list: ${ipAddress}`);
  }

  /**
   * Log fraud check for audit trail
   */
  private async logFraudCheck(request: FraudCheckRequest, result: FraudCheckResult): Promise<void> {
    try {
      console.log('🕵️ Fraud Detection Log:', {
        userId: request.userId,
        timestamp: new Date().toISOString(),
        transactionType: request.transactionType,
        amount: request.amount,
        currency: request.currency,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        fraudulent: result.fraudulent,
        flags: result.flags,
        requiresManualReview: result.requiresManualReview,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
      });

      // In production, store in dedicated fraud log table
      // await this.prisma.fraudLog.create({ ... });
    } catch (error) {
      console.error('Error logging fraud check:', error);
      // Don't throw error as this shouldn't block the fraud check
    }
  }

  /**
   * Get fraud detection statistics
   */
  async getFraudStats(): Promise<{
    totalChecks: number;
    fraudulentTransactions: number;
    blockedUsers: number;
    suspiciousIPs: number;
    riskDistribution: Record<string, number>;
  }> {
    return {
      totalChecks: 0, // Would come from fraud logs
      fraudulentTransactions: 0, // Would come from fraud logs
      blockedUsers: this.blockedUsers.size,
      suspiciousIPs: this.suspiciousIPs.size,
      riskDistribution: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      },
    };
  }

  /**
   * Update fraud rule configuration
   */
  updateFraudRule(ruleId: string, updates: Partial<FraudRule>): boolean {
    const ruleIndex = this.fraudRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      return false;
    }

    this.fraudRules[ruleIndex] = { ...this.fraudRules[ruleIndex], ...updates };
    console.log(`📝 Updated fraud rule: ${ruleId}`);
    return true;
  }

  /**
   * Get all fraud rules
   */
  getFraudRules(): FraudRule[] {
    return this.fraudRules.map(rule => ({ ...rule })); // Return copy
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}