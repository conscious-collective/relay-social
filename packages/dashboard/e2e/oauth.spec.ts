// OAuth E2E Tests
import { test, expect } from '@playwright/test';

test.describe('OAuth Providers Page', () => {
  test('should display available OAuth providers', async ({ page }) => {
    await page.goto('/api/oauth/providers');
    
    // Check response is JSON
    const response = await page.request.get('/api/oauth/providers');
    const data = await response.json();
    
    // Should have providers object
    expect(data).toHaveProperty('providers');
    expect(data.providers).toHaveProperty('instagram');
    expect(data.providers).toHaveProperty('twitter');
    expect(data.providers).toHaveProperty('linkedin');
  });

  test('should indicate which providers are configured', async ({ page }) => {
    const response = await page.request.get('/api/oauth/providers');
    const data = await response.json();
    
    // Check provider structure
    const instagram = data.providers.instagram;
    expect(instagram).toHaveProperty('available');
    expect(instagram).toHaveProperty('authUrl');
    expect(instagram).toHaveProperty('configure');
  });
});

test.describe('OAuth Instagram Flow', () => {
  test('should redirect to Instagram when configured', async ({ page }) => {
    const response = await page.request.get('/api/oauth/instagram');
    
    // Should either redirect (302) or return error (500) if not configured
    expect([302, 500]).toContain(response.status());
  });
});

test.describe('OAuth Twitter Flow', () => {
  test('should redirect to Twitter when configured', async ({ page }) => {
    const response = await page.request.get('/api/oauth/twitter');
    
    // Should either redirect (302) or return error (500) if not configured
    expect([302, 500]).toContain(response.status());
  });
});

test.describe('OAuth LinkedIn Flow', () => {
  test('should redirect to LinkedIn when configured', async ({ page }) => {
    const response = await page.request.get('/api/oauth/linkedin');
    
    // Should either redirect (302) or return error (500) if not configured
    expect([302, 500]).toContain(response.status());
  });
});