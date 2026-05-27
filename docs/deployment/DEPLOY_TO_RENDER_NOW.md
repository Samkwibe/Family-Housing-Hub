# 🚀 Deploy Backend to Render.com - Step by Step

## Quick Deployment Guide

### Step 1: Go to Render.com
1. Visit: https://dashboard.render.com
2. Sign up or log in (free account)

### Step 2: Create New Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**

### Step 3: Connect Repository
1. Choose **"Connect GitHub"** (or GitLab if you use that)
2. Select repository: **`Samkwibe/Family-Housing-Hub`**
3. Click **"Connect"**

### Step 4: Configure Service Settings

**Basic Settings:**
- **Name**: `family-housing-hub-api`
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ **IMPORTANT!**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

### Step 5: Add Environment Variables

Click **"Add Environment Variable"** for each:

#### Required for Email Verification:
1. **SMTP_USER**
   - Value: `Samsnhu@gmail.com` (your Gmail address)

2. **SMTP_PASSWORD**
   - Value: Your Gmail App Password (the one you generated earlier)

3. **EMAIL_FROM**
   - Value: `noreply@family-housing-hub.com`

#### Already Set in render.yaml (but verify):
- `SMTP_HOST` = `smtp.gmail.com`
- `SMTP_PORT` = `587`
- `PORT` = `10000`

#### Optional (for other features):
- `GEMINI_API_KEY` = Your Gemini API key
- `GOOGLE_MAPS_API_KEY` = Your Google Maps key
- `OPENAI_API_KEY` = Your OpenAI key (if you have one)

### Step 6: Deploy
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Watch the logs for any errors

### Step 7: Get Your Backend URL
1. Once deployed, you'll see a URL like:
   - `https://family-housing-hub-api.onrender.com`
2. **Copy this URL** - you'll need it for the frontend

### Step 8: Test the Backend
1. Visit: `https://your-backend-url.onrender.com/api/health`
2. You should see: `{"status": "healthy", ...}`

### Step 9: Update Frontend
1. Create/update `.env.local` in project root:
   ```
   VITE_BACKEND_URL=https://your-backend-url.onrender.com
   ```

2. Rebuild and redeploy frontend:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## ✅ Success Checklist

- [ ] Render.com account created
- [ ] Web service created
- [ ] Root directory set to `backend`
- [ ] SMTP_USER environment variable added
- [ ] SMTP_PASSWORD environment variable added
- [ ] Service deployed successfully
- [ ] Health endpoint returns 200 OK
- [ ] Backend URL copied
- [ ] Frontend `.env.local` updated
- [ ] Frontend redeployed

## 🐛 Troubleshooting

### Build Fails
- Check that `Root Directory` is set to `backend`
- Verify `requirements.txt` exists in `backend/` folder
- Check build logs for specific errors

### Service Won't Start
- Verify `Start Command` is: `gunicorn app:app --bind 0.0.0.0:$PORT`
- Check logs for Python errors
- Make sure `PORT` environment variable is set

### Email Still Not Sending
- Verify `SMTP_USER` and `SMTP_PASSWORD` are set correctly
- Check backend logs for SMTP errors
- Test health endpoint: `/api/health` (should show email as "configured")

### CORS Errors
- The backend already has CORS configured for:
  - `https://family-housing-hub.web.app`
  - `http://localhost:5173`
  - `http://localhost:3001`

## 📝 Important Notes

1. **Free Tier**: Services sleep after 15 minutes of inactivity
   - First request after sleep takes ~30 seconds (cold start)
   - This is normal for free tier

2. **Auto-Deploy**: Render automatically deploys when you push to GitHub
   - No need to manually redeploy after first setup

3. **Environment Variables**: 
   - Sensitive values (like passwords) are stored securely
   - Never commit `.env` files to GitHub

## 🎉 After Deployment

Once deployed, your email verification will work! Users will receive actual emails instead of seeing codes in toast messages.

---

**Need Help?** Check Render.com docs: https://render.com/docs

