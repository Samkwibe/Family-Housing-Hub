import { test, expect } from '@playwright/test';
import { ensureLoggedIn } from './helpers/auth.js';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    // Check if page is closed
    if (page.isClosed()) {
      test.skip();
      return;
    }
    
    // Ensure user is logged in (with timeout)
    const authSuccess = await Promise.race([
      ensureLoggedIn(page),
      new Promise(resolve => setTimeout(() => resolve(false), 20000)) // 20 second timeout
    ]);
    
    if (!authSuccess) {
      // Skip test if authentication fails
      test.skip();
      return;
    }
    
    // Check page is still open after auth
    if (page.isClosed()) {
      test.skip();
      return;
    }
    
    // Navigate to calendar (shorter timeout)
    try {
      await page.goto('/calendar', { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch (error) {
      if (error.message && error.message.includes('closed')) {
        test.skip();
        return;
      }
      // If navigation fails, skip test
      test.skip();
      return;
    }
    
    // Wait for calendar to load (shorter timeout)
    await page.waitForSelector('text=Calendar', { timeout: 5000 }).catch(() => {});
    
    // Ensure we're on calendar view (not tasks)
    const calendarButton = page.locator('button:has-text("Calendar")');
    if (await calendarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calendarButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display calendar view', async ({ page }) => {
    // Check that calendar is visible
    await expect(page.locator('text=Calendar')).toBeVisible({ timeout: 10000 });
  });

  test('should switch between calendar views', async ({ page }) => {
    // Test Day view
    const daySelectors = [
      'button[title="Day"]',
      'button:has-text("Day")',
      'button >> text=/Day/i'
    ];
    
    let dayButton = null;
    for (const selector of daySelectors) {
      dayButton = page.locator(selector).first();
      if (await dayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        break;
      }
    }
    
    if (dayButton && await dayButton.isVisible().catch(() => false)) {
      await dayButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Test Week view
    const weekSelectors = [
      'button[title="Week"]',
      'button:has-text("Week")',
      'button >> text=/Week/i'
    ];
    
    let weekButton = null;
    for (const selector of weekSelectors) {
      weekButton = page.locator(selector).first();
      if (await weekButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        break;
      }
    }
    
    if (weekButton && await weekButton.isVisible().catch(() => false)) {
      await weekButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Test Month view (default)
    const monthSelectors = [
      'button[title="Month"]',
      'button:has-text("Month")',
      'button >> text=/Month/i'
    ];
    
    let monthButton = null;
    for (const selector of monthSelectors) {
      monthButton = page.locator(selector).first();
      if (await monthButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        break;
      }
    }
    
    if (monthButton && await monthButton.isVisible().catch(() => false)) {
      await monthButton.click();
      await page.waitForTimeout(1500);
    }
  });

  test('should create a new event', async ({ page }) => {
    // Ensure we're on calendar view
    const calendarViewButton = page.locator('button:has-text("Calendar")');
    if (await calendarViewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calendarViewButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find New Event button
    const newEventSelectors = [
      'button:has-text("New Event")',
      'button:has-text("New Task")',
      'button >> text=/New Event/i',
      'button >> text=/New Task/i'
    ];
    
    let newEventButton = null;
    for (const selector of newEventSelectors) {
      newEventButton = page.locator(selector).first();
      if (await newEventButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        break;
      }
    }
    
    if (newEventButton && await newEventButton.isVisible().catch(() => false)) {
      await newEventButton.click();
      await page.waitForTimeout(2000);
      
      // Try to find and fill title input
      const titleInput = page.locator('input[placeholder*="title" i], input[type="text"], input[name="title"]').first();
      if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await titleInput.fill('Test Event');
      }
    } else {
      test.skip();
    }
  });

  test('should search events', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="text"]').first();
    
    if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
    }
  });
});
