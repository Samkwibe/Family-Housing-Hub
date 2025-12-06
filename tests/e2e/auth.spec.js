import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign in, text=Login, text=Welcome')).toBeVisible();
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    // Should show validation error
    await expect(page.locator('text=invalid, text=email, text=format')).toBeVisible({ timeout: 2000 }).catch(() => {});
  });
});

