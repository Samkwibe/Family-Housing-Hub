/**
 * Multi-Factor Authentication Service
 * Implements TOTP-based MFA using Firebase Auth
 * Note: Firebase MFA requires Firebase Auth with Identity Platform enabled
 * For production, ensure MFA is enabled in Firebase Console
 */

import {
    getMultiFactorResolver,
    TotpMultiFactorGenerator,
    getAuth
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

/**
 * Initialize MFA for a user
 * @param {Object} user - Firebase Auth user object
 * @returns {Promise<Object>} - Secret and QR code data
 */
export async function enrollMFA(user) {
    try {
        // Check if multi-factor is available
        if (!user.multiFactor) {
            throw new Error('Multi-factor authentication is not available. Please enable it in Firebase Console.');
        }

        // Get the multi-factor session
        const multiFactorSession = await TotpMultiFactorGenerator.generateSecret(
            auth,
            user
        );

        // Extract the secret from the session
        const secret = multiFactorSession.secret;

        // Generate QR code data
        const qrCodeData = {
            secret: secret,
            accountName: user.email,
            issuer: "Family Housing Hub"
        };

        // Store enrollment session in Firestore (temporary, until verified)
        await setDoc(
            doc(db, 'mfaEnrollments', user.uid),
            {
                secret: secret,
                createdAt: new Date(),
                verified: false
            },
            { merge: true }
        );

        return {
            secret,
            qrCodeData,
            session: multiFactorSession
        };
    } catch (error) {
        console.error('Error enrolling MFA:', error);

        // Provide helpful error messages
        if (error.code === 'auth/operation-not-allowed') {
            throw new Error('Multi-factor authentication is not enabled. Please contact support.');
        } else if (error.code === 'auth/requires-recent-login') {
            throw new Error('Please log out and log back in, then try again.');
        }

        throw new Error(`Failed to initialize MFA: ${error.message}`);
    }
}

/**
 * Verify and complete MFA enrollment
 * @param {Object} user - Firebase Auth user object
 * @param {string} verificationCode - 6-digit TOTP code
 * @param {Object} multiFactorSession - Session from enrollMFA
 * @returns {Promise<boolean>}
 */
export async function verifyAndEnrollMFA(user, verificationCode, multiFactorSession) {
    try {
        // Validate code format
        if (!validateTOTPCode(verificationCode)) {
            throw new Error('Invalid code format. Please enter a 6-digit number.');
        }

        // Create TOTP credential for enrollment
        const totpCredential = TotpMultiFactorGenerator.assertionForEnrollment(
            multiFactorSession,
            verificationCode
        );

        // Enroll the credential
        const multiFactor = user.multiFactor;
        await multiFactor.enroll(totpCredential, {
            displayName: 'Authenticator App'
        });

        // Mark as verified in Firestore
        await updateDoc(doc(db, 'mfaEnrollments', user.uid), {
            verified: true,
            enrolledAt: new Date()
        });

        // Update user security settings
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                'security.twoFactorEnabled': true,
                'security.mfaEnrolledAt': new Date()
            });
        } else {
            // Create user document with security settings if it doesn't exist
            await setDoc(userRef, {
                security: {
                    twoFactorEnabled: true,
                    mfaEnrolledAt: new Date()
                }
            }, { merge: true });
        }

        toast.success('Multi-factor authentication enabled successfully!');
        return true;
    } catch (error) {
        console.error('Error verifying MFA enrollment:', error);

        let errorMessage = 'Failed to verify MFA code. ';
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = 'Invalid verification code. Please try again.';
        } else if (error.code === 'auth/code-expired') {
            errorMessage = 'Verification code expired. Please generate a new one.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Verify MFA during login
 * @param {Object} authError - Firebase auth error with multiFactor property
 * @param {string} verificationCode - 6-digit TOTP code
 * @returns {Promise<Object>} - User credential
 */
export async function verifyMFAForLogin(authError, verificationCode) {
    try {
        // Validate code format
        if (!validateTOTPCode(verificationCode)) {
            throw new Error('Invalid code format. Please enter a 6-digit number.');
        }

        // Get the resolver
        const resolver = getMultiFactorResolver(auth, authError);

        // Get the first enrolled factor (TOTP)
        const hint = resolver.hints[0];
        if (!hint) {
            throw new Error('No MFA factor found. Please contact support.');
        }

        // Create TOTP assertion for sign-in
        const totpCredential = TotpMultiFactorGenerator.assertionForSignIn(
            hint.uid,
            verificationCode
        );

        // Resolve the sign-in
        const userCredential = await resolver.resolveSignIn(totpCredential);

        return userCredential;
    } catch (error) {
        console.error('Error verifying MFA for login:', error);

        let errorMessage = 'Invalid verification code. ';
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage = 'Invalid verification code. Please try again.';
        } else if (error.code === 'auth/code-expired') {
            errorMessage = 'Verification code expired. Please generate a new one.';
        } else if (error.code === 'auth/multi-factor-auth-required') {
            errorMessage = 'Multi-factor authentication is required.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Check if user has MFA enabled
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function isMFAEnabled(userId) {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const data = userDoc.data();
            return data.security?.twoFactorEnabled || false;
        }
        return false;
    } catch (error) {
        console.error('Error checking MFA status:', error);
        return false;
    }
}

/**
 * Disable MFA for a user
 * @param {Object} user - Firebase Auth user object
 * @param {string} currentPassword - User's current password for verification
 * @returns {Promise<boolean>}
 */
export async function disableMFA(user, currentPassword = null) {
    try {
        // Note: In production, you might want to require password verification
        // For now, we'll just unenroll the factors

        const multiFactor = user.multiFactor;
        if (!multiFactor) {
            throw new Error('Multi-factor authentication is not available.');
        }

        const enrolledFactors = multiFactor.enrolledFactors;

        if (enrolledFactors.length === 0) {
            // Already disabled
            await updateDoc(doc(db, 'users', user.uid), {
                'security.twoFactorEnabled': false
            });
            return true;
        }

        // Unenroll all MFA factors
        for (const factor of enrolledFactors) {
            await multiFactor.unenroll(factor);
        }

        // Update Firestore
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                'security.twoFactorEnabled': false,
                'security.mfaDisabledAt': new Date()
            });
        }

        // Update enrollment record
        await updateDoc(doc(db, 'mfaEnrollments', user.uid), {
            verified: false,
            disabledAt: new Date()
        });

        toast.success('Multi-factor authentication disabled.');
        return true;
    } catch (error) {
        console.error('Error disabling MFA:', error);

        let errorMessage = 'Failed to disable MFA. ';
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Please log out and log back in, then try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        toast.error(errorMessage);
        throw new Error(errorMessage);
    }
}

/**
 * Generate QR code URL for authenticator apps
 * @param {string} secret - TOTP secret
 * @param {string} accountName - User email
 * @param {string} issuer - App name
 * @returns {string} - QR code URL
 */
export function generateQRCodeURL(secret, accountName, issuer) {
    const encodedAccount = encodeURIComponent(accountName);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Validate TOTP code format
 * @param {string} code - 6-digit code
 * @returns {boolean}
 */
export function validateTOTPCode(code) {
    return /^\d{6}$/.test(code);
}

