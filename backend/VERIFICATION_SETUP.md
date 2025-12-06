# Verification Setup Guide - Gmail & Twilio

This guide will help you configure Gmail SMTP and Twilio for email and phone verification.

## Step 1: Gmail SMTP Setup

### Option A: Using Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification" if not already enabled

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Family Housing Hub" as the name
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this)

3. **Add to .env file**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # The 16-char app password
   EMAIL_FROM=noreply@family-housing-hub.com
   ```

### Option B: Using SendGrid (Production Recommended)

1. **Sign up for SendGrid**
   - Go to: https://sendgrid.com
   - Free tier: 100 emails/day

2. **Create API Key**
   - Go to Settings → API Keys
   - Create new API key with "Full Access"
   - Copy the API key

3. **Add to .env file**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your_sendgrid_api_key
   EMAIL_FROM=noreply@yourdomain.com
   ```

---

## Step 2: Twilio SMS Setup

1. **Sign up for Twilio**
   - Go to: https://www.twilio.com/try-twilio
   - Free trial includes $15.50 credit
   - Verify your phone number

2. **Get Your Credentials**
   - Go to: https://console.twilio.com
   - Find your **Account SID** (starts with `AC`)
   - Find your **Auth Token** (click to reveal)

3. **Get a Phone Number**
   - Go to: Phone Numbers → Manage → Buy a number
   - For testing: Use the trial number (free)
   - For production: Purchase a number ($1/month)
   - Copy the phone number (format: +1234567890)

4. **Add to .env file**
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

---

## Step 3: Create .env File

1. **Copy the example file**
   ```bash
   cd backend
   cp env.example .env
   ```

2. **Edit .env and add your credentials**
   ```bash
   # Use your preferred editor
   nano .env
   # or
   code .env
   ```

3. **Fill in the values** from Steps 1 and 2

---

## Step 4: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `twilio` - For SMS sending
- All other required packages

---

## Step 5: Test the Configuration

### Test Email Sending

```bash
cd backend
python -c "
from app import app
import os
from dotenv import load_dotenv
load_dotenv()

# Test email configuration
smtp_user = os.getenv('SMTP_USER')
smtp_pass = os.getenv('SMTP_PASSWORD')

if smtp_user and smtp_pass:
    print('✅ Email configuration found')
    print(f'   SMTP User: {smtp_user}')
    print(f'   SMTP Password: {"*" * len(smtp_pass)}')
else:
    print('❌ Email configuration missing')
"
```

### Test SMS Configuration

```bash
python -c "
from app import app
import os
from dotenv import load_dotenv
load_dotenv()

# Test Twilio configuration
twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_phone = os.getenv('TWILIO_PHONE_NUMBER')

if twilio_sid and twilio_token and twilio_phone:
    print('✅ Twilio configuration found')
    print(f'   Account SID: {twilio_sid[:10]}...')
    print(f'   Phone Number: {twilio_phone}')
else:
    print('❌ Twilio configuration missing')
"
```

### Test Backend Endpoints

1. **Start the backend server**
   ```bash
   cd backend
   python app.py
   ```

2. **Test email endpoint** (in another terminal)
   ```bash
   curl -X POST http://localhost:5000/api/verification/send-email \
     -H "Content-Type: application/json" \
     -d '{"email": "your-email@example.com", "code": "123456"}'
   ```

3. **Test SMS endpoint**
   ```bash
   curl -X POST http://localhost:5000/api/verification/send-sms \
     -H "Content-Type: application/json" \
     -d '{"phone": "1234567890", "code": "123456"}'
   ```

---

## Step 6: Frontend Configuration

Make sure your frontend knows where the backend is:

1. **Check `vite.config.js` or `.env`**
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   ```

2. **For production**, update to your deployed backend URL:
   ```env
   VITE_BACKEND_URL=https://your-backend-url.com
   ```

---

## Troubleshooting

### Email Not Sending

1. **Check Gmail App Password**
   - Make sure you're using the 16-character app password, not your regular password
   - App passwords have spaces: `xxxx xxxx xxxx xxxx` (remove spaces in .env)

2. **Check SMTP Settings**
   - Gmail: `smtp.gmail.com:587`
   - Make sure TLS is enabled (port 587)

3. **Check Spam Folder**
   - Verification emails might go to spam initially
   - Mark as "Not Spam" to improve deliverability

### SMS Not Sending

1. **Check Twilio Trial Limits**
   - Trial accounts can only send to verified numbers
   - Verify your phone number in Twilio Console

2. **Check Phone Number Format**
   - Must include country code: `+1234567890`
   - No spaces or dashes

3. **Check Twilio Balance**
   - Go to: https://console.twilio.com
   - Make sure you have credits

### Backend Not Starting

1. **Check Python Version**
   ```bash
   python --version  # Should be 3.8+
   ```

2. **Check Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Check .env File**
   - Make sure it exists in the `backend/` directory
   - Check for typos in variable names

---

## Production Checklist

- [ ] Gmail/SendGrid configured
- [ ] Twilio account set up
- [ ] Phone number purchased (if not using trial)
- [ ] .env file created with all credentials
- [ ] Dependencies installed
- [ ] Email test successful
- [ ] SMS test successful
- [ ] Backend deployed (if applicable)
- [ ] Frontend configured with backend URL
- [ ] End-to-end test completed

---

## Quick Start Commands

```bash
# 1. Navigate to backend
cd backend

# 2. Copy example env file
cp .env.example .env

# 3. Edit .env file (add your credentials)
nano .env  # or use your preferred editor

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start backend
python app.py

# 6. In another terminal, test
curl -X POST http://localhost:5000/api/verification/send-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'
```

---

## Support

If you encounter issues:
1. Check backend logs for error messages
2. Verify all credentials in .env file
3. Test email/SMS endpoints individually
4. Check Twilio Console for SMS delivery status
5. Check Gmail/SendGrid logs for email delivery

