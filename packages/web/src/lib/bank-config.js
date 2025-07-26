"use strict";
/**
 * Bank configuration by country
 * This defines the banking infrastructure for each supported country
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COUNTRY_BANKING_CONFIGS = exports.formatRUT = exports.validateRUT = void 0;
exports.getCountriesForCurrency = getCountriesForCurrency;
exports.getBankByCode = getBankByCode;
exports.validateIBAN = validateIBAN;
exports.validateCLABE = validateCLABE;
exports.validateUSRoutingNumber = validateUSRoutingNumber;
exports.validateUKSortCode = validateUKSortCode;
exports.formatSortCode = formatSortCode;
// Import Chilean utilities
import * as chilean_utils_1 from "./chilean-utils";
Object.defineProperty(exports, "validateRUT", { enumerable: true, get: function () { return chilean_utils_1.validateRUT; } });
Object.defineProperty(exports, "formatRUT", { enumerable: true, get: function () { return chilean_utils_1.formatRUT; } });
exports.COUNTRY_BANKING_CONFIGS = {
    // Chile
    CL: {
        countryCode: 'CL',
        countryName: 'Chile',
        currency: 'CLP',
        flag: '🇨🇱',
        banks: [
            { id: 'cl-001', name: 'Banco de Chile', code: '001' },
            { id: 'cl-012', name: 'Banco del Estado (BancoEstado)', code: '012' },
            { id: 'cl-016', name: 'Banco de Crédito e Inversiones (BCI)', code: '016' },
            { id: 'cl-037', name: 'Banco Santander Chile', code: '037' },
            { id: 'cl-039', name: 'Banco Itaú Chile', code: '039' },
            { id: 'cl-049', name: 'Banco Security', code: '049' },
            { id: 'cl-051', name: 'Banco Falabella', code: '051' },
            { id: 'cl-053', name: 'Banco Ripley', code: '053' },
            { id: 'cl-054', name: 'Banco Consorcio', code: '054' },
            { id: 'cl-055', name: 'Banco BICE', code: '055' },
            { id: 'cl-504', name: 'Scotiabank Chile', code: '504' },
        ],
        accountTypes: [
            { value: 'checking', label: 'Cuenta Corriente' },
            { value: 'savings', label: 'Cuenta de Ahorro' },
            { value: 'vista', label: 'Cuenta Vista' },
            { value: 'rut', label: 'Cuenta RUT (BancoEstado)' }
        ],
        requiredFields: [
            {
                field: 'rut',
                label: 'RUT del Titular',
                type: 'text',
                placeholder: '12.345.678-9',
                validation: 'Chilean RUT',
                maxLength: 12
            },
            {
                field: 'accountNumber',
                label: 'Número de Cuenta',
                type: 'text',
                placeholder: '0123456789',
                maxLength: 20
            }
        ]
    },
    // United States
    US: {
        countryCode: 'US',
        countryName: 'United States',
        currency: 'USD',
        flag: '🇺🇸',
        banks: [
            { id: 'us-boa', name: 'Bank of America', code: 'BOFAUS3N', swift: 'BOFAUS3N' },
            { id: 'us-chase', name: 'JPMorgan Chase', code: 'CHASUS33', swift: 'CHASUS33' },
            { id: 'us-wells', name: 'Wells Fargo', code: 'WFBIUS6S', swift: 'WFBIUS6S' },
            { id: 'us-citi', name: 'Citibank', code: 'CITIUS33', swift: 'CITIUS33' },
            { id: 'us-pnc', name: 'PNC Bank', code: 'PNCCUS33', swift: 'PNCCUS33' },
            { id: 'us-usbank', name: 'U.S. Bank', code: 'USBKUS44', swift: 'USBKUS44' },
            { id: 'us-capital', name: 'Capital One', code: 'HIBKUS44', swift: 'HIBKUS44' },
            { id: 'us-td', name: 'TD Bank', code: 'NRTHUS33', swift: 'NRTHUS33' },
            { id: 'us-regions', name: 'Regions Bank', code: 'UPNBUS44', swift: 'UPNBUS44' },
            { id: 'us-fifth', name: 'Fifth Third Bank', code: 'FTBCUS3C', swift: 'FTBCUS3C' }
        ],
        accountTypes: [
            { value: 'checking', label: 'Checking Account' },
            { value: 'savings', label: 'Savings Account' },
            { value: 'money_market', label: 'Money Market Account' }
        ],
        requiredFields: [
            {
                field: 'routingNumber',
                label: 'Routing Number (ABA)',
                type: 'text',
                placeholder: '123456789',
                validation: 'US Routing Number',
                maxLength: 9
            },
            {
                field: 'accountNumber',
                label: 'Account Number',
                type: 'text',
                placeholder: '1234567890',
                maxLength: 17
            }
        ]
    },
    // Germany (EUR)
    DE: {
        countryCode: 'DE',
        countryName: 'Germany',
        currency: 'EUR',
        flag: '🇩🇪',
        banks: [
            { id: 'de-deutsche', name: 'Deutsche Bank', code: 'DEUTDEFF', swift: 'DEUTDEFF' },
            { id: 'de-commerzbank', name: 'Commerzbank', code: 'COBADEFF', swift: 'COBADEFF' },
            { id: 'de-dkb', name: 'DKB (Deutsche Kreditbank)', code: 'BYLADEM1', swift: 'BYLADEM1' },
            { id: 'de-postbank', name: 'Postbank', code: 'PBNKDEFF', swift: 'PBNKDEFF' },
            { id: 'de-sparkasse', name: 'Sparkasse', code: 'VARIES', swift: 'VARIES' },
            { id: 'de-volksbank', name: 'Volksbank', code: 'VARIES', swift: 'VARIES' },
            { id: 'de-hypovereins', name: 'HypoVereinsbank', code: 'HYVEDEMMXXX', swift: 'HYVEDEMMXXX' }
        ],
        accountTypes: [
            { value: 'girokonto', label: 'Girokonto (Checking)' },
            { value: 'sparkonto', label: 'Sparkonto (Savings)' },
            { value: 'tagesgeld', label: 'Tagesgeldkonto (Daily Savings)' }
        ],
        requiredFields: [
            {
                field: 'iban',
                label: 'IBAN',
                type: 'text',
                placeholder: 'DE89 3704 0044 0532 0130 00',
                validation: 'IBAN',
                maxLength: 34
            }
        ]
    },
    // Spain (EUR)
    ES: {
        countryCode: 'ES',
        countryName: 'Spain',
        currency: 'EUR',
        flag: '🇪🇸',
        banks: [
            { id: 'es-santander', name: 'Banco Santander', code: 'BSCHESMMXXX', swift: 'BSCHESMMXXX' },
            { id: 'es-bbva', name: 'BBVA', code: 'BBVAESMMXXX', swift: 'BBVAESMMXXX' },
            { id: 'es-caixa', name: 'CaixaBank', code: 'CAIXESBBXXX', swift: 'CAIXESBBXXX' },
            { id: 'es-sabadell', name: 'Banco Sabadell', code: 'BSABESBBXXX', swift: 'BSABESBBXXX' },
            { id: 'es-bankinter', name: 'Bankinter', code: 'BKBKESMMXXX', swift: 'BKBKESMMXXX' },
            { id: 'es-unicaja', name: 'Unicaja Banco', code: 'UCJAES2MXXX', swift: 'UCJAES2MXXX' }
        ],
        accountTypes: [
            { value: 'corriente', label: 'Cuenta Corriente' },
            { value: 'ahorro', label: 'Cuenta de Ahorro' },
            { value: 'nomina', label: 'Cuenta Nómina' }
        ],
        requiredFields: [
            {
                field: 'iban',
                label: 'IBAN',
                type: 'text',
                placeholder: 'ES91 2100 0418 4502 0005 1332',
                validation: 'IBAN',
                maxLength: 34
            }
        ]
    },
    // France (EUR)
    FR: {
        countryCode: 'FR',
        countryName: 'France',
        currency: 'EUR',
        flag: '🇫🇷',
        banks: [
            { id: 'fr-bnp', name: 'BNP Paribas', code: 'BNPAFRPPXXX', swift: 'BNPAFRPPXXX' },
            { id: 'fr-credit-agricole', name: 'Crédit Agricole', code: 'AGRIFRPPXXX', swift: 'AGRIFRPPXXX' },
            { id: 'fr-societe', name: 'Société Générale', code: 'SOGEFRPPXXX', swift: 'SOGEFRPPXXX' },
            { id: 'fr-credit-mutuel', name: 'Crédit Mutuel', code: 'CMCIFRPPXXX', swift: 'CMCIFRPPXXX' },
            { id: 'fr-banque-postale', name: 'La Banque Postale', code: 'PSSTFRPPXXX', swift: 'PSSTFRPPXXX' },
            { id: 'fr-lcl', name: 'LCL', code: 'CRLYFRPPXXX', swift: 'CRLYFRPPXXX' }
        ],
        accountTypes: [
            { value: 'courant', label: 'Compte Courant' },
            { value: 'epargne', label: 'Compte Épargne' },
            { value: 'livret_a', label: 'Livret A' }
        ],
        requiredFields: [
            {
                field: 'iban',
                label: 'IBAN',
                type: 'text',
                placeholder: 'FR14 2004 1010 0505 0001 3M02 606',
                validation: 'IBAN',
                maxLength: 34
            }
        ]
    },
    // Italy (EUR)
    IT: {
        countryCode: 'IT',
        countryName: 'Italy',
        currency: 'EUR',
        flag: '🇮🇹',
        banks: [
            { id: 'it-unicredit', name: 'UniCredit', code: 'UNCRITMMXXX', swift: 'UNCRITMMXXX' },
            { id: 'it-intesa', name: 'Intesa Sanpaolo', code: 'BCITITMM', swift: 'BCITITMM' },
            { id: 'it-mps', name: 'Monte dei Paschi di Siena', code: 'PASCITMMXXX', swift: 'PASCITMMXXX' },
            { id: 'it-bnl', name: 'BNL (BNP Paribas)', code: 'BNLIITRR', swift: 'BNLIITRR' },
            { id: 'it-banco-bpm', name: 'Banco BPM', code: 'BAPPIT21', swift: 'BAPPIT21' }
        ],
        accountTypes: [
            { value: 'corrente', label: 'Conto Corrente' },
            { value: 'risparmio', label: 'Conto di Risparmio' },
            { value: 'deposito', label: 'Conto Deposito' }
        ],
        requiredFields: [
            {
                field: 'iban',
                label: 'IBAN',
                type: 'text',
                placeholder: 'IT60 X054 2811 1010 0000 0123 456',
                validation: 'IBAN',
                maxLength: 34
            }
        ]
    },
    // Mexico
    MX: {
        countryCode: 'MX',
        countryName: 'Mexico',
        currency: 'MXN',
        flag: '🇲🇽',
        banks: [
            { id: 'mx-bbva', name: 'BBVA México', code: '012', swift: 'BCMRMXMM' },
            { id: 'mx-santander', name: 'Santander México', code: '014', swift: 'BMSXMXMM' },
            { id: 'mx-banamex', name: 'Citibanamex', code: '002', swift: 'BNMXMXMM' },
            { id: 'mx-banorte', name: 'Banorte', code: '072', swift: 'MENOMXMT' },
            { id: 'mx-hsbc', name: 'HSBC México', code: '021', swift: 'BIMEMXMM' },
            { id: 'mx-scotiabank', name: 'Scotiabank', code: '044', swift: 'MBCOMXMM' },
            { id: 'mx-inbursa', name: 'Inbursa', code: '036', swift: 'INBUMXMM' },
            { id: 'mx-azteca', name: 'Banco Azteca', code: '127', swift: 'AZTKMXMM' }
        ],
        accountTypes: [
            { value: 'checking', label: 'Cuenta de Cheques' },
            { value: 'savings', label: 'Cuenta de Ahorro' },
            { value: 'payroll', label: 'Cuenta de Nómina' }
        ],
        requiredFields: [
            {
                field: 'clabe',
                label: 'CLABE',
                type: 'text',
                placeholder: '012345678901234567',
                validation: 'CLABE',
                maxLength: 18
            }
        ]
    },
    // United Kingdom
    GB: {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        currency: 'GBP',
        flag: '🇬🇧',
        banks: [
            { id: 'gb-hsbc', name: 'HSBC UK', code: 'HBUKGB4B', swift: 'HBUKGB4B' },
            { id: 'gb-barclays', name: 'Barclays', code: 'BUKBGB22', swift: 'BUKBGB22' },
            { id: 'gb-lloyds', name: 'Lloyds Bank', code: 'LOYDGB2L', swift: 'LOYDGB2L' },
            { id: 'gb-natwest', name: 'NatWest', code: 'NWBKGB2L', swift: 'NWBKGB2L' },
            { id: 'gb-santander', name: 'Santander UK', code: 'ABBYGB2L', swift: 'ABBYGB2L' },
            { id: 'gb-halifax', name: 'Halifax', code: 'HLFXGB21', swift: 'HLFXGB21' },
            { id: 'gb-nationwide', name: 'Nationwide', code: 'NAIAGB21', swift: 'NAIAGB21' },
            { id: 'gb-metro', name: 'Metro Bank', code: 'MYMBGB2L', swift: 'MYMBGB2L' }
        ],
        accountTypes: [
            { value: 'current', label: 'Current Account' },
            { value: 'savings', label: 'Savings Account' },
            { value: 'isa', label: 'ISA Account' }
        ],
        requiredFields: [
            {
                field: 'sortCode',
                label: 'Sort Code',
                type: 'text',
                placeholder: '12-34-56',
                validation: 'UK Sort Code',
                maxLength: 8
            },
            {
                field: 'accountNumber',
                label: 'Account Number',
                type: 'text',
                placeholder: '12345678',
                validation: 'UK Account Number',
                maxLength: 8
            }
        ]
    }
};
// Helper functions
function getCountriesForCurrency(currency) {
    return Object.values(exports.COUNTRY_BANKING_CONFIGS).filter(config => config.currency === currency);
}
function getBankByCode(countryCode, bankCode) {
    const country = exports.COUNTRY_BANKING_CONFIGS[countryCode];
    if (!country)
        return undefined;
    return country.banks.find(bank => bank.code === bankCode);
}
// Validation functions for different account number formats
function validateIBAN(iban) {
    // Remove spaces and convert to uppercase
    const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();
    // Check basic format
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIBAN))
        return false;
    // Check length for specific countries
    const countryLengths = {
        DE: 22, ES: 24, FR: 27, IT: 27, GB: 22
    };
    const countryCode = cleanIBAN.substring(0, 2);
    if (countryLengths[countryCode] && cleanIBAN.length !== countryLengths[countryCode]) {
        return false;
    }
    // TODO: Implement full IBAN checksum validation
    return true;
}
function validateCLABE(clabe) {
    // CLABE must be exactly 18 digits
    const cleanCLABE = clabe.replace(/\s/g, '');
    if (!/^\d{18}$/.test(cleanCLABE))
        return false;
    // TODO: Implement CLABE checksum validation
    return true;
}
function validateUSRoutingNumber(routing) {
    // Must be exactly 9 digits
    return /^\d{9}$/.test(routing);
}
function validateUKSortCode(sortCode) {
    // Can be 6 digits or formatted as XX-XX-XX
    const clean = sortCode.replace(/-/g, '');
    return /^\d{6}$/.test(clean);
}
function formatSortCode(sortCode) {
    const clean = sortCode.replace(/-/g, '');
    if (clean.length >= 4) {
        return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
    }
    return clean;
}
