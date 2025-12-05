# 🔑 Add API Key to Firebase Hosting

## Your API Key
`K83137649388957`

## ⚠️ Important Note
The API key format `K83137649388957` doesn't match Google Gemini API key format (which typically starts with "AIza"). 

**This might be from a different OCR service.** If so, we may need to integrate a different API.

## For Now: Add to Firebase Hosting

### Option 1: Firebase Console (Recommended)

1. Go to: https://console.firebase.google.com/project/family-housing-hub/hosting
2. Click on **"Environment Variables"** or **"Build Settings"**
3. Add new variable:
   - **Name:** `VITE_GEMINI_API_KEY`
   - **Value:** `K83137649388957`
4. Save and redeploy

### Option 2: Firebase CLI

```bash
firebase functions:config:set gemini.api_key="K83137649388957"
```

### Option 3: Build-time Embedding

Since Vite embeds `VITE_` variables at build time, the key should already be in your build if it's in `.env.local`. 

**However**, if you're seeing 404 errors, the key format might be incorrect for Gemini API.

## Check Your API Key Source

**If this is a Gemini API key:**
- It should start with "AIza"
- Get it from: https://aistudio.google.com/app/apikey

**If this is from a different OCR service:**
- Let me know which service (e.g., OCR.space, Tesseract, etc.)
- I can integrate that service instead

## Test After Adding

1. Refresh: https://family-housing-hub.web.app/shopping-meals
2. Click "Scan Receipt"
3. Upload a receipt
4. Check browser console for errors

---

**Current Status:** The key is in `.env.local` but may need to be in Firebase Hosting environment variables for production.



