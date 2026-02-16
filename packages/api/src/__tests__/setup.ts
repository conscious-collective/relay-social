// Test setup and utilities
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer, Server } from 'http';

// Test configuration
export const TEST_PORT = 3002;
export const TEST_API_URL = `http://localhost:${TEST_PORT}`;

// Global test server instance
let server: Server | null = null;

// Setup test database (use in-memory SQLite for tests)
export function setupTestDatabase() {
  // In a real implementation, you'd use a test database
  // For now, we use the existing SQLite database
  process.env.DATABASE_URL = 'file:./test-relay.db';
}

// Start test server
export async function startTestServer(app: any): Promise<Server> {
  return new Promise((resolve) => {
    server = createServer(app.fetch);
    server.listen(TEST_PORT, () => {
      console.log(`🧪 Test server running on port ${TEST_PORT}`);
      resolve(server as Server);
    });
  });
}

// Stop test server
export async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('🧪 Test server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Generate test API key
export function generateTestApiKey(): string {
  return `relay_test_${Math.random().toString(36).substring(7)}`;
}

// Mock API key header
export function getAuthHeader(key?: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${key || 'relay_test_key'}`,
  };
}

// Clean up test database
export async function cleanupTestDatabase() {
  // In a real implementation, you'd truncate tables
  console.log('🧪 Cleaning up test database...');
}

// Global beforeAll hook
beforeAll(async () => {
  setupTestDatabase();
});

// Global afterAll hook
afterAll(async () => {
  await stopTestServer();
});

// Global afterEach hook
afterEach(async () => {
  // Cleanup between tests
  vi.clearAllMocks();
});