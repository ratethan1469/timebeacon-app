import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Declare global to avoid TypeScript error
declare global {
  interface Window {
    indexedDB: any;
    localStorage: any;
    location: any;
    confirm: any;
  }
  // Add global object for Node.js compatibility
  var global: typeof globalThis;
}

// Mock IndexedDB for testing
const mockData = new Map();

const createMockRequest = (result?: any) => {
  const request = {
    onsuccess: null as ((event: any) => void) | null,
    onerror: null as ((event: any) => void) | null,
    result: result
  };
  
  setTimeout(() => {
    if (request.onsuccess) {
      request.onsuccess({ target: { result } });
    }
  }, 0);
  
  return request;
};

const mockIndexedDB = {
  open: vi.fn().mockImplementation((_dbName: string, _version?: number) => {
    const request = {
      onsuccess: null as ((event: any) => void) | null,
      onerror: null as ((event: any) => void) | null,
      onupgradeneeded: null as ((event: any) => void) | null,
      result: {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false)
        },
        createObjectStore: vi.fn().mockReturnValue({
          createIndex: vi.fn()
        }),
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            add: vi.fn().mockImplementation((data) => {
              mockData.set(data.id, data);
              return createMockRequest();
            }),
            put: vi.fn().mockImplementation((data) => {
              mockData.set(data.id, data);
              return createMockRequest();
            }),
            get: vi.fn().mockImplementation((id) => {
              return createMockRequest(mockData.get(id));
            }),
            getAll: vi.fn().mockImplementation(() => {
              return createMockRequest(Array.from(mockData.values()));
            }),
            delete: vi.fn().mockImplementation((id) => {
              mockData.delete(id);
              return createMockRequest();
            }),
            clear: vi.fn().mockImplementation(() => {
              mockData.clear();
              return createMockRequest();
            })
          })
        })
      }
    };
    
    // Simulate successful database opening
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: { result: request.result } });
      }
    }, 0);
    
    return request;
  })
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn((key: string, value: string) => {}),
  removeItem: vi.fn((key: string) => {}),
  clear: vi.fn(() => {}),
  length: 0,
  key: vi.fn((index: number) => null)
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn()
  },
  writable: true
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true
});

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9))
  }
});

// Mock import.meta.env for Vite environment variables
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
        VITE_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        MODE: 'test',
        DEV: false,
        PROD: false
      }
    }
  },
  writable: true
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Reset localStorage mock
  localStorageMock.getItem.mockReturnValue(null);
  // Reset mock data
  mockData.clear();
});