# 🚀 AWS Cognito Setup - Step by Step Instructions

## ⚠️ BEFORE YOU START

**You already have Firebase working!** Switching to Cognito requires rewriting all authentication code. 

**Recommendation:** Use Firebase instead (see `MFA_SETUP_QUICK_START.md`)

---

## 📋 If You Still Want Cognito - Complete Setup

### Step 1: Set Up Cognito Domain in AWS Console

1. Go to **AWS Cognito Console**
2. Select your User Pool: `us-east-1_pNHf3ZUq9`
3. Go to **App integration** → **Domain**
4. Click **Create Cognito domain**
5. Enter a domain prefix (e.g., `family-hub-auth`)
6. Click **Create domain**
7. **Save the domain name** (e.g., `family-hub-auth.auth.us-east-1.amazoncognito.com`)

### Step 2: Configure App Client

1. In Cognito Console, go to **App integration** → **App clients**
2. Click on your app client: `2qkhqr39rarvi8bq60bp8jq584`
3. Under **Hosted UI**, configure:
   - **Allowed callback URLs:**
     - `http://localhost:5173` (development)
     - `https://family-housing-hub.web.app` (production)
   - **Allowed sign-out URLs:**
     - `http://localhost:5173` (development)
     - `https://family-housing-hub.web.app` (production)
   - **Allowed OAuth flows:**
     - ✅ Authorization code grant
   - **Allowed OAuth scopes:**
     - ✅ openid
     - ✅ email
     - ✅ profile
     - ✅ phone
4. Click **Save changes**

### Step 3: Enable MFA

1. In Cognito Console, go to **Sign-in experience** → **Multi-factor authentication**
2. Enable **TOTP (Time-based One-Time Password)**
3. Set **MFA enforcement:** Optional (recommended) or Required
4. Click **Save changes**

### Step 4: Install Required Packages

```bash
npm install aws-amplify
```

### Step 5: Update Configuration File

Edit `src/services/cognito/config.js`:

```javascript
export const cognitoConfig = {
  userPoolId: 'us-east-1_pNHf3ZUq9', // ✅ Already correct
  clientId: '2qkhqr39rarvi8bq60bp8jq584', // ✅ Already correct
  region: 'us-east-1', // ✅ Already correct
  domain: 'family-hub-auth.auth.us-east-1.amazoncognito.com', // ⚠️ REPLACE with your domain!
  // ... rest stays the same
};
```

### Step 6: Initialize Amplify in Your App

Add to `src/main.jsx` or `src/App.jsx`:

```javascript
// At the top of the file
import './services/cognito/amplifyConfig';
```

### Step 7: Replace Firebase Auth with Cognito

**This is the BIG step** - You need to:

1. **Update `src/contexts/AuthContext.jsx`** to use Cognito instead of Firebase
2. **Update all login/register pages** to use Cognito
3. **Update MFA implementation** to use Cognito MFA
4. **Test everything**

---

## 🔧 Code Changes Required

### Option A: Complete Rewrite (Recommended if switching)

I can help you rewrite `AuthContext.jsx` to use Cognito. This is a major change.

### Option B: Hybrid Approach (Not Recommended)

Keep both Firebase and Cognito - confusing and not recommended.

---

## 📝 Quick Test

After setup, test with:

```javascript
import cognitoAuth from './services/cognito/authService';

// Test sign up
const result = await cognitoAuth.signUp('test@example.com', 'Password123!', {
  firstName: 'Test',
  lastName: 'User'
});
console.log(result);
```

---

## ⚠️ WARNING

**This will break your current authentication!** 

You'll need to:
- ❌ Remove all Firebase Auth code
- ❌ Rewrite AuthContext
- ❌ Update all components
- ❌ Test everything
- ❌ Migrate existing users (if any)

**Estimated time:** 2-3 days of work

---

## 🎯 My Recommendation

**DON'T DO THIS!** 

Instead:
1. Use Firebase (already working)
2. Enable MFA in Firebase Console (5 minutes)
3. Done! ✅

---

## ❓ Need Help?

If you really want to switch to Cognito, I can:
1. Rewrite the AuthContext for you
2. Update all authentication components
3. Help with testing

But I strongly recommend sticking with Firebase! 🚀


