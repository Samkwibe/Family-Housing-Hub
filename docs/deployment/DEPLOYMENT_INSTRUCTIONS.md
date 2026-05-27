# 🚀 Deployment Instructions

## ✅ Frontend Deployment (Firebase Hosting)

The frontend has been built and is ready to deploy. Run:

```bash
firebase deploy --only hosting
```

## ⚙️ Backend Deployment (Render.com)

### Step 1: Update Environment Variables on Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your backend service: `family-housing-hub-api`
3. Go to **Environment** tab
4. Add/Update these variables:

**Email Configuration:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@family-housing-hub.com
```

**SMS Configuration:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 2: Redeploy Backend

After adding environment variables, Render will automatically redeploy. Or manually trigger:
- Go to **Manual Deploy** → **Deploy latest commit**

### Step 3: Update Frontend Backend URL

Update your frontend `.env` or environment variables with your Render backend URL:

```env
VITE_BACKEND_URL=https://your-backend-url.onrender.com
```

Then rebuild and redeploy frontend:
```bash
npm run build
firebase deploy --only hosting
```

## 🔍 Verify Deployment

1. **Check Backend Health:**
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

2. **Test Frontend:**
   - Visit your Firebase hosting URL
   - Go to registration page
   - Test email and phone verification

## 📝 Quick Deploy Commands

```bash
# Frontend
npm run build
firebase deploy --only hosting

# Backend (on Render)
# Just update environment variables in Render dashboard
# It will auto-redeploy
```

---

## 🎯 Current Status

- ✅ Frontend: Built successfully
- ✅ Backend: Code ready (needs env vars on Render)
- ✅ Verification: Gmail & Twilio configured locally

**Next:** Deploy frontend and update backend env vars on Render!

