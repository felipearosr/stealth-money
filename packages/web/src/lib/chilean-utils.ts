/**
 * Chilean-specific utility functions
 * Includes RUT validation, formatting, and other Chilean market utilities
 */

/**
 * Validates a Chilean RUT (Rol Único Tributario)
 * @param rut - The RUT string to validate (can include dots and hyphen)
 * @returns boolean indicating if the RUT is valid
 */
export function validateRUT(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  // Remove dots, hyphens, and spaces, convert to uppercase
  const cleanRut = rut.replace(/[\.\-\s]/g, '').toUpperCase();
  
  // Check basic format: 7-8 digits + 1 verification digit
  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return false;
  }

  // Check if all characters except the last one are digits
  const body = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1);
  
  if (!/^\d+$/.test(body)) {
    return false;
  }

  // Check if verification digit is valid (0-9 or K)
  if (!/^[0-9K]$/.test(verificationDigit)) {
    return false;
  }

  // Calculate the verification digit using the Chilean algorithm
  let sum = 0;
  let multiplier = 2;
  
  // Process digits from right to left
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  // Calculate expected verification digit
  const remainder = sum % 11;
  const expectedDV = 11 - remainder;
  
  let calculatedVerificationDigit: string;
  if (expectedDV === 11) {
    calculatedVerificationDigit = '0';
  } else if (expectedDV === 10) {
    calculatedVerificationDigit = 'K';
  } else {
    calculatedVerificationDigit = expectedDV.toString();
  }
  
  return verificationDigit === calculatedVerificationDigit;
}

/**
 * Formats a RUT string with dots and hyphen for display
 * @param rut - The RUT string to format
 * @returns Formatted RUT string (e.g., "12.345.678-9")
 */
export function formatRUT(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return '';
  }

  // Remove all non-alphanumeric characters and convert to uppercase
  const cleanRut = rut.replace(/[^0-9K]/gi, '').toUpperCase();
  
  if (cleanRut.length < 2) {
    return cleanRut;
  }
  
  // Separate body and verification digit
  const body = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1);
  
  // Add dots every 3 digits from right to left
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${formattedBody}-${verificationDigit}`;
}

/**
 * Cleans a RUT string by removing formatting characters
 * @param rut - The RUT string to clean
 * @returns Clean RUT string without dots, hyphens, or spaces
 */
export function cleanRUT(rut: string): string {
  if (!rut || typeof rut !== 'string') {
    return '';
  }
  
  return rut.replace(/[\.\-\s]/g, '').toUpperCase();
}

/**
 * Formats RUT input as user types (for input fields)
 * @param value - Current input value
 * @param _previousValue - Previous input value (to handle deletions) - currently unused
 * @returns Formatted RUT string
 */
export function formatRUTInput(value: string, _previousValue: string = ''): string {
  if (!value) {
    return '';
  }

  // Remove all non-alphanumeric characters
  const cleanValue = value.replace(/[^0-9K]/gi, '').toUpperCase();
  
  // Limit to maximum 9 characters (8 digits + 1 verification digit)
  const limitedValue = cleanValue.slice(0, 9);
  
  // If we have at least 2 characters, format with hyphen before last character
  if (limitedValue.length >= 2) {
    const body = limitedValue.slice(0, -1);
    const verificationDigit = limitedValue.slice(-1);
    
    // Add dots to body every 3 digits from right to left
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${formattedBody}-${verificationDigit}`;
  }
  
  return limitedValue;
}

/**
 * Validates if a string could be a valid RUT format (for real-time validation)
 * This is more lenient than validateRUT and is used for input validation
 * @param rut - The RUT string to check
 * @returns boolean indicating if the format could be valid
 */
export function isValidRUTFormat(rut: string): boolean {
  if (!rut || typeof rut !== 'string') {
    return false;
  }

  const cleanRut = cleanRUT(rut);
  
  // Must be between 7-9 characters
  if (cleanRut.length < 7 || cleanRut.length > 9) {
    return false;
  }
  
  // All characters except the last must be digits
  const body = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1);
  
  if (!/^\d+$/.test(body)) {
    return false;
  }
  
  // Verification digit must be 0-9 or K
  if (!/^[0-9K]$/.test(verificationDigit)) {
    return false;
  }
  
  return true;
}

/**
 * Gets a user-friendly error message for RUT validation
 * @param rut - The RUT string that failed validation
 * @returns Localized error message
 */
export function getRUTValidationError(rut: string): string {
  if (!rut || rut.trim() === '') {
    return 'RUT es requerido';
  }
  
  const cleanRut = cleanRUT(rut);
  
  if (cleanRut.length < 7) {
    return 'RUT debe tener al menos 7 dígitos';
  }
  
  if (cleanRut.length > 9) {
    return 'RUT no puede tener más de 9 caracteres';
  }
  
  const body = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1);
  
  if (!/^\d+$/.test(body)) {
    return 'RUT debe contener solo números antes del dígito verificador';
  }
  
  if (!/^[0-9K]$/.test(verificationDigit)) {
    return 'Dígito verificador debe ser un número del 0-9 o K';
  }
  
  if (!validateRUT(rut)) {
    return 'Dígito verificador no es válido';
  }
  
  return 'RUT no es válido';
}

/**
 * Generates example RUTs for testing purposes
 * @returns Array of valid RUT examples
 */
export function getExampleRUTs(): string[] {
  return [
    '12.345.678-5',
    '11.111.111-1',
    '22.222.222-2',
    '9.876.543-3',
    '1.234.567-4'
  ];
}