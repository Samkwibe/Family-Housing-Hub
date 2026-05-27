# Email & Phone Verification Setup Guide

## Overview

The Family Housing Hub now requires email and phone verification before users can complete signup. This ensures:
- ✅ Only valid, real email addresses can be used
- ✅ Only real phone numbers can be used
- ✅ Users must verify their contact information
- ✅ Unverified accounts are automatically cleaned up

---

## Features Implemented

### 1. Email Verification
- **6-digit verification code** sent to user's email
- **10-minute expiration** for security
- **5 attempt limit** before requiring new code
- **Fake email detection** - blocks disposable/temporary email services
- **Format validation** - ensures proper email format

### 2. Phone Verification
- **6-digit verification code** sent via SMS
- **10-minute expiration** for security
- **5 attempt limit** before requiring new code
- **US phone number validation** - ensures 10-digit format
- **Fake number detection** - blocks test/fake numbers

### 3. Account Cleanup
- **Automatic cleanup** of unverified accounts older than 7 days
- **Suspension option** - can suspend instead of delete
- **Firestore integration** - tracks verification status

---

## Setup Instructions

### Backend Configuration

#### 1. Email Service (SMTP)

Add to your `.env` file:

```env
# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@family-housing-hub.com
```

**For Gmail:**
1. Enable 2-factor authentication
2. Generate an "App Password" (not your regular password)
3. Use the app password in `SMTP_PASSWORD`

**Alternative Services:**
- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- **AWS SES**: Very cheap, pay-as-you-go

#### 2. SMS Service (Twilio)

Add to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Twilio Setup:**
1. Sign up at https://www.twilio.com
2. Get your Account SID and Auth Token
3. Purchase a phone number
4. Add credentials to `.env`

**Install Twilio Python SDK:**
```bash
pip install twilio
```

#### 3. Backend Dependencies

Make sure your backend has the required packages:

```bash
pip install flask flask-cors python-dotenv
```

---

## How It Works

### Registration Flow

1. **User fills out registration form**
   - Email and phone are validated in real-time
   - Fake/disposable emails are rejected
   - Invalid phone formats are rejected

2. **Email Verification Step**
   - User clicks "Sign Up"
   - System sends 6-digit code to email
   - User enters code to verify
   - Code expires in 10 minutes

3. **Phone Verification Step** (for non-child accounts)
   - After email verification
   - System sends 6-digit code via SMS
   - User enters code to verify
   - Code expires in 10 minutes

4. **Account Creation**
   - Only after both verifications complete
   - Account is created with `emailVerified: true` and `phoneVerified: true`
   - User proceeds to onboarding

### Verification Codes

- **Format**: 6-digit numeric code (e.g., `123456`)
- **Expiration**: 10 minutes
- **Attempts**: Maximum 5 failed attempts before requiring new code
- **Storage**: Codes stored in Firestore with expiration timestamps

### Unverified Account Cleanup

The system automatically:
- Finds accounts with `emailVerified: false` older than 7 days
- Deletes or suspends these accounts
- Can be run manually or via scheduled job

**To run cleanup manually:**
```javascript
import { unverifiedAccountCleanup } from './services/unverifiedAccountCleanup';

// Delete unverified accounts older than 7 days
await unverifiedAccountCleanup.cleanupUnverifiedAccounts(7, true);

// Or suspend them instead
await unverifiedAccountCleanup.cleanupUnverifiedAccounts(7, false);
```

---

## Development Mode

In development, verification codes are displayed in:
- **Console logs** (backend)
- **Toast notifications** (frontend)

This allows testing without actual email/SMS services.

---

## Security Features

### Email Validation
- ✅ Blocks disposable email services (Mailinator, 10MinuteMail, etc.)
- ✅ Validates proper email format
- ✅ Rejects test/fake email patterns

### Phone Validation
- ✅ Validates US phone number format (10 digits)
- ✅ Blocks fake/test numbers (000-000-0000, 111-111-1111, etc.)
- ✅ Formats numbers consistently

### Verification Security
- ✅ Codes expire after 10 minutes
- ✅ Maximum 5 verification attempts
- ✅ Codes are single-use
- ✅ Rate limiting on code requests

---

## Testing

### Test Email Verification

1. Enter a valid email address
2. Click "Sign Up"
3. Check console/email for verification code
4. Enter code to verify
5. Account creation proceeds

### Test Phone Verification

1. Enter a valid phone number (10 digits)
2. Complete email verification first
3. Check console/SMS for verification code
4. Enter code to verify
5. Account creation proceeds

### Test Validation

**Invalid Email:**
- `test@test.com` ❌ (fake pattern)
- `user@mailinator.com` ❌ (disposable)
- `invalid-email` ❌ (wrong format)

**Invalid Phone:**
- `0000000000` ❌ (fake number)
- `123` ❌ (too short)
- `12345678901` ❌ (too long)

---

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials** in `.env`
2. **Verify SMTP settings** (host, port, TLS)
3. **Check spam folder** - emails may be filtered
4. **Check backend logs** for errors
5. **In dev mode**, check console for code

### SMS Not Sending

1. **Check Twilio credentials** in `.env`
2. **Verify phone number format** (+1XXXXXXXXXX)
3. **Check Twilio account balance**
4. **Verify phone number is verified** in Twilio
5. **In dev mode**, check console for code

### Verification Code Not Working

1. **Check expiration** - codes expire in 10 minutes
2. **Check attempts** - max 5 attempts allowed
3. **Request new code** if expired
4. **Verify code format** - must be 6 digits

---

## Production Checklist

- [ ] Configure SMTP service (Gmail/SendGrid/Mailgun)
- [ ] Configure SMS service (Twilio)
- [ ] Set up environment variables
- [ ] Test email delivery
- [ ] Test SMS delivery
- [ ] Set up scheduled cleanup job (daily/weekly)
- [ ] Monitor verification success rates
- [ ] Set up email templates (optional)
- [ ] Configure email domain (optional)

---

## API Endpoints

### Backend Endpoints

**POST `/api/verification/send-email`**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "email_verification"
}
```

**POST `/api/verification/send-sms`**
```json
{
  "phone": "1234567890",
  "code": "123456",
  "type": "phone_verification"
}
```

---

## Files Created/Modified

### New Files
- `src/services/verificationService.js` - Verification service
- `src/components/EmailVerificationStep.jsx` - Email verification UI
- `src/components/PhoneVerificationStep.jsx` - Phone verification UI
- `src/services/unverifiedAccountCleanup.js` - Account cleanup service

### Modified Files
- `src/pages/Register.jsx` - Added verification flow
- `backend/app.py` - Added email/SMS endpoints
- `src/contexts/AuthContext.jsx` - Added verification tracking

---

## Next Steps

1. **Set up email service** (Gmail/SendGrid)
2. **Set up SMS service** (Twilio)
3. **Test verification flow** end-to-end
4. **Set up scheduled cleanup** (Cloud Function or cron)
5. **Monitor verification rates** in production

---

## Support

For issues or questions:
1. Check backend logs for errors
2. Verify environment variables
3. Test in development mode first
4. Check Firestore for verification records

