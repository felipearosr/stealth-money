import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000'

// Mock fetch globally
global.fetch = jest.fn()

// Setup fetch mock reset
beforeEach(() => {
  fetch.mockClear()
})