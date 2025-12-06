// src/services/familyInviteCodeService.js
// Family invite code service for secure family joining

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { familyInvitationService } from './firebaseService';
import { userService } from './firebaseService';
import toast from 'react-hot-toast';

/**
 * Generate a unique invite code
 * Format: FAM-XXXX-XXXX (e.g., FAM-A1B2-C3D4)
 */
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FAM-${part1}-${part2}`;
};

class FamilyInviteCodeService {
  /**
   * Create or get invite code for a family
   * @param {string} familyId - Family ID (usually the head of family's user ID)
   * @param {string} createdBy - User ID who created the code
   * @returns {Promise<string>} Invite code
   */
  async createOrGetInviteCode(familyId, createdBy) {
    try {
      // Validate inputs
      if (!familyId || !createdBy) {
        console.error('Missing required parameters:', { familyId, createdBy });
        throw new Error('Family ID and creator ID are required');
      }

      // Check if family already has an invite code
      const existingCodeQuery = query(
        collection(db, 'familyInviteCodes'),
        where('familyId', '==', familyId),
        where('isActive', '==', true)
      );
      const existingSnap = await getDocs(existingCodeQuery);

      if (!existingSnap.empty) {
        const existingCode = existingSnap.docs[0].data();
        console.log('Found existing invite code:', existingCode.code);
        return existingCode.code;
      }

      // Generate new code
      let code = generateInviteCode();
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts

      // Ensure code is unique
      while (attempts < maxAttempts) {
        const codeCheck = query(
          collection(db, 'familyInviteCodes'),
          where('code', '==', code)
        );
        const codeSnap = await getDocs(codeCheck);

        if (codeSnap.empty) {
          break; // Code is unique
        }

        code = generateInviteCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error('Failed to generate unique code after', maxAttempts, 'attempts');
        throw new Error('Failed to generate unique invite code. Please try again.');
      }

      // Create invite code document
      const codeRef = doc(collection(db, 'familyInviteCodes'));
      await setDoc(codeRef, {
        code,
        familyId,
        createdBy,
        isActive: true,
        expiresAt: null, // No expiration by default
        usageCount: 0,
        maxUses: null, // Unlimited uses by default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('Successfully created invite code:', code);
      return code;
    } catch (error) {
      console.error('Error creating invite code:', error);
      // Provide more specific error messages
      if (error.message.includes('permission') || error.message.includes('Permission')) {
        throw new Error('Permission denied. Please check your Firestore security rules.');
      }
      if (error.message.includes('network') || error.message.includes('Network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      // Re-throw with original message if it's already descriptive
      if (error.message && error.message !== 'Failed to create invite code') {
        throw error;
      }
      throw new Error(`Failed to create invite code: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get invite code for a family
   * @param {string} familyId - Family ID
   * @returns {Promise<string|null>} Invite code or null
   */
  async getInviteCode(familyId) {
    try {
      const codeQuery = query(
        collection(db, 'familyInviteCodes'),
        where('familyId', '==', familyId),
        where('isActive', '==', true)
      );
      const codeSnap = await getDocs(codeQuery);

      if (codeSnap.empty) {
        return null;
      }

      return codeSnap.docs[0].data().code;
    } catch (error) {
      console.error('Error getting invite code:', error);
      return null;
    }
  }

  /**
   * Validate and get family info from invite code
   * @param {string} code - Invite code
   * @returns {Promise<Object|null>} Family info or null if invalid
   */
  async validateInviteCode(code) {
    try {
      const codeQuery = query(
        collection(db, 'familyInviteCodes'),
        where('code', '==', code.toUpperCase()),
        where('isActive', '==', true)
      );
      const codeSnap = await getDocs(codeQuery);

      if (codeSnap.empty) {
        return null;
      }

      const codeData = codeSnap.docs[0].data();

      // Check expiration
      if (codeData.expiresAt) {
        const expiresAt = codeData.expiresAt.toDate();
        if (expiresAt < new Date()) {
          return null; // Expired
        }
      }

      // Check max uses
      if (codeData.maxUses && codeData.usageCount >= codeData.maxUses) {
        return null; // Max uses reached
      }

      // Get family info
      const familyId = codeData.familyId;
      
      // Get family head profile
      const familyHeadProfile = await userService.getUserProfile(familyId);
      
      // Get all family members
      const familyMembersQuery = query(
        collection(db, 'users'),
        where('familyId', '==', familyId)
      );
      const familyMembersSnap = await getDocs(familyMembersQuery);
      const familyMembers = familyMembersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        code: codeData.code,
        familyId,
        familyName: familyHeadProfile?.familyName || `${familyHeadProfile?.firstName || ''} ${familyHeadProfile?.lastName || ''}`.trim() || 'Family',
        familyHead: {
          id: familyId,
          name: `${familyHeadProfile?.firstName || ''} ${familyHeadProfile?.lastName || ''}`.trim() || 'Family Head',
          email: familyHeadProfile?.email,
        },
        memberCount: familyMembers.length,
        members: familyMembers.slice(0, 5), // Show first 5 members
        createdAt: codeData.createdAt?.toDate(),
      };
    } catch (error) {
      console.error('Error validating invite code:', error);
      return null;
    }
  }

  /**
   * Accept invite code and join family
   * @param {string} code - Invite code
   * @param {string} userId - User ID accepting the code
   * @param {string} relationship - Relationship to family (optional)
   * @returns {Promise<Object>} Result with family info
   */
  async acceptInviteCode(code, userId, relationship = 'Family Member') {
    try {
      // Validate code
      const familyInfo = await this.validateInviteCode(code);
      if (!familyInfo) {
        throw new Error('Invalid or expired invite code');
      }

      // Check if user is already in a family
      const userProfile = await userService.getUserProfile(userId);
      if (userProfile?.familyId && userProfile.familyId !== familyInfo.familyId) {
        throw new Error('You are already part of another family');
      }

      // Update user profile to join family
      const userFamilyMembers = userProfile?.familyMembers || [];
      const newFamilyMember = {
        id: familyInfo.familyHead.id,
        name: familyInfo.familyHead.name,
        relationship: 'Family Head',
        userId: familyInfo.familyHead.id,
        addedAt: new Date(),
      };

      await userService.updateUserProfile(userId, {
        familyId: familyInfo.familyId,
        familyMembers: [...userFamilyMembers, newFamilyMember],
        updatedAt: new Date(),
      });

      // Add user to family head's family members list
      const familyHeadProfile = await userService.getUserProfile(familyInfo.familyId);
      const familyHeadMembers = familyHeadProfile?.familyMembers || [];
      const newMember = {
        id: userId,
        name: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Family Member',
        relationship,
        userId,
        addedAt: new Date(),
      };

      await userService.updateUserProfile(familyInfo.familyId, {
        familyMembers: [...familyHeadMembers, newMember],
        updatedAt: new Date(),
      });

      // Increment usage count
      const codeQuery = query(
        collection(db, 'familyInviteCodes'),
        where('code', '==', code.toUpperCase())
      );
      const codeSnap = await getDocs(codeQuery);
      if (!codeSnap.empty) {
        const codeRef = codeSnap.docs[0].ref;
        await updateDoc(codeRef, {
          usageCount: (codeSnap.docs[0].data().usageCount || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(`Welcome to ${familyInfo.familyName}! 🎉`);
      return familyInfo;
    } catch (error) {
      console.error('Error accepting invite code:', error);
      toast.error(error.message || 'Failed to join family');
      throw error;
    }
  }

  /**
   * Deactivate invite code
   * @param {string} code - Invite code
   * @param {string} userId - User ID (must be family head)
   * @returns {Promise<boolean>} Success
   */
  async deactivateInviteCode(code, userId) {
    try {
      const codeQuery = query(
        collection(db, 'familyInviteCodes'),
        where('code', '==', code.toUpperCase())
      );
      const codeSnap = await getDocs(codeQuery);

      if (codeSnap.empty) {
        throw new Error('Invite code not found');
      }

      const codeData = codeSnap.docs[0].data();
      if (codeData.familyId !== userId && codeData.createdBy !== userId) {
        throw new Error('Not authorized to deactivate this code');
      }

      await updateDoc(codeSnap.docs[0].ref, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error deactivating invite code:', error);
      throw error;
    }
  }

  /**
   * Regenerate invite code (deactivate old, create new)
   * @param {string} familyId - Family ID
   * @param {string} userId - User ID
   * @returns {Promise<string>} New invite code
   */
  async regenerateInviteCode(familyId, userId) {
    try {
      // Deactivate old codes
      const oldCodesQuery = query(
        collection(db, 'familyInviteCodes'),
        where('familyId', '==', familyId),
        where('isActive', '==', true)
      );
      const oldCodesSnap = await getDocs(oldCodesQuery);
      
      for (const docSnap of oldCodesSnap.docs) {
        await updateDoc(docSnap.ref, {
          isActive: false,
          updatedAt: serverTimestamp(),
        });
      }

      // Create new code
      return await this.createOrGetInviteCode(familyId, userId);
    } catch (error) {
      console.error('Error regenerating invite code:', error);
      throw error;
    }
  }
}

export const familyInviteCodeService = new FamilyInviteCodeService();
export default familyInviteCodeService;

