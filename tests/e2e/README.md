# E2E Test Setup Guide

## Prerequisites

1. **Test User Account**: You need to create a test user in your authentication system (Firebase/Cognito) before running tests.

   Default test credentials:
   - Email: `test@example.com`
   - Password: `Test123456!`

   To create a test user:
   ```bash
   # Via Firebase Console or Cognito Console
   # Or use your app's registration flow
   ```

2. **Environment Variables**: Make sure `.env` file has:
   ```
   APPLITOOLS_API_KEY=your_key_here
   ```

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run only visual tests
npm run test:visual

# Run tests in UI mode
npm run test:e2e:ui
```

## Test Helpers

### Authentication Helper (`helpers/auth.js`)

- `loginUser(page, email, password)` - Logs in a user
- `isLoggedIn(page)` - Checks if user is logged in
- `ensureLoggedIn(page, email, password)` - Ensures user is logged in, logs in if not

### Applitools Helper (`helpers/applitools.js`)

- `handleApplitoolsResults(runner)` - Handles visual test results gracefully
- `closeEyesSafely(eyes)` - Closes Applitools eyes with error handling

## Test Structure

- `auth.spec.js` - Authentication flow tests
- `calendar.spec.js` - Calendar functionality tests
- `visual-calendar.spec.js` - Visual regression tests with Applitools

## Troubleshooting

### Tests fail with "element not found"

- Check if test user exists and credentials are correct
- Verify the app is running on `http://localhost:3001`
- Check browser console for errors

### Applitools shows "differences detected"

- This is **expected on first run** - Applitools needs to establish a baseline
- Review differences in Applitools dashboard
- Accept baseline if differences are expected

### Authentication fails

- Ensure test user exists in Firebase/Cognito
- Check that credentials match in `helpers/auth.js`
- Verify login page is accessible

## Notes

- Tests automatically authenticate before running
- Visual diffs are handled gracefully (won't fail tests on first run)
- Tests skip gracefully if elements aren't found (instead of failing)

