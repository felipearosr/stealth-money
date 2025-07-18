"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
// src/services/payment.service.ts
const stripe_1 = __importDefault(require("stripe"));
class PaymentService {
    constructor() {
        this.stripe = null;
        this.isConfigured = false;
        const secretKey = process.env.STRIPE_SECRET_KEY;
        console.log('🔍 Stripe Secret Key check:', secretKey ? `${secretKey.substring(0, 15)}...` : 'undefined');
        console.log('🔍 Secret Key starts with sk_:', secretKey === null || secretKey === void 0 ? void 0 : secretKey.startsWith('sk_'));
        console.log('🔍 Secret Key length:', secretKey === null || secretKey === void 0 ? void 0 : secretKey.length);
        if (!secretKey || secretKey === 'sk_test_...' || secretKey.length < 20) {
            console.log('⚠️  Stripe not configured - payment features disabled');
            this.isConfigured = false;
            return;
        }
        try {
            this.stripe = new stripe_1.default(secretKey);
            this.isConfigured = true;
            console.log('✅ Stripe service initialized');
        }
        catch (error) {
            console.log('⚠️  Stripe initialization failed - payment features disabled');
            this.isConfigured = false;
        }
    }
    /**
     * Creates a Stripe Payment Intent.
     * @param amount The amount to be charged, in the smallest currency unit (e.g., cents).
     * @param currency The currency code (e.g., 'usd').
     * @param transactionId The internal transaction ID for tracking.
     */
    createPaymentIntent(amount, currency, transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured || !this.stripe) {
                throw new Error('Stripe not configured - cannot create payment intent');
            }
            try {
                const paymentIntent = yield this.stripe.paymentIntents.create({
                    amount,
                    currency: currency.toLowerCase(),
                    automatic_payment_methods: { enabled: true },
                    metadata: {
                        internalTransactionId: transactionId, // Link Stripe payment to our DB record
                    },
                });
                if (!paymentIntent.client_secret) {
                    throw new Error('Failed to create payment intent.');
                }
                return {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id,
                };
            }
            catch (error) {
                console.error('Error creating Stripe Payment Intent:', error);
                throw new Error('Could not initiate payment.');
            }
        });
    }
    /**
     * Retrieve a payment intent by ID
     */
    getPaymentIntent(paymentIntentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured || !this.stripe) {
                throw new Error('Stripe not configured - cannot retrieve payment intent');
            }
            try {
                return yield this.stripe.paymentIntents.retrieve(paymentIntentId);
            }
            catch (error) {
                console.error('Error retrieving payment intent:', error);
                throw new Error('Could not retrieve payment intent.');
            }
        });
    }
    /**
     * Confirm a payment intent (for server-side confirmation if needed)
     */
    confirmPaymentIntent(paymentIntentId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConfigured || !this.stripe) {
                throw new Error('Stripe not configured - cannot confirm payment intent');
            }
            try {
                return yield this.stripe.paymentIntents.confirm(paymentIntentId);
            }
            catch (error) {
                console.error('Error confirming payment intent:', error);
                throw new Error('Could not confirm payment intent.');
            }
        });
    }
    /**
     * Get Stripe publishable key for frontend
     */
    getPublishableKey() {
        if (!this.isConfigured) {
            throw new Error('Stripe not configured - cannot get publishable key');
        }
        const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey || publishableKey === 'pk_test_...') {
            throw new Error('Stripe publishable key not configured');
        }
        return publishableKey;
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        if (!this.isConfigured || !this.stripe) {
            throw new Error('Stripe not configured - cannot verify webhook signature');
        }
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret || webhookSecret === 'whsec_...') {
            throw new Error('Stripe webhook secret not configured');
        }
        try {
            return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        }
        catch (error) {
            console.error('Webhook signature verification failed:', error);
            throw new Error('Invalid webhook signature');
        }
    }
}
exports.PaymentService = PaymentService;
