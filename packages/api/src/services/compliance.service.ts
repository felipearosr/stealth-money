import { PrismaClient } from '@prisma/client';

export interface KYCData {
  userId: string;
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentNumber: string;
  documentCountry: string;
  dateOfBirth: Date;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  occupation?: string;
  sourceOfFunds?: string;
}

export interface AMLCheckResult {
  userId: string;
  riskScore: number; // 0-100, higher is riskier
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  sanctionsMatch: boolean;
  pepMatch: boolean; // Politically Exposed Person
  watchlistMatch: boolean;
  countryRisk: number;
  recommendations: string[];
  requiresManualReview: boolean;
  checkDate: Date;
}

export interface ComplianceCheckRequest {
  userId: string;
  transactionAmount: number;
  currency: string;
  recipientCountry: string;
  senderCountry: string;
  transactionType: 'payment_request' | 'direct_transfer' | 'settlement';
  metadata?: Record<string, any>;
}

export interface ComplianceResult {
  approved: boolean;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  flags: string[];
  requirements: string[];
  maxTransactionAmount?: number;
  requiresKYC: boolean;
  requiresEnhancedDueDiligence: boolean;
  blockedCountries: string[];
  recommendations: string[];
}

export class ComplianceService {
  private prisma: PrismaClient;
  private sanctionsList: Set<string>;
  private pepList: Set<string>;
  private watchlist: Set<string>;
  private blockedCountries: Set<string>;
  private highRiskCountries: Set<string>;

  constructor() {
    this.prisma = new PrismaClient();
    this.initializeComplianceLists();
  }

  /**
   * Initialize compliance lists (in production, these would be loaded from external sources)
   */
  private initializeComplianceLists(): void {
    // Sanctions list (simplified - in production, use OFAC SDN list)
    this.sanctionsList = new Set([
      'sanctioned_entity_1',
      'sanctioned_entity_2',
      // Add more sanctioned entities
    ]);

    // PEP list (simplified - in production, use comprehensive PEP database)
    this.pepList = new Set([
      'politically_exposed_person_1',
      'politically_exposed_person_2',
      // Add more PEPs
    ]);

    // Watchlist (simplified - in production, use comprehensive watchlist)
    this.watchlist = new Set([
      'watchlist_entity_1',
      'watchlist_entity_2',
      // Add more watchlist entities
    ]);

    // Blocked countries (example - adjust based on business requirements)
    this.blockedCountries = new Set([
      'IR', // Iran
      'KP', // North Korea
      'SY', // Syria
      // Add more blocked countries based on sanctions
    ]);

    // High-risk countries for enhanced due diligence
    this.highRiskCountries = new Set([
      'AF', // Afghanistan
      'MM', // Myanmar
      'YE', // Yemen
      // Add more high-risk countries
    ]);
  }

  /**
   * Perform comprehensive compliance check for cross-border transfers
   */
  async performComplianceCheck(request: ComplianceCheckRequest): Promise<ComplianceResult> {
    try {
      console.log(`🔍 Performing compliance check for user ${request.userId}`);

      // Get user information
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
      });

      if (!user) {
        throw new Error('User not found for compliance check');
      }

      // Perform AML check
      const amlResult = await this.performAMLCheck(user, request);

      // Check country restrictions
      const countryCheck = this.checkCountryRestrictions(
        request.senderCountry,
        request.recipientCountry
      );

      // Calculate transaction limits
      const transactionLimits = this.calculateTransactionLimits(
        user,
        request.transactionAmount,
        request.currency
      );

      // Determine KYC requirements
      const kycRequirements = this.determineKYCRequirements(
        user,
        request.transactionAmount,
        amlResult.riskLevel
      );

      // Combine all checks into final result
      const complianceResult: ComplianceResult = {
        approved: this.determineApproval(amlResult, countryCheck, transactionLimits, kycRequirements),
        riskScore: amlResult.riskScore,
        riskLevel: amlResult.riskLevel,
        flags: [
          ...amlResult.flags,
          ...countryCheck.flags,
          ...transactionLimits.flags,
          ...kycRequirements.flags,
        ],
        requirements: [
          ...kycRequirements.requirements,
          ...transactionLimits.requirements,
        ],
        maxTransactionAmount: transactionLimits.maxAmount,
        requiresKYC: kycRequirements.requiresKYC,
        requiresEnhancedDueDiligence: amlResult.riskLevel === 'HIGH' || amlResult.riskLevel === 'CRITICAL',
        blockedCountries: Array.from(this.blockedCountries),
        recommendations: amlResult.recommendations,
      };

      // Log compliance check result
      await this.logComplianceCheck(request, complianceResult);

