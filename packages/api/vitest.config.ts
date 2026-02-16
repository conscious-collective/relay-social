import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable globals (beforeAll, afterAll, describe, it, etc.)
    globals: true,
    
    // Test environment
    environment: 'node',
    
    // Test files pattern
    include: ['src/**/*.test.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/__tests__/**'],
    },
    
    // Test timeout
    testTimeout: 30000,
    
    // Hook timeout
    hookTimeout: 30000,
    
    // Global setup
    setupFiles: ['src/__tests__/setup.ts'],
    
    // Pool options
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});