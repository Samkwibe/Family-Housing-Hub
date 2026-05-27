# 📧 Gmail SMTP Setup Guide - Step by Step

## What You Need

You need a **Gmail account** and a **Gmail App Password** (not your regular Gmail password).

## Step 1: Choose Your Gmail Account

Use any Gmail account you have access to. This will be the account that sends verification emails.

**Examples:**
- `yourname@gmail.com`
- `yourbusiness@gmail.com`
- `familyhousinghub@gmail.com` (if you created one)

**Important:** This should be a Gmail account you control and can access.

## Step 2: Enable 2-Factor Authentication

1. Go to: https://myaccount.google.com/security
2. Sign in with your Gmail account
3. Under "Signing in to Google", find **"2-Step Verification"**
4. Click **"Get Started"** and follow the prompts
5. Complete the setup (you'll need your phone)

## Step 3: Generate an App Password

1. Go to: https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. Sign in with your Gmail account
3. Under "Select app", choose **"Mail"**
4. Under "Select device", choose **"Other (Custom name)"**
5. Type: `Family Housing Hub` or `Render Backend`
6. Click **"Generate"**
7. **Copy the 16-character password** (it looks like: `abcd efgh ijkl mnop`)
   - Remove spaces: `abcdefghijklmnop`

## Step 4: Configure in Render

Go to Render Dashboard → Your API Service → Environment Variables:

### Add/Update These Variables:

1. **SMTP_HOST**
   - Key: `SMTP_HOST`
   - Value: `smtp.gmail.com`

2. **SMTP_PORT**
   - Key: `SMTP_PORT`
   - Value: `587`

3. **SMTP_USER**
   - Key: `SMTP_USER`
   - Value: `your-email@gmail.com` (the Gmail address you used)

4. **SMTP_PASSWORD**
   - Key: `SMTP_PASSWORD`
   - Value: `abcdefghijklmnop` (the 16-character App Password from Step 3)

5. **EMAIL_FROM**
   - Key: `EMAIL_FROM`
   - Value: `your-email@gmail.com` (same as SMTP_USER)

## Example Configuration

If your Gmail is `john.doe@gmail.com` and your App Password is `abcd efgh ijkl mnop`:

```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = john.doe@gmail.com
SMTP_PASSWORD = abcdefghijklmnop
EMAIL_FROM = john.doe@gmail.com
```

## Important Notes

⚠️ **Use App Password, NOT your regular Gmail password**
- Regular passwords won't work
- App Passwords are 16 characters (no spaces)

⚠️ **EMAIL_FROM must match SMTP_USER**
- Gmail requires them to be the same
- Don't use `noreply@family-housing-hub.com`

⚠️ **2-Factor Authentication is Required**
- You can't generate App Passwords without 2FA enabled

## After Setup

1. Save all environment variables in Render
2. Wait for service to redeploy (2-3 minutes)
3. Test email verification
4. Check your email inbox (and spam folder)

## Troubleshooting

**"Invalid credentials" error:**
- Make sure you're using the App Password, not your regular password
- Verify 2FA is enabled
- Regenerate the App Password if needed

**"Email not received":**
- Check spam folder
- Verify SMTP_USER and EMAIL_FROM match
- Check Render logs for errors

**"Can't generate App Password":**
- Make sure 2-Step Verification is enabled
- Wait a few minutes after enabling 2FA
- Try a different browser

