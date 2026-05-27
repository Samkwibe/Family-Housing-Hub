// src/services/verificationService.js
// Email and phone verification service

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { validateUSPhone } from '../../shared/utils/phone.js';

/** Backend base URL — prefer VITE_API_URL (Render), then VITE_BACKEND_URL. */
function getBackendUrl() {
  const url =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    'https://family-housing-hub-api.onrender.com';
  return String(url).replace(/\/$/, '');
}

/**
 * Generate a 6-digit verification code
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }

  // Check for common fake email patterns
  const fakePatterns = [
    /^test@/i,
    /^fake@/i,
    /^temp@/i,
    /@test\./i,
    /@fake\./i,
    /@temp\./i,
    /@example\./i,
    /@mailinator\./i,
    /@guerrillamail\./i,
    /@10minutemail\./i,
    /@throwaway\./i,
    /@tempmail\./i,
  ];

  for (const pattern of fakePatterns) {
    if (pattern.test(email)) {
      return { isValid: false, message: 'Please use a valid email address' };
    }
  }

  // Check for disposable email domains (common ones)
  const disposableDomains = [
    'tempmail.com',
    'mailinator.com',
    'guerrillamail.com',
    '10minutemail.com',
    'throwaway.email',
    'temp-mail.org',
    'getnada.com',
    'mohmal.com',
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { isValid: false, message: 'Disposable email addresses are not allowed' };
  }

  return { isValid: true, message: 'Email is valid' };
};

/**
 * Validate phone number format (US format)
 */
export const validatePhoneNumber = validateUSPhone;

/** Pick the newest pending verification doc (handles resends). */
function pickLatestPendingDoc(docList) {
  if (!docList || docList.length === 0) return null;
  const rows = docList.map((d) => ({ ...d.data(), ref: d.ref }));
  rows.sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return tb - ta;
  });
  return rows[0];
}

/** Extra: set VITE_SHOW_VERIFICATION_CODES=true to always show codes in UI (testing). */
const forceShowCodesInUi = () => import.meta.env.VITE_SHOW_VERIFICATION_CODES === 'true';

