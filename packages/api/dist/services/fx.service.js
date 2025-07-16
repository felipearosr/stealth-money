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
exports.FxService = void 0;
// src/services/fx.service.ts
const axios_1 = __importDefault(require("axios"));
const fx_service_mock_1 = require("./fx.service.mock");
const API_KEY = process.env.EXCHANGERATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/`;
class FxService {
    constructor() {
        this.mockService = new fx_service_mock_1.MockFxService();
    }
    getRate(sourceCurrency, destCurrency) {
        return __awaiter(this, void 0, void 0, function* () {
            // Use mock service if no API key is provided or API key is placeholder
            if (!API_KEY || API_KEY === 'your_api_key_here') {
                console.log('🧪 Using mock exchange rates (no API key configured)');
                return this.mockService.getRate(sourceCurrency, destCurrency);
            }
            try {
                const response = yield axios_1.default.get(`${BASE_URL}${sourceCurrency}`);
                const rates = response.data.conversion_rates;
                if (!rates || !rates[destCurrency]) {
                    throw new Error(`Currency not found: ${destCurrency}`);
                }
                console.log(`✅ Real exchange rate: ${sourceCurrency}/${destCurrency} = ${rates[destCurrency]}`);
                return rates[destCurrency];
            }
            catch (error) {
                console.error('Error fetching exchange rate:', error);
                console.log('🔄 Falling back to mock exchange rates');
                // Fallback to mock service if API fails
                return this.mockService.getRate(sourceCurrency, destCurrency);
            }
        });
    }
}
exports.FxService = FxService;
