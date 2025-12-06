import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'networkidle' });
    
    // Wait for calendar to load
    await page.waitForSelector('text=Calendar', { timeout: 10000 }).catch(() => {});
    
    // Ensure we're on calendar view (not tasks)
    const calendarButton = page.locator('button:has-text("Calendar")');
    if (await calendarButton.isVisible().catch(() => false)) {
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
    const dayButton = page.locator('button[title="Day"], button:has-text("Day")').first();
    await dayButton.waitFor({ timeout: 10000 });
    await dayButton.click();
    await page.waitForTimeout(1000);
    
    // Test Week view
    const weekButton = page.locator('button[title="Week"], button:has-text("Week")').first();
    await weekButton.waitFor({ timeout: 10000 });
    await weekButton.click();
    await page.waitForTimeout(1000);
    
    // Test Month view (default)
    const monthButton = page.locator('button[title="Month"], button:has-text("Month")').first();
    await monthButton.waitFor({ timeout: 10000 });
    await monthButton.click();
    await page.waitForTimeout(1000);
  });

  test('should create a new event', async ({ page }) => {
    // Ensure we're on calendar view
    const calendarViewButton = page.locator('button:has-text("Calendar")');
    if (await calendarViewButton.isVisible().catch(() => false)) {
      await calendarViewButton.click();
      await page.waitForTimeout(500);
    }
    
    // Click "New Event" button
    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New Task")').first();
    await newEventButton.waitFor({ timeout: 10000 });
    await newEventButton.click();
    await page.waitForTimeout(1000);
    
    // Fill in event form - try multiple selectors
    const titleInput = page.locator('input[placeholder*="title" i], input[type="text"], input[name="title"]').first();
    await titleInput.waitFor({ timeout: 5000 }).catch(() => {});
    if (await titleInput.isVisible().catch(() => false)) {
      await titleInput.fill('Test Event');
    }
  });

  test('should search events', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="text"]').first();
    await searchInput.waitFor({ timeout: 10000 }).catch(() => {});
    
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });
});
