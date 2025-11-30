# Deployment Guide - Python Backend + React Frontend

## Backend Deployment (Python Flask API)

### Option 1: Render.com (Recommended - Free Tier)

1. **Create Render Account**: Go to https://render.com and sign up
2. **New Web Service**: 
   - Connect your GitHub repository
   - Select "Web Service"
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && gunicorn app:app --bind 0.0.0.0:$PORT`
   - Environment Variables:
     - `OPENAI_API_KEY` (optional)
     - `GEMINI_API_KEY` (your key)
     - `GOOGLE_MAPS_API_KEY` (your key)
     - `PORT` = 10000
3. **Deploy**: Render will automatically deploy from your GitHub repo

### Option 2: Railway.app (Free Tier)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Add environment variables
4. Railway auto-detects Python and deploys

### Option 3: Heroku (Paid, but reliable)

1. Install Heroku CLI
2. `heroku create your-app-name`
3. `git push heroku main`
4. Set environment variables in Heroku dashboard

## Frontend Configuration

After backend is deployed, update `.env.local`:

```env
VITE_API_URL=https://your-backend-url.onrender.com
VITE_GEMINI_API_KEY=your_key
VITE_GOOGLE_MAPS_API_KEY=your_key
```

## Current Deployment Status

- ✅ Frontend: Deployed to Firebase Hosting
- ⏳ Backend: Needs deployment to Render/Railway/Heroku
- ✅ API Service: Created in `src/services/api.js`

## Next Steps

1. Deploy backend to Render.com (free)
2. Get backend URL
3. Update frontend `.env.local` with backend URL
4. Redeploy frontend

