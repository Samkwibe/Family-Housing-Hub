# 🔑 Gemini API Key Setup for Receipt Scanner

## Quick Setup (2 minutes)

### Step 1: Get Your Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Click **"Create API Key"**
3. Select your Google Cloud project (or create a new one)
4. Copy the API key

### Step 2: Add to Your Project

#### Option A: For Local Development
Create a file `.env.local` in your project root:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

#### Option B: For Production (Firebase Hosting)
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `family-housing-hub`
3. Go to **Build** → **Hosting** → **Environment Variables**
4. Add: `VITE_GEMINI_API_KEY` = `your_api_key_here`
5. Redeploy: `npm run build && firebase deploy --only hosting`

### Step 3: Test It

1. Refresh your app: https://family-housing-hub.web.app/shopping-meals
2. Click "Scan Receipt"
3. Upload a receipt
4. It should now work!

## ⚠️ Important Notes

- **Free Tier**: Gemini API has a generous free tier (60 requests/minute)
- **No Credit Card Required**: For basic usage
- **Security**: Never commit your API key to GitHub
- **Fallback**: Even without API key, you can still manually enter items

## 🐛 Troubleshooting

### "404 Not Found" Error
- Check that your API key is correct
- Make sure you're using the latest API key from Google AI Studio
- Try regenerating the API key

### "403 Forbidden" Error
- Check API key permissions
- Make sure the API is enabled in Google Cloud Console
- Verify billing is set up (even for free tier)

### Still Not Working?
The receipt scanner will automatically fall back to manual entry mode, so you can still:
- Add items manually
- Save the receipt image
- View in receipt history

---

**Need Help?** Check the browser console for detailed error messages.



