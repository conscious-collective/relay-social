# Testing Guide

This project includes comprehensive testing at multiple levels:

## Test Types

### 1. API Unit Tests
- **Location:** `packages/api/src/__tests__/`
- **Framework:** Vitest + Supertest
- **Purpose:** Test API endpoints, business logic, and data operations

### 2. E2E Tests
- **Location:** `packages/dashboard/e2e/`
- **Framework:** Playwright
- **Purpose:** Test full user flows in real browsers

## Running Tests

### API Tests
```bash
# Install dependencies
cd packages/api
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### E2E Tests
```bash
# Install dependencies
cd packages/dashboard
npm install

# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

### All Tests
```bash
# From root directory
npm test           # API tests
cd packages/dashboard && npm run test:e2e  # E2E tests
```

## CI/CD Pipeline

Tests run automatically on:
- Pull requests to `main` and `develop` branches
- Push to `main` and `develop` branches

### Pipeline Jobs:
1. **API Tests** - Unit and integration tests
2. **Dashboard Tests** - Build verification
3. **E2E Tests** - Full browser testing
4. **Lint & Type Check** - Code quality
5. **Security Audit** - Vulnerability scanning

## Environment Variables

### For Testing
```env
# API Tests
TEST_API_KEY=relay_sk_test_key
DATABASE_URL=file:./test-relay.db

# E2E Tests  
DASHBOARD_URL=http://localhost:3000
API_URL=http://localhost:3001
```

## Writing Tests

### API Test Example
```typescript
import { describe, it, expect } from 'vitest';

describe('Posts API', () => {
  it('should create a post', async () => {
    const response = await request(API_URL)
      .post('/api/posts')
      .set(authHeader)
      .send({ account_id, content: 'Test' });
    
    expect(response.status).toBe(201);
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should display dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
```

## Test Coverage Goals
- API: 80%+ coverage
- Critical E2E flows: 100%