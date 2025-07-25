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
const account_controller_1 = __importDefault(require("./routes/account.controller"));
const currencies_controller_1 = __importDefault(require("./routes/currencies.controller"));
const users_controller_1 = __importDefault(require("./routes/users.controller"));
const verification_controller_1 = __importDefault(require("./routes/verification.controller"));
const cookathon_routes_1 = __importDefault(require("./routes/cookathon.routes"));
const database_simple_service_1 = require("./services/database-simple.service");
const security_middleware_1 = require("./middleware/security.middleware");
const logging_middleware_1 = require("./middleware/logging.middleware");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4000', 10);
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(__dirname, '../logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
logging_middleware_1.logger.info('Starting Stealth Money API', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV,
    blockchainMode: process.env.BLOCKCHAIN_MODE || 'mock'
});
// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);
// Security middleware (order matters!)
app.use(security_middleware_1.requestId);
app.use(security_middleware_1.helmetConfig);
app.use(security_middleware_1.speedLimiter);
app.use(security_middleware_1.generalRateLimit);
app.use((0, cors_1.default)(security_middleware_1.corsConfig));
// Request logging middleware
app.use(logging_middleware_1.requestLogger);
// Input sanitization middleware
app.use(security_middleware_1.sanitizeInput);
// CRITICAL: Raw body parsing for Stripe webhooks MUST come before express.json()
// Stripe requires the raw, unparsed body for signature verification
app.use('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json({ limit: '10mb' })); // Enable JSON body parsing with size limit
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
// Email-based balance lookup (for Clerk integration)
app.get('/balance-by-email/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const dbService = new database_simple_service_1.SimpleDatabaseService();
        // Find all transactions where this email is the recipient
        const receivedTransactions = await dbService.getTransactionsReceivedByEmail(email);
        // Calculate totals
        const totalReceived = receivedTransactions.reduce((sum, tx) => {
            const amount = typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0;
            return sum + amount;
        }, 0);
        // For now, assume no money sent (since we're just receiving)
        const totalSent = 0;
        const availableBalance = totalReceived - totalSent;
        // Get recent received transactions
        const recentReceived = receivedTransactions
            .filter((tx) => tx.status === 'COMPLETED')
            .slice(0, 5)
            .map((tx) => ({
            id: tx.id,
            amount: typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0,
            currency: tx.destCurrency,
            from: tx.userId,
            status: tx.status,
            date: tx.createdAt
        }));
        res.json({
            email,
            totalSent: parseFloat(totalSent.toFixed(2)),
            totalReceived: parseFloat(totalReceived.toFixed(2)),
            availableBalance: parseFloat(availableBalance.toFixed(2)),
            recentReceived,
            message: "This balance will be available when you create your Clerk account with this email"
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to get balance by email',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Test account balance for any user
app.get('/test-balance/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const dbService = new database_simple_service_1.SimpleDatabaseService();
        // Get all transactions for the user (sent and received)
        const sentTransactions = await dbService.getTransactionsByUserId(userId);
        const receivedTransactions = await dbService.getTransactionsReceivedByUserId(userId);
        // Calculate totals with safety checks
        const totalSent = sentTransactions.reduce((sum, tx) => {
            const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0;
            return sum + amount;
        }, 0);
        const totalReceived = receivedTransactions.reduce((sum, tx) => {
            const amount = typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0;
            return sum + amount;
        }, 0);
        const availableBalance = totalReceived - totalSent;
        // Get recent received transactions
        const recentReceived = receivedTransactions
            .filter(tx => tx.status === 'COMPLETED')
            .slice(0, 5)
            .map(tx => ({
            id: tx.id,
            amount: typeof tx.recipientAmount === 'number' ? tx.recipientAmount : parseFloat(tx.recipientAmount) || 0,
            currency: tx.destCurrency,
            from: tx.userId,
            status: tx.status,
            date: tx.createdAt
        }));
        res.json({
            userId,
            totalSent: parseFloat(totalSent.toFixed(2)),
            totalReceived: parseFloat(totalReceived.toFixed(2)),
            availableBalance: parseFloat(availableBalance.toFixed(2)),
            recentReceived
        });
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to get account balance',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Direct exchange rate test
app.get('/test-rate', async (req, res) => {
    try {
        const { FxService } = await Promise.resolve().then(() => __importStar(require('./services/fx.service')));
        const fxService = new FxService();
        const rate = await fxService.getRate('USD', 'EUR');
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
});
// Wire up the transfer routes with /api prefix
app.use('/api', transfers_controller_1.default);
// Wire up the webhook routes with /api prefix
app.use('/api/webhooks', webhooks_controller_1.default);
// Wire up the account routes with /api prefix
app.use('/api', account_controller_1.default);
// Wire up the currency routes with /api prefix
app.use('/api/currencies', currencies_controller_1.default);
// Wire up the user routes with /api prefix
app.use('/api/users', users_controller_1.default);
// Wire up the verification routes with /api prefix
app.use('/api', verification_controller_1.default);
// Wire up the cookathon routes with /api prefix
app.use('/api/cookathon', cookathon_routes_1.default);
// Error logging middleware
app.use(logging_middleware_1.errorLogger);
// Global error handling middleware
app.use((err, req, res, next) => {
    const requestId = req.headers['x-request-id'];
    logging_middleware_1.logger.error('Unhandled application error', {
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack
        },
        requestId,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'Something went wrong',
        requestId,
        ...(isDevelopment && { stack: err.stack })
    });
});
// Initialize database and start server
async function startServer() {
    try {
        const dbService = new database_simple_service_1.SimpleDatabaseService();
        // Test database connection and initialize tables
        console.log('🔌 Testing database connection...');
        const connected = await dbService.testConnection();
        if (connected) {
            console.log('📊 Initializing database tables...');
            const initialized = await dbService.initialize();
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
}
startServer();