class VerificationService {
  /**
   * Send email verification code.
   * Returns { code, delivered } so the UI can show the code if email didn’t send.
   */
  async sendEmailVerificationCode(email, options = {}) {
    const { suppressToast = false } = options;
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.message);
    }

    const code = generateVerificationCode();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

    const verificationRef = doc(collection(db, 'emailVerifications'));
    await setDoc(verificationRef, {
      email: email.toLowerCase(),
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: serverTimestamp(),
    });

    const backendUrl = getBackendUrl();
    let delivered = false;

    try {
      const response = await fetch(`${backendUrl}/api/verification/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code,
          type: 'email_verification',
          website: '' // honeypot field (must stay empty)
        }),
      });

      let responseData = {};
      try {
        responseData = await response.json();
      } catch {
        /* non-JSON */
      }

      delivered = response.ok === true;

      if (delivered && !suppressToast) {
        if (responseData.message && String(responseData.message).includes('dev mode')) {
          toast.success(`Code sent (dev). Your code: ${code}`, { duration: 20000 });
        } else {
          toast.success('Verification code sent to your email.');
        }
      }
    } catch (err) {
      console.warn('Email delivery request failed:', err);
      delivered = false;
    }

    if (!delivered && !suppressToast) {
      toast.error('Could not send email — use the code shown on screen.', { duration: 6000 });
    }

    const showCodeInUi = !delivered || forceShowCodesInUi();
    return {
      success: true,
      verificationId: verificationRef.id,
      code,
      delivered,
      showCodeInUi,
    };
  }

  /**
   * Send phone verification code (SMS).
   * Never throws on delivery failure — returns { code, delivered, showCodeInUi }.
   */
  async sendPhoneVerificationCode(phone, options = {}) {
    const { suppressToast = false } = options;
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.message);
    }

    const code = generateVerificationCode();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

    const verificationRef = doc(collection(db, 'phoneVerifications'));
    await setDoc(verificationRef, {
      phone: phoneValidation.digitsOnly,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: serverTimestamp(),
    });

    const backendUrl = getBackendUrl();
    let delivered = false;

    try {
      const response = await fetch(`${backendUrl}/api/verification/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneValidation.digitsOnly,
          code,
          type: 'phone_verification',
          website: '' // honeypot field (must stay empty)
        }),
      });
      delivered = response.ok === true;
      if (delivered && !suppressToast) {
        toast.success('Verification code sent to your phone.');
      }
    } catch (err) {
      console.warn('SMS delivery request failed:', err);
      delivered = false;
    }

    if (!delivered && !suppressToast) {
      toast.error('Could not send SMS — use the code shown on screen.', { duration: 6000 });
    }

    const showCodeInUi = !delivered || forceShowCodesInUi();
    return {
      success: true,
      verificationId: verificationRef.id,
      code,
      delivered,
      showCodeInUi,
    };
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(email, code) {
    try {
      const emailLower = email.toLowerCase();
      
      // Find verification record(s) — use latest pending (handles resends)
      const q = query(
        collection(db, 'emailVerifications'),
        where('email', '==', emailLower),
        where('verified', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('No verification code found. Please request a new code.');
      }

      const latest = pickLatestPendingDoc(snapshot.docs);
      if (!latest) {
        throw new Error('No verification code found. Please request a new code.');
      }

      const verification = latest;
      const verificationRef = latest.ref;

      // Check if expired
      if (verification.expiresAt.toDate() < new Date()) {
        await deleteDoc(verificationRef);
        throw new Error('Verification code has expired. Please request a new code.');
      }

      // Check attempts
      if (verification.attempts >= 5) {
        await deleteDoc(verificationRef);
        throw new Error('Too many failed attempts. Please request a new code.');
      }

      // Verify code
      if (verification.code !== code) {
        await updateDoc(verificationRef, {
          attempts: verification.attempts + 1,
        });
        throw new Error('Invalid verification code. Please try again.');
      }

      // Mark as verified
      await updateDoc(verificationRef, {
        verified: true,
        verifiedAt: serverTimestamp(),
      });

      toast.success('Email verified successfully!');
      return { success: true, verified: true };
    } catch (error) {
      console.error('Error verifying email code:', error);
      throw error;
    }
  }

  /**
   * Verify phone code
   */
  async verifyPhoneCode(phone, code) {
    try {
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.message);
      }

      const digitsOnly = phoneValidation.digitsOnly;

      // Find verification record
      const q = query(
        collection(db, 'phoneVerifications'),
        where('phone', '==', digitsOnly),
        where('verified', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('No verification code found. Please request a new code.');
      }

      const latest = pickLatestPendingDoc(snapshot.docs);
      if (!latest) {
        throw new Error('No verification code found. Please request a new code.');
      }

      const verification = latest;
      const verificationRef = latest.ref;

      // Check if expired
      if (verification.expiresAt.toDate() < new Date()) {
        await deleteDoc(verificationRef);
        throw new Error('Verification code has expired. Please request a new code.');
      }

      // Check attempts
      if (verification.attempts >= 5) {
        await deleteDoc(verificationRef);
        throw new Error('Too many failed attempts. Please request a new code.');
      }

      // Verify code
      if (verification.code !== code) {
        await updateDoc(verificationRef, {
          attempts: verification.attempts + 1,
        });
        throw new Error('Invalid verification code. Please try again.');
      }

      // Mark as verified
      await updateDoc(verificationRef, {
        verified: true,
        verifiedAt: serverTimestamp(),
      });

      toast.success('Phone number verified successfully!');
      return { success: true, verified: true };
    } catch (error) {
      console.error('Error verifying phone code:', error);
      throw error;
    }
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email) {
    try {
      const emailLower = email.toLowerCase();
      const q = query(
        collection(db, 'emailVerifications'),
        where('email', '==', emailLower),
        where('verified', '==', true)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking email verification:', error);
      return false;
    }
  }

  /**
   * Check if phone is verified
   */
  async isPhoneVerified(phone) {
    try {
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        return false;
      }

      const digitsOnly = phoneValidation.digitsOnly;
      const q = query(
        collection(db, 'phoneVerifications'),
        where('phone', '==', digitsOnly),
        where('verified', '==', true)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking phone verification:', error);
      return false;
    }
  }
}

export const verificationService = new VerificationService();
export default verificationService;

