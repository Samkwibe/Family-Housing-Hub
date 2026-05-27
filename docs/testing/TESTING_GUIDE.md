# 🧪 Complete Testing Guide - AWS Cognito Integration

## ✅ Pre-Testing Checklist

Before you start testing, make sure you've completed:

- [ ] **Cognito Domain Created** in AWS Console
- [ ] **Config File Updated** with your domain (`src/services/cognito/config.js`)
- [ ] **App Client Configured** with callback URLs
- [ ] **MFA Enabled** in Cognito Console
- [ ] **App Running** (`npm run dev`)

---

## 🚀 Step-by-Step Testing

### **Test 1: Registration & Email Verification**

#### Steps:
1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Go to Registration:**
   - Navigate to: `http://localhost:5173/register`
   - Or click "Sign Up" from login page

3. **Fill in the form:**
   - First Name: `Test`
   - Last Name: `User`
   - Email: Use a **real email** you can access
   - Phone: `6036615417` (optional)
   - Password: `Test123!` (must have uppercase, number)
   - Confirm Password: `Test123!`
   - Select role: **Parent** or **Child**

4. **Submit:**
   - Click "Create Account"
   - You should see: "Account created! Please check your email for verification code"
   - **Email Verification Modal** should appear

5. **Check Your Email:**
   - Open your email inbox
   - Look for email from AWS Cognito
   - **Subject:** "Your verification code"
   - **Code:** 6-digit number (e.g., `123456`)

6. **Enter Verification Code:**
   - Type the 6-digit code in the modal
   - Click "Verify Email"
   - Should see: "Email verified! You can now log in."

7. **Expected Result:**
   - ✅ Modal closes
   - ✅ Redirected to login page
   - ✅ Toast shows success message

#### If It Doesn't Work:
- Check browser console for errors
- Check spam folder for email
- Click "Resend verification code" in modal
- Verify Cognito domain is set up correctly

---

### **Test 2: Login**

#### Steps:
1. **Go to Login:**
   - Navigate to: `http://localhost:5173/login`
   - Or from register page, click "Sign in here"

2. **Enter Credentials:**
   - Email: The email you just registered
   - Password: The password you used

3. **Click "Access Family Hub"**

4. **Expected Result:**
   - ✅ Login successful
   - ✅ Redirected to Dashboard
   - ✅ Toast shows "Welcome back!"
   - ✅ No errors in console

#### If It Doesn't Work:
- Check browser console for errors
- Verify email was verified
- Check password is correct
- Verify Cognito config is correct

---

### **Test 3: MFA Setup**

#### Steps:
1. **After logging in, go to Settings:**
   - Click **Settings** in sidebar
   - Or navigate to: `http://localhost:5173/settings`

2. **Go to Privacy & Security:**
   - Scroll to **Security** section
   - Find **Multi-Factor Authentication**

3. **Enable MFA:**
   - Click **"Enable"** button
   - MFA Setup Modal should open

4. **Follow Setup Wizard:**
   - **Step 1:** Read information, click "Get Started"
   - **Step 2:** Scan QR code with authenticator app
     - Use Google Authenticator, Authy, or Microsoft Authenticator
     - Scan the QR code shown
   - **Step 3:** Enter 6-digit code from your app
   - Click "Verify & Enable"

5. **Expected Result:**
   - ✅ MFA enabled successfully
   - ✅ Status shows "Enabled"
   - ✅ Toast shows success message

#### If It Doesn't Work:
- Make sure MFA is enabled in Cognito Console
- Check browser console for errors
- Verify you're using a real authenticator app
- Try manual entry of secret code

---

### **Test 4: Login with MFA**

#### Steps:
1. **Log Out:**
   - Click your profile → Sign Out
   - Or go to Settings → Sign Out

2. **Log Back In:**
   - Go to login page
   - Enter email and password
   - Click "Access Family Hub"

3. **MFA Prompt:**
   - After entering password, **MFA Verification Modal** should appear
   - Enter 6-digit code from your authenticator app
   - Click "Verify"

4. **Expected Result:**
   - ✅ MFA code accepted
   - ✅ Logged in successfully
   - ✅ Redirected to Dashboard

#### If It Doesn't Work:
- Check that MFA is actually enabled for your user
- Verify code from authenticator app is current (refreshes every 30 seconds)
- Check browser console for errors
- Make sure MFA is enabled in Cognito Console

---

### **Test 5: First-Login MFA Prompt**

#### Steps:
1. **Create a New Account:**
   - Register a new user
   - Verify email
   - Log in for the first time

2. **Expected Result:**
   - ✅ After login, **MFA Required Modal** should appear
   - ✅ Asks you to set up MFA
   - ✅ Can click "Set Up MFA Now" or "Set Up Later"

3. **Set Up MFA:**
   - Click "Set Up MFA Now"
   - Follow setup wizard
   - Complete MFA setup

4. **Expected Result:**
   - ✅ MFA setup complete
   - ✅ Redirected to Dashboard
   - ✅ Toast shows success

#### If It Doesn't Work:
- Check that the modal appears after first login
- Verify MFA status check is working
- Check browser console

---

### **Test 6: Password Reset**

#### Steps:
1. **Go to Login Page:**
   - Navigate to: `http://localhost:5173/login`

2. **Click "Forgot password?"**

