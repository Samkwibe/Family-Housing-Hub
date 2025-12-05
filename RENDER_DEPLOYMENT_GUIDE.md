# 🚀 Render.com Deployment Guide

## Step-by-Step: Adding API Keys to Render.com

### Prerequisites
- Render.com account (sign up at https://render.com if needed)
- GitHub repository connected (already done ✅)

---

## 📋 Step 1: Create a New Web Service

1. **Go to Render.com Dashboard**
   - Visit: https://dashboard.render.com
   - Click **"New +"** button (top right)
   - Select **"Web Service"**

2. **Connect Your Repository**
   - Choose **"Connect GitHub"** or **"Connect GitLab"**
   - Select your repository: `Samkwibe/Family-Housing-Hub`
   - Click **"Connect"**

3. **Configure the Service**
   - **Name**: `family-housing-hub-api` (or any name you prefer)
   - **Region**: Choose closest to you (e.g., `Oregon (US West)`)
   - **Branch**: `main`
   - **Root Directory**: `backend` ⚠️ **IMPORTANT: Set this to `backend`**
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

---

## 🔑 Step 2: Add Environment Variables

1. **In the Render.com service settings**, scroll down to **"Environment Variables"** section

2. **Click "Add Environment Variable"** for each key below:

### Required Environment Variables:

#### 1. RapidAPI Key (Realtor.com API)
- **Key**: `RAPIDAPI_KEY`
- **Value**: `4d9f4dec85msh34a2b4ff5648991p1dcfccjsn125f4440583c`
- Click **"Save"**

#### 2. Estated API Key
- **Key**: `ESTATED_API_KEY`
- **Value**: `ec5c7745e9236b9519809c1d4c3f9c87`
- Click **"Save"**

#### 3. (Optional) Google Maps API Key
- **Key**: `GOOGLE_MAPS_API_KEY`
- **Value**: Your Google Maps API key (if you have one)
- Click **"Save"**

#### 4. (Optional) Gemini API Key
- **Key**: `GEMINI_API_KEY`
- **Value**: Your Gemini API key (if you have one)
- Click **"Save"**

---

## ⚙️ Step 3: Configure Advanced Settings

1. **Scroll to "Advanced" section**

2. **Set these options:**
   - **Auto-Deploy**: `Yes` (deploys automatically on git push)
   - **Health Check Path**: `/api/health` (optional, for monitoring)

3. **Plan Selection:**
   - Start with **Free** plan (good for testing)
   - Upgrade to **Starter** ($7/month) for better performance

---

## 🚀 Step 4: Deploy

1. **Click "Create Web Service"** at the bottom

2. **Wait for deployment** (usually 2-5 minutes)
   - You'll see build logs in real-time
   - Watch for any errors

3. **Once deployed**, you'll get a URL like:
   - `https://family-housing-hub-api.onrender.com`

---

## ✅ Step 5: Update Frontend API URL

1. **Copy your Render.com backend URL**

2. **Update frontend environment variable:**
   - In your project root, create/update `.env.local`:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   ```

3. **Or update in `src/services/propertyService.js`:**
   - Change the default URL to your Render.com URL

4. **Redeploy frontend:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 🧪 Step 6: Test the Backend

1. **Test Health Endpoint:**
   - Visit: `https://your-backend-url.onrender.com/api/health`
   - Should return JSON with API configuration status

2. **Test Property Search:**
   - Use Postman or curl:
   ```bash
   curl -X POST https://your-backend-url.onrender.com/api/properties/search \
     -H "Content-Type: application/json" \
     -d '{"query": "Manchester NH", "filters": {}}'
   ```

---

## 📸 Visual Guide: Adding Environment Variables

1. **In Render.com Dashboard:**
   ```
   Your Service → Settings → Environment Variables
   ```

2. **Click "Add Environment Variable"**

3. **Fill in:**
   - Key: `RAPIDAPI_KEY`
   - Value: `4d9f4dec85msh34a2b4ff5648991p1dcfccjsn125f4440583c`
   - Click "Save"

4. **Repeat for each API key**

---

## 🔍 Troubleshooting

### Issue: Build fails
- **Check**: Root directory is set to `backend`
- **Check**: `requirements.txt` exists in `backend/` folder
- **Check**: Python version in `runtime.txt` (should be `python-3.13.3`)

### Issue: API keys not working
- **Check**: Environment variables are saved (refresh page)
- **Check**: No extra spaces in key names or values
- **Check**: Backend logs for API errors

### Issue: Backend not responding
- **Check**: Health endpoint: `/api/health`
- **Check**: Render.com service is "Live" (not "Suspended")
- **Check**: Free tier services sleep after 15 min inactivity

### Issue: CORS errors
- **Check**: Frontend URL is in CORS origins in `backend/app.py`
- **Add**: Your frontend URL to the CORS list

---

## 📝 Quick Reference

### Environment Variables to Add:
```
RAPIDAPI_KEY=4d9f4dec85msh34a2b4ff5648991p1dcfccjsn125f4440583c
ESTATED_API_KEY=ec5c7745e9236b9519809c1d4c3f9c87
```

### Build Settings:
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`

### Important URLs:
- **Backend Health**: `https://your-backend.onrender.com/api/health`
- **Property Search**: `https://your-backend.onrender.com/api/properties/search`

---

## 🎉 Success Checklist

- [ ] Backend service created on Render.com
- [ ] Root directory set to `backend`
- [ ] `RAPIDAPI_KEY` environment variable added
- [ ] `ESTATED_API_KEY` environment variable added
- [ ] Service deployed successfully
- [ ] Health endpoint returns 200 OK
- [ ] Frontend updated with backend URL
- [ ] Property search works in the app

---

## 💡 Pro Tips

1. **Free Tier Limitations:**
   - Services sleep after 15 minutes of inactivity
   - First request after sleep takes ~30 seconds (cold start)
   - Consider upgrading to Starter plan for production

2. **Monitoring:**
   - Check Render.com logs for errors
   - Use `/api/health` endpoint for uptime monitoring

3. **Auto-Deploy:**
   - Enable auto-deploy to automatically deploy on git push
   - No manual deployment needed!

---

**Need Help?** Check Render.com documentation: https://render.com/docs



