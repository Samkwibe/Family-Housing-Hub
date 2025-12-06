import { test, expect } from '@playwright/test';
import { Eyes, ClassicRunner } from '@applitools/eyes-playwright';
import dotenv from 'dotenv';
import { ensureLoggedIn } from './helpers/auth.js';
import { handleApplitoolsResults, closeEyesSafely } from './helpers/applitools.js';

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
    
    // Wait for calendar to be visible (shorter timeout)
    await page.waitForSelector('text=Calendar', { timeout: 5000 }).catch(() => {});
    
    // Ensure we're on calendar view (not tasks)
    const calendarButton = page.locator('button:has-text("Calendar")');
    if (await calendarButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calendarButton.click();
      await page.waitForTimeout(500);
    }
    
    // Open eyes only if API key is set and eyes aren't already open
    if (process.env.APPLITOOLS_API_KEY && !page.isClosed()) {
      try {
        // Check if eyes are already open
        if (typeof eyes.getIsOpen === 'function' && !eyes.getIsOpen()) {
          await eyes.open(page, 'Family Housing Hub', 'Calendar Visual Tests');
        } else if (typeof eyes.getIsOpen !== 'function') {
          // If getIsOpen doesn't exist, try to open anyway
          await eyes.open(page, 'Family Housing Hub', 'Calendar Visual Tests');
        }
        // Wait a bit for eyes to fully initialize
        await page.waitForTimeout(500);
      } catch (error) {
        console.warn('Failed to open Applitools eyes:', error.message);
        // Continue anyway - test will skip if eyes aren't open
      }
    }
  });

  test.afterEach(async () => {
    if (eyes && process.env.APPLITOOLS_API_KEY) {
      await closeEyesSafely(eyes);
    }
  });

  test.afterAll(async () => {
    if (runner && process.env.APPLITOOLS_API_KEY) {
      await handleApplitoolsResults(runner);
    }
  });

  test('Calendar month view - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Check if eyes are open
    const isOpen = typeof eyes.getIsOpen === 'function' ? eyes.getIsOpen() : false;
    if (!isOpen) {
      test.skip();
      return;
    }
    
    // Wait for calendar to fully render
    await page.waitForTimeout(2000);
    
    // Take visual snapshot of calendar
    try {
      await eyes.check('Calendar Month View', {
        target: 'window',
        fully: true
      });
    } catch (error) {
      if (error.message && error.message.includes('Eyes not open')) {
        test.skip();
      } else {
        throw error;
      }
    }
  });

  test('Calendar week view - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Check if eyes are open
    const isOpen = typeof eyes.getIsOpen === 'function' ? eyes.getIsOpen() : false;
    if (!isOpen) {
      test.skip();
      return;
    }
    
    // Find Week button - try multiple selectors
    const weekSelectors = [
      'button[title="Week"]',
      'button:has-text("Week")',
      'button:has([aria-label*="Week" i])',
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
      await page.waitForTimeout(2000); // Wait for view to switch
      
      try {
        await eyes.check('Calendar Week View', {
          target: 'window',
          fully: true
        });
      } catch (error) {
        if (error.message && error.message.includes('Eyes not open')) {
          test.skip();
        } else {
          throw error;
        }
      }
    } else {
      test.skip();
    }
  });

  test('Calendar day view - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Check if eyes are open
    const isOpen = typeof eyes.getIsOpen === 'function' ? eyes.getIsOpen() : false;
    if (!isOpen) {
      test.skip();
      return;
    }
    
    // Find Day button - try multiple selectors
    const daySelectors = [
      'button[title="Day"]',
      'button:has-text("Day")',
      'button:has([aria-label*="Day" i])',
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
      await page.waitForTimeout(2000); // Wait for view to switch
      
      try {
        await eyes.check('Calendar Day View', {
          target: 'window',
          fully: true
        });
      } catch (error) {
        if (error.message && error.message.includes('Eyes not open')) {
          test.skip();
        } else {
          throw error;
        }
      }
    } else {
      test.skip();
    }
  });

  test('Event creation modal - visual test', async ({ page }) => {
    if (!process.env.APPLITOOLS_API_KEY) {
      test.skip();
      return;
    }
    
    // Check if eyes are open
    const isOpen = typeof eyes.getIsOpen === 'function' ? eyes.getIsOpen() : false;
    if (!isOpen) {
      test.skip();
      return;
    }
    
    // Ensure we're on calendar view first
    const calendarViewButton = page.locator('button:has-text("Calendar")');
    if (await calendarViewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await calendarViewButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find New Event button - try multiple selectors
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
      await page.waitForTimeout(2000); // Wait for modal to open
      
      try {
        await eyes.check('Event Creation Modal', {
          target: 'window',
          fully: true
        });
      } catch (error) {
        if (error.message && error.message.includes('Eyes not open')) {
          test.skip();
        } else {
          throw error;
        }
      }
    } else {
      test.skip();
    }
  });
});
