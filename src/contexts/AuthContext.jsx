// src/contexts/AuthContext.jsx - ENHANCED WITH PROFILE TRACKING AND SESSION TIMEOUT
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase/config';
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
  
  // Session timeout management
  const sessionTimeoutRef = React.useRef(null);
  const SESSION_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds (15-20 min range for security)

  // Check if user profile is complete
  const checkProfileComplete = (profile) => {
    if (!profile) return false;

    // If onboardingComplete flag is set, respect it
    if (profile.onboardingComplete === true) {
      return true;
    }

    // If profileComplete flag is set, respect it
    if (profile.profileComplete === true) {
      return true;
    }

    // Otherwise, check required fields
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

  // Sign up with basic info
  async function signup(email, password, userData) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase auth profile
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`,
        photoURL: userData.photoURL || null
      });

      // Create initial user document in Firestore
      const userDoc = {
        uid: user.uid,
        email: user.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        role: 'family',
        userType: userData.userType || 'renter', // 'owner' or 'renter'

        // Address information (empty for new users)
        address: {
          street: '',
          unit: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        },

        // Family members (empty array for new users)
        familyMembers: [],

        // Lease information (for renters)
        lease: {
          startDate: null,
          endDate: null,
          monthlyRent: 0,
          securityDeposit: 0,
          landlordId: null
        },

        // Property information (for owners)
        property: {
          address: null,
          purchaseDate: null,
          purchasePrice: 0,
          currentValue: 0,
          mortgage: {
            hasMortgage: false,
            lender: '',
            loanAmount: 0,
            monthlyPayment: 0,
            interestRate: 0,
            loanStartDate: null,
            loanEndDate: null
          }
        },

        // User preferences
        preferences: {
          language: 'en',
          notifications: {
            email: true,
            sms: false,
            push: true,
            rentReminders: true,
            maintenanceUpdates: true
          },
          theme: 'light',
          currency: 'USD'
        },

        // Profile completion status
        profileComplete: false,
        onboardingComplete: false,

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      };

      await userService.createUserProfile(user.uid, userDoc);

      toast.success('Account created successfully! Please complete your profile.');
      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      let errorMessage = 'Failed to create account. ';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage += 'This email is already registered.';
          break;
        case 'auth/weak-password':
          errorMessage += 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Email address is invalid.';
          break;
        default:
          errorMessage += error.message;
      }

      toast.error(errorMessage);
      throw error;
    }
  }

  // Login
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Update last login timestamp
      await userService.updateUserProfile(userCredential.user.uid, {
        lastLogin: new Date()
      });

      // Log successful login
      try {
        const device = navigator.userAgent.includes('Mobile') ? 'Mobile Device' :
          navigator.userAgent.includes('Tablet') ? 'Tablet' : 'Desktop';
        await securityService.addLoginRecord(userCredential.user.uid, {
          success: true,
          device: device,
          userAgent: navigator.userAgent,
          ipAddress: 'Unknown', // Would need backend to get real IP
          location: 'Unknown' // Would need geolocation service
        });
      } catch (logError) {
        console.warn('Failed to log login history:', logError);
      }

      toast.success('Welcome back!');
      return userCredential;
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Failed to login. ';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage += 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage += 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Email address is invalid.';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage += error.message;
      }

      toast.error(errorMessage);
      throw error;
    }
  }

  // Logout
  async function logout() {
    try {
      // Clear session timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      await signOut(auth);
      setUserProfile(null);
      setProfileComplete(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
      throw error;
    }
  }
  
  // Reset session timeout on user activity
  const resetSessionTimeout = useCallback(() => {
    // Clear existing timeout
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    
    // Only set timeout if user is logged in
    if (currentUser) {
      sessionTimeoutRef.current = setTimeout(() => {
        toast.error('Your session has expired after 20 minutes of inactivity. Please log in again for security.', {
          duration: 6000
        });
        logout();
      }, SESSION_DURATION);
    }
  }, [currentUser]);
  
  // Set up activity listeners
  useEffect(() => {
    if (!currentUser) {
      // Clear timeout if user is not logged in
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      return;
    }
    
    // Reset timeout on initial load
    resetSessionTimeout();
    
    // Activity events that should reset the timeout
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];
    
    // Add event listeners
    const handleActivity = () => {
      resetSessionTimeout();
    };
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });
    
    // Also check for visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetSessionTimeout();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
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

  // Complete user profile (onboarding)
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

      const updatedProfile = await userService.updateUserProfile(currentUser.uid, {
        ...updates,
        updatedAt: new Date()
      });

      setUserProfile(updatedProfile);

      // Recheck profile completion
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

  // Update property info (for owners)
  async function updatePropertyInfo(propertyData) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const updates = {
        property: {
          address: propertyData.address || null,
          purchaseDate: propertyData.purchaseDate ? new Date(propertyData.purchaseDate) : null,
          purchasePrice: propertyData.purchasePrice || 0,
          currentValue: propertyData.currentValue || 0,
          propertyType: propertyData.propertyType || null,
          bedrooms: propertyData.bedrooms || null,
          bathrooms: propertyData.bathrooms || null,
          squareFootage: propertyData.squareFootage || null,
          yearBuilt: propertyData.yearBuilt || null,
          mortgage: {
            hasMortgage: propertyData.mortgage?.hasMortgage || false,
            lender: propertyData.mortgage?.lender || '',
            loanAmount: propertyData.mortgage?.loanAmount || 0,
            monthlyPayment: propertyData.mortgage?.monthlyPayment || 0,
            interestRate: propertyData.mortgage?.interestRate || 0,
            loanStartDate: propertyData.mortgage?.loanStartDate ? new Date(propertyData.mortgage.loanStartDate) : null,
            loanEndDate: propertyData.mortgage?.loanEndDate ? new Date(propertyData.mortgage.loanEndDate) : null,
            downPayment: propertyData.mortgage?.downPayment || 0
          }
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

  // Update lease information
  async function updateLeaseInfo(leaseData) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const updatedProfile = await userService.updateUserProfile(currentUser.uid, {
        lease: {
          ...userProfile?.lease,
          monthlyRent: leaseData.monthlyRent || 0,
          startDate: leaseData.startDate || null,
          endDate: leaseData.endDate || null,
          securityDeposit: leaseData.securityDeposit || 0,
          landlordName: leaseData.landlordName || null,
          landlordPhone: leaseData.landlordPhone || null,
          landlordEmail: leaseData.landlordEmail || null,
          landlordId: leaseData.landlordId || null,
          utilitiesIncluded: leaseData.utilitiesIncluded || false,
          utilitiesCost: leaseData.utilitiesCost || 0
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

  // Upload profile photo
  async function uploadProfilePhoto(file) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      const photoURL = await userService.uploadProfilePhoto(currentUser.uid, file);

      // Update auth profile
      await updateProfile(currentUser, { photoURL });

      // Update local state
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

  // Reset password
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Failed to send reset email');
      throw error;
    }
  }

  // Update user email
  async function updateUserEmail(newEmail, currentPassword) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update email in Firebase Auth
      await updateEmail(currentUser, newEmail);

      // Update email in Firestore profile
      await userService.updateUserProfile(currentUser.uid, {
        email: newEmail,
        updatedAt: new Date()
      });

      // Update local state
      setUserProfile(prev => ({ ...prev, email: newEmail }));

      toast.success('Email updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating email:', error);

      let errorMessage = 'Failed to update email. ';
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage += 'Incorrect password.';
          break;
        case 'auth/email-already-in-use':
          errorMessage += 'This email is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Invalid email address.';
          break;
        case 'auth/requires-recent-login':
          errorMessage += 'Please log out and log back in, then try again.';
          break;
        default:
          errorMessage += error.message;
      }

      toast.error(errorMessage);
      throw error;
    }
  }

  // Update user password
  async function updateUserPassword(newPassword, currentPassword) {
    try {
      if (!currentUser) throw new Error('No user logged in');

      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      toast.success('Password updated successfully!');
      return true;
    } catch (error) {
      console.error('Error updating password:', error);

      let errorMessage = 'Failed to update password. ';
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage += 'Current password is incorrect.';
          break;
        case 'auth/weak-password':
          errorMessage += 'New password is too weak. Use at least 6 characters.';
          break;
        case 'auth/requires-recent-login':
          errorMessage += 'Please log out and log back in, then try again.';
          break;
        default:
          errorMessage += error.message;
      }

      toast.error(errorMessage);
      throw error;
    }
  }

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await userService.getUserProfile(user.uid);
          setUserProfile(profile);

          // Check if profile is complete
          const isComplete = checkProfileComplete(profile);
          setProfileComplete(isComplete);
          
          // Reset session timeout when user logs in
          resetSessionTimeout();
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
          setProfileComplete(false);
        }
      } else {
        setUserProfile(null);
        setProfileComplete(false);
        
        // Clear session timeout when user logs out
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      // Cleanup timeout on unmount
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    };
  }, [resetSessionTimeout]);

  const value = {
    currentUser,
    userProfile,
    loading,
    profileComplete,
    signup,
    login,
    logout,
    completeProfile,
    updateUserProfile,
    addFamilyMember,
    removeFamilyMember,
    updateLeaseInfo,
    updatePropertyInfo,
    uploadProfilePhoto,
    resetPassword,
    updateUserEmail,
    updateUserPassword,
    checkProfileComplete
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}