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
export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's a valid US phone number (10 digits)
  if (digitsOnly.length !== 10) {
    return { isValid: false, message: 'Phone number must be 10 digits' };
  }

  // Check for fake/test numbers
  const fakeNumbers = [
    '0000000000',
    '1111111111',
    '1234567890',
    '9999999999',
    '5555555555',
  ];

  if (fakeNumbers.includes(digitsOnly)) {
    return { isValid: false, message: 'Please use a valid phone number' };
  }

  // Format: (XXX) XXX-XXXX
  const formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;

  return { 
    isValid: true, 
    message: 'Phone number is valid',
    formatted,
    digitsOnly
  };
};

class VerificationService {
  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(email) {
    try {
      // Validate email first
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      // Generate code
      const code = generateVerificationCode();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes

      // Store verification code in Firestore
      const verificationRef = doc(collection(db, 'emailVerifications'));
      await setDoc(verificationRef, {
        email: email.toLowerCase(),
        code,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: serverTimestamp(),
      });

      // Send email via backend API
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/verification/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            code,
            type: 'email_verification',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send verification email');
        }

        toast.success('Verification code sent to your email!');
        return { success: true, verificationId: verificationRef.id };
      } catch (error) {
        console.error('Error sending email:', error);
        // For development, show the code
        if (import.meta.env.DEV) {
          toast.success(`Dev mode: Your code is ${code}`, { duration: 10000 });
        } else {
          throw new Error('Failed to send verification email. Please try again.');
        }
        return { success: true, verificationId: verificationRef.id, code }; // Dev only
      }
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  /**
   * Send phone verification code (SMS)
   */
  async sendPhoneVerificationCode(phone) {
    try {
      // Validate phone first
      const phoneValidation = validatePhoneNumber(phone);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.message);
      }

      // Generate code
      const code = generateVerificationCode();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes

      // Store verification code in Firestore
      const verificationRef = doc(collection(db, 'phoneVerifications'));
      await setDoc(verificationRef, {
        phone: phoneValidation.digitsOnly,
        code,
        expiresAt,
        attempts: 0,
        verified: false,
        createdAt: serverTimestamp(),
      });

      // Send SMS via backend API
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/api/verification/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: phoneValidation.digitsOnly,
            code,
            type: 'phone_verification',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send verification SMS');
        }

        toast.success('Verification code sent to your phone!');
        return { success: true, verificationId: verificationRef.id };
      } catch (error) {
        console.error('Error sending SMS:', error);
        // For development, show the code
        if (import.meta.env.DEV) {
          toast.success(`Dev mode: Your code is ${code}`, { duration: 10000 });
        } else {
          throw new Error('Failed to send verification SMS. Please try again.');
        }
        return { success: true, verificationId: verificationRef.id, code }; // Dev only
      }
    } catch (error) {
      console.error('Error sending phone verification:', error);
      throw error;
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(email, code) {
    try {
      const emailLower = email.toLowerCase();
      
      // Find verification record
      const q = query(
        collection(db, 'emailVerifications'),
        where('email', '==', emailLower),
        where('verified', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('No verification code found. Please request a new code.');
      }

      const verification = snapshot.docs[0].data();
      const verificationRef = snapshot.docs[0].ref;

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

      const verification = snapshot.docs[0].data();
      const verificationRef = snapshot.docs[0].ref;

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

