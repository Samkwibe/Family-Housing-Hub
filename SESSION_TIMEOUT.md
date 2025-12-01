# 🔒 Session Timeout Security Feature

## Overview
The application now includes automatic session timeout for enhanced security. Users are automatically logged out after 20 minutes of inactivity.

## Features

### ⏱️ 20-Minute Session Duration
- Sessions automatically expire after 20 minutes of inactivity
- Timer resets on any user activity
- Optimized for security (15-20 minute range)

### 🎯 Activity Detection
The system tracks the following user activities to reset the session timer:
- Mouse movements (`mousemove`)
- Mouse clicks (`mousedown`, `click`)
- Keyboard input (`keypress`, `keydown`)
- Scrolling (`scroll`)
- Touch events (`touchstart`)
- Tab visibility changes (when user switches back to the tab)

### 🔄 Automatic Logout
- When 20 minutes of inactivity is detected, the user is automatically logged out
- A notification message appears: "Your session has expired after 20 minutes of inactivity. Please log in again for security."
- All user data is cleared from the session

### 🛡️ Security Benefits
1. **Prevents unauthorized access** - If a user leaves their device unattended, the session expires automatically
2. **Reduces risk of session hijacking** - Shorter session duration limits exposure window
3. **Compliance** - Meets security best practices for web applications handling sensitive data

## Technical Implementation

### Session Management
- Uses React `useRef` to store timeout reference (avoids re-renders)
- Uses `useCallback` to optimize activity handler performance
- Cleans up timeouts on component unmount and logout

### Activity Listeners
- Event listeners are attached to the window object
- Uses event capturing (`true` flag) to catch all events
- Properly removes listeners on cleanup to prevent memory leaks

### Integration Points
- Integrated into `AuthContext` component
- Works seamlessly with Firebase Authentication
- Automatically resets on login
- Clears on logout

## User Experience

### What Users See
- No interruption during active use
- Automatic logout only occurs after 30 minutes of complete inactivity
- Clear notification when session expires
- Users can simply log back in to continue

### Best Practices for Users
- Stay active on the page to maintain session
- If working on multiple tabs, activity in any tab resets the timer
- Session persists when switching between tabs (if returning within 30 minutes)

## Configuration

The session duration is set to **20 minutes** (1,200,000 milliseconds) and can be adjusted in `src/contexts/AuthContext.jsx`:

```javascript
const SESSION_DURATION = 20 * 60 * 1000; // 20 minutes (15-20 min range for security)
```

To change the duration:
- For 15 minutes: `15 * 60 * 1000`
- For 20 minutes: `20 * 60 * 1000` (current)
- For other durations, adjust the multiplier accordingly

## Testing

To test the session timeout:
1. Log in to the application
2. Wait 20 minutes without any activity (mouse, keyboard, etc.)
3. You should be automatically logged out with a notification

**Note:** For development/testing, you can temporarily reduce `SESSION_DURATION` to a shorter time (e.g., 1 minute = `60 * 1000`) to test the functionality quickly.

