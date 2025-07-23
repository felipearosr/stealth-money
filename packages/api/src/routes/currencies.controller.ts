// src/routes/currencies.controller.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CurrencyConfigService } from '../services/currency-config.service';
import { FXService } from '../services/fx.service';
import { generalRateLimit } from '../middleware/security.middleware';

const router = Router();

/**
 * Get all supported currencies
 * GET /api/currencies
 */
router.get('/', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const currencies = CurrencyConfigService.getSupportedCurrencies();
        const sendCurrencies = CurrencyConfigService.getSendCurrencies();
        const receiveCurrencies = CurrencyConfigService.getReceiveCurrencies();

        res.json({
            currencies: Object.values(currencies).map(currency => ({
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                flag: currency.flag,
                countries: currency.countries,
                minAmount: currency.minAmount,
                maxAmount: currency.maxAmount,
                decimalPlaces: currency.decimalPlaces,
                isActive: currency.isActive,
                canSend: sendCurrencies.includes(currency.code),
                canReceive: receiveCurrencies.includes(currency.code)
            })),
            sendCurrencies,
            receiveCurrencies,
            totalCurrencies: Object.keys(currencies).length,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        res.status(500).json({
            error: 'CURRENCIES_FETCH_FAILED',
            message: 'Failed to fetch supported currencies',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Get supported currency pairs
 * GET /api/currencies/pairs
 */
router.get('/pairs', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const pairs = CurrencyConfigService.getSupportedCurrencyPairs();

        res.json({
            pairs: pairs.map(pair => ({
                from: pair.from,
                to: pair.to,
                isSupported: pair.isSupported,
                minAmount: pair.minAmount,
                maxAmount: pair.maxAmount,
                estimatedArrival: pair.estimatedArrival
            })),
            totalPairs: pairs.length,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching currency pairs:', error);
        res.status(500).json({
            error: 'CURRENCY_PAIRS_FETCH_FAILED',
            message: 'Failed to fetch supported currency pairs',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Currency configuration health check
 * GET /api/currencies/health
 */
router.get('/health', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const healthCheck = CurrencyConfigService.healthCheck();
        const fxService = new FXService();
        const fxHealthCheck = await fxService.fxHealthCheck();

        res.json({
            currencyConfig: healthCheck,
            fxService: fxHealthCheck,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Currency health check error:', error);
        res.status(500).json({
            error: 'HEALTH_CHECK_FAILED',
            message: 'Currency service health check failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Get specific currency information
 * GET /api/currencies/:code
 */
router.get('/:code', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const currencySchema = z.object({
            code: z.string().length(3).regex(/^[A-Z]{3}$/)
        });

        const { code } = currencySchema.parse({
            code: req.params.code.toUpperCase()
        });

        const currency = CurrencyConfigService.getCurrency(code);
        if (!currency) {
            return res.status(404).json({
                error: 'CURRENCY_NOT_FOUND',
                message: `Currency ${code} is not supported`,
                supportedCurrencies: CurrencyConfigService.getSendCurrencies().concat(CurrencyConfigService.getReceiveCurrencies())
            });
        }

        const sendCurrencies = CurrencyConfigService.getSendCurrencies();
        const receiveCurrencies = CurrencyConfigService.getReceiveCurrencies();

        res.json({
            ...currency,
            canSend: sendCurrencies.includes(currency.code),
            canReceive: receiveCurrencies.includes(currency.code),
            displayName: CurrencyConfigService.getCurrencyDisplayName(currency.code),
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_CURRENCY_CODE',
                message: 'Currency code must be a 3-letter ISO code',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Error fetching currency:', error);
        res.status(500).json({
            error: 'CURRENCY_FETCH_FAILED',
            message: 'Failed to fetch currency information',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Validate currency pair and amount
 * POST /api/currencies/validate
 */
router.post('/validate', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const validateSchema = z.object({
            sendCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
            receiveCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
            amount: z.number().min(0.01)
        });

        const { sendCurrency, receiveCurrency, amount } = validateSchema.parse(req.body);

        // Validate currency pair
        const validationError = CurrencyConfigService.validateCurrencyPair(
            sendCurrency,
            receiveCurrency,
            amount
        );

        if (validationError) {
            return res.status(400).json({
                isValid: false,
                error: 'VALIDATION_FAILED',
                message: validationError,
                details: {
                    sendCurrency,
                    receiveCurrency,
                    amount
                }
            });
        }

        // Get currency pair information
        const pair = CurrencyConfigService.getCurrencyPair(sendCurrency, receiveCurrency);

        res.json({
            isValid: true,
            pair: pair ? {
                from: pair.from,
                to: pair.to,
                minAmount: pair.minAmount,
                maxAmount: pair.maxAmount,
                estimatedArrival: pair.estimatedArrival
            } : null,
            validatedAmount: amount,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'Request validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Error validating currency pair:', error);
        res.status(500).json({
            error: 'VALIDATION_FAILED',
            message: 'Failed to validate currency pair',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Get current exchange rates for a currency pair
 * GET /api/currencies/rates/:from/:to
 */
router.get('/rates/:from/:to', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const rateSchema = z.object({
            from: z.string().length(3).regex(/^[A-Z]{3}$/),
            to: z.string().length(3).regex(/^[A-Z]{3}$/)
        });

        const { from, to } = rateSchema.parse({
            from: req.params.from.toUpperCase(),
            to: req.params.to.toUpperCase()
        });

        // Validate currency pair is supported
        if (!CurrencyConfigService.isCurrencyPairSupported(from, to)) {
            return res.status(400).json({
                error: 'UNSUPPORTED_CURRENCY_PAIR',
                message: `Currency pair ${from} to ${to} is not supported`,
                supportedPairs: CurrencyConfigService.getSupportedCurrencyPairs().map(p => `${p.from}-${p.to}`)
            });
        }

        const fxService = new FXService();
        const exchangeRate = await fxService.getExchangeRate({
            fromCurrency: from,
            toCurrency: to
        });

        res.json({
            fromCurrency: exchangeRate.fromCurrency,
            toCurrency: exchangeRate.toCurrency,
            rate: exchangeRate.rate,
            inverseRate: exchangeRate.inverseRate,
            rateId: exchangeRate.rateId,
            validUntil: exchangeRate.validUntil.toISOString(),
            fees: exchangeRate.fees,
            timestamp: exchangeRate.timestamp.toISOString(),
            source: exchangeRate.source
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_CURRENCY_CODES',
                message: 'Currency codes must be 3-letter ISO codes',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Error fetching exchange rate:', error);
        res.status(500).json({
            error: 'EXCHANGE_RATE_FETCH_FAILED',
            message: 'Failed to fetch exchange rate',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Lock an exchange rate for a specific duration
 * POST /api/currencies/rates/lock
 */
router.post('/rates/lock', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const lockRateSchema = z.object({
            fromCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
            toCurrency: z.string().length(3).regex(/^[A-Z]{3}$/),
            amount: z.number().min(0.01),
            lockDurationMinutes: z.number().min(1).max(60).optional().default(10)
        });

        const { fromCurrency, toCurrency, amount, lockDurationMinutes } = lockRateSchema.parse(req.body);

        // Validate currency pair
        const validationError = CurrencyConfigService.validateCurrencyPair(
            fromCurrency,
            toCurrency,
            amount
        );

        if (validationError) {
            return res.status(400).json({
                error: 'VALIDATION_FAILED',
                message: validationError
            });
        }

        const fxService = new FXService();
        const lockedRate = await fxService.lockExchangeRate({
            fromCurrency,
            toCurrency,
            amount,
            lockDurationMinutes
        });

        res.json({
            rateId: lockedRate.rateId,
            fromCurrency: lockedRate.fromCurrency,
            toCurrency: lockedRate.toCurrency,
            rate: lockedRate.rate,
            amount: lockedRate.amount,
            convertedAmount: lockedRate.convertedAmount,
            fees: lockedRate.fees,
            lockedAt: lockedRate.lockedAt.toISOString(),
            expiresAt: lockedRate.expiresAt.toISOString(),
            isLocked: lockedRate.isLocked
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'Request validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Error locking exchange rate:', error);
        res.status(500).json({
            error: 'RATE_LOCK_FAILED',
            message: 'Failed to lock exchange rate',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Get rate history for analytics
 * GET /api/currencies/rates/:from/:to/history
 */
router.get('/rates/:from/:to/history', generalRateLimit, async (req: Request, res: Response) => {
    try {
        const historySchema = z.object({
            from: z.string().length(3).regex(/^[A-Z]{3}$/),
            to: z.string().length(3).regex(/^[A-Z]{3}$/),
            hours: z.string().regex(/^\d+$/).transform(Number).optional().default("24")
        });

        const { from, to } = historySchema.parse({
            from: req.params.from.toUpperCase(),
            to: req.params.to.toUpperCase()
        });

        const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;

        // Validate currency pair is supported
        if (!CurrencyConfigService.isCurrencyPairSupported(from, to)) {
            return res.status(400).json({
                error: 'UNSUPPORTED_CURRENCY_PAIR',
                message: `Currency pair ${from} to ${to} is not supported`
            });
        }

        const fxService = new FXService();
        const history = await fxService.getRateHistory(from, to, hours);

        res.json({
            fromCurrency: from,
            toCurrency: to,
            hours,
            history: history.map(entry => ({
                rate: entry.rate,
                timestamp: entry.timestamp.toISOString()
            })),
            totalEntries: history.length,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'Request validation failed',
                details: error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }))
            });
        }

        console.error('Error fetching rate history:', error);
        res.status(500).json({
            error: 'RATE_HISTORY_FETCH_FAILED',
            message: 'Failed to fetch rate history',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;