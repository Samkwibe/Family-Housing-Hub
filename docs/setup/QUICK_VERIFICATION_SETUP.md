# Quick Verification Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Gmail Setup (2 minutes)

1. **Enable 2FA on Gmail**
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" → "Other" → Name it "Family Hub"
   - **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 2: Twilio Setup (2 minutes)

1. **Sign up for Twilio** (Free trial)
   - Go to: https://www.twilio.com/try-twilio
   - Sign up with your email

2. **Get Credentials**
   - Go to: https://console.twilio.com
   - Copy your **Account SID** (starts with `AC`)
   - Copy your **Auth Token** (click to reveal)
   - Get a **Phone Number** (use trial number for testing)

### Step 3: Configure Backend (1 minute)

1. **Create .env file**
   ```bash
   cd backend
   cp env.example .env
   ```

2. **Edit .env file** - Add your credentials:
   ```env
   # Gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password  # Remove spaces!
   EMAIL_FROM=noreply@family-housing-hub.com
   
   # Twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Test configuration**
   ```bash
   python test_verification.py
   ```

### Step 4: Start Backend

```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

### Step 5: Test in App

1. Go to your app's registration page
2. Enter email and phone
3. Click "Sign Up"
4. Check email for verification code
5. Enter code to verify email
6. Check SMS for phone verification code
7. Enter code to verify phone
8. Complete registration!

---

## ✅ Verification Checklist

- [ ] Gmail 2FA enabled
- [ ] Gmail App Password created
- [ ] Twilio account created
- [ ] Twilio credentials copied
- [ ] .env file created with all credentials
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Test script passed (`python test_verification.py`)
- [ ] Backend started (`python app.py`)
- [ ] Health check shows services configured (`curl http://localhost:5000/api/health`)
- [ ] End-to-end test completed in app

---

## 🐛 Troubleshooting

### Email not sending?
- ✅ Check you're using App Password (not regular password)
- ✅ Remove spaces from App Password in .env
- ✅ Check spam folder
- ✅ Verify SMTP settings: `smtp.gmail.com:587`

### SMS not sending?
- ✅ Verify your phone number in Twilio Console (trial accounts only)
- ✅ Check phone format: `+1234567890` (with country code)
- ✅ Check Twilio account balance

### Backend errors?
- ✅ Check .env file exists in `backend/` directory
- ✅ Verify all credentials are correct
- ✅ Run `python test_verification.py` to diagnose

---

## 📞 Need Help?

1. Run the test script: `python backend/test_verification.py`
2. Check backend logs for error messages
3. Verify credentials in Twilio/Gmail consoles
4. See `backend/VERIFICATION_SETUP.md` for detailed guide

---

## 🎉 You're Ready!

Once the test script passes, you can test the full verification flow in your app!