3. **Enter Email:**
   - Enter your registered email
   - Click "Send Reset Link"

4. **Check Email:**
   - Look for password reset email from AWS Cognito
   - Click the reset link OR copy the code

5. **Reset Password:**
   - Enter new password: `NewTest123!`
   - Confirm new password: `NewTest123!`
   - Submit

6. **Expected Result:**
   - ✅ Password reset successfully
   - ✅ Can log in with new password

#### If It Doesn't Work:
- Check spam folder
- Verify email is registered
- Check Cognito email settings

---

### **Test 7: Google Sign-In**

#### Steps:
1. **Go to Login Page:**
   - Navigate to: `http://localhost:5173/login`

2. **Click "Sign in with Google"**

3. **Expected Result:**
   - ✅ Redirected to Cognito Hosted UI
   - ✅ Google Sign-In option available
   - ✅ After signing in, redirected back to app
   - ✅ Logged in successfully

#### If It Doesn't Work:
- Make sure Google is configured in Cognito
- Check callback URLs are correct
- Verify OAuth settings

---

### **Test 8: Profile Management**

#### Steps:
1. **Go to Profile:**
   - Navigate to: `http://localhost:5173/profile`

2. **Check MFA Status:**
   - Scroll to Security section
   - Should show MFA status (Enabled/Disabled)
   - Should have "Enable" or "Manage" button

3. **Update Profile:**
   - Edit any field
   - Save changes
   - **Expected:** Changes saved successfully

4. **Upload Photo:**
   - Click on profile photo
   - Upload an image
   - **Expected:** Photo updated

#### If It Doesn't Work:
- Check Firebase Storage permissions
- Verify user is authenticated
- Check browser console

---

### **Test 9: Settings - MFA Management**

#### Steps:
1. **Go to Settings:**
   - Navigate to: `http://localhost:5173/settings`

2. **Privacy & Security Section:**
   - Find "Multi-Factor Authentication"
   - Should show current status

3. **Disable MFA (if enabled):**
   - Click "Disable"
   - Confirm
   - **Expected:** MFA disabled, status updated

4. **Re-enable MFA:**
   - Click "Enable"
   - Follow setup wizard
   - **Expected:** MFA enabled again

#### If It Doesn't Work:
- Check MFA status in Cognito Console
- Verify user permissions
- Check browser console

---

### **Test 10: Session Management**

#### Steps:
1. **Log In:**
   - Log in to your account

2. **Wait or Simulate Inactivity:**
   - Don't interact with the app for a while
   - Or manually test session timeout

3. **Expected Result:**
   - ✅ Session should persist during activity
   - ✅ After 24 hours of inactivity, should log out
   - ✅ Toast shows session expired message

#### If It Doesn't Work:
- Check session timeout settings
- Verify activity detection is working

---

## 🐛 Common Issues & Fixes

### Issue: "Domain not found"
**Fix:**
1. Go to Cognito Console
2. Create the domain
3. Update `src/services/cognito/config.js` with your domain

### Issue: "Invalid redirect URI"
**Fix:**
1. Go to Cognito Console → App clients
2. Add your URLs to callback URLs exactly as they appear
3. Make sure no trailing slashes

### Issue: "User not found"
**Fix:**
1. Make sure you verified your email
2. Check that registration completed successfully
3. Verify email in Cognito Console

### Issue: "MFA not working"
**Fix:**
1. Enable MFA in Cognito Console
2. Set up MFA for your user account
3. Use a real authenticator app
4. Make sure code is current (30-second window)

### Issue: "Email not received"
**Fix:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Cognito email settings
4. Try resending code

---

## ✅ Testing Checklist

### Basic Functionality:
- [ ] Registration works
- [ ] Email verification works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works

### MFA:
- [ ] MFA setup works
- [ ] MFA login works
- [ ] MFA disable works
- [ ] MFA re-enable works
- [ ] First-login MFA prompt appears

### User Experience:
- [ ] Profile page shows MFA status
- [ ] Settings page shows MFA status
- [ ] MFA can be enabled/disabled
- [ ] Error messages are clear
- [ ] Success messages appear

### Integration:
- [ ] Firebase Firestore still works
- [ ] Firebase Storage still works
- [ ] All existing features work
- [ ] No console errors

---

## 🎯 Quick Test Script

Run through this quick test:

```bash
# 1. Start app
npm run dev

# 2. Test Registration
# - Go to /register
# - Create account
# - Verify email

# 3. Test Login
# - Go to /login
# - Log in
# - Should work!

# 4. Test MFA
# - Go to Settings
# - Enable MFA
# - Log out and back in
# - Enter MFA code
# - Should work!
```

---

## 📊 Expected Results

### ✅ Success Indicators:
- No errors in browser console
- Smooth user experience
- All modals work correctly
- Email verification works
- MFA setup works
- Login with MFA works
- All existing features still work

### ❌ Failure Indicators:
- Errors in browser console
- Modals don't appear
- Email not received
- MFA codes not working
- Login fails
- Existing features broken

---

## 🚀 Ready to Test!

**Everything is set up!** Just:

1. ✅ Complete Cognito domain setup (if not done)
2. ✅ Update config file
3. ✅ Run `npm run dev`
4. ✅ Follow the tests above

**You're ready to test!** 🎉

---

**Need help?** Check the browser console for errors and let me know what you see!


