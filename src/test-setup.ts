import '@testing-library/jest-dom';

// Setup environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-12345';

// Polyfills for MSW v2 in Jest environment
import { TextEncoder, TextDecoder } from 'util';
import { Blob } from 'buffer';
import { ReadableStream } from 'stream/web';

Object.assign(global, { 
  TextDecoder, 
  TextEncoder, 
  Blob,
  ReadableStream
});

// Mock fetch for Jest environment (simpler than undici)
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock Web API constructors properly
global.Request = jest.fn().mockImplementation((input: string | Request, init?: RequestInit) => ({
  url: typeof input === 'string' ? input : input.url,
  method: init?.method || 'GET',
  headers: new Map(),
  body: init?.body || null,
  clone: jest.fn(),
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  json: jest.fn(),
  text: jest.fn(),
})) as any;

global.Response = jest.fn().mockImplementation((body?: BodyInit | null, init?: ResponseInit) => ({
  ok: init?.status ? init.status >= 200 && init.status < 300 : true,
  status: init?.status || 200,
  statusText: init?.statusText || 'OK',
  headers: new Map(),
  body,
  clone: jest.fn(),
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  json: jest.fn(),
  text: jest.fn(),
})) as any;

global.Headers = jest.fn().mockImplementation((init?: HeadersInit) => {
  const headers = new Map<string, string>();
  
  if (init) {
    if (Array.isArray(init)) {
      init.forEach(([key, value]) => headers.set(key.toLowerCase(), value));
    } else if (init instanceof Headers) {
      // Handle Headers instance
      init.forEach((value, key) => headers.set(key.toLowerCase(), value));
    } else {
      // Handle object
      Object.entries(init).forEach(([key, value]) => headers.set(key.toLowerCase(), value));
    }
  }
  
  return {
    append: jest.fn((key: string, value: string) => headers.set(key.toLowerCase(), value)),
    delete: jest.fn((key: string) => headers.delete(key.toLowerCase())),
    get: jest.fn((key: string) => headers.get(key.toLowerCase()) || null),
    has: jest.fn((key: string) => headers.has(key.toLowerCase())),
    set: jest.fn((key: string, value: string) => headers.set(key.toLowerCase(), value)),
    forEach: jest.fn((callback: (value: string, key: string) => void) => {
      headers.forEach((value, key) => callback(value, key));
    }),
    entries: jest.fn(() => headers.entries()),
    keys: jest.fn(() => headers.keys()),
    values: jest.fn(() => headers.values()),
    [Symbol.iterator]: jest.fn(() => headers.entries()),
  };
}) as any;

import { server } from './mocks/server';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Clerk auth
jest.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      fullName: 'Test User',
    },
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    userId: 'test-user-id',
    isLoaded: true,
    isSignedIn: true,
  }),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock framer motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    option: 'option',
    label: 'label',
    ul: 'ul',
    li: 'li',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers that we may add during the tests
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn(); 