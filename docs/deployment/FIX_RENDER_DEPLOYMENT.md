# 🔧 Fix Render.com Deployment Failures

## Current Issue
Both services show "Failed deploy" status on Render.com.

## 🔍 Step 1: Check Deployment Logs

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on "Family-Housing-Hub-api"** service
3. **Click "Logs" tab** at the top
4. **Scroll to the bottom** to see the error

Common errors you might see:

### Error 1: "Module not found" or "Import error"
**Fix**: Check `requirements.txt` has all dependencies

### Error 2: "Build command failed"
**Fix**: Verify build command is correct

### Error 3: "Start command failed"
**Fix**: Check start command and PORT variable

### Error 4: "Root directory not found"
**Fix**: Set Root Directory to `backend`

## 🛠️ Step 2: Fix the API Service (Python Backend)

### Option A: Delete and Recreate (Recommended)

1. **Delete the failed service**:
   - Click on "Family-Housing-Hub-api"
   - Go to "Settings" → Scroll down → "Delete Service"
   - Confirm deletion

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub: `Samkwibe/Family-Housing-Hub`
   - **Settings**:
     - Name: `family-housing-hub-api`
     - Root Directory: `backend` ⚠️ **CRITICAL**
     - Environment: `Python 3`
     - Build Command: `pip install -r requirements.txt`
     - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`
     - Plan: `Free` (or Starter if you want)

3. **Add Environment Variables**:
   ```
   SMTP_USER = Samsnhu@gmail.com
   SMTP_PASSWORD = lintplcxfhgxgpja
   EMAIL_FROM = noreply@family-housing-hub.com
   PORT = 10000
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   ```

4. **Click "Create Web Service"**

### Option B: Fix Existing Service

1. **Click on "Family-Housing-Hub-api"**
2. **Go to "Settings"**
3. **Check these settings**:
   - **Root Directory**: Must be `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
4. **Save Changes**
5. **Go to "Events" tab** → Click "Manual Deploy" → "Deploy latest commit"

## 🛠️ Step 3: Fix the Static Service (Frontend)

The static service might not be needed if you're using Firebase Hosting. But if you want to fix it:

1. **Click on "Family-Housing-Hub"** service
2. **Check Logs** for errors
3. **Settings**:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Root Directory**: Leave empty (or set to `.`)

**OR** just delete it since you're using Firebase Hosting.

## 📋 Common Fixes

### Fix 1: Root Directory Issue
**Problem**: Build can't find files
**Solution**: Set Root Directory to `backend` for API service

### Fix 2: Missing Dependencies
**Problem**: `pip install` fails
**Solution**: Check `backend/requirements.txt` exists and has all packages

### Fix 3: Port Configuration
**Problem**: Service won't start
**Solution**: 
- Set `PORT` environment variable to `10000`
- Verify start command uses `$PORT`

### Fix 4: Python Version
**Problem**: Wrong Python version
**Solution**: 
- Check `backend/runtime.txt` has correct version
- Or set in Render settings

### Fix 5: Gunicorn Not Found
**Problem**: `gunicorn` command fails
**Solution**: Verify `gunicorn==21.2.0` is in `requirements.txt`

## 🔍 Debugging Steps

1. **Check Build Logs**:
   - Look for red error messages
   - Check if `pip install` succeeded
   - Verify all packages installed

2. **Check Runtime Logs**:
   - Look for Python errors
   - Check if app started successfully
   - Verify PORT is being used

3. **Test Locally First**:
   ```bash
   cd backend
   pip install -r requirements.txt
   gunicorn app:app --bind 0.0.0.0:5000
   ```
   If this works locally, it should work on Render.

## ✅ Quick Checklist

- [ ] Root Directory set to `backend`
- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`
- [ ] PORT environment variable set to `10000`
- [ ] All required environment variables added
- [ ] `requirements.txt` exists in `backend/` folder
- [ ] `app.py` exists in `backend/` folder

## 🚀 After Fixing

1. **Wait for deployment** (5-10 minutes)
2. **Check status** - should be "Live" (green)
3. **Test health endpoint**: `https://your-url.onrender.com/api/health`
4. **Update frontend** with backend URL

## 💡 Pro Tips

1. **Use Render Blueprint** (render.yaml):
   - If you have `render.yaml` in root, Render might auto-configure
   - But manual setup is more reliable

2. **Check Branch**:
   - Make sure you're deploying from `main` or `dev` branch
   - Verify code is pushed to GitHub

3. **Free Tier Limitations**:
   - Services sleep after 15 min inactivity
   - First request after sleep takes ~30 seconds
   - This is normal, not an error

---

**Next Step**: Check the logs in Render dashboard to see the specific error, then apply the appropriate fix above.

