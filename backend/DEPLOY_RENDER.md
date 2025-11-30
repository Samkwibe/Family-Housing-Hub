# Deploy to Render.com

1. Go to https://render.com
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repository: Samkwibe/Family-Housing-Hub
5. Configure:
   - Name: family-housing-hub-api
   - Environment: Python 3
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && gunicorn app:app --bind 0.0.0.0:$PORT`
6. Add Environment Variables:
   - GEMINI_API_KEY=your_key
   - GOOGLE_MAPS_API_KEY=your_key
   - OPENAI_API_KEY=your_key (optional)
   - PORT=10000
7. Click "Create Web Service"
8. Wait for deployment (5-10 minutes)
9. Copy the service URL (e.g., https://family-housing-hub-api.onrender.com)
10. Update frontend .env.local with: VITE_API_URL=https://your-service-url.onrender.com
