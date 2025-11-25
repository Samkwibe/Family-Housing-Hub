// src/contexts/AuthContext.jsx - ENHANCED WITH PROFILE TRACKING
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { userService } from '../services/firebaseService';
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

  // Check if user profile is complete
  const checkProfileComplete = (profile) => {
    if (!profile) return false;
    
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
        
        // Lease information
        lease: {
          startDate: null,
          endDate: null,
          monthlyRent: 0,
          securityDeposit: 0,
          landlordId: null
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

  // Update lease information
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
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null);
          setProfileComplete(false);
        }
      } else {
        setUserProfile(null);
        setProfileComplete(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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
    uploadProfilePhoto,
    resetPassword,
    checkProfileComplete
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}