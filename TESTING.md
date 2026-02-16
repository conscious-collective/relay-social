# Testing Guide

This project includes automated testing for API and Dashboard builds.

## Test Types

### 1. API Unit Tests
- **Location:** `packages/api/src/__tests__/`
- **Framework:** Vitest
- **Purpose:** Basic smoke tests to verify API modules load correctly

### 2. Dashboard Build Tests
- **Purpose:** Verify Dashboard builds successfully without errors

## Running Tests

### API Tests
```bash
# Install dependencies
cd packages/api
npm install

# Run tests
npm test
```

### Dashboard Build
```bash
# Install dependencies
cd packages/dashboard
npm install

# Build
npm run build
```

### All Tests
```bash
# From root directory
cd packages/api && npm test
cd packages/dashboard && npm run build
```

## CI/CD Pipeline

Tests run automatically on:
- Pull requests to `main` and `develop` branches
- Push to `main` and `develop` branches

### Pipeline Jobs:
1. **API Tests** - Unit tests
2. **Dashboard Tests** - Build verification
3. **Lint & Type Check** - Code quality
4. **Security Audit** - Vulnerability scanning

## Writing Tests

### API Test Example
```typescript
import { describe, it, expect } from 'vitest';

describe('Health Check API', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});
```

## Test Coverage Goals
- Focus on integration and E2E tests to be added in future PRs
- Current tests verify builds don't break
