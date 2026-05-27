# 📧 Email Verification Troubleshooting Guide

## Issue: Not Receiving Verification Emails

If you're not receiving verification emails, here's what to check:

### ✅ Immediate Solution (Current Fix)

The app now **shows the verification code in a toast notification** if the email service is unavailable. Look for a toast message that says:

> ⚠️ Email service unavailable. Your verification code is: **123456**

This code is valid for 10 minutes.

### 🔍 Root Causes

1. **Backend Not Deployed or Not Accessible**
   - The frontend tries to send emails via the backend API
   - If the backend is not running or not accessible, emails won't be sent
   - **Solution**: Deploy backend to Render.com or configure backend URL

2. **Backend URL Not Configured**
   - Frontend defaults to `http://localhost:5000` which won't work in production
   - **Solution**: Set `VITE_BACKEND_URL` environment variable

3. **SMTP Credentials Not Set**
   - Backend needs Gmail SMTP credentials to send emails
   - **Solution**: Configure SMTP_USER and SMTP_PASSWORD in backend

### 🛠️ How to Fix

#### Option 1: Quick Fix (Use Toast Code)
The app now automatically shows the verification code in a toast message if email sending fails. Just use that code to verify.

#### Option 2: Configure Backend (For Production)

1. **Deploy Backend to Render.com**:
   ```bash
   # Backend is already configured in render.yaml
   # Just push to GitHub and Render will deploy
   ```

2. **Set Environment Variables in Render.com**:
   - Go to https://dashboard.render.com
   - Find your backend service
   - Add these environment variables:
     - `SMTP_USER`: Your Gmail address
     - `SMTP_PASSWORD`: Your Gmail App Password
     - `EMAIL_FROM`: noreply@family-housing-hub.com

3. **Update Frontend Environment**:
   - Get your Render backend URL (e.g., `https://family-housing-hub-api.onrender.com`)
   - Add to `.env.local`:
     ```
     VITE_BACKEND_URL=https://your-backend-url.onrender.com
     ```
   - Rebuild and redeploy frontend

#### Option 3: Test Locally

1. **Start Backend Locally**:
   ```bash
   cd backend
   python app.py
   # Backend runs on http://localhost:5000
   ```

2. **Update Frontend**:
   - Create `.env.local` in project root:
     ```
     VITE_BACKEND_URL=http://localhost:5000
     ```
   - Restart dev server

### 📝 Current Status

- ✅ **Frontend**: Shows verification code in toast if email fails
- ✅ **Backend**: Email sending code is ready
- ⚠️ **Backend URL**: Needs to be configured
- ⚠️ **SMTP Credentials**: Need to be set in Render.com

### 🧪 Testing

1. Try registering a new account
2. When email verification screen appears, check:
   - Browser console for errors
   - Toast notifications for the code
   - Email inbox (check spam folder)

### 📞 Next Steps

1. **For Now**: Use the code shown in the toast notification
2. **For Production**: Deploy backend and configure environment variables
3. **For Testing**: Set up local backend with SMTP credentials

---

**Note**: The verification code is always generated and stored in Firestore, even if email sending fails. The toast message ensures you can still complete verification.

