import { test, expect } from '@playwright/test';
import { Eyes, ClassicRunner } from '@applitools/eyes-playwright';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

test.describe('Calendar Visual Testing with Applitools', () => {
  let eyes;
  let runner;

  test.beforeAll(() => {
    runner = new ClassicRunner();
    eyes = new Eyes(runner);
    
    // Set API key from environment
    if (process.env.APPLITOOLS_API_KEY) {
      eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
    } else {
      console.warn('APPLITOOLS_API_KEY not found. Visual tests will be skipped.');
    }
  });

  test.beforeEach(async ({ page }) => {
    // Wait for page to load
    await page.goto('/calendar', { waitUntil: 'networkidle' });
    
    // Wait for calendar to be visible
    await page.waitForSelector('text=Calendar', { timeout: 10000 }).catch(() => {});
    
    // Ensure we're on calendar view (not tasks)
    const calendarButton = page.locator('button:has-text("Calendar")');
    if (await calendarButton.isVisible().catch(() => false)) {
      await calendarButton.click();
      await page.waitForTimeout(500); // Wait for view to switch
    }
    
    if (process.env.APPLITOOLS_API_KEY) {
      await eyes.open(page, 'Family Housing Hub', 'Calendar Visual Tests');
    }
  });

  test.afterEach(async () => {
    if (eyes && process.env.APPLITOOLS_API_KEY) {
      try {
        // Only close if eyes is actually open
        if (eyes.getIsOpen && eyes.getIsOpen()) {
          await eyes.close();
        }
      } catch (error) {
        // Ignore errors if eyes wasn't opened (e.g., browser failed to launch)
        if (!error.message.includes('Eyes not open')) {
          console.warn('Error closing eyes:', error.message);
        }
      }
    }
  });

  test.afterAll(async () => {
    if (runner && process.env.APPLITOOLS_API_KEY) {
      const results = await runner.getAllTestResults();
      console.log('Visual test results:', results);
    }
  });

  test('Calendar month view - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Take visual snapshot of calendar
    await eyes.check('Calendar Month View', {
      target: 'window',
      fully: true
    });
  });

  test('Calendar week view - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Try multiple selectors for the Week button
    const weekButton = page.locator('button[title="Week"], button:has-text("Week")').first();
    await weekButton.waitFor({ timeout: 10000 });
    await weekButton.click();
    await page.waitForTimeout(1000); // Wait for view to switch
    
    await eyes.check('Calendar Week View', {
      target: 'window',
      fully: true
    });
  });

  test('Calendar day view - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Try multiple selectors for the Day button
    const dayButton = page.locator('button[title="Day"], button:has-text("Day")').first();
    await dayButton.waitFor({ timeout: 10000 });
    await dayButton.click();
    await page.waitForTimeout(1000); // Wait for view to switch
    
    await eyes.check('Calendar Day View', {
      target: 'window',
      fully: true
    });
  });

  test('Event creation modal - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Ensure we're on calendar view first
    const calendarViewButton = page.locator('button:has-text("Calendar")');
    if (await calendarViewButton.isVisible().catch(() => false)) {
      await calendarViewButton.click();
      await page.waitForTimeout(500);
    }
    
    // Try multiple selectors for the New Event button
    const newEventButton = page.locator('button:has-text("New Event"), button:has-text("New Task")').first();
    await newEventButton.waitFor({ timeout: 10000 });
    await newEventButton.click();
    await page.waitForTimeout(1000); // Wait for modal to open
    
    await eyes.check('Event Creation Modal', {
      target: 'window',
      fully: true
    });
  });
});
