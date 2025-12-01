# Backend Debugging Guide

## Issue: No Properties Showing

The Estated API integration is configured but not returning results. Here's how to debug:

## 1. Check Backend Health

Test if the backend is running:
```bash
curl https://family-housing-hub-api.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "estated_configured": true,
  "rapidapi_configured": false,
  "attom_configured": false,
  "timestamp": "2024-11-30T..."
}
```

## 2. Check Browser Console

Open browser DevTools (F12) → Console tab and search for:
- `🔍 Searching for properties:` - Shows the search query
- `📡 Backend response status:` - Shows HTTP status
- `✅ Backend returned:` - Shows property count
- `❌` - Shows any errors

## 3. Test Estated API Directly

The backend logs will show:
- `🔍 Calling Estated API:` - The API URL being called
- `📡 Estated API response:` - HTTP status code
- `✅ Found property data:` - If property found
- `❌ Estated API error:` - If there's an error

## 4. Common Issues

### Backend Not Deployed
- **Symptom**: Network error in console
- **Fix**: Deploy backend to Render.com

### Estated API Key Invalid
- **Symptom**: 401 or 403 error from Estated API
- **Fix**: Verify API key in Render.com environment variables

### Address Not Found
- **Symptom**: 200 response but no `data` field
- **Fix**: Try a different, more specific address

### CORS Error
- **Symptom**: CORS error in console
- **Fix**: Check backend CORS configuration

## 5. Test Addresses

Try these specific addresses:
- `123 Main St, Manchester, NH 03101`
- `456 Elm Street, Manchester, NH`
- `789 Oak Avenue, Manchester, New Hampshire`

## 6. Next Steps

1. Check browser console for detailed logs
2. Check Render.com logs for backend errors
3. Verify Estated API key is set in Render.com
4. Test backend health endpoint
5. Try a very specific address format


