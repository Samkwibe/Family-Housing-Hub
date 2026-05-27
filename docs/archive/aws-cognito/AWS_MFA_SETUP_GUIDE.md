# 🔐 AWS Setup Guide for Multi-Factor Authentication (MFA)

This guide will help you set up AWS services to enable Multi-Factor Authentication (MFA) for your Family Housing Hub application.

---

## 📋 TABLE OF CONTENTS

1. [Option 1: Firebase Identity Platform (Recommended)](#option-1-firebase-identity-platform)
2. [Option 2: AWS Cognito (Alternative)](#option-2-aws-cognito-alternative)
3. [Option 3: Custom TOTP Solution (Free)](#option-3-custom-totp-solution-free)
4. [Step-by-Step Setup Instructions](#step-by-step-setup-instructions)

---

## 🎯 OPTION 1: Firebase Identity Platform (Recommended)

### Prerequisites:
- Firebase project already set up
- Firebase Blaze plan (pay-as-you-go) - **Required for MFA**

### Why Firebase Identity Platform?
- ✅ Already integrated with your app
- ✅ Seamless user experience
- ✅ Built-in TOTP support
- ✅ No additional infrastructure needed

### Setup Steps:

#### Step 1: Enable Identity Platform

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **family-housing-hub**
3. Click on **Authentication** in the left sidebar
4. Go to **Settings** → **General** tab
5. Scroll down to **Identity Platform**
6. Click **Enable Identity Platform**
7. Confirm the upgrade to **Blaze plan** (pay-as-you-go)

**Note:** Blaze plan has a free tier, you only pay for what you use beyond the free limits.

#### Step 2: Enable Multi-Factor Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Scroll down to **Multi-factor authentication** section
3. Click **Get Started** or **Enable**
4. Select **TOTP (Time-based One-Time Password)**
5. Configure settings:
   - **Enrollment requirements:** Optional (recommended) or Required
   - **Session duration:** 24 hours (default)
6. Click **Save**

#### Step 3: Configure MFA Settings (Optional)

1. In **Multi-factor authentication** settings:
   - Enable **Backup codes** (recommended)
   - Set **Enrollment grace period** (e.g., 7 days for existing users)
   - Configure **SMS as backup** (optional, costs apply)

#### Step 4: Test MFA

1. Create a test account or use existing account
2. Log in to your app
3. Go to **Settings** → **Privacy & Security**
4. Click **Enable** on Multi-Factor Authentication
5. Follow the setup wizard
6. Test login with MFA code

### Cost Estimate:
- **Free Tier:** First 50K MAU (Monthly Active Users)
- **After Free Tier:** ~$0.0055 per MAU
- **MFA TOTP:** Included in Identity Platform pricing
- **Estimated Cost:** $0-5/month for small families

---

## 🔄 OPTION 2: AWS Cognito (Alternative)

### Why AWS Cognito?
- ✅ Free tier: 50K MAU
- ✅ Built-in MFA support
- ✅ Can replace Firebase Auth if needed
- ✅ More control over authentication flow

### Setup Steps:

#### Step 1: Create AWS Account

1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Sign up for AWS account (if you don't have one)
3. Navigate to **AWS Cognito** service

#### Step 2: Create User Pool

1. In AWS Cognito, click **Create user pool**
2. **Sign-in options:**
   - Select **Email** or **Username**
   - Enable **MFA** → Select **TOTP (Time-based One-Time Password)**
3. **MFA settings:**
   - **MFA enforcement:** Optional (recommended) or Required
   - **TOTP:** Enabled
4. **User pool name:** `family-hub-users`
5. Click **Create user pool**

#### Step 3: Configure App Client

1. In your user pool, go to **App integration** → **App clients**
2. Click **Create app client**
3. **App client name:** `family-hub-web`
4. **Auth flows:**
   - ✅ ALLOW_USER_PASSWORD_AUTH
   - ✅ ALLOW_REFRESH_TOKEN_AUTH
5. Click **Create app client**
6. **Save the App Client ID** (you'll need this)

#### Step 4: Install AWS SDK

```bash
npm install @aws-sdk/client-cognito-identity-provider
```

#### Step 5: Update Your Code

You'll need to modify the authentication service to use Cognito instead of Firebase. This is a larger change.

**Cost Estimate:**
- **Free Tier:** 50K MAU/month
- **After Free Tier:** $0.0055 per MAU
- **Estimated Cost:** $0-5/month for small families

---

## 🆓 OPTION 3: Custom TOTP Solution (Free)

### Why Custom TOTP?
- ✅ **Completely FREE** - No AWS/Firebase costs
- ✅ Works with any authenticator app
- ✅ Full control over implementation
- ✅ No external dependencies

### How It Works:
- Uses `otplib` library for TOTP generation
- Stores secrets securely in Firestore
- Verifies codes client-side or via Firebase Functions

### Setup Steps:

#### Step 1: Install Required Package

```bash
npm install otplib qrcode
```

#### Step 2: The Code is Already Implemented!

✅ **Good News:** Your app already has a custom TOTP implementation in:
- `src/services/mfaService.js`
- `src/components/MFASetup.jsx`
- `src/components/MFAVerification.jsx`

#### Step 3: Update MFA Service to Use Custom TOTP

The current implementation tries to use Firebase MFA. We need to update it to use custom TOTP if Firebase Identity Platform is not available.

**No AWS setup needed for this option!**

---

## 🚀 RECOMMENDED APPROACH

### For Your Situation:

**I recommend Option 1 (Firebase Identity Platform)** because:

1. ✅ Your app already uses Firebase
2. ✅ Minimal code changes needed
3. ✅ Better user experience
4. ✅ Free tier covers most use cases
5. ✅ Easy to set up (just enable in console)

### If You Can't Use Firebase Identity Platform:

**Use Option 3 (Custom TOTP)** because:

1. ✅ Completely free
2. ✅ Already partially implemented
3. ✅ No AWS setup needed
4. ✅ Works immediately

---

## 📝 STEP-BY-STEP SETUP INSTRUCTIONS

### Quick Start (Firebase Identity Platform):

1. **Enable Identity Platform:**
   ```
   Firebase Console → Authentication → Settings → Enable Identity Platform
   ```

2. **Enable MFA:**
   ```
   Firebase Console → Authentication → Sign-in method → Multi-factor authentication → Enable TOTP
   ```

3. **Test in Your App:**
   ```
   Login → Settings → Privacy & Security → Enable MFA
   ```

4. **Done!** ✅

### Quick Start (Custom TOTP - No Setup Needed):

1. **The code is already there!**
2. **Just test it:**
   ```
   Login → Settings → Privacy & Security → Enable MFA
   ```

---

## 🔧 TROUBLESHOOTING

### Issue: "Multi-factor authentication is not available"

**Solution:**
- Enable Firebase Identity Platform (Option 1)
- OR use Custom TOTP (Option 3)

### Issue: "Identity Platform not enabled"

**Solution:**
- Upgrade to Blaze plan in Firebase Console
- Enable Identity Platform in Authentication settings

### Issue: MFA setup not working

**Solution:**
1. Check browser console for errors
2. Verify Firebase configuration
3. Check if user is logged in
4. Try custom TOTP option

---

## 💰 COST COMPARISON

| Option | Free Tier | Cost After Free Tier | Setup Complexity |
|--------|-----------|---------------------|------------------|
| **Firebase Identity Platform** | 50K MAU | $0.0055/MAU | ⭐ Easy |
| **AWS Cognito** | 50K MAU | $0.0055/MAU | ⭐⭐ Medium |
| **Custom TOTP** | Unlimited | $0 | ⭐⭐⭐ Hard (but done!) |

---

## ✅ CHECKLIST

### For Firebase Identity Platform:
- [ ] Firebase Blaze plan enabled
- [ ] Identity Platform enabled
- [ ] MFA (TOTP) enabled in Firebase Console
- [ ] Test MFA setup in app
- [ ] Test MFA login flow

### For Custom TOTP:
- [ ] `otplib` package installed
- [ ] `qrcode` package installed
- [ ] Test MFA setup in app
- [ ] Test MFA login flow

---

## 🎯 NEXT STEPS

1. **Choose your option** (I recommend Firebase Identity Platform)
2. **Follow the setup steps** above
3. **Test MFA** in your app
4. **Deploy** to production

---

## 📞 NEED HELP?

If you encounter issues:

1. Check the browser console for errors
2. Verify Firebase/AWS configuration
3. Check the implementation in `src/services/mfaService.js`
4. Review Firebase/AWS documentation

---

**Last Updated:** December 2024  
**Status:** Ready for Setup


