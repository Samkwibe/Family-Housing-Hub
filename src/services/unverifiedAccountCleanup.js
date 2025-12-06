// src/services/unverifiedAccountCleanup.js
// Service to clean up unverified accounts

import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { deleteUser } from 'firebase/auth';

/**
 * Cleanup service for unverified accounts
 * Should be run periodically (e.g., daily via Cloud Function or cron job)
 */
class UnverifiedAccountCleanupService {
  /**
   * Find and delete/suspend unverified accounts older than specified days
   * @param {number} daysOld - Accounts older than this many days will be deleted
   * @param {boolean} deleteAccounts - If true, delete accounts. If false, suspend them.
   */
  async cleanupUnverifiedAccounts(daysOld = 7, deleteAccounts = true) {
    try {
      const cutoffDate = Timestamp.fromDate(
        new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
      );

      // Find unverified accounts
      const usersQuery = query(
        collection(db, 'users'),
        where('emailVerified', '==', false),
        where('createdAt', '<', cutoffDate)
      );

      const snapshot = await getDocs(usersQuery);
      const unverifiedAccounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(`Found ${unverifiedAccounts.length} unverified accounts older than ${daysOld} days`);

      const results = {
        deleted: 0,
        suspended: 0,
        errors: 0,
      };

      for (const account of unverifiedAccounts) {
        try {
          if (deleteAccounts) {
            // Delete the account
            await this.deleteUnverifiedAccount(account.id);
            results.deleted++;
          } else {
            // Suspend the account
            await this.suspendUnverifiedAccount(account.id);
            results.suspended++;
          }
        } catch (error) {
          console.error(`Error processing account ${account.id}:`, error);
          results.errors++;
        }
      }

      return results;
    } catch (error) {
      console.error('Error cleaning up unverified accounts:', error);
      throw error;
    }
  }

  /**
   * Delete an unverified account
   */
  async deleteUnverifiedAccount(userId) {
    try {
      // Delete user document from Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      // Note: Firebase Auth user deletion should be done server-side
      // or with admin SDK. For now, we'll just delete the Firestore document.
      // The auth user will remain but won't have any data associated.

      console.log(`Deleted unverified account: ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting account ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend an unverified account (mark as suspended instead of deleting)
   */
  async suspendUnverifiedAccount(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        suspended: true,
        suspendedAt: Timestamp.now(),
        suspendedReason: 'Unverified account',
      });

      console.log(`Suspended unverified account: ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error suspending account ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if an account is verified
   */
  async isAccountVerified(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
      
      if (userSnap.empty) {
        return false;
      }

      const userData = userSnap.docs[0].data();
      return userData.emailVerified === true && (userData.phoneVerified === true || !userData.phone);
    } catch (error) {
      console.error('Error checking account verification:', error);
      return false;
    }
  }

  /**
   * Get all unverified accounts
   */
  async getUnverifiedAccounts() {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('emailVerified', '==', false)
      );

      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error getting unverified accounts:', error);
      throw error;
    }
  }
}

export const unverifiedAccountCleanup = new UnverifiedAccountCleanupService();
export default unverifiedAccountCleanup;

