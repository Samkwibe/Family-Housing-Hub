# 🔍 Debug Email Issues - Step by Step

## Step 1: Check Render Logs

1. Go to **Render Dashboard** → Your API service
2. Click **"Logs"** tab
3. Try sending a verification email in your app
4. Look for error messages in the logs

**Look for these messages:**
- `"Attempting to send email via smtp.gmail.com:587..."`
- `"SMTP Authentication failed"` → Wrong password
- `"SMTP error"` → Connection issue
- `"Error sending email"` → Other issue

**Copy the error message and share it!**

## Step 2: Verify Environment Variables in Render

Make sure these are set correctly:

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = Samsnhu@gmail.com
SMTP_PASSWORD = [Your 16-character App Password]
EMAIL_FROM = Samsnhu@gmail.com
```

**Important checks:**
- ✅ `SMTP_HOST` is `smtp.gmail.com` (NOT an email address)
- ✅ `SMTP_PORT` is `587` (NOT 465 or other)
- ✅ `SMTP_USER` and `EMAIL_FROM` match exactly
- ✅ `SMTP_PASSWORD` is the 16-character App Password (no spaces)

## Step 3: Test SMTP Connection Locally (Optional)

If you want to test locally:

1. Make sure you have a `.env` file in the `backend/` folder with:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=Samsnhu@gmail.com
   SMTP_PASSWORD=your-app-password-here
   EMAIL_FROM=Samsnhu@gmail.com
   ```

2. Run the test script:
   ```bash
   cd backend
   python test_smtp_connection.py
   ```

## Step 4: Common Issues & Fixes

### Issue: "SMTP Authentication failed"
**Fix:**
- Make sure you're using Gmail App Password (16 characters)
- NOT your regular Gmail password
- Regenerate App Password: https://myaccount.google.com/apppasswords

### Issue: "Connection refused" or "Connection timeout"
**Fix:**
- Verify `SMTP_HOST = smtp.gmail.com`
- Verify `SMTP_PORT = 587`
- Check if firewall is blocking

### Issue: "EMAIL_FROM doesn't match"
**Fix:**
- Set `EMAIL_FROM` to match `SMTP_USER` exactly
- Both should be: `Samsnhu@gmail.com`

### Issue: "Email not received"
**Fix:**
- Check spam/junk folder
- Wait 1-2 minutes
- Verify the email address is correct
- Check Render logs for actual sending confirmation

## Step 5: Check Backend Code is Deployed

Make sure the latest code is deployed:

1. Check Render → Your service → "Events" tab
2. Look for recent deployments
3. Make sure the latest commit is deployed
4. If not, click "Manual Deploy" → "Deploy latest commit"

## What to Share

When asking for help, share:
1. **Error message from Render logs**
2. **Screenshot of your Render environment variables** (hide passwords)
3. **What happens when you try to send email** (any error messages?)




