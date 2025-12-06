# 🧪 AI-Powered Testing Setup

## ✅ What's Installed

1. **Vitest** - Fast unit testing (Vite-native)
2. **React Testing Library** - Component testing
3. **Playwright** - E2E testing with AI features
4. **Jest DOM** - DOM matchers

## 🚀 Quick Start

### Run Unit Tests
```bash
npm run test
```

### Run Tests with UI
```bash
npm run test:ui
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run E2E Tests with UI (Visual)
```bash
npm run test:e2e:ui
```

### Run All Tests
```bash
npm run test:all
```

## 🤖 AI-Powered Testing Options

### Option 1: Playwright Codegen (Recommended - Easiest)
**Automatically generates tests as you use your app!**

```bash
# Start your app
npm run dev

# In another terminal, run:
npx playwright codegen http://localhost:5173
```

This will:
- Open a browser
- Record your interactions
- Generate test code automatically
- You just use your app normally!

### Option 2: Playwright Test Generator (AI)
```bash
npx playwright test --codegen
```

### Option 3: Use AI Services

#### With OpenAI:
```bash
# Install OpenAI SDK
npm install openai

# Use in your test files
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

#### With Claude (Anthropic):
```bash
npm install @anthropic-ai/sdk
```

### Option 4: Testim.io (Cloud AI Testing)
- Sign up at: https://www.testim.io/
- Connect your app
- AI automatically generates and maintains tests

### Option 5: Mabl (AI-Powered E2E Testing)
- Sign up at: https://www.mabl.com/
- AI learns your app and generates tests

## 📝 Example Tests Created

1. **Calendar Tests** (`tests/e2e/calendar.spec.js`)
   - View switching
   - Event creation
   - Search functionality

2. **Auth Tests** (`tests/e2e/auth.spec.js`)
   - Login/Register
   - Form validation

3. **Component Tests** (`src/test/Calendar.test.jsx`)
   - React component testing
   - Unit tests

## 🎯 Recommended Workflow

1. **Start with Playwright Codegen:**
   ```bash
   npm run dev
   npx playwright codegen http://localhost:5173
   ```

2. **Interact with your app** - Login, create events, use calendar

3. **Copy generated tests** to your test files

4. **Run tests:**
   ```bash
   npm run test:e2e
   ```

5. **Use AI to enhance tests:**
   - Ask AI to add edge cases
   - Generate accessibility tests
   - Create performance tests

## 🔧 Configuration Files

- `vitest.config.js` - Unit test configuration
- `playwright.config.js` - E2E test configuration
- `src/test/setup.js` - Test setup file

## 📚 Next Steps

1. Run `npx playwright codegen` to generate your first tests
2. Add more test scenarios
3. Set up CI/CD to run tests automatically
4. Use AI to generate test cases for new features

## 💡 AI Testing Tips

- Use Playwright Codegen for quick test generation
- Ask AI to generate test cases based on user stories
- Use AI to identify edge cases
- Automate test maintenance with AI

