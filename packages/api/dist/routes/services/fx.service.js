"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FxService = exports.FXService = void 0;
const circle_service_1 = require("./circle.service");
const currency_config_service_1 = require("./currency-config.service");
/**
 * FX Service for exchange rate calculation and management
 * Provides real-time rates, rate locking, and transfer calculations
 */
class FXService extends circle_service_1.CircleService {
    constructor() {
        super(...arguments);
        this.rateCache = new Map();
        this.lockedRates = new Map();
        this.CACHE_DURATION_MS = 30000; // 30 seconds
        this.DEFAULT_LOCK_DURATION_MINUTES = 10;
        this.FALLBACK_RATES = {
            // USD to other currencies
            'USD-EUR': 0.85,
            'USD-CLP': 950.0,
            'USD-MXN': 18.5,
            'USD-GBP': 0.78,
            'USD-CAD': 1.35,
            'USD-AUD': 1.52,
            'USD-JPY': 150.0,
            'USD-CHF': 0.88,
            'USD-SEK': 10.8,
            'USD-NOK': 10.9,
            'USD-DKK': 6.8,
            'USD-PLN': 4.1,
            'USD-CZK': 23.5,
            'USD-HUF': 360.0,
            'USD-RON': 4.6,
            'USD-BGN': 1.8,
            'USD-HRK': 6.9,
            'USD-RSD': 108.0,
            'USD-TRY': 28.5,
            'USD-ZAR': 18.8,
            'USD-BRL': 5.1,
            'USD-ARS': 350.0,
            'USD-COP': 4100.0,
            'USD-PEN': 3.7,
            'USD-UYU': 39.0,
            'USD-BOB': 6.9,
            'USD-PYG': 7300.0,
            'USD-VES': 36.0,
            'USD-CNY': 7.2,
            'USD-INR': 83.0,
            'USD-KRW': 1320.0,
            'USD-SGD': 1.35,
            'USD-THB': 35.5,
            'USD-MYR': 4.7,
            'USD-IDR': 15800.0,
            'USD-PHP': 56.0,
            'USD-VND': 24500.0,
            // Reverse rates (other currencies to USD)
            'EUR-USD': 1.18,
            'CLP-USD': 0.00105,
            'MXN-USD': 0.054,
            'GBP-USD': 1.28,
            'CAD-USD': 0.74,
            'AUD-USD': 0.66,
            'JPY-USD': 0.0067,
            'CHF-USD': 1.14,
            'SEK-USD': 0.093,
            'NOK-USD': 0.092,
            'DKK-USD': 0.147,
            'PLN-USD': 0.244,
            'CZK-USD': 0.043,
            'HUF-USD': 0.0028,
            'RON-USD': 0.217,
            'BGN-USD': 0.556,
            'HRK-USD': 0.145,
            'RSD-USD': 0.0093,
            'TRY-USD': 0.035,
            'ZAR-USD': 0.053,
            'BRL-USD': 0.196,
            'ARS-USD': 0.0029,
            'COP-USD': 0.000244,
            'PEN-USD': 0.270,
            'UYU-USD': 0.026,
            'BOB-USD': 0.145,
            'PYG-USD': 0.000137,
            'VES-USD': 0.028,
            'CNY-USD': 0.139,
            'INR-USD': 0.012,
            'KRW-USD': 0.000758,
            'SGD-USD': 0.741,
            'THB-USD': 0.028,
            'MYR-USD': 0.213,
            'IDR-USD': 0.000063,
            'PHP-USD': 0.018,
            'VND-USD': 0.000041,
            // Cross rates (non-USD pairs) - calculated from USD rates
            'EUR-GBP': 0.664,
            'EUR-CLP': 1117.6,
            'EUR-MXN': 21.8,
            'GBP-EUR': 1.506,
            'GBP-CLP': 1217.9,
            'GBP-MXN': 23.7,
            'CLP-EUR': 0.000895,
            'CLP-GBP': 0.000821,
            'CLP-MXN': 0.0195,
            'MXN-EUR': 0.046,
            'MXN-GBP': 0.042,
            'MXN-CLP': 51.4
        };
    }
    /**
     * Get current exchange rate between currencies
     */
    async getExchangeRate(request) {
        try {
            const cacheKey = `${request.fromCurrency}-${request.toCurrency}`;
            // Check cache first
            const cached = this.rateCache.get(cacheKey);
            if (cached && this.isCacheValid(cached)) {
                // Update converted amount if amount provided
                if (request.amount !== undefined) {
                    cached.amount = request.amount;
                    cached.convertedAmount = this.calculateConvertedAmount(request.amount, cached.rate, cached.fees);
                }
                return cached;
            }
            // Fetch fresh rate from Circle API
            const rate = await this.fetchRateFromCircle(request);
            // Cache the rate
            this.rateCache.set(cacheKey, rate);
            return rate;
        }
        catch (error) {
            console.error('Error fetching exchange rate:', error);
            // Fallback to static rates if Circle API fails
            return this.getFallbackRate(request);
        }
    }
    /**
     * Lock an exchange rate for a specific duration
     */
    async lockExchangeRate(request) {
        try {
            // Get current rate
            const currentRate = await this.getExchangeRate({
                fromCurrency: request.fromCurrency,
                toCurrency: request.toCurrency,
                amount: request.amount
            });
            // Create locked rate
            const lockDuration = request.lockDurationMinutes || this.DEFAULT_LOCK_DURATION_MINUTES;
            const lockedRate = {
                rateId: this.generateRateId(),
                fromCurrency: request.fromCurrency,
                toCurrency: request.toCurrency,
                rate: currentRate.rate,
                amount: request.amount,
                convertedAmount: this.calculateConvertedAmount(request.amount, currentRate.rate, currentRate.fees),
                fees: currentRate.fees,
                lockedAt: new Date(),
                expiresAt: new Date(Date.now() + lockDuration * 60 * 1000),
                isLocked: true
            };
            // Store locked rate
            this.lockedRates.set(lockedRate.rateId, lockedRate);
            // Clean up expired rates
            this.cleanupExpiredRates();
            return lockedRate;
        }
        catch (error) {
            console.error('Error locking exchange rate:', error);
            throw new Error(`Failed to lock exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get a locked rate by ID
     */
    async getLockedRate(rateId) {
        const lockedRate = this.lockedRates.get(rateId);
        if (!lockedRate) {
            return null;
        }
        // Check if rate has expired
        if (new Date() > lockedRate.expiresAt) {
            this.lockedRates.delete(rateId);
            return null;
        }
        return lockedRate;
    }
    /**
     * Calculate complete transfer cost and receive amount
     */
    async calculateTransfer(request) {
        try {
            // Validate currency pair using CurrencyConfigService
            const validationError = currency_config_service_1.CurrencyConfigService.validateCurrencyPair(request.sendCurrency, request.receiveCurrency, request.sendAmount);
            if (validationError) {
                throw new Error(validationError);
            }
            // Get currency pair configuration for estimated arrival
            const currencyPair = currency_config_service_1.CurrencyConfigService.getCurrencyPair(request.sendCurrency, request.receiveCurrency);
            // Get current exchange rate
            const rateResponse = await this.getExchangeRate({
                fromCurrency: request.sendCurrency,
                toCurrency: request.receiveCurrency,
                amount: request.sendAmount
            });
            // Calculate all fees based on destination currency
            const fees = this.calculateAllFees(request.sendAmount, request.receiveCurrency);
            // Calculate breakdown
            const breakdown = this.calculateTransferBreakdown(request.sendAmount, rateResponse.rate, fees);
            return {
                sendAmount: request.sendAmount,
                receiveAmount: breakdown.finalAmountReceive,
                exchangeRate: rateResponse.rate,
                fees,
                rateId: rateResponse.rateId,
                rateValidUntil: rateResponse.validUntil,
                estimatedArrival: currencyPair?.estimatedArrival || {
                    min: 5,
                    max: 15,
                    unit: 'minutes'
                },
                breakdown
            };
        }
        catch (error) {
            console.error('Error calculating transfer:', error);
            throw new Error(`Failed to calculate transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get real-time rate updates (for WebSocket or polling)
     */
    async getRateUpdates(fromCurrency, toCurrency, callback, intervalMs = 5000) {
        const interval = setInterval(async () => {
            try {
                const rate = await this.getExchangeRate({ fromCurrency, toCurrency });
                callback(rate);
            }
            catch (error) {
                console.error('Error in rate update:', error);
            }
        }, intervalMs);
        // Return cleanup function
        return () => clearInterval(interval);
    }
    /**
     * Validate if a rate is still valid and within acceptable variance
     */
    async validateRate(rateId, expectedRate, maxVariancePercent = 2, fromCurrency = 'USD', toCurrency = 'EUR') {
        try {
            // Check if it's a locked rate first
            const lockedRate = await this.getLockedRate(rateId);
            if (lockedRate) {
                return Math.abs(lockedRate.rate - expectedRate) / expectedRate <= maxVariancePercent / 100;
            }
            // For non-locked rates, get current rate and compare
            const currentRate = await this.getExchangeRate({ fromCurrency, toCurrency });
            return Math.abs(currentRate.rate - expectedRate) / expectedRate <= maxVariancePercent / 100;
        }
        catch (error) {
            console.error('Error validating rate:', error);
            return false;
        }
    }
    /**
     * Get rate history for analytics (simplified implementation)
     */
    async getRateHistory(fromCurrency, toCurrency, hours = 24) {
        // In a real implementation, this would fetch from a database or external service
        // For now, return mock data
        const history = [];
        const rateKey = `${fromCurrency}-${toCurrency}`;
        const baseRate = this.FALLBACK_RATES[rateKey] || 1.0;
        for (let i = hours; i >= 0; i--) {
            const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
            const variance = (Math.random() - 0.5) * 0.02; // ±1% variance
            const rate = baseRate + (baseRate * variance);
            history.push({ rate: Math.round(rate * 10000) / 10000, timestamp });
        }
        return history;
    }
    /**
     * Fetch exchange rate from Circle API
     */
    async fetchRateFromCircle(request) {
        try {
            // Mock Circle API call - in production this would use actual Circle SDK
            const mockRate = await this.mockCircleRateAPI(request);
            const fees = this.calculateFees(request.amount || 100);
            const convertedAmount = request.amount !== undefined ?
                this.calculateConvertedAmount(request.amount, mockRate.rate, fees) : undefined;
            return {
                fromCurrency: request.fromCurrency,
                toCurrency: request.toCurrency,
                rate: mockRate.rate,
                inverseRate: 1 / mockRate.rate,
                amount: request.amount,
                convertedAmount,
                rateId: this.generateRateId(),
                validUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                fees,
                timestamp: new Date(),
                source: 'circle'
            };
        }
        catch (error) {
            throw new Error(`Circle API rate fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Mock Circle API rate call
     */
    async mockCircleRateAPI(request) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        // Add some realistic variance to the base rate
        const baseRate = this.FALLBACK_RATES[`${request.fromCurrency}-${request.toCurrency}`] || 0.85;
        const variance = (Math.random() - 0.5) * 0.01; // ±0.5% variance
        const rate = baseRate + (baseRate * variance);
        return { rate: Math.round(rate * 10000) / 10000 };
    }
    /**
     * Get fallback rate when Circle API is unavailable
     */
    getFallbackRate(request) {
        const rateKey = `${request.fromCurrency}-${request.toCurrency}`;
        const rate = this.FALLBACK_RATES[rateKey] || 0.85;
        const fees = this.calculateFees(request.amount || 100);
        const convertedAmount = request.amount !== undefined ?
            this.calculateConvertedAmount(request.amount, rate, fees) : undefined;
        return {
            fromCurrency: request.fromCurrency,
            toCurrency: request.toCurrency,
            rate,
            inverseRate: 1 / rate,
            amount: request.amount,
            convertedAmount,
            rateId: this.generateRateId(),
            validUntil: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes for fallback
            fees,
            timestamp: new Date(),
            source: 'fallback'
        };
    }
    /**
     * Calculate fees for currency conversion
     */
    calculateFees(amount) {
        const percentage = 0.005; // 0.5% conversion fee
        const fixed = 0.50; // $0.50 fixed fee
        const percentageFee = amount * percentage;
        const total = percentageFee + fixed;
        return {
            percentage: Math.round(percentageFee * 100) / 100,
            fixed,
            total: Math.round(total * 100) / 100
        };
    }
    /**
     * Calculate all transfer fees based on destination currency
     */
    calculateAllFees(amount, destinationCurrency) {
        const cardProcessing = Math.round((amount * 0.029 + 0.30) * 100) / 100; // 2.9% + $0.30
        const transfer = Math.round((amount * 0.005) * 100) / 100; // 0.5% transfer fee
        // Different payout fees based on destination currency and region
        let payout;
        switch (destinationCurrency) {
            // European currencies
            case 'EUR':
                payout = 2.50; // €2.50 for EUR transfers
                break;
            case 'GBP':
                payout = 2.00; // £2.00 for GBP transfers
                break;
            case 'CHF':
                payout = 2.20; // CHF 2.20 for Swiss transfers
                break;
            case 'SEK':
                payout = 25.0; // SEK 25 for Swedish transfers
                break;
            case 'NOK':
                payout = 26.0; // NOK 26 for Norwegian transfers
                break;
            case 'DKK':
                payout = 17.0; // DKK 17 for Danish transfers
                break;
            case 'PLN':
                payout = 10.0; // PLN 10 for Polish transfers
                break;
            case 'CZK':
                payout = 58.0; // CZK 58 for Czech transfers
                break;
            case 'HUF':
                payout = 900.0; // HUF 900 for Hungarian transfers
                break;
            // North American currencies
            case 'CAD':
                payout = 3.25; // CAD 3.25 for Canadian transfers
                break;
            // Asia-Pacific currencies
            case 'AUD':
                payout = 3.80; // AUD 3.80 for Australian transfers
                break;
            case 'JPY':
                payout = 375.0; // JPY 375 for Japanese transfers
                break;
            case 'SGD':
                payout = 3.40; // SGD 3.40 for Singapore transfers
                break;
            case 'CNY':
                payout = 18.0; // CNY 18 for Chinese transfers
                break;
            case 'INR':
                payout = 208.0; // INR 208 for Indian transfers
                break;
            case 'KRW':
                payout = 3300.0; // KRW 3300 for Korean transfers
                break;
            case 'THB':
                payout = 89.0; // THB 89 for Thai transfers
                break;
            case 'MYR':
                payout = 11.8; // MYR 11.8 for Malaysian transfers
                break;
            case 'IDR':
                payout = 39500.0; // IDR 39500 for Indonesian transfers
                break;
            case 'PHP':
                payout = 140.0; // PHP 140 for Philippine transfers
                break;
            case 'VND':
                payout = 61250.0; // VND 61250 for Vietnamese transfers
                break;
            // Latin American currencies
            case 'MXN':
                payout = 45.0; // MXN 45 for Mexican transfers
                break;
            case 'BRL':
                payout = 12.8; // BRL 12.8 for Brazilian transfers
                break;
            case 'ARS':
                payout = 875.0; // ARS 875 for Argentine transfers
                break;
            case 'COP':
                payout = 10250.0; // COP 10250 for Colombian transfers
                break;
            case 'PEN':
                payout = 9.3; // PEN 9.3 for Peruvian transfers
                break;
            case 'CLP':
                payout = 2000.0; // CLP 2000 for Chilean transfers
                break;
            // Other currencies
            case 'ZAR':
                payout = 47.0; // ZAR 47 for South African transfers
                break;
            case 'TRY':
                payout = 71.3; // TRY 71.3 for Turkish transfers
                break;
            default:
                payout = 2.50; // Default to EUR equivalent fee
                break;
        }
        const total = cardProcessing + transfer + payout;
        return {
            cardProcessing,
            transfer,
            payout,
            total: Math.round(total * 100) / 100
        };
    }
    /**
     * Calculate transfer breakdown
     */
    calculateTransferBreakdown(sendAmount, exchangeRate, fees) {
        const sendAmountUSD = sendAmount;
        const cardProcessingFee = fees.cardProcessing;
        const netAmountUSD = sendAmountUSD - cardProcessingFee;
        const grossAmountReceive = netAmountUSD * exchangeRate;
        const transferFee = fees.transfer * exchangeRate; // Convert to receive currency
        const payoutFee = fees.payout;
        const finalAmountReceive = grossAmountReceive - transferFee - payoutFee;
        return {
            sendAmountUSD: Math.round(sendAmountUSD * 100) / 100,
            cardProcessingFee: Math.round(cardProcessingFee * 100) / 100,
            netAmountUSD: Math.round(netAmountUSD * 100) / 100,
            exchangeRate: Math.round(exchangeRate * 10000) / 10000,
            grossAmountReceive: Math.round(grossAmountReceive * 100) / 100,
            transferFee: Math.round(transferFee * 100) / 100,
            payoutFee: Math.round(payoutFee * 100) / 100,
            finalAmountReceive: Math.round(finalAmountReceive * 100) / 100,
            receiveAmount: Math.round(finalAmountReceive * 100) / 100 // Add this for API compatibility
        };
    }
    /**
     * Calculate converted amount after fees
     */
    calculateConvertedAmount(amount, rate, fees) {
        if (amount === 0)
            return 0;
        const netAmount = Math.max(0, amount - fees.total);
        const converted = netAmount * rate;
        return Math.round(converted * 100) / 100;
    }
    /**
     * Check if cached rate is still valid
     */
    isCacheValid(rate) {
        return new Date() < rate.validUntil;
    }
    /**
     * Generate unique rate ID
     */
    generateRateId() {
        return `rate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Clean up expired locked rates
     */
    cleanupExpiredRates() {
        const now = new Date();
        for (const [rateId, lockedRate] of this.lockedRates.entries()) {
            if (now > lockedRate.expiresAt) {
                this.lockedRates.delete(rateId);
            }
        }
    }
    /**
     * Health check for FX service
     */
    async healthCheck() {
        try {
            // Test rate fetch
            await this.getExchangeRate({ fromCurrency: 'USD', toCurrency: 'EUR' });
            return {
                status: 'healthy',
                environment: this.getEnvironment()
            };
        }
        catch (error) {
            return {
                status: 'degraded',
                environment: this.getEnvironment()
            };
        }
    }
    /**
     * Extended health check with FX-specific information
     */
    async fxHealthCheck() {
        try {
            // Test rate fetch
            await this.getExchangeRate({ fromCurrency: 'USD', toCurrency: 'EUR' });
            return {
                status: 'healthy',
                environment: this.getEnvironment(),
                ratesAvailable: true,
                cacheSize: this.rateCache.size
            };
        }
        catch (error) {
            return {
                status: 'degraded',
                environment: this.getEnvironment(),
                ratesAvailable: false,
                cacheSize: this.rateCache.size
            };
        }
    }
    /**
     * Simple getRate method for backward compatibility
     * @param fromCurrency Source currency (e.g., 'USD')
     * @param toCurrency Target currency (e.g., 'EUR')
     * @returns Exchange rate as a number
     */
    async getRate(fromCurrency, toCurrency) {
        const response = await this.getExchangeRate({
            fromCurrency,
            toCurrency
        });
        return response.rate;
    }
}
exports.FXService = FXService;
exports.FxService = FXService;
