# 📧 Complete Email Setup for Render

## Missing Environment Variables

You need to add these two environment variables in Render:

### 1. SMTP_HOST
- **Key**: `SMTP_HOST`
- **Value**: `smtp.gmail.com`

### 2. SMTP_PORT
- **Key**: `SMTP_PORT`
- **Value**: `587`

## Complete List of Required Variables

Make sure you have ALL of these in Render:

✅ **SMTP_HOST** = `smtp.gmail.com` ← **MISSING**
✅ **SMTP_PORT** = `587` ← **MISSING**
✅ **SMTP_USER** = Your Gmail address (you have this)
✅ **SMTP_PASSWORD** = Your Gmail App Password (you have this)
✅ **EMAIL_FROM** = Your Gmail address (currently set to `noreply@family-housing-hub.com` - should be your Gmail)

## How to Add Missing Variables

1. Go to Render Dashboard
2. Click on your API service
3. Go to **Environment** tab
4. Click **"Add Environment Variable"**
5. Add:
   - Key: `SMTP_HOST`, Value: `smtp.gmail.com`
   - Key: `SMTP_PORT`, Value: `587`
6. Click **"Save Changes"**
7. The service will automatically redeploy

## Important Note About EMAIL_FROM

Your `EMAIL_FROM` is currently set to `noreply@family-housing-hub.com`, but it should be your **actual Gmail address** (the same as `SMTP_USER`). Gmail requires the "From" address to match the authenticated user.

## After Adding Variables

1. Wait for the service to redeploy (2-3 minutes)
2. Try the email verification again
3. Check your email inbox (and spam folder)

## Troubleshooting

If emails still don't arrive:
- Check Render logs for SMTP connection errors
- Verify your Gmail App Password is correct
- Make sure 2-factor authentication is enabled on your Gmail account
- Check that "Less secure app access" is enabled (or use App Password)

