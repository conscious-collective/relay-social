// Dashboard E2E Tests
import { test, expect } from '@playwright/test';

test.describe('Dashboard Home', () => {
  test('should load dashboard homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check page loads without errors
    await expect(page).toHaveTitle(/Relay/i);
    
    // Check main elements are present
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should show navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check navigation exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});

test.describe('Accounts Page', () => {
  test('should display accounts page', async ({ page }) => {
    await page.goto('/accounts');
    
    // Check accounts page loads
    await expect(page.locator('h1')).toContainText(/Account/i);
  });

  test('should show connect account button', async ({ page }) => {
    await page.goto('/accounts');
    
    // Look for connect/add account button
    const connectButton = page.locator('button:has-text("Connect"), a:has-text("Add Account")');
    await expect(connectButton.first()).toBeVisible();
  });
});

test.describe('Posts Page', () => {
  test('should display posts page', async ({ page }) => {
    await page.goto('/posts');
    
    // Check posts page loads
    await expect(page.locator('h1')).toContainText(/Post/i);
  });

  test('should show create post button', async ({ page }) => {
    await page.goto('/posts');
    
    // Look for create post button
    const createButton = page.locator('button:has-text("Create"), a:has-text("New Post")');
    await expect(createButton.first()).toBeVisible();
  });
});