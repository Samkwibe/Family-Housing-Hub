// src/services/userDataService.js - Organize User Data by Account Type
// This service ensures owner and renter data are kept completely separate

import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * User Data Organization Service
 * Ensures owner and renter data are stored separately and never mixed
 */
class UserDataService {
  /**
   * Save Owner Data - Stores in owner-specific structure
   * @param {string} userId - User ID
   * @param {Object} ownerData - Owner-specific data
   */
  async saveOwnerData(userId, ownerData) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Get existing user data
      const userDoc = await getDoc(userRef);
      const existingData = userDoc.exists() ? userDoc.data() : {};
      
      // ORGANIZE OWNER DATA - Keep separate from renter data
      const organizedData = {
        // User type - CRITICAL
        userType: 'owner',
        role: 'owner',
        
        // Owner-specific data structure
        ownerData: {
          // Business information
          business: ownerData.business || existingData.ownerData?.business || null,
          
          // Property portfolio
          properties: ownerData.properties || existingData.ownerData?.properties || [],
          
          // Payment preferences
          paymentPreferences: ownerData.paymentPreferences || existingData.ownerData?.paymentPreferences || null,
          
          // Notification preferences (owner-specific)
          notifications: ownerData.notifications || existingData.ownerData?.notifications || {},
          
          // Owner-specific settings
          settings: ownerData.settings || existingData.ownerData?.settings || {}
        },
        
        // Clear any renter data if user is switching to owner
        renterData: null,
        lease: null,
        
        // Update timestamps
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString()
      };
      
      // Merge with existing data but preserve owner structure
      await setDoc(userRef, organizedData, { merge: true });
      
