import { vi } from 'vitest';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key';
process.env.BASE_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};