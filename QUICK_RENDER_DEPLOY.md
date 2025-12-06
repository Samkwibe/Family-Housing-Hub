# ⚡ Quick Render.com Deployment - 5 Minutes

## 🎯 What You Need
- Your Gmail App Password: `lintplcxfhgxgpja`
- Your Gmail: `Samsnhu@gmail.com`

## 📋 Step-by-Step Instructions

### 1. Go to Render.com
👉 https://dashboard.render.com
- Sign up (free) or log in

### 2. Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub: **`Samkwibe/Family-Housing-Hub`**
3. Click **"Connect"**

### 3. Configure Service

**Settings:**
- **Name**: `family-housing-hub-api`
- **Region**: `Oregon (US West)` or closest to you
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **CRITICAL!**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

### 4. Add Environment Variables

Click **"Add Environment Variable"** for each:

#### Email Configuration (REQUIRED):
```
SMTP_USER = Samsnhu@gmail.com
SMTP_PASSWORD = lintplcxfhgxgpja
EMAIL_FROM = noreply@family-housing-hub.com
```

#### Already Configured (verify these exist):
```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
PORT = 10000
```

#### Optional (for other features):
```
GEMINI_API_KEY = (your key if you have one)
GOOGLE_MAPS_API_KEY = (your key if you have one)
```

### 5. Deploy
1. Click **"Create Web Service"**
2. ⏳ Wait 5-10 minutes
3. Watch the deployment logs

### 6. Get Your URL
Once deployed, you'll see:
```
https://family-housing-hub-api.onrender.com
```
**Copy this URL!**

### 7. Test It
Visit: `https://your-url.onrender.com/api/health`

You should see:
```json
{
  "status": "healthy",
  "services": {
    "email": "configured"
  }
}
```

### 8. Update Frontend

1. Create `.env.local` in project root:
   ```bash
   VITE_BACKEND_URL=https://your-url.onrender.com
   ```

2. Rebuild and deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## ✅ Done!

Your email verification will now work! Users will receive actual emails.

## 🐛 Quick Troubleshooting

**Build fails?**
- Check Root Directory is `backend`
- Check logs for specific errors

**Service won't start?**
- Verify Start Command is correct
- Check PORT is set to 10000

**Email still not working?**
- Check SMTP_USER and SMTP_PASSWORD are correct
- Test health endpoint to see if email is "configured"

---

**That's it!** Your backend will be live in ~10 minutes. 🚀

