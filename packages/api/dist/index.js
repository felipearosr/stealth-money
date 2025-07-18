"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const transfers_controller_1 = __importDefault(require("./routes/transfers.controller"));
const webhooks_controller_1 = __importDefault(require("./routes/webhooks.controller"));
const database_simple_service_1 = require("./services/database-simple.service");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4000', 10);
console.log(`🔧 Environment PORT: ${process.env.PORT}`);
console.log(`🔧 Using PORT: ${PORT}`);
app.use((0, cors_1.default)()); // Enable Cross-Origin Resource Sharing
// CRITICAL: Raw body parsing for Stripe webhooks MUST come before express.json()
// Stripe requires the raw, unparsed body for signature verification
app.use('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json()); // Enable JSON body parsing for all other routes
// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Stealth Money API',
        version: '1.0.0',
        status: 'running',
        port: PORT,
        timestamp: new Date().toISOString()
    });
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API is healthy' });
});
// Simple test endpoint
app.get('/test', (req, res) => {
    res.status(200).json({
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        env: {
            hasExchangeRateKey: !!process.env.EXCHANGERATE_API_KEY,
            nodeEnv: process.env.NODE_ENV
        }
    });
});
// Direct exchange rate test
app.get('/test-rate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { FxService } = yield Promise.resolve().then(() => __importStar(require('./services/fx.service')));
        const fxService = new FxService();
        const rate = yield fxService.getRate('USD', 'EUR');
        res.json({
            success: true,
            rate,
            from: 'USD',
            to: 'EUR',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Direct rate test error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
// Debug environment variables
app.get('/debug-env', (req, res) => {
    var _a, _b;
    res.json({
        port: process.env.PORT,
        hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
        hasStripePublishable: !!process.env.STRIPE_PUBLISHABLE_KEY,
        stripeSecretPrefix: (_a = process.env.STRIPE_SECRET_KEY) === null || _a === void 0 ? void 0 : _a.substring(0, 10),
        stripePublishablePrefix: (_b = process.env.STRIPE_PUBLISHABLE_KEY) === null || _b === void 0 ? void 0 : _b.substring(0, 10),
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});
// Wire up the transfer routes with /api prefix
app.use('/api', transfers_controller_1.default);
// Wire up the webhook routes with /api prefix
app.use('/api/webhooks', webhooks_controller_1.default);
// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});
// Initialize database and start server
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dbService = new database_simple_service_1.SimpleDatabaseService();
            // Test database connection and initialize tables
            console.log('🔌 Testing database connection...');
            const connected = yield dbService.testConnection();
            if (connected) {
                console.log('📊 Initializing database tables...');
                const initialized = yield dbService.initialize();
                if (initialized) {
                    console.log('✅ Database ready!');
                }
                else {
                    console.log('⚠️  Database initialization failed, but continuing...');
                }
            }
            else {
                console.log('⚠️  Database connection failed, but continuing...');
            }
            const server = app.listen(PORT, '0.0.0.0', () => {
                console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
                console.log(`📍 Health check: http://0.0.0.0:${PORT}/health`);
                console.log(`🧪 Test endpoint: http://0.0.0.0:${PORT}/test`);
            });
            server.on('error', (error) => {
                console.error('❌ Server error:', error);
            });
        }
        catch (error) {
            console.error('❌ Failed to start server:', error);
            process.exit(1);
        }
    });
}
startServer();
