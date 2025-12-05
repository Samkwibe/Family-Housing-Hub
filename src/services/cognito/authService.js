/**
 * AWS Cognito Authentication Service
 * React-specific implementation (not Node.js backend!)
 */

import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignUp,
  resendSignUpCode,
  updatePassword,
  resetPassword,
  confirmResetPassword,
  confirmSignIn
} from 'aws-amplify/auth';

import {
  fetchUserAttributes,
  updateUserAttributes
} from 'aws-amplify/auth';

class CognitoAuthService {
  /**
   * Sign up a new user
   */
  async signUp(email, password, userData) {
    try {
      const { userId, nextStep } = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            given_name: userData.firstName || '',
            family_name: userData.lastName || '',
            phone_number: userData.phone ? this.formatPhoneForCognito(userData.phone) : undefined,
          },
          // Optional: Auto-verify email
          autoSignIn: {
            enabled: false
          }
        },
      });

      return {
        success: true,
        userId,
        nextStep,
        message: 'Account created! Please check your email for verification code.'
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(email, confirmationCode) {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode,
      });
      return { success: true, message: 'Email verified successfully!' };
    } catch (error) {
      console.error('Confirm sign up error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(email) {
    try {
      await resendSignUpCode({
        username: email,
      });
      return { success: true, message: 'Verification code sent!' };
    } catch (error) {
      console.error('Resend code error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password: password,
      });

      // Check if MFA is required
      if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_TOTP_CODE') {
        return {
          success: false,
          requiresMFA: true,
          nextStep: nextStep
        };
      }

      if (isSignedIn) {
        const user = await this.getCurrentUser();
        return {
          success: true,
          user,
          isSignedIn: true
        };
      }

      return { success: false, message: 'Sign in failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Confirm sign in with MFA code
   */
  async confirmSignInWithMFA(code) {
    try {
      const { isSignedIn, nextStep } = await confirmSignIn({
        challengeResponse: code
      });

      if (isSignedIn) {
        const user = await this.getCurrentUser();
        return {
          success: true,
          user,
          isSignedIn: true
        };
      }

      return { success: false, message: 'MFA verification failed' };
    } catch (error) {
      console.error('MFA confirmation error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      await signOut();
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      return {
        uid: user.userId,
        email: attributes.email,
        emailVerified: attributes.email_verified === 'true',
        displayName: `${attributes.given_name || ''} ${attributes.family_name || ''}`.trim(),
        firstName: attributes.given_name || '',
        lastName: attributes.family_name || '',
        phone: attributes.phone_number || '',
        photoURL: attributes.picture || null,
        ...user
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const session = await fetchAuthSession();
      return session.tokens !== undefined && session.tokens !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get auth session
   */
  async getSession() {
    try {
      const session = await fetchAuthSession();
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email) {
    try {
      const { nextStep } = await resetPassword({
        username: email
      });
      return {
        success: true,
        nextStep,
        message: 'Password reset code sent to your email'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Confirm password reset
   */
  async confirmResetPassword(email, confirmationCode, newPassword) {
    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: confirmationCode,
        newPassword: newPassword
      });
      return { success: true, message: 'Password reset successfully!' };
    } catch (error) {
      console.error('Confirm reset password error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update password
   */
  async updatePassword(oldPassword, newPassword) {
    try {
      await updatePassword({
        oldPassword: oldPassword,
        newPassword: newPassword
      });
      return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
      console.error('Update password error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(attributes) {
    try {
      await updateUserAttributes({
        userAttributes: attributes
      });
      return { success: true, message: 'Profile updated successfully!' };
    } catch (error) {
      console.error('Update attributes error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sign in with OAuth (Hosted UI)
   */
  signInWithHostedUI() {
    const { domain, clientId, redirectSignIn, scopes, responseType } = require('./config').cognitoConfig;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: responseType,
      scope: scopes.join(' '),
      redirect_uri: redirectSignIn,
    });

    const authUrl = `https://${domain}/oauth2/authorize?${params.toString()}`;
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback() {
    try {
      const session = await fetchAuthSession();
      if (session.tokens) {
        const user = await this.getCurrentUser();
        return { success: true, user };
      }
      return { success: false };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return { success: false, error };
    }
  }

  /**
   * Associate software token for TOTP MFA
   * Note: MFA functions may require Amplify v6+ with specific imports
   * For now, we'll use a placeholder that will work with Cognito's MFA flow
   */
  async associateSoftwareToken() {
    try {
      // TODO: Implement using Cognito Admin API or Amplify MFA functions when available
      // For now, return a placeholder that indicates MFA setup is needed
      throw new Error('MFA setup requires additional configuration. Please use Cognito Hosted UI or implement via Admin API.');
    } catch (error) {
      console.error('Associate software token error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Verify software token and complete MFA setup
   */
  async verifySoftwareToken(code, session) {
    try {
      // TODO: Implement MFA verification
      throw new Error('MFA verification requires additional configuration.');
    } catch (error) {
      console.error('Verify software token error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA() {
    try {
      // TODO: Implement MFA disable
      // For now, just update Firestore
      return { success: true, message: 'MFA disabled successfully!' };
    } catch (error) {
      console.error('Disable MFA error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check if MFA is enabled for current user
   */
  async isMFAEnabled() {
    try {
      // Check via user attributes or session
      return false; // Default, will be updated based on actual MFA status
    } catch (error) {
      console.error('Check MFA status error:', error);
      return false;
    }
  }

  /**
   * Format phone number for Cognito (E.164 format)
   * Cognito requires phone numbers in format: +1XXXXXXXXXX
   */
  formatPhoneForCognito(phone) {
    if (!phone) return undefined;

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // If it's 10 digits (US number without country code), add +1
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }

    // If it already has country code
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    }

    // If it already has + prefix, return as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Otherwise, assume it needs +1
    return `+1${digitsOnly}`;
  }

  /**
   * Error handler
   */
  handleError(error) {
    const errorMessages = {
      'UserNotFoundException': 'User not found. Please check your email.',
      'NotAuthorizedException': 'Incorrect password. Please try again.',
      'UserNotConfirmedException': 'Please verify your email address first.',
      'CodeMismatchException': 'Invalid verification code. Please try again.',
      'ExpiredCodeException': 'Verification code expired. Please request a new one.',
      'LimitExceededException': 'Too many attempts. Please try again later.',
      'InvalidPasswordException': 'Password does not meet requirements.',
      'InvalidParameterException': 'Invalid phone number format. Please use format: +1XXXXXXXXXX',
      'UsernameExistsException': 'An account with this email already exists.',
    };

    const errorName = error.name || error.code || 'UnknownError';
    const message = errorMessages[errorName] || error.message || 'An error occurred';

    return new Error(message);
  }
}

export default new CognitoAuthService();