      return complianceResult;
    } catch (error) {
      console.error('Error performing compliance check:', error);
      throw new Error('Compliance check failed');
    }
  }

  /**
   * Perform AML (Anti-Money Laundering) check
   */
  private async performAMLCheck(user: any, request: ComplianceCheckRequest): Promise<AMLCheckResult> {
    let riskScore = 0;
    const flags: string[] = [];
    const recommendations: string[] = [];

    // Check sanctions list
    const sanctionsMatch = this.checkSanctionsList(user);
    if (sanctionsMatch) {
      riskScore += 100; // Maximum risk
      flags.push('SANCTIONS_MATCH');
    }

    // Check PEP list
    const pepMatch = this.checkPEPList(user);
    if (pepMatch) {
      riskScore += 30;
      flags.push('PEP_MATCH');
      recommendations.push('Enhanced due diligence required for PEP');
    }

    // Check watchlist
    const watchlistMatch = this.checkWatchlist(user);
    if (watchlistMatch) {
      riskScore += 20;
      flags.push('WATCHLIST_MATCH');
      recommendations.push('Manual review required for watchlist match');
    }

    // Country risk assessment
    const countryRisk = this.assessCountryRisk(request.senderCountry, request.recipientCountry);
    riskScore += countryRisk;

    // Transaction amount risk
    const amountRisk = this.assessTransactionAmountRisk(request.transactionAmount, request.currency);
    riskScore += amountRisk;

    // User behavior risk (simplified)
    const behaviorRisk = await this.assessUserBehaviorRisk(user.id);
    riskScore += behaviorRisk;

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (riskScore >= 80) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 60) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 30) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    return {
      userId: user.id,
      riskScore: Math.min(riskScore, 100), // Cap at 100
      riskLevel,
      flags,
      sanctionsMatch,
      pepMatch,
      watchlistMatch,
      countryRisk,
      recommendations,
      requiresManualReview: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      checkDate: new Date(),
    };
  }

  /**
   * Check if user matches sanctions list
   */
  private checkSanctionsList(user: any): boolean {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return this.sanctionsList.has(fullName) || this.sanctionsList.has(user.email.toLowerCase());
  }

  /**
   * Check if user matches PEP list
   */
  private checkPEPList(user: any): boolean {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return this.pepList.has(fullName);
  }

  /**
   * Check if user matches watchlist
   */
  private checkWatchlist(user: any): boolean {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    return this.watchlist.has(fullName) || this.watchlist.has(user.email.toLowerCase());
  }

  /**
   * Assess country risk for cross-border transactions
   */
  private assessCountryRisk(senderCountry: string, recipientCountry: string): number {
    let risk = 0;

    if (this.highRiskCountries.has(senderCountry)) {
      risk += 25;
    }

    if (this.highRiskCountries.has(recipientCountry)) {
      risk += 25;
    }

    // Additional risk for certain country combinations
    if (senderCountry !== recipientCountry) {
      risk += 5; // Cross-border inherently has some risk
    }

    return risk;
  }

  /**
   * Assess transaction amount risk
   */
  private assessTransactionAmountRisk(amount: number, currency: string): number {
    // Convert to USD for consistent risk assessment
    const usdAmount = this.convertToUSD(amount, currency);

    if (usdAmount >= 10000) {
      return 20; // High amount transactions are riskier
    } else if (usdAmount >= 5000) {
      return 10;
    } else if (usdAmount >= 1000) {
      return 5;
    }

    return 0;
  }

  /**
   * Assess user behavior risk based on transaction history
   */
  private async assessUserBehaviorRisk(userId: string): Promise<number> {
    try {
      // Get user's recent transaction history
      const recentTransactions = await this.prisma.payment.findMany({
        where: {
          OR: [
            { senderId: userId },
            { recipientId: userId },
          ],
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let risk = 0;

      // Check for unusual patterns
      if (recentTransactions.length > 50) {
        risk += 15; // Very high transaction frequency
      } else if (recentTransactions.length > 20) {
        risk += 10; // High transaction frequency
      }

      // Check for large amounts
      const totalAmount = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      if (totalAmount > 50000) {
        risk += 15; // Large total transaction volume
      }

      // Check for failed transactions (potential fraud attempts)
      const failedTransactions = recentTransactions.filter(tx => tx.status === 'FAILED');
      if (failedTransactions.length > 5) {
        risk += 20; // Multiple failed transactions
      }

      return risk;
    } catch (error) {
      console.error('Error assessing user behavior risk:', error);
      return 10; // Default moderate risk if assessment fails
    }
  }

  /**
   * Check country restrictions
   */
  private checkCountryRestrictions(senderCountry: string, recipientCountry: string): {
    allowed: boolean;
    flags: string[];
  } {
    const flags: string[] = [];

    if (this.blockedCountries.has(senderCountry)) {
      flags.push(`BLOCKED_SENDER_COUNTRY_${senderCountry}`);
    }

    if (this.blockedCountries.has(recipientCountry)) {
      flags.push(`BLOCKED_RECIPIENT_COUNTRY_${recipientCountry}`);
    }

    return {
      allowed: flags.length === 0,
      flags,
    };
  }

  /**
   * Calculate transaction limits based on user KYC status and risk
   */
  private calculateTransactionLimits(user: any, amount: number, currency: string): {
    allowed: boolean;
    maxAmount?: number;
    flags: string[];
    requirements: string[];
  } {
    const flags: string[] = [];
    const requirements: string[] = [];
    let maxAmount: number;

    // Set limits based on KYC status
    switch (user.kycStatus) {
      case 'VERIFIED':
        maxAmount = 50000; // $50,000 USD equivalent
        break;
      case 'PENDING':
        maxAmount = 5000; // $5,000 USD equivalent
        requirements.push('Complete KYC verification for higher limits');
        break;
      case 'FAILED':
        maxAmount = 0;
        flags.push('KYC_FAILED');
        requirements.push('KYC verification failed - contact support');
        break;
      default:
        maxAmount = 1000; // $1,000 USD equivalent for unverified users
        requirements.push('Complete KYC verification for higher limits');
    }

    const usdAmount = this.convertToUSD(amount, currency);
    const allowed = usdAmount <= maxAmount;

    if (!allowed) {
      flags.push('AMOUNT_EXCEEDS_LIMIT');
    }

    return {
      allowed,
      maxAmount,
      flags,
      requirements,
    };
  }

  /**
   * Determine KYC requirements
   */
  private determineKYCRequirements(user: any, amount: number, riskLevel: string): {
    requiresKYC: boolean;
    flags: string[];
    requirements: string[];
  } {
    const flags: string[] = [];
    const requirements: string[] = [];
    let requiresKYC = false;

    // KYC required for amounts over $1000 or high-risk users
    const usdAmount = this.convertToUSD(amount, user.currency);
    
    if (usdAmount >= 1000 || riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      requiresKYC = true;
    }

    if (user.kycStatus !== 'VERIFIED' && requiresKYC) {
      flags.push('KYC_REQUIRED');
      requirements.push('Complete KYC verification to proceed');
    }

    if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
      requirements.push('Enhanced due diligence required');
    }

    return {
      requiresKYC,
      flags,
      requirements,
    };
  }

  /**
   * Determine overall approval based on all checks
   */
  private determineApproval(
    amlResult: AMLCheckResult,
    countryCheck: { allowed: boolean; flags: string[] },
    transactionLimits: { allowed: boolean },
    kycRequirements: { requiresKYC: boolean }
  ): boolean {
    // Automatic rejection for critical risk or sanctions match
    if (amlResult.riskLevel === 'CRITICAL' || amlResult.sanctionsMatch) {
      return false;
    }

    // Rejection for blocked countries
    if (!countryCheck.allowed) {
      return false;
    }

    // Rejection for amount exceeding limits
    if (!transactionLimits.allowed) {
      return false;
    }

    // Approval with conditions for other cases
    return true;
  }

  /**
   * Log compliance check for audit trail
   */
  private async logComplianceCheck(
    request: ComplianceCheckRequest,
    result: ComplianceResult
  ): Promise<void> {
    try {
      // In a real implementation, this would be stored in a dedicated audit table
      console.log('📋 Compliance Check Log:', {
        userId: request.userId,
        timestamp: new Date().toISOString(),
        transactionAmount: request.transactionAmount,
        currency: request.currency,
        senderCountry: request.senderCountry,
        recipientCountry: request.recipientCountry,
        approved: result.approved,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        flags: result.flags,
        requirements: result.requirements,
      });

      // Store in database (would need to create ComplianceLog model)
      // await this.prisma.complianceLog.create({ ... });
    } catch (error) {
      console.error('Error logging compliance check:', error);
      // Don't throw error as this shouldn't block the compliance check
    }
  }

  /**
   * Convert amount to USD for consistent risk assessment
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
   * Update user KYC status
   */
  async updateKYCStatus(userId: string, status: 'PENDING' | 'VERIFIED' | 'FAILED', kycData?: KYCData): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { kycStatus: status },
      });

      console.log(`✅ Updated KYC status for user ${userId} to ${status}`);

      // In production, store KYC data in separate secure table
      if (kycData) {
        console.log('📄 KYC data received and would be stored securely');
      }
    } catch (error) {
      console.error('Error updating KYC status:', error);
      throw error;
    }
  }

  /**
   * Get compliance statistics
   */
  async getComplianceStats(): Promise<{
    totalChecks: number;
    approvedChecks: number;
    rejectedChecks: number;
    highRiskUsers: number;
    pendingKYC: number;
  }> {
    try {
      // In production, these would come from compliance log table
      const users = await this.prisma.user.findMany({
        select: { kycStatus: true },
      });

      const pendingKYC = users.filter(u => u.kycStatus === 'PENDING').length;

      return {
        totalChecks: 0, // Would come from compliance logs
        approvedChecks: 0, // Would come from compliance logs
        rejectedChecks: 0, // Would come from compliance logs
        highRiskUsers: 0, // Would come from compliance logs
        pendingKYC,
      };
    } catch (error) {
      console.error('Error getting compliance stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}