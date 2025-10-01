import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom environment to provide browser-like APIs
    environment: 'jsdom',
    // Setup files to run before each test file
    setupFiles: ['./src/test/setup.ts'],
    // Global test utilities
    globals: true,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js',
        '**/*.config.ts'
      ]
    },
    // Handle static assets
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
    // Exclude e2e tests
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/*.e2e.{js,ts,jsx,tsx}'
    ]
  },
  // Define global constants
  define: {
    global: 'globalThis',
  },
});