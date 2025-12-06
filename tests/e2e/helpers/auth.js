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
  try {
    // Check if page is closed
    if (page.isClosed()) {
      return false;
    }
    
    // Navigate to login page with shorter timeout
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {
      // If navigation fails, page might be closed
      return false;
    });
    
    // Wait for login form to be visible - try multiple selectors
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      if (page.isClosed()) return false;
      emailInput = page.locator(selector).first();
      if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        break;
      }
    }
    
    if (emailInput && !page.isClosed() && await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill(email).catch(() => {});
    }
    
    // Try to find and fill password input
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      if (page.isClosed()) return false;
      passwordInput = page.locator(selector).first();
      if (await passwordInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        break;
      }
    }
    
    if (passwordInput && !page.isClosed() && await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill(password).catch(() => {});
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
      if (page.isClosed()) return false;
      submitButton = page.locator(selector).first();
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        break;
      }
    }
    
    if (submitButton && !page.isClosed() && await submitButton.isVisible().catch(() => false)) {
      await submitButton.click().catch(() => {});
      // Wait for navigation or dashboard to appear (shorter timeout)
      await page.waitForURL(/\/(dashboard|calendar|owner-dashboard|child-dashboard)/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000); // Shorter wait for redirect
      return true;
    }
    
    return false;
  } catch (error) {
    // If page is closed or any other error, return false
    if (error.message && error.message.includes('closed')) {
      return false;
    }
    console.warn('Login error:', error.message);
    return false;
  }
}

/**
 * Check if user is logged in by checking for dashboard elements
 */
export async function isLoggedIn(page) {
  try {
    // Check if page is closed
    if (page.isClosed()) {
      return false;
    }
    
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
    // Check if page is closed first
    if (page.isClosed()) {
      console.warn('Page is closed, cannot authenticate');
      return false;
    }
    
    // Check current URL to see if already logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/calendar') || currentUrl.includes('/owner-dashboard')) {
      // Already on a protected page, likely logged in
      return true;
    }
    
    // Quick check if already logged in (with shorter timeout)
    const loggedIn = await Promise.race([
      isLoggedIn(page),
      new Promise(resolve => setTimeout(() => resolve(false), 3000)) // 3 second timeout
    ]);
    
    if (!loggedIn) {
      const loginResult = await Promise.race([
        loginUser(page, email, password),
        new Promise(resolve => setTimeout(() => resolve(false), 15000)) // 15 second timeout for login
      ]);
      
      if (!loginResult) {
        console.warn('Login may have failed - test user might not exist');
        return false;
      }
      
      // Quick verify login succeeded (shorter wait)
      if (!page.isClosed()) {
        await page.waitForTimeout(1000);
        const stillNotLoggedIn = !(await Promise.race([
          isLoggedIn(page),
          new Promise(resolve => setTimeout(() => resolve(false), 2000))
        ]));
        if (stillNotLoggedIn) {
          console.warn('Login may have failed - test user might not exist');
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    // If page is closed or any other error
    if (error.message && error.message.includes('closed')) {
      console.warn('Page was closed during authentication');
      return false;
    }
    console.warn('Authentication check failed:', error.message);
    return false;
  }
}

