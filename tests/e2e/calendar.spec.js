import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to calendar page (adjust URL based on your routing)
    await page.goto('/calendar');
  });

  test('should display calendar view', async ({ page }) => {
    // Check if calendar is visible
    await expect(page.locator('text=Calendar')).toBeVisible();
  });

  test('should switch between calendar views', async ({ page }) => {
    // Test Day view
    await page.click('button:has-text("Day")');
    await expect(page.locator('text=Day')).toBeVisible();
    
    // Test Week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('text=Week')).toBeVisible();
    
    // Test Month view
    await page.click('button:has-text("Month")');
    await expect(page.locator('text=Month')).toBeVisible();
    
    // Test Agenda view
    await page.click('button:has-text("Agenda")');
    await expect(page.locator('text=Agenda')).toBeVisible();
  });

  test('should create a new event', async ({ page }) => {
    // Click "New Event" button
    await page.click('button:has-text("New Event")');
    
    // Fill in event form
    await page.fill('input[placeholder*="title" i], input[type="text"]', 'Test Event');
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    
    // Submit form
    await page.click('button:has-text("Create Event"), button[type="submit"]');
    
    // Verify event was created (adjust selector based on your UI)
    await expect(page.locator('text=Test Event')).toBeVisible();
  });

  test('should search events', async ({ page }) => {
    // Use search functionality
    const searchInput = page.locator('input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      // Verify search results
      await expect(page.locator('text=test')).toBeVisible();
    }
  });
});

