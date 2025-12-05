# 📸 AWS Cognito Setup - Visual Guide

## 🎯 What You're Seeing

The AWS Cognito console is showing you a **"Set up resources"** page with language options:
- Golang
- Java
- NodeJS
- Python

**This is for BACKEND developers!** You're building a **React frontend**, so you can **SKIP this page!**

---

## ✅ What You Actually Need

### **Skip the Language Selection Page**

**Just close it or navigate away!** You don't need to select anything there.

### **Go to These Sections Instead:**

1. **App integration** → **Domain** (to create domain)
2. **App integration** → **App clients** (to configure callbacks)
3. **Sign-in experience** → **Multi-factor authentication** (to enable MFA)

---

## 🗺️ Navigation Guide

### **In AWS Cognito Console:**

```
AWS Cognito Console
├── User pools
│   └── us-east-1_pNHf3ZUq9 (Your User Pool)
│       ├── App integration ← GO HERE FIRST
│       │   ├── Domain ← Create domain here
│       │   └── App clients ← Configure here
│       ├── Sign-in experience ← GO HERE SECOND
│       │   └── Multi-factor authentication ← Enable MFA here
│       └── (Other sections - you can ignore for now)
```

---

## 📋 Step-by-Step (What to Click)

### **Step 1: Create Domain**

1. In Cognito Console, you should see your User Pool
2. **Click "App integration"** (left sidebar)
3. **Click "Domain"** tab
4. **Click "Create Cognito domain"** button
5. Enter: `family-hub-auth`
6. Click **"Create domain"**
7. **Copy the domain:** `family-hub-auth.auth.us-east-1.amazoncognito.com`

### **Step 2: Configure App Client**

1. **Still in "App integration"**
2. **Click "App clients"** tab
3. **Click on:** `2qkhqr39rarvi8bq60bp8jq584`
4. Scroll down to **"Hosted UI"** section
5. Configure:
   - **Callback URLs:** Add `http://localhost:5173` and `https://family-housing-hub.web.app`
   - **Sign-out URLs:** Add `http://localhost:5173` and `https://family-housing-hub.web.app`
   - **OAuth flows:** Check "Authorization code grant"
   - **OAuth scopes:** Check "openid", "email", "profile", "phone"
6. **Click "Save changes"**

### **Step 3: Enable MFA**

1. **Click "Sign-in experience"** (left sidebar)
2. **Click "Multi-factor authentication"**
3. **Toggle "TOTP"** to ON
4. **MFA enforcement:** Select "Optional"
5. **Click "Save changes"**

---

## ❌ What to Ignore

### **You Can Ignore:**
- ❌ Language selection page (Golang, Java, NodeJS, Python)
- ❌ "Set up resources" page
- ❌ Backend code examples
- ❌ Quick setup guide (that's for backend)

### **Why?**
Because your React app already has all the code it needs! The AWS console is just showing backend examples that you don't need.

---

## ✅ After Setup

1. **Update config file** with your domain
2. **Rebuild:** `npm run build`
3. **Redeploy:** `firebase deploy --only hosting`
4. **Test:** Go to https://family-housing-hub.web.app

---

## 🎯 Bottom Line

**The language selection is for backend developers. You're building a React frontend, so you can skip it!**

Just focus on:
1. ✅ Creating the domain
2. ✅ Configuring the app client
3. ✅ Enabling MFA

**That's it!** 🚀

---

**Need help navigating?** Let me know what you see in the console and I'll guide you!


