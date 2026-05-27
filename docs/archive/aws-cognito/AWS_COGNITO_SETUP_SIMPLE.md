# 🎯 AWS Cognito Setup - Simple Step-by-Step

## ⚠️ Important: You DON'T Need to Select a Language!

The language selection (Golang, Java, NodeJS, Python) in the AWS Cognito console is **only for backend examples**. 

**Since you're using React (frontend), you can SKIP that step!** ✅

---

## ✅ What You Actually Need to Do

### **Step 1: Create Cognito Domain** (Required)

1. **Go to AWS Cognito Console:**
   - https://console.aws.amazon.com/cognito/
   - Make sure you're in the correct region: **us-east-1**

2. **Select Your User Pool:**
   - Click on: `us-east-1_pNHf3ZUq9`
   - Or find it in the list

3. **Create Domain:**
   - Click **"App integration"** in the left sidebar
   - Click **"Domain"** tab
   - Click **"Create Cognito domain"** button
   - Enter domain prefix: `family-hub-auth` (or any name you like)
   - Click **"Create domain"**
   - **IMPORTANT:** Copy the full domain name (e.g., `family-hub-auth.auth.us-east-1.amazoncognito.com`)

### **Step 2: Configure App Client** (Required)

1. **Still in "App integration" section:**
   - Click **"App clients"** tab
   - Click on your app client: `2qkhqr39rarvi8bq60bp8jq584`

2. **Scroll to "Hosted UI" section:**
   - Find **"Allowed callback URLs"**
   - Click **"Add callback URL"** or edit existing
   - Add these URLs (one per line):
     ```
     http://localhost:5173
     https://family-housing-hub.web.app
     ```

3. **Find "Allowed sign-out URLs":**
   - Click **"Add sign-out URL"** or edit existing
   - Add these URLs (one per line):
     ```
     http://localhost:5173
     https://family-housing-hub.web.app
     ```

4. **Find "Allowed OAuth flows":**
   - Check: ✅ **Authorization code grant**
   - Uncheck others if checked

5. **Find "Allowed OAuth scopes":**
   - Check: ✅ **openid**
   - Check: ✅ **email**
   - Check: ✅ **profile**
   - Check: ✅ **phone** (optional)

6. **Click "Save changes"** at the bottom

### **Step 3: Enable MFA** (Optional but Recommended)

1. **Click "Sign-in experience"** in left sidebar
2. **Click "Multi-factor authentication"**
3. **Enable TOTP:**
   - Toggle **"TOTP (Time-based One-Time Password)"** to ON
4. **MFA enforcement:**
   - Select: **Optional** (recommended) or **Required**
5. **Click "Save changes"**

### **Step 4: Skip the Language Selection!** ✅

**You can IGNORE the "Set up resources" page with language selection!**

That page is showing you **backend code examples** (Node.js, Python, etc.). Since you're using **React (frontend)**, you don't need those examples.

**Just close that page or navigate away from it.** The code is already in your React app!

---

## 📝 What to Do After Setup

### **Step 5: Update Your Config File**

1. **Open:** `src/services/cognito/config.js`
2. **Find line 20** (or around there)
3. **Replace:**
   ```javascript
   domain: 'YOUR-DOMAIN.auth.us-east-1.amazoncognito.com',
   ```
   **With your actual domain:**
   ```javascript
   domain: 'family-hub-auth.auth.us-east-1.amazoncognito.com', // Use YOUR domain!
   ```

### **Step 6: Rebuild and Redeploy**

```bash
npm run build
firebase deploy --only hosting
```

---

## 🎯 Summary

**What You Need:**
- ✅ Cognito Domain (Step 1)
- ✅ App Client Configuration (Step 2)
- ✅ MFA Enabled (Step 3)
- ✅ Config File Updated (Step 5)
- ✅ Redeploy (Step 6)

**What You DON'T Need:**
- ❌ Language selection (skip it!)
- ❌ Backend code examples (skip them!)
- ❌ Node.js/Python setup (not needed!)

---

## ✅ Quick Checklist

- [ ] Cognito domain created
- [ ] Domain name copied
- [ ] App client configured with callback URLs
- [ ] MFA enabled (optional)
- [ ] Config file updated with domain
- [ ] App rebuilt and redeployed

---

## 🚀 You're Done!

After completing these steps, your app will work with AWS Cognito!

**The language selection page is just documentation - you can ignore it!** ✅

---

**Need help?** Let me know if you get stuck on any step!


