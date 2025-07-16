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
const database_simple_service_1 = require("./services/database-simple.service");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '4000', 10);
app.use((0, cors_1.default)()); // Enable Cross-Origin Resource Sharing
app.use(express_1.default.json()); // Enable JSON body parsing
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
// Wire up the transfer routes with /api prefix
app.use('/api', transfers_controller_1.default);
// Initialize database and start server
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
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
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
        });
    });
}
startServer().catch(console.error);
