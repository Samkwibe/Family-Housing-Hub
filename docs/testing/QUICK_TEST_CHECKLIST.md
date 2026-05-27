# ⚡ Quick Test Checklist

## 🎯 5-Minute Quick Test

### ✅ Pre-Test:
- [ ] Cognito domain created
- [ ] Config file updated
- [ ] App running (`npm run dev`)

### 🧪 Test Steps:

#### 1. Registration (2 min)
- [ ] Go to `/register`
- [ ] Fill form and submit
- [ ] Check email for code
- [ ] Enter code in modal
- [ ] ✅ Should redirect to login

#### 2. Login (1 min)
- [ ] Go to `/login`
- [ ] Enter credentials
- [ ] Click login
- [ ] ✅ Should log in successfully

#### 3. MFA Setup (2 min)
- [ ] Go to Settings → Privacy & Security
- [ ] Click "Enable" on MFA
- [ ] Scan QR code with authenticator app
- [ ] Enter verification code
- [ ] ✅ Should enable MFA

#### 4. MFA Login (1 min)
- [ ] Log out
- [ ] Log back in
- [ ] Enter MFA code when prompted
- [ ] ✅ Should log in with MFA

---

## ✅ If All Tests Pass:
**Everything is working!** 🎉

## ❌ If Tests Fail:
1. Check browser console (F12)
2. Check Cognito Console setup
3. Verify config file
4. See `TESTING_GUIDE.md` for detailed troubleshooting

---

**Total Time:** ~5 minutes for quick test! ⚡


