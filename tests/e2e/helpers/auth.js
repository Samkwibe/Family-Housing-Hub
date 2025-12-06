// Test helper for authentication
import { expect } from '@playwright/test';

/**
 * Login helper function
 * Attempts to login with test credentials
 * 
 * NOTE: You need to create a test user in your Firebase/Cognito first!
 * Default credentials: test@example.com / Test123456!
 */
export async function loginUser(page, email = 'test@example.com', password = 'Test123456!') {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' });
  
  // Wait for login form to be visible - try multiple selectors
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]'
  ];
  
  let emailInput = null;
  for (const selector of emailSelectors) {
    emailInput = page.locator(selector).first();
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      break;
    }
  }
  
  if (emailInput && await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
  }
  
  // Try to find and fill password input
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]'
  ];
  
  let passwordInput = null;
  for (const selector of passwordSelectors) {
    passwordInput = page.locator(selector).first();
    if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      break;
    }
  }
  
  if (passwordInput && await passwordInput.isVisible().catch(() => false)) {
    await passwordInput.fill(password);
  }
  
  // Try to find and click submit button
  const submitSelectors = [
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Login")',
    'button >> text=/sign in/i',
    'button >> text=/login/i'
  ];
  
  let submitButton = null;
  for (const selector of submitSelectors) {
    submitButton = page.locator(selector).first();
    if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      break;
    }
  }
  
  if (submitButton && await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
    // Wait for navigation or dashboard to appear
    await page.waitForURL(/\/(dashboard|calendar|owner-dashboard|child-dashboard)/, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000); // Wait for redirect and profile load
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
  try {
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      await loginUser(page, email, password);
      // Verify login succeeded
      await page.waitForTimeout(2000);
      const stillNotLoggedIn = !(await isLoggedIn(page));
      if (stillNotLoggedIn) {
        console.warn('Login may have failed - test user might not exist');
        // Don't throw - let test continue and fail gracefully
      }
    }
  } catch (error) {
    console.warn('Authentication check failed:', error.message);
    // Don't throw - let test continue and fail gracefully
  }
}

