# Applitools Quick Start Guide

## ✅ API Key Configured

Your Applitools API key has been securely stored in `.env` file.

## 🚀 Running Visual Tests

### Run Visual Tests Only
```bash
npm run test:visual
```

### Run All E2E Tests (including visual)
```bash
npm run test:e2e
```

### Run All Tests (unit + E2E + visual)
```bash
npm run test:all
```

## 📊 What Gets Tested

The visual tests currently cover:
- ✅ Calendar Month View
- ✅ Calendar Week View  
- ✅ Calendar Day View
- ✅ Event Creation Modal

## 🔍 Viewing Results

After running tests, results are available in your Applitools dashboard:
https://eyes.applitools.com/

## 🎯 Adding More Visual Tests

To add visual tests for other pages:

1. Create a new test file in `tests/e2e/`:
   ```javascript
   import { test } from '@playwright/test';
   import { Eyes, ClassicRunner } from '@applitools/eyes-playwright';
   
   test.describe('Your Page Visual Tests', () => {
     let eyes, runner;
     
     test.beforeAll(() => {
       runner = new ClassicRunner();
       eyes = new Eyes(runner);
       eyes.setApiKey(process.env.APPLITOOLS_API_KEY);
     });
     
     test('Your page visual test', async ({ page }) => {
       await page.goto('/your-page');
       await eyes.open(page, 'Family Housing Hub', 'Your Page Tests');
       await eyes.check('Your Page', { target: 'window', fully: true });
       await eyes.close();
     });
   });
   ```

2. Run the test:
   ```bash
   npx playwright test tests/e2e/your-page.spec.js
   ```

## 🔐 Security

- ✅ API key stored in `.env` (not committed to git)
- ✅ `.env` is in `.gitignore`
- ✅ Use `.env.example` as template for team members

## 📚 Resources

- [Applitools Documentation](https://applitools.com/docs/)
- [Playwright Integration Guide](https://applitools.com/tutorials/quickstart/playwright.html)
- [Visual Testing Best Practices](https://applitools.com/blog/visual-testing-best-practices/)