      return organizedData;
    } catch (error) {
      console.error('Error saving owner data:', error);
      throw new Error('Failed to save owner data');
    }
  }
  
  /**
   * Save Renter Data - Stores in renter-specific structure
   * @param {string} userId - User ID
   * @param {Object} renterData - Renter-specific data
   */
  async saveRenterData(userId, renterData) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Get existing user data
      const userDoc = await getDoc(userRef);
      const existingData = userDoc.exists() ? userDoc.data() : {};
      
      // ORGANIZE RENTER DATA - Keep separate from owner data
      const organizedData = {
        // User type - CRITICAL
        userType: 'renter',
        role: 'renter',
        
        // Renter-specific data structure
        renterData: {
          // Personal information
          personal: renterData.personal || existingData.renterData?.personal || null,
          
          // Family information
          family: renterData.family || existingData.renterData?.family || null,
          
          // Housing information
          housing: renterData.housing || existingData.renterData?.housing || null,
          
          // Financial information
          financial: renterData.financial || existingData.renterData?.financial || null,
          
          // Preferences (renter-specific)
          preferences: renterData.preferences || existingData.renterData?.preferences || {}
        },
        
        // Lease information (renter-specific)
        lease: renterData.lease || existingData.lease || {
          startDate: null,
          endDate: null,
          monthlyRent: 0,
          securityDeposit: 0,
          landlordId: null
        },
        
        // Clear any owner data if user is switching to renter
        ownerData: null,
        property: null,
        
        // Update timestamps
        updatedAt: serverTimestamp(),
        lastUpdated: new Date().toISOString()
      };
      
      // Merge with existing data but preserve renter structure
      await setDoc(userRef, organizedData, { merge: true });
      
      return organizedData;
    } catch (error) {
      console.error('Error saving renter data:', error);
      throw new Error('Failed to save renter data');
    }
  }
  
  /**
   * Get Owner Data - Returns only owner-specific data
   * @param {string} userId - User ID
   */
  async getOwnerData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const data = userDoc.data();
      
      // Verify user is actually an owner
      if (data.userType !== 'owner' && data.role !== 'owner') {
        console.warn('User is not an owner, but owner data requested');
        return null;
      }
      
      // Return only owner-specific data
      return {
        userId,
        userType: 'owner',
        business: data.ownerData?.business || null,
        properties: data.ownerData?.properties || [],
        paymentPreferences: data.ownerData?.paymentPreferences || null,
        notifications: data.ownerData?.notifications || {},
        settings: data.ownerData?.settings || {}
      };
    } catch (error) {
      console.error('Error getting owner data:', error);
      throw new Error('Failed to get owner data');
    }
  }
  
  /**
   * Get Renter Data - Returns only renter-specific data
   * @param {string} userId - User ID
   */
  async getRenterData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const data = userDoc.data();
      
      // Verify user is actually a renter
      if (data.userType !== 'renter' && data.role !== 'renter') {
        console.warn('User is not a renter, but renter data requested');
        return null;
      }
      
      // Return only renter-specific data
      return {
        userId,
        userType: 'renter',
        personal: data.renterData?.personal || null,
        family: data.renterData?.family || null,
        housing: data.renterData?.housing || null,
        financial: data.renterData?.financial || null,
        preferences: data.renterData?.preferences || {},
        lease: data.lease || null
      };
    } catch (error) {
      console.error('Error getting renter data:', error);
      throw new Error('Failed to get renter data');
    }
  }
  
  /**
   * Add Owner Property - Adds property to owner's portfolio
   * @param {string} userId - Owner user ID
   * @param {Object} propertyData - Property information
   */
  async addOwnerProperty(userId, propertyData) {
    try {
      const ownerData = await this.getOwnerData(userId);
      
      if (!ownerData) {
        throw new Error('User is not an owner');
      }
      
      const newProperty = {
        ...propertyData,
        id: `prop_${Date.now()}`,
        addedAt: new Date().toISOString(),
        status: 'active'
      };
      
      const updatedProperties = [...(ownerData.properties || []), newProperty];
      
      await this.saveOwnerData(userId, {
        properties: updatedProperties
      });
      
      return newProperty;
    } catch (error) {
      console.error('Error adding owner property:', error);
      throw new Error('Failed to add property');
    }
  }
  
  /**
   * Update Renter Lease - Updates renter's lease information
   * @param {string} userId - Renter user ID
   * @param {Object} leaseData - Lease information
   */
  async updateRenterLease(userId, leaseData) {
    try {
      const renterData = await this.getRenterData(userId);
      
      if (!renterData) {
        throw new Error('User is not a renter');
      }
      
      await this.saveRenterData(userId, {
        lease: {
          ...renterData.lease,
          ...leaseData,
          updatedAt: new Date().toISOString()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error updating renter lease:', error);
      throw new Error('Failed to update lease');
    }
  }
  
  /**
   * Verify Data Separation - Ensures owner/renter data is not mixed
   * @param {string} userId - User ID
   */
  async verifyDataSeparation(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return { valid: true, message: 'User does not exist' };
      }
      
      const data = userDoc.data();
      const issues = [];
      
      // Check if user has both owner and renter data (shouldn't happen)
      if (data.ownerData && data.renterData && data.userType) {
        if (data.userType === 'owner' && data.renterData) {
          issues.push('Owner has renter data - should be cleared');
        }
        if (data.userType === 'renter' && data.ownerData) {
          issues.push('Renter has owner data - should be cleared');
        }
      }
      
      // Check userType matches role
      if (data.userType && data.role && data.userType !== data.role) {
        issues.push('userType and role do not match');
      }
      
      return {
        valid: issues.length === 0,
        issues,
        userType: data.userType,
        hasOwnerData: !!data.ownerData,
        hasRenterData: !!data.renterData
      };
    } catch (error) {
      console.error('Error verifying data separation:', error);
      return { valid: false, error: error.message };
    }
  }
  
  /**
   * Clean Mixed Data - Removes conflicting data based on userType
   * @param {string} userId - User ID
   */
  async cleanMixedData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return { cleaned: false, message: 'User does not exist' };
      }
      
      const data = userDoc.data();
      const updates = {};
      
      // If user is owner, remove renter data
      if (data.userType === 'owner' || data.role === 'owner') {
        updates.renterData = null;
        updates.lease = null;
        updates.userType = 'owner';
        updates.role = 'owner';
      }
      
      // If user is renter, remove owner data
      if (data.userType === 'renter' || data.role === 'renter') {
        updates.ownerData = null;
        updates.property = null;
        updates.userType = 'renter';
        updates.role = 'renter';
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', userId), {
          ...updates,
          updatedAt: serverTimestamp(),
          dataCleanedAt: new Date().toISOString()
        });
        
        return { cleaned: true, updates };
      }
      
      return { cleaned: false, message: 'No mixed data found' };
    } catch (error) {
      console.error('Error cleaning mixed data:', error);
      throw new Error('Failed to clean mixed data');
    }
  }
}

// Export singleton instance
export const userDataService = new UserDataService();
export default userDataService;

