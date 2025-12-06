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
    await page.goto('/calendar');
    if (process.env.APPLITOOLS_API_KEY) {
      await eyes.open(page, 'Family Housing Hub', 'Calendar Visual Tests');
    }
  });

  test.afterEach(async () => {
    if (eyes && process.env.APPLITOOLS_API_KEY) {
      await eyes.close();
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
    
    await page.click('button:has-text("Week")');
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
    
    await page.click('button:has-text("Day")');
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
    
    await page.click('button:has-text("New Event")');
    await eyes.check('Event Creation Modal', {
      target: 'window',
      fully: true
    });
  });
});
