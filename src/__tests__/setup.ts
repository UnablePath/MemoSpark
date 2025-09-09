import '@testing-library/jest-dom';

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    reload: jest.fn(),
    assign: jest.fn(),
  },
  writable: true,
});

// Mock process.env for tests
process.env = {
  ...process.env,
  NODE_ENV: 'test',
};

// Setup global test utilities
export const createMockElement = (tagName: string = 'div', attributes: Record<string, string> = {}) => {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

export const createMockEvent = (type: string, options: EventInit = {}) => {
  return new Event(type, options);
};

export const createMockKeyboardEvent = (key: string, options: KeyboardEventInit = {}) => {
  return new KeyboardEvent('keydown', { key, ...options });
};

export const createMockMouseEvent = (type: string, options: MouseEventInit = {}) => {
  return new MouseEvent(type, options);
};

// Helper to wait for async operations in tests
export const waitFor = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to flush all pending promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));
