# Firebase Email Configuration Guide

## Issue: Password Reset Emails Not Being Received

If you're not receiving password reset emails, it's likely because Firebase email templates need to be configured or the emails are going to spam.

---

## 🔧 Solution 1: Configure Firebase Email Templates

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com
2. Select your project: **family-housing-hub**
3. Go to **Authentication** → **Templates** (or **Settings** → **Email Templates**)

### Step 2: Configure Password Reset Email Template
1. Click on **Password reset** template
2. You'll see the default template
3. **Important:** Make sure the template is **enabled**
4. Customize the email if needed:
   - **Subject:** "Reset your Family Housing Hub password"
   - **Body:** You can customize the message
   - **Action URL:** Should be your app URL (e.g., `https://family-housing-hub.web.app`)

### Step 3: Configure Email Sender
1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Make sure your domain is authorized:
   - `family-housing-hub.web.app`
   - `family-housing-hub.firebaseapp.com`
   - Your custom domain (if you have one)

### Step 4: Check Email Delivery Settings
1. Go to **Authentication** → **Settings** → **Email templates**
2. Verify that **Password reset** is enabled
3. Check the **From** email address (should be `noreply@family-housing-hub.firebaseapp.com`)

---

## 🔧 Solution 2: Use Custom SMTP (Recommended for Production)

For better email delivery and branding, configure a custom SMTP server:

### Step 1: Get SMTP Credentials
You can use:
- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, pay-as-you-go)
- **Gmail SMTP** (for testing only)

### Step 2: Configure in Firebase
1. Go to **Authentication** → **Settings** → **Email templates**
2. Scroll to **SMTP configuration**
3. Click **Add SMTP configuration**
4. Enter your SMTP details:
   - **SMTP host:** (e.g., `smtp.sendgrid.net`)
   - **SMTP port:** (usually `587` for TLS)
   - **SMTP username:** Your SMTP username
   - **SMTP password:** Your SMTP password
   - **Sender email:** Your verified sender email
   - **Sender name:** "Family Housing Hub"

### Step 3: Test
1. Save the configuration
2. Try the password reset again
3. Check your inbox (and spam folder)

---

## 🔧 Solution 3: Check Spam Folder

Firebase emails often go to spam, especially:
- Gmail: Check **Spam** and **Promotions** tabs
- Outlook: Check **Junk Email** folder
- Yahoo: Check **Spam** folder

### Tips to Avoid Spam:
1. Add `noreply@family-housing-hub.firebaseapp.com` to your contacts
2. Mark the email as "Not Spam" if it appears in spam
3. Configure email filters to allow Firebase emails

---

## 🔧 Solution 4: Verify Email Domain (Advanced)

For better deliverability, verify your domain:

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your custom domain (if you have one)
3. Follow Firebase's domain verification process
4. This improves email deliverability significantly

---

## 🧪 Testing the Password Reset

### Test Steps:
1. Go to login page
2. Click "Forgot password?"
3. Enter a **registered email address**
4. Click "Send Reset Link"
5. Check your email inbox
6. If not received within 5 minutes:
   - Check spam folder
   - Verify email is correct
   - Check Firebase Console for errors

### Common Issues:

#### Issue: "Email sent" but no email received
**Causes:**
- Email in spam folder
- Firebase email templates not configured
- Email address doesn't exist in system (Firebase doesn't reveal this for security)

**Solutions:**
- Check spam folder
- Configure Firebase email templates
- Verify email address is correct
- Wait a few minutes (can take up to 5 minutes)

#### Issue: "Invalid email" error
**Causes:**
- Email format is incorrect
- Email domain is blocked

**Solutions:**
- Check email format
- Try a different email address
- Verify email in Firebase Console

#### Issue: "Too many requests" error
**Causes:**
- Too many password reset attempts

**Solutions:**
- Wait 15 minutes
- Try again later

---

## 📧 Email Template Customization

### Default Firebase Email Template:
```
Subject: Reset your password

Hello,

Follow this link to reset your password for your account.

[Reset Password Button]

If you didn't ask to reset your password, you can ignore this email.

Thanks,
Your Family Housing Hub team
```

### Customize in Firebase Console:
1. Go to **Authentication** → **Templates** → **Password reset**
2. Edit the template
3. Use variables:
   - `%LINK%` - Reset password link
   - `%EMAIL%` - User's email address
4. Save changes

---

## 🚀 Quick Fix Checklist

- [ ] Check spam/junk folder
- [ ] Verify email address is correct
- [ ] Check Firebase Console → Authentication → Templates (ensure enabled)
- [ ] Wait 5 minutes (email delivery can be delayed)
- [ ] Try with a different email address
- [ ] Check Firebase Console for errors
- [ ] Configure custom SMTP (for better delivery)

---

## 📞 Need Help?

If emails still aren't being received:

1. **Check Firebase Console Logs:**
   - Go to **Authentication** → **Users**
   - Check if user exists
   - Look for any error messages

2. **Test with Different Email:**
   - Try with a Gmail account (usually works best)
   - Try with the email you used to register

3. **Contact Support:**
   - Firebase Support: https://firebase.google.com/support
   - Check Firebase Status: https://status.firebase.google.com

---

## ✅ Expected Behavior

When password reset works correctly:
1. User enters email
2. Success message appears: "If an account exists with this email, a password reset link has been sent..."
3. Email arrives within 1-5 minutes
4. Email contains reset link
5. Clicking link opens password reset page
6. User can set new password

---

**Last Updated:** December 2024  
**Firebase Project:** family-housing-hub



