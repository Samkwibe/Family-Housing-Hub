# 🔧 Backend Environment Variables Setup for Render

## Quick Setup

Your backend is deployed on Render, but you need to add the email and SMS credentials.

### Step 1: Go to Render Dashboard

1. Visit: https://dashboard.render.com
2. Find your service: `family-housing-hub-api`
3. Click on it

### Step 2: Add Environment Variables

Go to **Environment** tab and add these:

#### Email (Gmail SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=Samsnhu@gmail.com
SMTP_PASSWORD=lintplcxfhgxgpja
EMAIL_FROM=noreply@family-housing-hub.com
```

#### SMS (Twilio)
```
TWILIO_ACCOUNT_SID=AC18e3d561...
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+16036706761
```

**Note:** Get your full Twilio credentials from your `.env` file in the backend directory.

### Step 3: Redeploy

After adding variables, Render will auto-redeploy. Or:
- Go to **Manual Deploy** → **Deploy latest commit**

### Step 4: Verify

Check the health endpoint:
```bash
curl https://your-backend-url.onrender.com/api/health
```

Should show:
```json
{
  "services": {
    "email": "configured",
    "sms": "configured"
  }
}
```

---

## 📋 Your Current Credentials

From your local `.env` file:

**Gmail:**
- User: `Samsnhu@gmail.com`
- Password: `lintplcxfhgxgpja` (App Password)

**Twilio:**
- Account SID: `AC18e3d561...` (check your .env for full value)
- Auth Token: (check your .env)
- Phone: `+16036706761`

---

## ✅ Once Done

1. Backend will be ready with email/SMS
2. Frontend is already deployed
3. Test the verification flow at: https://family-housing-hub.web.app

🎉 You're all set!

