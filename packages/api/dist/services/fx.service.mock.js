"use strict";
// src/services/fx.service.mock.ts
// Mock FxService for testing without API key
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockFxService = void 0;
class MockFxService {
    constructor() {
        this.mockRates = {
            USD: {
                EUR: 0.85,
                GBP: 0.73,
                JPY: 110.0,
                CAD: 1.25,
                AUD: 1.35,
            },
            EUR: {
                USD: 1.18,
                GBP: 0.86,
                JPY: 129.5,
                CAD: 1.47,
                AUD: 1.59,
            },
            GBP: {
                USD: 1.37,
                EUR: 1.16,
                JPY: 150.8,
                CAD: 1.71,
                AUD: 1.85,
            },
        };
    }
    getRate(sourceCurrency, destCurrency) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate API delay
            yield new Promise(resolve => setTimeout(resolve, 100));
            if (sourceCurrency === destCurrency) {
                return 1.0;
            }
            const sourceRates = this.mockRates[sourceCurrency];
            if (!sourceRates || !sourceRates[destCurrency]) {
                throw new Error(`Currency pair not supported: ${sourceCurrency}/${destCurrency}`);
            }
            return sourceRates[destCurrency];
        });
    }
}
exports.MockFxService = MockFxService;
