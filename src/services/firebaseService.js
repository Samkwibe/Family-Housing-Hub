// src/services/firebaseService.js - COMPLETE WITH USER DATA MANAGEMENT
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase/config';

// Cache management
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (key) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

// Custom Error Class
export class FirebaseServiceError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'FirebaseServiceError';
    this.code = code;
  }
}

// Enhanced Upload Service
export const uploadService = {
  async uploadFile(path, file, maxSize = 5 * 1024 * 1024) {
    try {
      // Validate file size
      if (file.size > maxSize) {
        throw new FirebaseServiceError(`File size exceeds ${maxSize / 1024 / 1024}MB limit`, 'FILE_TOO_LARGE');
      }
      
      // Validate file type
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const validDocumentTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      const isValidType = validImageTypes.includes(file.type) || validDocumentTypes.includes(file.type);
      if (!isValidType) {
        throw new FirebaseServiceError('Invalid file type', 'INVALID_FILE_TYPE');
      }
      
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, `${path}/${filename}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      return { url, filename, path: snapshot.ref.fullPath };
    } catch (error) {
      if (error instanceof FirebaseServiceError) {
        throw error;
      }
      console.error('Upload error:', error);
      throw new FirebaseServiceError('Failed to upload file', 'UPLOAD_FAILED');
    }
  },
  
  async deleteFile(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      return true;
    } catch (error) {
      console.warn('File delete warning:', error);
      // Don't throw for delete errors - file might already be deleted
      return false;
    }
  }
};

// ============================================================================
// USER SERVICE - Complete user profile management
// ============================================================================

export const userService = {
  // Create new user profile
  async createUserProfile(userId, userData) {
    try {
      const userRef = doc(db, 'users', userId);
      
      const profileData = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      await setDoc(userRef, profileData);
      clearCache(`user_${userId}`);
      
      return { id: userId, ...profileData };
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new FirebaseServiceError('Failed to create user profile', 'PROFILE_CREATE_FAILED');
    }
  },

  // Get user profile
  async getUserProfile(userId) {
    try {
      const cacheKey = `user_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = { 
          id: userDoc.id, 
          ...userDoc.data(),
          createdAt: userDoc.data().createdAt?.toDate(),
          updatedAt: userDoc.data().updatedAt?.toDate(),
          lastLogin: userDoc.data().lastLogin?.toDate()
        };
        setCachedData(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new FirebaseServiceError('Failed to load user profile', 'PROFILE_LOAD_FAILED');
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);
      clearCache(`user_${userId}`);
      
      return await this.getUserProfile(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new FirebaseServiceError('Failed to update profile', 'PROFILE_UPDATE_FAILED');
    }
  },

  // Upload profile photo
  async uploadProfilePhoto(userId, file) {
    try {
      const uploadResult = await uploadService.uploadFile(`profile-photos/${userId}`, file);
      
      // Update user profile with photo URL
      await this.updateUserProfile(userId, { 
        photoURL: uploadResult.url,
        photoPath: uploadResult.path
      });
      
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw new FirebaseServiceError('Failed to upload photo', 'PHOTO_UPLOAD_FAILED');
    }
  },

  // Delete profile photo
  async deleteProfilePhoto(userId, photoPath) {
    try {
      if (photoPath) {
        await uploadService.deleteFile(photoPath);
      }
      
      // Remove photo URL from profile
      await this.updateUserProfile(userId, { 
        photoURL: null,
        photoPath: null
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      throw new FirebaseServiceError('Failed to delete photo', 'PHOTO_DELETE_FAILED');
    }
  }
};

// ============================================================================
// MAINTENANCE SERVICE - Maintenance request management
// ============================================================================

export const maintenanceService = {
  // Get all requests for a user
  async getUserRequests(userId) {
    try {
      const cacheKey = `maintenance_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'maintenanceRequests'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        scheduledDate: doc.data().scheduledDate?.toDate(),
        completedDate: doc.data().completedDate?.toDate()
      }));
      
      setCachedData(cacheKey, requests);
      return requests;
    } catch (error) {
      console.error('Error getting maintenance requests:', error);
      throw new FirebaseServiceError('Failed to load maintenance requests', 'REQUESTS_LOAD_FAILED');
    }
  },

  // Create new maintenance request
  async createRequest(userId, requestData) {
    try {
      const docRef = await addDoc(collection(db, 'maintenanceRequests'), {
        userId,
        title: requestData.title,
        description: requestData.description,
        category: requestData.category || 'general',
        priority: requestData.priority || 'normal',
        location: requestData.location || 'general',
        status: 'submitted',
        images: requestData.images || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        scheduledDate: null,
        completedDate: null,
        notes: []
      });
      
      clearCache(`maintenance_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      throw new FirebaseServiceError('Failed to submit request', 'REQUEST_CREATE_FAILED');
    }
  },

  // Update maintenance request
  async updateRequest(requestId, userId, updates) {
    try {
      const requestRef = doc(db, 'maintenanceRequests', requestId);
      await updateDoc(requestRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      clearCache(`maintenance_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating maintenance request:', error);
      throw new FirebaseServiceError('Failed to update request', 'REQUEST_UPDATE_FAILED');
    }
  },

  // Upload maintenance image
  async uploadMaintenanceImage(userId, requestId, file) {
    try {
      const uploadResult = await uploadService.uploadFile(`maintenance/${userId}/${requestId}`, file);
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading maintenance image:', error);
      throw new FirebaseServiceError('Failed to upload image', 'IMAGE_UPLOAD_FAILED');
    }
  },

  // Delete maintenance request
  async deleteRequest(requestId, userId) {
    try {
      await deleteDoc(doc(db, 'maintenanceRequests', requestId));
      clearCache(`maintenance_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting maintenance request:', error);
      throw new FirebaseServiceError('Failed to delete request', 'REQUEST_DELETE_FAILED');
    }
  }
};

// ============================================================================
// RENT SERVICE - Rent payment management
// ============================================================================

export const rentService = {
  // Get all payments for a user
  async getUserPayments(userId) {
    try {
      const cacheKey = `rent_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'rentPayments'),
        where('userId', '==', userId),
        orderBy('dueDate', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        paidDate: doc.data().paidDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      
      setCachedData(cacheKey, payments);
      return payments;
    } catch (error) {
      console.error('Error getting rent payments:', error);
      throw new FirebaseServiceError('Failed to load rent payments', 'PAYMENTS_LOAD_FAILED');
    }
  },

  // Create rent payment record
  async createPayment(userId, paymentData) {
    try {
      const docRef = await addDoc(collection(db, 'rentPayments'), {
        userId,
        amount: paymentData.amount,
        dueDate: paymentData.dueDate ? Timestamp.fromDate(new Date(paymentData.dueDate)) : serverTimestamp(),
        paidDate: paymentData.paidDate ? Timestamp.fromDate(new Date(paymentData.paidDate)) : null,
        status: paymentData.status || 'pending',
        paymentMethod: paymentData.paymentMethod || 'other',
        confirmationNumber: paymentData.confirmationNumber || null,
        notes: paymentData.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      clearCache(`rent_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating rent payment:', error);
      throw new FirebaseServiceError('Failed to record payment', 'PAYMENT_CREATE_FAILED');
    }
  },

  // Update payment status
  async updatePayment(paymentId, userId, updates) {
    try {
      const paymentRef = doc(db, 'rentPayments', paymentId);
      await updateDoc(paymentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      clearCache(`rent_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating rent payment:', error);
      throw new FirebaseServiceError('Failed to update payment', 'PAYMENT_UPDATE_FAILED');
    }
  },

  // Upload payment receipt
  async uploadReceipt(userId, paymentId, file) {
    try {
      const uploadResult = await uploadService.uploadFile(`receipts/${userId}/${paymentId}`, file, 10 * 1024 * 1024);
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      throw new FirebaseServiceError('Failed to upload receipt', 'RECEIPT_UPLOAD_FAILED');
    }
  },

  // Delete payment record
  async deletePayment(paymentId, userId) {
    try {
      await deleteDoc(doc(db, 'rentPayments', paymentId));
      clearCache(`rent_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting rent payment:', error);
      throw new FirebaseServiceError('Failed to delete payment', 'PAYMENT_DELETE_FAILED');
    }
  }
};

// ============================================================================
// DOCUMENT SERVICE - Document management
// ============================================================================

export const documentService = {
  // Get all documents for a user
  async getUserDocuments(userId) {
    try {
      const cacheKey = `documents_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'documents'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiryDate: doc.data().expiryDate?.toDate(),
        uploadedAt: doc.data().uploadedAt?.toDate()
      }));
      
      setCachedData(cacheKey, documents);
      return documents;
    } catch (error) {
      console.error('Error getting documents:', error);
      throw new FirebaseServiceError('Failed to load documents', 'DOCUMENTS_LOAD_FAILED');
    }
  },

  // Upload document
  async uploadDocument(userId, documentData) {
    try {
      let fileURL = null;
      let fileName = null;
      let fileSize = null;
      let filePath = null;
      
      // Upload file if provided
      if (documentData.file) {
        const uploadResult = await uploadService.uploadFile(`documents/${userId}`, documentData.file, 10 * 1024 * 1024);
        fileURL = uploadResult.url;
        fileName = documentData.file.name;
        fileSize = documentData.file.size;
        filePath = uploadResult.path;
      }
      
      const docRef = await addDoc(collection(db, 'documents'), {
        userId,
        title: documentData.title,
        type: documentData.type,
        description: documentData.description || '',
        fileURL,
        fileName,
        fileSize,
        filePath,
        expiryDate: documentData.expiryDate ? Timestamp.fromDate(new Date(documentData.expiryDate)) : null,
        tags: documentData.tags || [],
        createdAt: serverTimestamp(),
        uploadedAt: serverTimestamp()
      });
      
      clearCache(`documents_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw new FirebaseServiceError('Failed to upload document', 'DOCUMENT_UPLOAD_FAILED');
    }
  },

  // Delete document
  async deleteDocument(documentId, userId, filePath) {
    try {
      // Delete file from storage if exists
      if (filePath) {
        await uploadService.deleteFile(filePath);
      }
      
      // Delete document from Firestore
      await deleteDoc(doc(db, 'documents', documentId));
      
      clearCache(`documents_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new FirebaseServiceError('Failed to delete document', 'DOCUMENT_DELETE_FAILED');
    }
  },

  // Update document
  async updateDocument(documentId, userId, updates) {
    try {
      const documentRef = doc(db, 'documents', documentId);
      await updateDoc(documentRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      clearCache(`documents_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating document:', error);
      throw new FirebaseServiceError('Failed to update document', 'DOCUMENT_UPDATE_FAILED');
    }
  }
};

// ============================================================================
// MESSAGE SERVICE - Messaging system
// ============================================================================

export const messageService = {
  // Get all messages for a user
  async getUserMessages(userId) {
    try {
      const cacheKey = `messages_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'messages'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        readAt: doc.data().readAt?.toDate(),
        repliedAt: doc.data().repliedAt?.toDate()
      }));
      
      setCachedData(cacheKey, messages);
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw new FirebaseServiceError('Failed to load messages', 'MESSAGES_LOAD_FAILED');
    }
  },

  // Send message
  async sendMessage(userId, messageData) {
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        userId,
        subject: messageData.subject || 'General Inquiry',
        message: messageData.message,
        type: messageData.type || 'general',
        priority: messageData.priority || 'normal',
        read: false,
        replied: false,
        createdAt: serverTimestamp(),
        readAt: null,
        repliedAt: null
      });
      
      clearCache(`messages_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new FirebaseServiceError('Failed to send message', 'MESSAGE_SEND_FAILED');
    }
  },

  // Mark message as read
  async markAsRead(messageId, userId) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        read: true,
        readAt: serverTimestamp()
      });
      
      clearCache(`messages_${userId}`);
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw new FirebaseServiceError('Failed to update message', 'MESSAGE_UPDATE_FAILED');
    }
  },

  // Delete message
  async deleteMessage(messageId, userId) {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      clearCache(`messages_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new FirebaseServiceError('Failed to delete message', 'MESSAGE_DELETE_FAILED');
    }
  }
};

// ============================================================================
// ACTIVITY LOG SERVICE - Track user activities
// ============================================================================

export const activityService = {
  // Log activity
  async logActivity(userId, activityData) {
    try {
      await addDoc(collection(db, 'activities'), {
        userId,
        action: activityData.action,
        type: activityData.type,
        details: activityData.details || {},
        ipAddress: activityData.ipAddress || null,
        userAgent: activityData.userAgent || null,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging shouldn't break the app
    }
  },

  // Get user activity history
  async getUserActivities(userId, limit = 50) {
    try {
      const q = query(
        collection(db, 'activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
    } catch (error) {
      console.error('Error getting activities:', error);
      return [];
    }
  }
};

// Export cache utilities
export const cacheUtils = {
  clearCache,
  clearAllCache: () => cache.clear()
};

// Export the error class
export { FirebaseServiceError };