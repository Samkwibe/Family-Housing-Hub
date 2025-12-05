/**
 * AuthContext with AWS Cognito
 * Hybrid approach: Cognito for Auth, Firebase for Data
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import cognitoAuth from '../services/cognito/authService';
import { userService, securityService } from '../services/firebaseService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaNextStep, setMfaNextStep] = useState(null);

  // Session timeout management
  const sessionTimeoutRef = React.useRef(null);
  const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Rate limiting for login attempts
  const loginAttemptsRef = React.useRef({});
  const MAX_LOGIN_ATTEMPTS = 5;
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

  // Check if user profile is complete
  const checkProfileComplete = (profile) => {
    if (!profile) return false;
    if (profile.onboardingComplete === true || profile.profileComplete === true) {
      return true;
    }

    const requiredFields = [
      'firstName',
      'lastName',
      'phone',
      'address.street',
      'address.city',
      'address.state',
      'address.zipCode'
    ];

    return requiredFields.every(field => {
      const keys = field.split('.');
      let value = profile;
      for (const key of keys) {
        value = value?.[key];
        if (!value) return false;
      }
      return true;
    });
  };

  // Check rate limiting
  const checkRateLimit = (email) => {
    const now = Date.now();
    const attempts = loginAttemptsRef.current[email] || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };

    if (now > attempts.resetTime) {
      attempts.count = 0;
      attempts.resetTime = now + RATE_LIMIT_WINDOW;
    }

    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const minutesLeft = Math.ceil((attempts.resetTime - now) / 60000);
      throw new Error(`Too many login attempts. Please try again in ${minutesLeft} minute(s).`);
    }

    return attempts;
  };

  const recordFailedAttempt = (email) => {
    const attempts = loginAttemptsRef.current[email] || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
    attempts.count++;
    attempts.resetTime = Date.now() + RATE_LIMIT_WINDOW;
    loginAttemptsRef.current[email] = attempts;
  };

  const clearRateLimit = (email) => {
    if (loginAttemptsRef.current[email]) {
      delete loginAttemptsRef.current[email];
    }
  };

  // Sign up with Cognito
  async function signup(email, password, userData) {
    try {
      const result = await cognitoAuth.signUp(email, password, userData);

      // Create user profile in Firestore (using Cognito user ID)
      // Note: We'll get the user ID after email confirmation
      // For now, store with email as key
      const tempUserDoc = {
        email: email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        role: 'family',
        userType: userData.userType || 'renter',
        emailVerified: false,
        provider: 'cognito',
        createdAt: new Date(),
        profileComplete: false,
        onboardingComplete: false,
      };

      // Store temporarily with email, will update with Cognito user ID after confirmation
      await userService.createUserProfileByEmail(email, tempUserDoc);

      toast.success('Account created! Please check your email for verification code.');
      return { success: true, requiresVerification: true };
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  }

  // Confirm sign up
  async function confirmSignUp(email, confirmationCode) {
    try {
      const result = await cognitoAuth.confirmSignUp(email, confirmationCode);

      // Now get the user and update Firestore with Cognito user ID
      const user = await cognitoAuth.getCurrentUser();
      if (user && user.uid) {
        await userService.updateUserProfileByEmail(email, {
          uid: user.uid,
          emailVerified: true
        });
      }

      toast.success('Email verified successfully!');
      return result;
    } catch (error) {
      console.error('Confirm signup error:', error);
      toast.error(error.message || 'Failed to verify email');
      throw error;
    }
  }

  // Login with Cognito
  async function login(email, password) {
    try {
      checkRateLimit(email);

      const result = await cognitoAuth.signIn(email, password);

      if (result.requiresMFA) {
        // MFA required
        setRequiresMFA(true);
        setMfaNextStep(result.nextStep);
        clearRateLimit(email);
        return { requiresMFA: true, nextStep: result.nextStep };
      }

      if (result.success) {
        clearRateLimit(email);
        const user = result.user;
        setCurrentUser(user);

        // Load or create user profile in Firestore
        let profile = await userService.getUserProfile(user.uid);

        if (!profile) {
          // Create profile if doesn't exist
          profile = await userService.createUserProfile(user.uid, {
            uid: user.uid,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            role: 'family',
            userType: 'renter',
            emailVerified: user.emailVerified,
            provider: 'cognito',
            createdAt: new Date(),
            lastLogin: new Date()
          });
        } else {
          // Update last login
          await userService.updateUserProfile(user.uid, {
            lastLogin: new Date()
          });
        }

        setUserProfile(profile);
        setProfileComplete(checkProfileComplete(profile));

        // Check MFA status
        const mfaStatus = await checkMFAStatus();
        setMfaEnabled(mfaStatus);

        // Log successful login
        try {
          const device = navigator.userAgent.includes('Mobile') ? 'Mobile Device' :
            navigator.userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';
          await securityService.addLoginRecord(user.uid, {
            success: true,
            device: device,
            userAgent: navigator.userAgent,
          });
        } catch (logError) {
          console.warn('Failed to log login history:', logError);
        }

        toast.success('Welcome back!');
        return { success: true, user };
      }

      throw new Error('Login failed');
    } catch (error) {
      console.error('Login error:', error);

      if (error.code === 'NotAuthorizedException' || error.code === 'UserNotFoundException') {
        recordFailedAttempt(email);
      }

      let errorMessage = 'Failed to login. ';
      switch (error.code) {
        case 'UserNotFoundException':
          errorMessage = 'No account found with this email address.';
          break;
        case 'NotAuthorizedException':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'UserNotConfirmedException':
          errorMessage = 'Please verify your email address first.';
          break;
        default:
          if (error.message.includes('Too many login attempts')) {
            errorMessage = error.message;
          } else {
            errorMessage += error.message;
          }
      }

      // Don't show toast errors if we're on the register page
      // This prevents login errors from showing during registration
      if (!window.location.pathname.includes('/register')) {
        toast.error(errorMessage);
      }
      throw error;
    }
  }

  // Confirm MFA for login
  async function confirmMFA(code) {
    try {
      const result = await cognitoAuth.confirmSignInWithMFA(code);

      if (result.success) {
        const user = result.user;
        setCurrentUser(user);
        setRequiresMFA(false);
        setMfaNextStep(null);

        // Load user profile
        let profile = await userService.getUserProfile(user.uid);
        if (!profile) {
          profile = await userService.createUserProfile(user.uid, {
            uid: user.uid,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: 'family',
            provider: 'cognito',
            createdAt: new Date(),
            lastLogin: new Date()
          });
        }

        setUserProfile(profile);
        setProfileComplete(checkProfileComplete(profile));

        toast.success('Login successful!');
        return { success: true, user };
      }

      throw new Error('MFA verification failed');
    } catch (error) {
      console.error('MFA confirmation error:', error);
      toast.error(error.message || 'Invalid verification code');
      throw error;
    }
  }

  // Google Sign-In (using Cognito Hosted UI)
  async function signInWithGoogle() {
    try {
      cognitoAuth.signInWithHostedUI();
      // User will be redirected to Cognito Hosted UI
      // Callback will be handled in App.jsx
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to sign in with Google');
      throw error;
    }
  }

  // Handle OAuth callback
  async function handleOAuthCallback() {
    try {
      const result = await cognitoAuth.handleOAuthCallback();
      if (result.success) {
        const user = result.user;
        setCurrentUser(user);

        // Load or create profile
        let profile = await userService.getUserProfile(user.uid);
        if (!profile) {
          profile = await userService.createUserProfile(user.uid, {
            uid: user.uid,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: 'family',
            provider: 'cognito-oauth',
            createdAt: new Date(),
            lastLogin: new Date()
          });
        }

        setUserProfile(profile);
        setProfileComplete(checkProfileComplete(profile));

        return { success: true, user };
      }
      return { success: false };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error };
    }
  }

  // Logout
  async function logout() {
    try {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }

      await cognitoAuth.signOut();
      setCurrentUser(null);
      setUserProfile(null);
      setProfileComplete(false);
      setMfaEnabled(false);
      setRequiresMFA(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  }

  // Reset password
  async function resetPassword(email) {
    try {
      const result = await cognitoAuth.resetPassword(email);
      return {
        success: true,
        message: result.message || 'Password reset code sent to your email'
      };
    } catch (error) {
      console.error('Error sending reset email:', error);
      throw new Error(error.message || 'Failed to send reset email');
    }
  }

  // Confirm password reset
  async function confirmResetPassword(email, code, newPassword) {
    try {
      const result = await cognitoAuth.confirmResetPassword(email, code, newPassword);
      toast.success('Password reset successfully!');
      return result;
    } catch (error) {
      console.error('Error confirming password reset:', error);
      toast.error(error.message || 'Failed to reset password');
      throw error;
    }
  }

  // Update password
  async function updateUserPassword(newPassword, currentPassword) {
    try {
      const result = await cognitoAuth.updatePassword(currentPassword, newPassword);
      toast.success('Password updated successfully!');
      return result;
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password');
      throw error;
    }
  }

  // Initialize MFA enrollment (Cognito MFA)
  // Note: Full MFA setup requires Cognito Admin API or Amplify MFA functions
  // For now, MFA works during login (when user has MFA enabled in Cognito)
  async function initializeMFAEnrollment() {
    try {
      if (!currentUser) throw new Error('No user logged in');

      // MFA setup can be done via Cognito Hosted UI or Admin API
      // For now, we'll guide users to set it up through Cognito console
      toast.info('MFA setup is available through Cognito. MFA verification works during login.');
      throw new Error('Full MFA enrollment requires additional setup. MFA verification works during login when enabled.');
    } catch (error) {
      console.error('Error initializing MFA enrollment:', error);
      throw error;
    }
  }

  // Enable MFA (enrollMFA for compatibility)
  // Note: This is a placeholder - full implementation requires Admin API
  async function enrollMFA(user) {
    try {
      if (!currentUser && !user) throw new Error('No user logged in');

      // For now, return a message that MFA setup needs to be done via Cognito
      toast.info('MFA can be enabled in Cognito console. MFA verification works during login.');
      throw new Error('MFA enrollment requires Cognito Admin API setup. MFA verification works during login.');
    } catch (error) {
      console.error('Error enrolling MFA:', error);
      throw error;
    }
  }

  // Enable MFA (verify and complete enrollment)
  async function enableMFA(verificationCode, multiFactorSession) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const result = await cognitoAuth.verifySoftwareToken(verificationCode, multiFactorSession);

      // Update Firestore
      await userService.updateUserProfile(currentUser.uid, {
        'security.twoFactorEnabled': true,
        'security.mfaEnabledAt': new Date()
      });

      setMfaEnabled(true);
      toast.success('MFA enabled successfully!');

      return result;
    } catch (error) {
      console.error('Error enabling MFA:', error);
      toast.error(error.message || 'Failed to enable MFA');
      throw error;
    }
  }

  // Verify and enroll MFA (for compatibility with MFASetup component)
  async function verifyAndEnrollMFA(user, code, session) {
    return await enableMFA(code, session);
  }

  // Disable MFA
  async function disableMFA() {
    try {
      if (!currentUser) throw new Error('No user logged in');

      await cognitoAuth.disableMFA();

      // Update Firestore
      await userService.updateUserProfile(currentUser.uid, {
        'security.twoFactorEnabled': false,
        'security.mfaDisabledAt': new Date()
      });

      setMfaEnabled(false);
      toast.success('MFA disabled successfully');
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast.error(error.message || 'Failed to disable MFA');
      throw error;
    }
  }

  // Check MFA status
  async function checkMFAStatus() {
    try {
      if (!currentUser) return false;

      const profile = await userService.getUserProfile(currentUser.uid);
      return profile?.security?.twoFactorEnabled || false;
    } catch (error) {
      console.error('Error checking MFA status:', error);
      return false;
    }
  }

  // Send verification email
  async function sendVerificationEmail() {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const result = await cognitoAuth.resendVerificationCode(currentUser.email);
      toast.success('Verification code sent! Please check your inbox.');
      return result;
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error('Failed to send verification email');
      throw error;
    }
  }

  // Check if email is verified
  const isEmailVerified = () => {
    return currentUser?.emailVerified || false;
  }

  // Complete profile
  async function completeProfile(profileData) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const updates = {
        ...profileData,
        profileComplete: true,
        onboardingComplete: true,
        updatedAt: new Date()
      };

      const updatedProfile = await userService.updateUserProfile(currentUser.uid, updates);
      setUserProfile(updatedProfile);
      setProfileComplete(true);

      toast.success('Profile completed successfully!');
      return updatedProfile;
    } catch (error) {
      console.error('Error completing profile:', error);
      toast.error('Failed to complete profile');
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(updates) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      // Update Cognito attributes if needed
      const cognitoAttributes = {};
      if (updates.firstName) cognitoAttributes.given_name = updates.firstName;
      if (updates.lastName) cognitoAttributes.family_name = updates.lastName;
      if (updates.phone) cognitoAttributes.phone_number = updates.phone;

      if (Object.keys(cognitoAttributes).length > 0) {
        await cognitoAuth.updateUserAttributes(cognitoAttributes);
      }

      // Update Firestore
      const updatedProfile = await userService.updateUserProfile(currentUser.uid, {
        ...updates,
        updatedAt: new Date()
      });

      setUserProfile(updatedProfile);
      const isComplete = checkProfileComplete(updatedProfile);
      setProfileComplete(isComplete);

      toast.success('Profile updated successfully!');
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
      throw error;
    }
  }

  // Add family member
  async function addFamilyMember(memberData) {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const currentMembers = userProfile?.familyMembers || [];
      const newMember = {
        id: `member_${Date.now()}`,
        ...memberData,
        addedAt: new Date()
      };

      const updatedProfile = await userService.updateUserProfile(currentUser.uid, {
        familyMembers: [...currentMembers, newMember],
        updatedAt: new Date()
      });

      setUserProfile(updatedProfile);
      toast.success('Family member added!');
      return updatedProfile;
    } catch (error) {
      console.error('Error adding family member:', error);
      toast.error('Failed to add family member');
      throw error;
    }
  }

  // Remove family member
  async function removeFamilyMember(memberId) {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const currentMembers = userProfile?.familyMembers || [];
      const updatedMembers = currentMembers.filter(m => m.id !== memberId);

      const updatedProfile = await userService.updateUserProfile(currentUser.uid, {
        familyMembers: updatedMembers,
        updatedAt: new Date()
      });

      setUserProfile(updatedProfile);
      toast.success('Family member removed');
      return updatedProfile;
    } catch (error) {
      console.error('Error removing family member:', error);
      toast.error('Failed to remove family member');
      throw error;
    }
  }

  // Upload profile photo
  async function uploadProfilePhoto(file) {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const photoURL = await userService.uploadProfilePhoto(currentUser.uid, file);

      // Update Cognito picture attribute
      await cognitoAuth.updateUserAttributes({ picture: photoURL });

      setUserProfile(prev => ({ ...prev, photoURL }));
      setCurrentUser(prev => ({ ...prev, photoURL }));

      toast.success('Profile photo updated!');
      return photoURL;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      toast.error('Failed to upload profile photo');
      throw error;
    }
  }

  // Update lease info
  async function updateLeaseInfo(leaseData) {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const updatedProfile = await userService.updateUserProfile(currentUser.uid, {
        lease: {
          ...userProfile?.lease,
          ...leaseData
        },
        updatedAt: new Date()
      });

      setUserProfile(updatedProfile);
      toast.success('Lease information updated!');
      return updatedProfile;
    } catch (error) {
      console.error('Error updating lease:', error);
      toast.error('Failed to update lease information');
      throw error;
    }
  }

  // Update property info
  async function updatePropertyInfo(propertyData) {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const updates = {
        property: {
          ...userProfile?.property,
          ...propertyData
        },
        updatedAt: new Date()
      };

      const updatedProfile = await userService.updateUserProfile(currentUser.uid, updates);
      setUserProfile(updatedProfile);
      toast.success('Property information updated!');
      return updatedProfile;
    } catch (error) {
      console.error('Error updating property info:', error);
      toast.error('Failed to update property information');
      throw error;
    }
  }

  // Reset session timeout
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    if (currentUser) {
      sessionTimeoutRef.current = setTimeout(() => {
        toast.error('Your session has expired. Please log in again.', {
          duration: 6000
        });
        logout();
      }, SESSION_DURATION);
    }
  }, [currentUser]);

  // Set up activity listeners
  useEffect(() => {
    if (!currentUser) {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      return;
    }

    resetSessionTimeout();

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'];

    const handleActivity = () => {
      resetSessionTimeout();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetSessionTimeout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    };
  }, [currentUser, resetSessionTimeout]);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await cognitoAuth.isAuthenticated();
        if (isAuth) {
          const user = await cognitoAuth.getCurrentUser();
          if (user) {
            setCurrentUser(user);

            // Load profile from Firestore
            const profile = await userService.getUserProfile(user.uid);
            if (profile) {
              setUserProfile(profile);
              setProfileComplete(checkProfileComplete(profile));

              // Check MFA status
              const mfaStatus = await checkMFAStatus();
              setMfaEnabled(mfaStatus);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // Don't show toast errors during silent auth check
        // This prevents "Incorrect password" errors from showing on page load
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle OAuth callback on mount
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        // OAuth callback
        try {
          await handleOAuthCallback();
          // Remove code from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('OAuth callback error:', error);
          // Silent fail - don't show error toasts for OAuth issues
        }
      }
    };

    handleCallback();
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    profileComplete,
    mfaEnabled,
    requiresMFA,
    mfaNextStep,
    signup,
    confirmSignUp,
    login,
    confirmMFA,
    logout,
    signInWithGoogle,
    handleOAuthCallback,
    resetPassword,
    confirmResetPassword,
    sendVerificationEmail,
    isEmailVerified,
    completeProfile,
    updateUserProfile,
    addFamilyMember,
    removeFamilyMember,
    updateLeaseInfo,
    updatePropertyInfo,
    uploadProfilePhoto,
    updateUserPassword,
    checkProfileComplete,
    checkMFAStatus,
    initializeMFAEnrollment,
    enrollMFA,
    verifyAndEnrollMFA,
    enableMFA,
    disableMFA,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

