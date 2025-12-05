# 🚀 AWS Cognito - Quick Start Code

## ⚠️ IMPORTANT REMINDER

**You already have Firebase working!** Using Cognito requires rewriting all your auth code.

**Easier option:** Use Firebase - see `MFA_SETUP_QUICK_START.md`

---

## 📦 Step 1: Install Package

```bash
npm install aws-amplify
```

---

## 🔧 Step 2: Set Up Cognito Domain in AWS Console

1. Go to AWS Cognito Console
2. Your User Pool: `us-east-1_pNHf3ZUq9`
3. **App integration** → **Domain** → **Create Cognito domain**
4. Enter domain prefix: `family-hub-auth`
5. **Save the domain:** `family-hub-auth.auth.us-east-1.amazoncognito.com`

---

## 📝 Step 3: Update Config File

Edit `src/services/cognito/config.js`:

```javascript
domain: 'family-hub-auth.auth.us-east-1.amazoncognito.com', // ⚠️ Use YOUR domain!
```

---

## 🚀 Step 4: Initialize Amplify

Add to `src/main.jsx` (at the top, before App):

```javascript
// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './services/cognito/amplifyConfig' // ⬅️ ADD THIS LINE
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

## 💻 Step 5: Use in Your Code

### Example: Login Page

```javascript
import cognitoAuth from '../services/cognito/authService';

// Sign in
const handleLogin = async (email, password) => {
  try {
    const result = await cognitoAuth.signIn(email, password);
    
    if (result.requiresMFA) {
      // Show MFA input
      setShowMFA(true);
    } else if (result.success) {
      // Login successful
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// MFA confirmation
const handleMFA = async (code) => {
  try {
    const result = await cognitoAuth.confirmSignInWithMFA(code);
    if (result.success) {
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('MFA failed:', error);
  }
};
```

### Example: Register Page

```javascript
import cognitoAuth from '../services/cognito/authService';

const handleRegister = async (email, password, userData) => {
  try {
    const result = await cognitoAuth.signUp(email, password, userData);
    if (result.success) {
      // Show verification code input
      setShowVerification(true);
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
};

// Confirm email
const handleConfirm = async (email, code) => {
  try {
    const result = await cognitoAuth.confirmSignUp(email, code);
    if (result.success) {
      navigate('/login');
    }
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

---

## 🔄 Step 6: Replace Firebase AuthContext

You'll need to rewrite `src/contexts/AuthContext.jsx` to use Cognito instead of Firebase.

**This is a MAJOR change!** I can help you with this if you want.

---

## ✅ Files Created

I've created these files for you:

1. ✅ `src/services/cognito/config.js` - Configuration
2. ✅ `src/services/cognito/authService.js` - All auth functions
3. ✅ `src/services/cognito/amplifyConfig.js` - Amplify setup

---

## 🧪 Test It

After setup, test with:

```javascript
import cognitoAuth from './services/cognito/authService';

// Check if authenticated
const isAuth = await cognitoAuth.isAuthenticated();
console.log('Authenticated:', isAuth);

// Get current user
const user = await cognitoAuth.getCurrentUser();
console.log('User:', user);
```

---

## ⚠️ What You Need to Do

1. ✅ Install `aws-amplify` package
2. ✅ Set up Cognito domain in AWS Console
3. ✅ Update config with your domain
4. ✅ Add Amplify init to main.jsx
5. ❌ **Rewrite AuthContext** (big job!)
6. ❌ **Update all auth components** (big job!)
7. ❌ **Test everything** (big job!)

---

## 🎯 My Strong Recommendation

**DON'T DO THIS!** 

Instead:
1. Use Firebase (already working)
2. Enable MFA in Firebase (5 minutes)
3. Done! ✅

**OR** if you really want Cognito, I can help you rewrite the AuthContext. But it's 2-3 days of work!

---

**Need help?** Let me know if you want me to rewrite the AuthContext for Cognito, or if you'd prefer to stick with Firebase! 🚀


