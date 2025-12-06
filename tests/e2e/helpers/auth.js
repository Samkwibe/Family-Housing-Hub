// Test helper for authentication
import { expect } from '@playwright/test';

/**
 * Login helper function
 * Attempts to login with test credentials or creates a test user
 */
export async function loginUser(page, email = 'test@example.com', password = 'Test123456!') {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 }).catch(() => {});
  
  // Try to find and fill email input
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
  }
  
  // Try to find and fill password input
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  if (await passwordInput.isVisible().catch(() => false)) {
    await passwordInput.fill(password);
  }
  
  // Try to find and click submit button
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
    // Wait for navigation or dashboard to appear
    await page.waitForURL(/\/(dashboard|calendar|owner-dashboard)/, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000); // Wait for redirect
  }
}

/**
 * Check if user is logged in by checking for dashboard elements
 */
export async function isLoggedIn(page) {
  try {
    // Check if we're on a dashboard or if user menu exists
    const dashboardIndicator = page.locator('text=Dashboard, text=Calendar, [data-testid="user-menu"]').first();
    await dashboardIndicator.waitFor({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure user is logged in, login if not
 */
export async function ensureLoggedIn(page, email = 'test@example.com', password = 'Test123456!') {
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    await loginUser(page, email, password);
  }
}

