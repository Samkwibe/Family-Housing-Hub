# Free AI Setup Guide

The AI Cooking Assistant now uses **FREE APIs**! No payment required.

## Option 1: Google Gemini API (Recommended - FREE)

Google Gemini offers a generous free tier perfect for this app.

### Steps:
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key
5. Create a `.env` file in the project root:
   ```
   VITE_GEMINI_API_KEY=your-api-key-here
   ```
6. Restart your dev server: `npm run dev`

**Free Tier Limits:**
- 60 requests per minute
- 1,500 requests per day
- More than enough for personal use!

## Option 2: OpenAI API (Optional - Premium)

If you prefer OpenAI (requires payment after free trial):
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to `.env`:
   ```
   VITE_OPENAI_API_KEY=your-api-key-here
   ```

## Option 3: No API Key (Free Mode)

The app works perfectly without any API key! It uses an intelligent fallback system that:
- Answers specific recipe questions
- Provides detailed cooking instructions
- Includes YouTube video links
- Works completely offline

## Which Should You Use?

- **No API Key**: Works great for basic recipe questions
- **Gemini API (Free)**: Best for advanced AI responses, no cost
- **OpenAI API**: Premium option if you want ChatGPT-quality responses

The app automatically uses the best available option!

