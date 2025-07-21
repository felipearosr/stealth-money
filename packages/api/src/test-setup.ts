// Test setup file for Jest
// This file is run before each test file

// Mock environment variables for tests
process.env.CIRCLE_API_KEY = 'test-api-key';
process.env.CIRCLE_ENVIRONMENT = 'sandbox';

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});