/**
 * Unit tests for Chilean RUT validation utilities
 */

import {
  validateRUT,
  formatRUT,
  cleanRUT,
  formatRUTInput,
  isValidRUTFormat,
  getRUTValidationError,
  getExampleRUTs,
  isValidChileanUser,
  filterChileanUsers,
  isChileanUsernamePattern,
  formatChileanUserDisplay
} from '../chilean-utils';

describe('Chilean RUT Utilities', () => {
  describe('validateRUT', () => {
    it('should validate correct RUTs', () => {
      const validRUTs = [
        '12.345.678-5',
        '11.111.111-1',
        '22.222.222-2',
        '9.876.543-3',
        '1.234.567-4',
        '12345678-5',
        '111111111',
        '222222222',
        '98765433',
        '12345674'
      ];

      validRUTs.forEach(rut => {
        expect(validateRUT(rut)).toBe(true);
      });
    });

    it('should reject invalid RUTs', () => {
      const invalidRUTs = [
        '12.345.678-6', // Wrong verification digit
        '11.111.111-2', // Wrong verification digit
        '1234567-X',    // Invalid verification digit
        '123456789',    // Too long
        '123456',       // Too short
        '',             // Empty
        '12.345.678',   // Missing verification digit
        'abcdefgh-1',   // Non-numeric body
        '12.345.678-Z'  // Invalid verification digit
      ];

      invalidRUTs.forEach(rut => {
        expect(validateRUT(rut)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(validateRUT(null as unknown as string)).toBe(false);
      expect(validateRUT(undefined as unknown as string)).toBe(false);
      expect(validateRUT(123 as unknown as string)).toBe(false);
    });
  });

  describe('formatRUT', () => {
    it('should format RUTs correctly', () => {
      expect(formatRUT('123456785')).toBe('12.345.678-5');
      expect(formatRUT('111111111')).toBe('11.111.111-1');
      expect(formatRUT('1234567K')).toBe('1.234.567-K');
      expect(formatRUT('98765432')).toBe('9.876.543-2');
    });

    it('should handle already formatted RUTs', () => {
      expect(formatRUT('12.345.678-5')).toBe('12.345.678-5');
      expect(formatRUT('1.234.567-K')).toBe('1.234.567-K');
    });

    it('should handle edge cases', () => {
      expect(formatRUT('')).toBe('');
      expect(formatRUT('1')).toBe('1');
      expect(formatRUT('12')).toBe('1-2');
      expect(formatRUT(null as unknown as string)).toBe('');
      expect(formatRUT(undefined as unknown as string)).toBe('');
    });
  });

  describe('cleanRUT', () => {
    it('should remove formatting characters', () => {
      expect(cleanRUT('12.345.678-5')).toBe('123456785');
      expect(cleanRUT('1.234.567-K')).toBe('1234567K');
      expect(cleanRUT('12 345 678-5')).toBe('123456785');
      expect(cleanRUT('12-345-678-5')).toBe('123456785');
    });

    it('should handle edge cases', () => {
      expect(cleanRUT('')).toBe('');
      expect(cleanRUT(null as unknown as string)).toBe('');
      expect(cleanRUT(undefined as unknown as string)).toBe('');
    });

    it('should convert to uppercase', () => {
      expect(cleanRUT('1234567k')).toBe('1234567K');
      expect(cleanRUT('1.234.567-k')).toBe('1234567K');
    });
  });

  describe('formatRUTInput', () => {
    it('should format input as user types', () => {
      expect(formatRUTInput('1')).toBe('1');
      expect(formatRUTInput('12')).toBe('1-2');
      expect(formatRUTInput('123')).toBe('12-3');
      expect(formatRUTInput('1234')).toBe('123-4');
      expect(formatRUTInput('12345')).toBe('1.234-5');
      expect(formatRUTInput('123456')).toBe('12.345-6');
      expect(formatRUTInput('1234567')).toBe('123.456-7');
      expect(formatRUTInput('12345678')).toBe('1.234.567-8');
      expect(formatRUTInput('123456789')).toBe('12.345.678-9');
    });

    it('should handle K verification digit', () => {
      expect(formatRUTInput('1234567K')).toBe('1.234.567-K');
      expect(formatRUTInput('1234567k')).toBe('1.234.567-K');
    });

    it('should limit to 9 characters', () => {
      expect(formatRUTInput('1234567890')).toBe('12.345.678-9');
      expect(formatRUTInput('12345678901')).toBe('12.345.678-9');
    });

    it('should handle edge cases', () => {
      expect(formatRUTInput('')).toBe('');
      expect(formatRUTInput('abc')).toBe('');
      expect(formatRUTInput('12a34')).toBe('123-4'); // Non-numeric characters are filtered out
    });
  });

  describe('isValidRUTFormat', () => {
    it('should validate format without checking verification digit', () => {
      expect(isValidRUTFormat('12.345.678-5')).toBe(true);
      expect(isValidRUTFormat('12.345.678-9')).toBe(true); // Wrong digit but valid format
      expect(isValidRUTFormat('1.234.567-K')).toBe(true);
      expect(isValidRUTFormat('123456785')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidRUTFormat('123456')).toBe(false); // Too short
      expect(isValidRUTFormat('1234567890')).toBe(false); // Too long
      expect(isValidRUTFormat('abcdefgh-1')).toBe(false); // Non-numeric body
      expect(isValidRUTFormat('12345678-Z')).toBe(false); // Invalid verification digit
      expect(isValidRUTFormat('')).toBe(false);
    });
  });

  describe('getRUTValidationError', () => {
    it('should return appropriate error messages', () => {
      expect(getRUTValidationError('')).toBe('RUT es requerido');
      expect(getRUTValidationError('123456')).toBe('RUT debe tener al menos 7 dígitos');
      expect(getRUTValidationError('1234567890')).toBe('RUT no puede tener más de 9 caracteres');
      expect(getRUTValidationError('abcdefg-1')).toBe('RUT debe contener solo números antes del dígito verificador');
      expect(getRUTValidationError('1234567-Z')).toBe('Dígito verificador debe ser un número del 0-9 o K');
      expect(getRUTValidationError('12.345.678-6')).toBe('Dígito verificador no es válido');
    });

    it('should handle valid RUTs', () => {
      // For valid RUTs, it should still return the last error message since the function
      // is designed to be called when validation fails
      expect(getRUTValidationError('12.345.678-5')).toBe('RUT no es válido');
    });
  });

  describe('getExampleRUTs', () => {
    it('should return valid example RUTs', () => {
      const examples = getExampleRUTs();
      expect(examples).toHaveLength(5);
      
      examples.forEach(rut => {
        expect(validateRUT(rut)).toBe(true);
      });
    });

    it('should return formatted RUTs', () => {
      const examples = getExampleRUTs();
      examples.forEach(rut => {
        expect(rut).toMatch(/^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/);
      });
    });
  });

  describe('Integration tests', () => {
    it('should work together for complete RUT processing', () => {
      const userInput = '123456785';
      
      // Format for display
      const formatted = formatRUT(userInput);
      expect(formatted).toBe('12.345.678-5');
      
      // Validate
      expect(validateRUT(formatted)).toBe(true);
      
      // Clean for storage
      const cleaned = cleanRUT(formatted);
      expect(cleaned).toBe('123456785');
      
      // Validate cleaned version
      expect(validateRUT(cleaned)).toBe(true);
    });

    it('should handle user typing simulation', () => {
      const typingSequence = ['1', '12', '123', '1234', '12345', '123456', '1234567', '12345678', '123456785'];
      const expectedFormats = ['1', '1-2', '12-3', '123-4', '1.234-5', '12.345-6', '123.456-7', '1.234.567-8', '12.345.678-5'];
      
      typingSequence.forEach((input, index) => {
        const formatted = formatRUTInput(input);
        expect(formatted).toBe(expectedFormats[index]);
      });
    });
  });

  describe('Chilean User Search Utilities', () => {
    describe('isValidChileanUser', () => {
      it('should identify valid Chilean users', () => {
        const validUser = {
          id: '1',
          verifiedPaymentMethods: [
            { currency: 'CLP', country: 'CL' },
            { currency: 'USD', country: 'US' }
          ]
        };
        
        expect(isValidChileanUser(validUser)).toBe(true);
      });

      it('should reject users without Chilean accounts', () => {
        const invalidUser = {
          id: '1',
          verifiedPaymentMethods: [
            { currency: 'USD', country: 'US' }
          ]
        };
        
        expect(isValidChileanUser(invalidUser)).toBe(false);
        expect(isValidChileanUser(null)).toBe(false);
        expect(isValidChileanUser({})).toBe(false);
      });
    });

    describe('filterChileanUsers', () => {
      it('should filter array to only Chilean users', () => {
        const users = [
          {
            id: '1',
            verifiedPaymentMethods: [{ currency: 'CLP', country: 'CL' }]
          },
          {
            id: '2',
            verifiedPaymentMethods: [{ currency: 'USD', country: 'US' }]
          },
          {
            id: '3',
            verifiedPaymentMethods: [
              { currency: 'CLP', country: 'CL' },
              { currency: 'USD', country: 'US' }
            ]
          }
        ];
        
        const chileanUsers = filterChileanUsers(users);
        expect(chileanUsers).toHaveLength(2);
        expect(chileanUsers.map(u => u.id)).toEqual(['1', '3']);
      });
    });

    describe('isChileanUsernamePattern', () => {
      it('should identify Chilean username patterns', () => {
        expect(isChileanUsernamePattern('juan.perez')).toBe(true);
        expect(isChileanUsernamePattern('maria_gonzalez')).toBe(true);
        expect(isChileanUsernamePattern('carlos123')).toBe(true);
        expect(isChileanUsernamePattern('ana')).toBe(true);
        
        expect(isChileanUsernamePattern('test@email.com')).toBe(false);
        expect(isChileanUsernamePattern('+56912345678')).toBe(false);
        expect(isChileanUsernamePattern('')).toBe(false);
        expect(isChileanUsernamePattern('a')).toBe(false);
      });
    });

    describe('formatChileanUserDisplay', () => {
      it('should format Chilean user display information', () => {
        const user = {
          fullName: 'Juan Pérez',
          username: 'juan.perez',
          email: 'juan@example.com',
          isVerified: true,
          verifiedPaymentMethods: [
            { currency: 'CLP', country: 'CL' },
            { currency: 'CLP', country: 'CL' }
          ]
        };
        
        const display = formatChileanUserDisplay(user);
        
        expect(display.displayName).toBe('Juan Pérez');
        expect(display.subtitle).toBe('@juan.perez');
        expect(display.badges).toContain('Verificado');
        expect(display.badges).toContain('2 cuentas CLP');
      });

      it('should handle users without full names', () => {
        const user = {
          username: 'testuser',
          email: 'test@example.com',
          isVerified: false,
          verifiedPaymentMethods: [
            { currency: 'CLP', country: 'CL' }
          ]
        };
        
        const display = formatChileanUserDisplay(user);
        
        expect(display.displayName).toBe('testuser');
        expect(display.subtitle).toBe('test@example.com');
        expect(display.badges).not.toContain('Verificado');
        expect(display.badges).toContain('1 cuenta CLP');
      });
    });
  });
});