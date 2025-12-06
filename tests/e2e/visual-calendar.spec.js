import { test, expect } from '@playwright/test';
import { eyesCheck } from '@applitools/eyes-playwright';

test.describe('Calendar Visual Testing with Applitools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calendar');
  });

  test('Calendar month view - visual test', async ({ page, eyes }) => {
    // Take visual snapshot of calendar
    await eyesCheck(page, 'Calendar Month View', {
      target: 'window',
      fully: true
    });
  });

  test('Calendar week view - visual test', async ({ page, eyes }) => {
    await page.click('button:has-text("Week")');
    await eyesCheck(page, 'Calendar Week View', {
      target: 'window',
      fully: true
    });
  });

  test('Calendar day view - visual test', async ({ page, eyes }) => {
    await page.click('button:has-text("Day")');
    await eyesCheck(page, 'Calendar Day View', {
      target: 'window',
      fully: true
    });
  });

  test('Event creation modal - visual test', async ({ page, eyes }) => {
    await page.click('button:has-text("New Event")');
    await eyesCheck(page, 'Event Creation Modal', {
      target: 'window',
      fully: true
    });
  });
});

