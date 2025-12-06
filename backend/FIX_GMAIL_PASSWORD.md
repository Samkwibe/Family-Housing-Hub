# 🔧 Fix Gmail Password Issue

## Problem
You're seeing: `Application-specific password required`

This means you're using your **regular Gmail password** instead of an **App Password**.

## ✅ Solution (2 minutes)

### Step 1: Create Gmail App Password

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/apppasswords
   - (You may need to sign in)

2. **Generate App Password**
   - Select "Mail" from the dropdown
   - Select "Other (Custom name)"
   - Type: `Family Housing Hub`
   - Click "Generate"

3. **Copy the Password**
   - You'll see a 16-character password like: `abcd efgh ijkl mnop`
   - **Important**: Copy it exactly (you can remove spaces when adding to .env)

### Step 2: Update .env File

Edit `backend/.env` and replace the `SMTP_PASSWORD` line:

```env
SMTP_PASSWORD=your-16-character-app-password-here
```

**Important**: 
- Remove any spaces from the password
- Use the App Password, NOT your regular Gmail password
- Make sure 2FA is enabled on your Google account

### Step 3: Test Again

```bash
python test_verification.py
```

Or just test email:
```bash
python -c "
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
load_dotenv()

smtp_user = os.getenv('SMTP_USER')
smtp_password = os.getenv('SMTP_PASSWORD')

server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login(smtp_user, smtp_password)
print('✅ Gmail connection successful!')
server.quit()
"
```

## 🎯 Quick Fix Command

After you get your App Password, run:

```bash
# Edit .env file (replace YOUR_APP_PASSWORD with the actual password)
nano .env
# or
code .env
```

Then update the `SMTP_PASSWORD` line.

## ✅ Current Status

- ✅ **Twilio**: Working perfectly!
- ❌ **Gmail**: Needs App Password (not regular password)

Once you update the password, both services will be ready! 🚀

