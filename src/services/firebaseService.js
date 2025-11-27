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
      const validDocumentTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
      ];

      const isValidType = validImageTypes.includes(file.type) || validDocumentTypes.includes(file.type);
      if (!isValidType) {
        // Check file extension as fallback (some browsers don't set MIME type correctly)
        const fileName = file.name.toLowerCase();
        const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.gif', '.webp'];
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        if (!hasValidExtension) {
          throw new FirebaseServiceError(`Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX. Got: ${file.type || 'unknown'}`, 'INVALID_FILE_TYPE');
        }
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

      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        throw new FirebaseServiceError('Permission denied. Please check your account permissions.', 'UPLOAD_FAILED');
      } else if (error.code === 'storage/canceled') {
        throw new FirebaseServiceError('Upload was canceled', 'UPLOAD_CANCELED');
      } else if (error.code === 'storage/unknown') {
        throw new FirebaseServiceError('An unknown error occurred during upload', 'UPLOAD_FAILED');
      }

      throw new FirebaseServiceError(error.message || 'Failed to upload file. Please try again.', 'UPLOAD_FAILED');
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

      // Use setDoc with merge:true instead of updateDoc
      // This creates the document if it doesn't exist, or updates it if it does
      await setDoc(userRef, updateData, { merge: true });
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
  },

  // Get child accounts by parent ID
  async getChildrenByParent(parentId) {
    try {
      const q = query(
        collection(db, 'users'),
        where('parentId', '==', parentId),
        where('role', '==', 'child')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      }));
    } catch (error) {
      console.error('Error getting children by parent:', error);
      return [];
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
  // Get all messages for a user (where user is sender or receiver)
  async getUserMessages(userId) {
    try {
      const cacheKey = `messages_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      // Firestore doesn't support OR queries directly, so we need to query both
      // Query messages where user is the sender
      const sentQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Query messages where user is the receiver
      const receivedQuery = query(
        collection(db, 'messages'),
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Execute both queries in parallel
      const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery).catch((error) => {
          console.warn('Error fetching sent messages:', error);
          // If it's an index error, try without orderBy
          if (error.code === 'failed-precondition') {
            return getDocs(query(
              collection(db, 'messages'),
              where('senderId', '==', userId)
            )).catch(() => ({ docs: [] }));
          }
          return { docs: [] };
        }),
        getDocs(receivedQuery).catch((error) => {
          console.warn('Error fetching received messages:', error);
          // If it's an index error, try without orderBy
          if (error.code === 'failed-precondition') {
            return getDocs(query(
              collection(db, 'messages'),
              where('receiverId', '==', userId)
            )).catch(() => ({ docs: [] }));
          }
          return { docs: [] };
        })
      ]);

      // Combine results and remove duplicates
      const messageMap = new Map();
      
      [...sentSnapshot.docs, ...receivedSnapshot.docs].forEach(doc => {
        if (!messageMap.has(doc.id)) {
          messageMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            readAt: doc.data().readAt?.toDate(),
            repliedAt: doc.data().repliedAt?.toDate()
          });
        }
      });

      // Sort by creation date (most recent first)
      const messages = Array.from(messageMap.values()).sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });

      setCachedData(cacheKey, messages);
      return messages;
    } catch (error) {
      console.error('Error getting messages:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
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
  },

  // Add reaction to message
  async addReaction(messageId, userId, emoji) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        throw new FirebaseServiceError('Message not found', 'MESSAGE_NOT_FOUND');
      }

      const currentReactions = messageSnap.data().reactions || {};
      const reactionKey = `${userId}_${emoji}`;

      // Toggle reaction (remove if exists, add if not)
      if (currentReactions[reactionKey]) {
        delete currentReactions[reactionKey];
      } else {
        currentReactions[reactionKey] = {
          userId,
          emoji,
          timestamp: serverTimestamp()
        };
      }

      await updateDoc(messageRef, {
        reactions: currentReactions,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw new FirebaseServiceError('Failed to add reaction', 'REACTION_FAILED');
    }
  },

  // Edit message
  async editMessage(messageId, userId, newContent) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        throw new FirebaseServiceError('Message not found', 'MESSAGE_NOT_FOUND');
      }

      const messageData = messageSnap.data();
      if (messageData.senderId !== userId) {
        throw new FirebaseServiceError('Not authorized to edit this message', 'UNAUTHORIZED');
      }

      await updateDoc(messageRef, {
        message: newContent,
        edited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error editing message:', error);
      throw new FirebaseServiceError('Failed to edit message', 'EDIT_FAILED');
    }
  },

  // Schedule message
  async scheduleMessage(userId, messageData, scheduleTime) {
    try {
      const docRef = await addDoc(collection(db, 'scheduledMessages'), {
        userId,
        senderId: userId,
        receiverId: messageData.receiverId,
        conversationId: messageData.conversationId,
        message: messageData.message,
        attachments: messageData.attachments || null,
        location: messageData.location || null,
        scheduledFor: Timestamp.fromDate(new Date(scheduleTime)),
        status: 'scheduled',
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error scheduling message:', error);
      throw new FirebaseServiceError('Failed to schedule message', 'SCHEDULE_FAILED');
    }
  },

  // Create group chat
  async createGroupChat(userId, groupData) {
    try {
      const docRef = await addDoc(collection(db, 'groupChats'), {
        createdBy: userId,
        name: groupData.name,
        description: groupData.description || '',
        icon: groupData.icon || null,
        members: [userId, ...(groupData.memberIds || [])],
        admins: [userId],
        maxMembers: groupData.maxMembers || 1000,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw new FirebaseServiceError('Failed to create group chat', 'GROUP_CREATE_FAILED');
    }
  },

  // Send message to group
  async sendGroupMessage(groupId, userId, messageData) {
    try {
      const docRef = await addDoc(collection(db, 'groupMessages'), {
        groupId,
        senderId: userId,
        message: messageData.message,
        attachments: messageData.attachments || null,
        location: messageData.location || null,
        readBy: [userId], // Sender has read it
        reactions: {},
        expiresAt: messageData.expiresAt ? Timestamp.fromDate(new Date(messageData.expiresAt)) : null,
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error sending group message:', error);
      throw new FirebaseServiceError('Failed to send group message', 'GROUP_MESSAGE_FAILED');
    }
  },

  // Create broadcast channel
  async createBroadcastChannel(userId, channelData) {
    try {
      const docRef = await addDoc(collection(db, 'broadcastChannels'), {
        createdBy: userId,
        name: channelData.name,
        description: channelData.description || '',
        icon: channelData.icon || null,
        subscribers: [userId],
        isPublic: channelData.isPublic || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating broadcast channel:', error);
      throw new FirebaseServiceError('Failed to create broadcast channel', 'CHANNEL_CREATE_FAILED');
    }
  },

  // Broadcast message
  async broadcastMessage(channelId, userId, messageData) {
    try {
      const docRef = await addDoc(collection(db, 'broadcastMessages'), {
        channelId,
        senderId: userId,
        message: messageData.message,
        attachments: messageData.attachments || null,
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error broadcasting message:', error);
      throw new FirebaseServiceError('Failed to broadcast message', 'BROADCAST_FAILED');
    }
  },

  // Get message templates
  async getMessageTemplates(userId) {
    try {
      const q = query(
        collection(db, 'messageTemplates'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting templates:', error);
      return [];
    }
  },

  // Save message template
  async saveMessageTemplate(userId, templateData) {
    try {
      const docRef = await addDoc(collection(db, 'messageTemplates'), {
        userId,
        name: templateData.name,
        content: templateData.content,
        category: templateData.category || 'general',
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error saving template:', error);
      throw new FirebaseServiceError('Failed to save template', 'TEMPLATE_SAVE_FAILED');
    }
  },

  // Generate AI smart reply suggestions
  async generateSmartReplies(messageText, context = {}) {
    try {
      if (!messageText || typeof messageText !== 'string') {
        return ['Got it!', 'Thanks!', 'Will do!'];
      }

      // Simulated AI smart replies - in production, integrate with OpenAI, Google AI, etc.
      const commonReplies = {
        'hello': ['Hi!', 'Hello!', 'Hey there!', 'Hi, how can I help?'],
        'thanks': ['You\'re welcome!', 'Happy to help!', 'Anytime!', 'No problem!'],
        'how are you': ['I\'m doing well, thanks!', 'Great, thanks for asking!', 'All good!'],
        'bye': ['See you later!', 'Take care!', 'Goodbye!', 'Talk soon!']
      };

      const lowerText = messageText.toLowerCase();
      for (const [key, replies] of Object.entries(commonReplies)) {
        if (lowerText.includes(key)) {
          return replies.slice(0, 3); // Return top 3 suggestions
        }
      }

      // Default generic replies
      return ['Got it!', 'Thanks!', 'Will do!'];
    } catch (error) {
      console.error('Error generating smart replies:', error);
      return ['Got it!', 'Thanks!', 'Will do!'];
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

// ============================================================================
// CHILDREN SERVICE - Child profiles and savings goals
// ============================================================================

export const childrenService = {
  // Get all children for a user
  async getChildren(userId) {
    try {
      const cacheKey = `children_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      // Simple query without orderBy to avoid index requirements
      const q = query(
        collection(db, 'children'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateOfBirth: doc.data().dateOfBirth?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

      // Sort client-side by createdAt descending
      children.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setCachedData(cacheKey, children);
      return children;
    } catch (error) {
      console.error('Error getting children:', error);
      // Return empty array instead of throwing to prevent page crash
      return [];
    }
  },

  // Add a child
  async addChild(userId, childData) {
    try {
      const docData = {
        userId,
        name: childData.name,
        gender: childData.gender || '',
        notes: childData.notes || '',
        photoURL: childData.photoURL || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Only add dateOfBirth if it's a valid date
      if (childData.dateOfBirth) {
        docData.dateOfBirth = Timestamp.fromDate(new Date(childData.dateOfBirth));
      }

      const docRef = await addDoc(collection(db, 'children'), docData);

      clearCache(`children_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding child:', error);
      throw new FirebaseServiceError('Failed to add child', 'CHILD_ADD_FAILED');
    }
  },

  // Update a child
  async updateChild(childId, userId, updates) {
    try {
      const childRef = doc(db, 'children', childId);
      await updateDoc(childRef, {
        ...updates,
        dateOfBirth: updates.dateOfBirth ? Timestamp.fromDate(new Date(updates.dateOfBirth)) : null,
        updatedAt: serverTimestamp()
      });

      clearCache(`children_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating child:', error);
      throw new FirebaseServiceError('Failed to update child', 'CHILD_UPDATE_FAILED');
    }
  },

  // Delete a child
  async deleteChild(childId, userId) {
    try {
      // Also delete all savings goals for this child
      const goalsQuery = query(
        collection(db, 'savingsGoals'),
        where('childId', '==', childId)
      );
      const goalsSnapshot = await getDocs(goalsQuery);
      const batch = writeBatch(db);

      goalsSnapshot.docs.forEach(goalDoc => {
        batch.delete(goalDoc.ref);
      });

      batch.delete(doc(db, 'children', childId));
      await batch.commit();

      clearCache(`children_${userId}`);
      clearCache(`savings_${childId}`);
      return true;
    } catch (error) {
      console.error('Error deleting child:', error);
      throw new FirebaseServiceError('Failed to delete child', 'CHILD_DELETE_FAILED');
    }
  }
};

// ============================================================================
// SAVINGS GOALS SERVICE - Savings goals for children
// ============================================================================

export const savingsService = {
  // Get all savings goals for a child
  async getChildSavings(childId) {
    try {
      const cacheKey = `savings_${childId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'savingsGoals'),
        where('childId', '==', childId)
      );

      const snapshot = await getDocs(q);
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

      // Sort client-side
      goals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setCachedData(cacheKey, goals);
      return goals;
    } catch (error) {
      console.error('Error getting savings goals:', error);
      return [];
    }
  },

  // Get all savings goals for a user (all children)
  async getUserSavings(userId) {
    try {
      const cacheKey = `all_savings_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'savingsGoals'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

      // Sort client-side
      goals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setCachedData(cacheKey, goals);
      return goals;
    } catch (error) {
      console.error('Error getting all savings goals:', error);
      return [];
    }
  },

  // Create a savings goal
  async createSavingsGoal(userId, childId, goalData) {
    try {
      const docRef = await addDoc(collection(db, 'savingsGoals'), {
        userId,
        childId,
        goalName: goalData.goalName,
        targetAmount: parseFloat(goalData.targetAmount) || 0,
        currentAmount: parseFloat(goalData.currentAmount) || 0,
        dueDate: goalData.dueDate ? Timestamp.fromDate(new Date(goalData.dueDate)) : null,
        category: goalData.category || 'general',
        status: 'active',
        notes: goalData.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      clearCache(`savings_${childId}`);
      clearCache(`all_savings_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating savings goal:', error);
      throw new FirebaseServiceError('Failed to create savings goal', 'SAVINGS_CREATE_FAILED');
    }
  },

  // Update a savings goal
  async updateSavingsGoal(goalId, userId, childId, updates) {
    try {
      const goalRef = doc(db, 'savingsGoals', goalId);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      if (updates.dueDate) {
        updateData.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
      }
      if (updates.targetAmount !== undefined) {
        updateData.targetAmount = parseFloat(updates.targetAmount);
      }
      if (updates.currentAmount !== undefined) {
        updateData.currentAmount = parseFloat(updates.currentAmount);
      }

      await updateDoc(goalRef, updateData);

      clearCache(`savings_${childId}`);
      clearCache(`all_savings_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating savings goal:', error);
      throw new FirebaseServiceError('Failed to update savings goal', 'SAVINGS_UPDATE_FAILED');
    }
  },

  // Add money to a savings goal
  async addToSavings(goalId, userId, childId, amount) {
    try {
      const goalRef = doc(db, 'savingsGoals', goalId);
      const goalDoc = await getDoc(goalRef);

      if (!goalDoc.exists()) {
        throw new FirebaseServiceError('Savings goal not found', 'SAVINGS_NOT_FOUND');
      }

      const currentAmount = goalDoc.data().currentAmount || 0;
      const targetAmount = goalDoc.data().targetAmount || 0;
      const newAmount = currentAmount + parseFloat(amount);

      const updates = {
        currentAmount: newAmount,
        updatedAt: serverTimestamp()
      };

      // Check if goal is completed
      if (newAmount >= targetAmount) {
        updates.status = 'completed';
      }

      await updateDoc(goalRef, updates);

      clearCache(`savings_${childId}`);
      clearCache(`all_savings_${userId}`);
      return newAmount;
    } catch (error) {
      console.error('Error adding to savings:', error);
      throw new FirebaseServiceError('Failed to add to savings', 'SAVINGS_ADD_FAILED');
    }
  },

  // Delete a savings goal
  async deleteSavingsGoal(goalId, userId, childId) {
    try {
      await deleteDoc(doc(db, 'savingsGoals', goalId));
      clearCache(`savings_${childId}`);
      clearCache(`all_savings_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting savings goal:', error);
      throw new FirebaseServiceError('Failed to delete savings goal', 'SAVINGS_DELETE_FAILED');
    }
  }
};

// ============================================================================
// HEALTH RECORDS SERVICE - Family health records management
// ============================================================================

export const healthService = {
  // Get all health records for a user's family
  async getFamilyHealthRecords(userId) {
    try {
      const cacheKey = `health_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'healthRecords'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        lastUpdated: doc.data().lastUpdated?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Sort client-side
      records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setCachedData(cacheKey, records);
      return records;
    } catch (error) {
      console.error('Error getting health records:', error);
      return [];
    }
  },

  // Get health records for a specific family member
  async getMemberHealthRecords(userId, memberId) {
    try {
      // Use simpler query without compound index requirement
      const q = query(
        collection(db, 'healthRecords'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const records = snapshot.docs
        .filter(doc => doc.data().memberId === memberId)
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          startDate: doc.data().startDate?.toDate(),
          lastUpdated: doc.data().lastUpdated?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        }));

      // Sort client-side
      records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return records;
    } catch (error) {
      console.error('Error getting member health records:', error);
      return [];
    }
  },

  // Add a health record
  async addHealthRecord(userId, recordData) {
    try {
      const docRef = await addDoc(collection(db, 'healthRecords'), {
        userId,
        memberId: recordData.memberId,
        memberName: recordData.memberName,
        type: recordData.type, // condition, allergy, vaccine, medication, note
        title: recordData.title,
        description: recordData.description || '',
        severity: recordData.severity || 'normal', // mild, moderate, severe
        startDate: recordData.startDate ? Timestamp.fromDate(new Date(recordData.startDate)) : serverTimestamp(),
        endDate: recordData.endDate ? Timestamp.fromDate(new Date(recordData.endDate)) : null,
        isActive: recordData.isActive !== false,
        notes: recordData.notes || '',
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });

      clearCache(`health_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error adding health record:', error);
      throw new FirebaseServiceError('Failed to add health record', 'HEALTH_ADD_FAILED');
    }
  },

  // Update a health record
  async updateHealthRecord(recordId, userId, updates) {
    try {
      const recordRef = doc(db, 'healthRecords', recordId);
      const updateData = {
        ...updates,
        lastUpdated: serverTimestamp()
      };

      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(new Date(updates.startDate));
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(new Date(updates.endDate));
      }

      await updateDoc(recordRef, updateData);
      clearCache(`health_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating health record:', error);
      throw new FirebaseServiceError('Failed to update health record', 'HEALTH_UPDATE_FAILED');
    }
  },

  // Delete a health record
  async deleteHealthRecord(recordId, userId) {
    try {
      await deleteDoc(doc(db, 'healthRecords', recordId));
      clearCache(`health_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting health record:', error);
      throw new FirebaseServiceError('Failed to delete health record', 'HEALTH_DELETE_FAILED');
    }
  }
};

// ============================================================================
// APPOINTMENTS SERVICE - Medical appointments management
// ============================================================================

export const appointmentsService = {
  // Get all appointments for a user
  async getAppointments(userId) {
    try {
      const cacheKey = `appointments_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'appointments'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dateTime: doc.data().dateTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Sort client-side by dateTime ascending
      appointments.sort((a, b) => (a.dateTime || 0) - (b.dateTime || 0));

      setCachedData(cacheKey, appointments);
      return appointments;
    } catch (error) {
      console.error('Error getting appointments:', error);
      return [];
    }
  },

  // Create an appointment
  async createAppointment(userId, appointmentData) {
    try {
      const docRef = await addDoc(collection(db, 'appointments'), {
        userId,
        memberId: appointmentData.memberId,
        memberName: appointmentData.memberName,
        title: appointmentData.title,
        type: appointmentData.type || 'general', // checkup, dental, vaccine, specialist, etc.
        doctorName: appointmentData.doctorName || '',
        location: appointmentData.location || '',
        dateTime: Timestamp.fromDate(new Date(appointmentData.dateTime)),
        duration: appointmentData.duration || 30, // minutes
        notes: appointmentData.notes || '',
        reminder: appointmentData.reminder !== false,
        status: 'scheduled', // scheduled, completed, cancelled
        createdAt: serverTimestamp()
      });

      clearCache(`appointments_${userId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw new FirebaseServiceError('Failed to create appointment', 'APPOINTMENT_CREATE_FAILED');
    }
  },

  // Update an appointment
  async updateAppointment(appointmentId, userId, updates) {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const updateData = { ...updates };

      if (updates.dateTime) {
        updateData.dateTime = Timestamp.fromDate(new Date(updates.dateTime));
      }

      await updateDoc(appointmentRef, updateData);
      clearCache(`appointments_${userId}`);
      return true;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw new FirebaseServiceError('Failed to update appointment', 'APPOINTMENT_UPDATE_FAILED');
    }
  },

  // Delete an appointment
  async deleteAppointment(appointmentId, userId) {
    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
      clearCache(`appointments_${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw new FirebaseServiceError('Failed to delete appointment', 'APPOINTMENT_DELETE_FAILED');
    }
  }
};

// Security Service
export const securityService = {
  // Get login history
  async getLoginHistory(userId) {
    try {
      const cacheKey = `loginHistory_${userId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'loginHistory'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Sort by timestamp descending (most recent first)
      history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      setCachedData(cacheKey, history);
      return history;
    } catch (error) {
      console.error('Error getting login history:', error);
      return [];
    }
  },

  // Add login record
  async addLoginRecord(userId, loginData) {
    try {
      await addDoc(collection(db, 'loginHistory'), {
        userId,
        timestamp: serverTimestamp(),
        ipAddress: loginData.ipAddress || 'Unknown',
        userAgent: loginData.userAgent || 'Unknown',
        device: loginData.device || 'Unknown',
        location: loginData.location || 'Unknown',
        success: loginData.success !== false,
        createdAt: serverTimestamp()
      });
      clearCache(`loginHistory_${userId}`);
      return true;
    } catch (error) {
      console.error('Error adding login record:', error);
      return false;
    }
  },

  // Get active sessions
  async getActiveSessions(userId) {
    try {
      const q = query(
        collection(db, 'sessions'),
        where('userId', '==', userId),
        where('active', '==', true)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastActivity: doc.data().lastActivity?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  },

  // Create session
  async createSession(userId, sessionData) {
    try {
      await addDoc(collection(db, 'sessions'), {
        userId,
        sessionId: sessionData.sessionId || `session_${Date.now()}`,
        device: sessionData.device || 'Unknown',
        ipAddress: sessionData.ipAddress || 'Unknown',
        userAgent: sessionData.userAgent || 'Unknown',
        location: sessionData.location || 'Unknown',
        active: true,
        lastActivity: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error creating session:', error);
      return false;
    }
  },

  // End session
  async endSession(sessionId, userId) {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, where('sessionId', '==', sessionId), where('userId', '==', userId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        await updateDoc(doc(db, 'sessions', snapshot.docs[0].id), {
          active: false,
          endedAt: serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  },

  // Get security settings
  async getSecuritySettings(userId) {
    try {
      const docRef = doc(db, 'securitySettings', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      }

      // Return defaults
      return {
        twoFactorEnabled: false,
        loginAlerts: true,
        suspiciousActivityAlerts: true,
        passwordChangeRequired: false,
        lastPasswordChange: null,
        failedLoginAttempts: 0,
        accountLocked: false,
        trustedDevices: []
      };
    } catch (error) {
      console.error('Error getting security settings:', error);
      return null;
    }
  },

  // Update security settings
  async updateSecuritySettings(userId, settings) {
    try {
      await setDoc(doc(db, 'securitySettings', userId), {
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw new FirebaseServiceError('Failed to update security settings', 'SECURITY_UPDATE_FAILED');
    }
  },

  // Get security alerts
  async getSecurityAlerts(userId) {
    try {
      const q = query(
        collection(db, 'securityAlerts'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Sort by timestamp descending
      alerts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return alerts;
    } catch (error) {
      console.error('Error getting security alerts:', error);
      return [];
    }
  },

  // Add security alert
  async addSecurityAlert(userId, alertData) {
    try {
      await addDoc(collection(db, 'securityAlerts'), {
        userId,
        type: alertData.type, // 'login', 'password_change', 'suspicious_activity', etc.
        title: alertData.title,
        message: alertData.message,
        severity: alertData.severity || 'medium', // low, medium, high, critical
        read: false,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error adding security alert:', error);
      return false;
    }
  },

  // Mark security alert as read
  async markSecurityAlertAsRead(alertId) {
    try {
      await updateDoc(doc(db, 'securityAlerts', alertId), {
        read: true,
        readAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }
};

// Family Invitation Service
export const familyInvitationService = {
  // Create family invitation
  async createInvitation(inviterId, invitationData) {
    try {
      const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const docRef = doc(db, 'familyInvitations', invitationId);

      await setDoc(docRef, {
        invitationId,
        inviterId,
        inviterName: invitationData.inviterName,
        inviterEmail: invitationData.inviterEmail,
        inviteeEmail: invitationData.inviteeEmail,
        inviteePhone: invitationData.inviteePhone || null,
        inviteeName: invitationData.inviteeName || '',
        relationship: invitationData.relationship || 'Family Member',
        familyId: invitationData.familyId || inviterId, // Use inviter's ID as family ID
        status: 'pending', // pending, accepted, declined, expired
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days
        createdAt: serverTimestamp(),
        acceptedAt: null
      });

      return invitationId;
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw new FirebaseServiceError('Failed to create invitation', 'INVITATION_CREATE_FAILED');
    }
  },

  // Get invitations for a user (by email or phone)
  async getInvitationsByEmail(email) {
    try {
      const q = query(
        collection(db, 'familyInvitations'),
        where('inviteeEmail', '==', email),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate()
      })).filter(inv => {
        // Filter out expired invitations
        if (inv.expiresAt) {
          return inv.expiresAt > new Date();
        }
        return true;
      });
    } catch (error) {
      console.error('Error getting invitations:', error);
      return [];
    }
  },

  // Get invitations sent by a user
  async getSentInvitations(userId) {
    try {
      const q = query(
        collection(db, 'familyInvitations'),
        where('inviterId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        acceptedAt: doc.data().acceptedAt?.toDate()
      })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Error getting sent invitations:', error);
      return [];
    }
  },

  // Accept invitation
  async acceptInvitation(invitationId, userId) {
    try {
      const invitationRef = doc(db, 'familyInvitations', invitationId);
      const invitationSnap = await getDoc(invitationRef);

      if (!invitationSnap.exists()) {
        throw new FirebaseServiceError('Invitation not found', 'INVITATION_NOT_FOUND');
      }

      const invitationData = invitationSnap.data();

      // Check if expired
      if (invitationData.expiresAt?.toDate() < new Date()) {
        throw new FirebaseServiceError('Invitation has expired', 'INVITATION_EXPIRED');
      }

      // Update invitation status
      await updateDoc(invitationRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
        acceptedBy: userId
      });

      // Add user to family
      const inviterProfile = await userService.getUserProfile(invitationData.inviterId);
      const familyId = invitationData.familyId || invitationData.inviterId;

      // Update inviter's family list
      const inviterFamilyMembers = inviterProfile?.familyMembers || [];
      const newMember = {
        id: userId,
        name: invitationData.inviteeName || 'Family Member',
        relationship: invitationData.relationship,
        userId: userId,
        addedAt: new Date()
      };

      await userService.updateUserProfile(invitationData.inviterId, {
        familyMembers: [...inviterFamilyMembers, newMember],
        updatedAt: new Date()
      });

      // Update invitee's profile to link to family
      const inviteeProfile = await userService.getUserProfile(userId);
      const inviteeFamilyMembers = inviteeProfile?.familyMembers || [];

      await userService.updateUserProfile(userId, {
        familyId: familyId,
        familyMembers: [
          ...inviteeFamilyMembers,
          {
            id: invitationData.inviterId,
            name: invitationData.inviterName,
            relationship: 'Family Head',
            userId: invitationData.inviterId,
            addedAt: new Date()
          }
        ],
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new FirebaseServiceError('Failed to accept invitation', 'INVITATION_ACCEPT_FAILED');
    }
  },

  // Decline invitation
  async declineInvitation(invitationId) {
    try {
      await updateDoc(doc(db, 'familyInvitations', invitationId), {
        status: 'declined',
        declinedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error declining invitation:', error);
      throw new FirebaseServiceError('Failed to decline invitation', 'INVITATION_DECLINE_FAILED');
    }
  },

  // Cancel invitation
  async cancelInvitation(invitationId, userId) {
    try {
      const invitationRef = doc(db, 'familyInvitations', invitationId);
      const invitationSnap = await getDoc(invitationRef);

      if (!invitationSnap.exists()) {
        throw new FirebaseServiceError('Invitation not found', 'INVITATION_NOT_FOUND');
      }

      if (invitationSnap.data().inviterId !== userId) {
        throw new FirebaseServiceError('Not authorized to cancel this invitation', 'UNAUTHORIZED');
      }

      await updateDoc(invitationRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw new FirebaseServiceError('Failed to cancel invitation', 'INVITATION_CANCEL_FAILED');
    }
  }
};

// ============================================================================
// CHILD DASHBOARD SERVICES - Complete child management system
// ============================================================================

// Child Tasks & To-Do Service
export const childTasksService = {
  // Get tasks for a child
  async getChildTasks(childId, parentId) {
    try {
      const cacheKey = `child_tasks_${childId}`;
      const cached = getCachedData(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, 'childTasks'),
        where('childId', '==', childId)
      );

      const snapshot = await getDocs(q);
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        deadline: doc.data().deadline?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate()
      }));

      tasks.sort((a, b) => (a.deadline || 0) - (b.deadline || 0));
      setCachedData(cacheKey, tasks);
      return tasks;
    } catch (error) {
      console.error('Error getting child tasks:', error);
      return [];
    }
  },

  // Create task for child (parent only)
  async createTask(parentId, childId, taskData) {
    try {
      const docRef = await addDoc(collection(db, 'childTasks'), {
        parentId,
        childId,
        title: taskData.title,
        description: taskData.description || '',
        category: taskData.category || 'general',
        deadline: taskData.deadline ? Timestamp.fromDate(new Date(taskData.deadline)) : null,
        reward: taskData.reward || null,
        points: taskData.points || 0,
        status: 'pending', // pending, completed, approved, rejected
        completedAt: null,
        approvedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      clearCache(`child_tasks_${childId}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new FirebaseServiceError('Failed to create task', 'TASK_CREATE_FAILED');
    }
  },

  // Mark task as completed (child)
  async completeTask(taskId, childId) {
    try {
      const taskRef = doc(db, 'childTasks', taskId);
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      clearCache(`child_tasks_${childId}`);
      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      throw new FirebaseServiceError('Failed to complete task', 'TASK_COMPLETE_FAILED');
    }
  },

  // Approve/reject task (parent)
  async approveTask(taskId, parentId, approved, points = 0) {
    try {
      const taskRef = doc(db, 'childTasks', taskId);
      await updateDoc(taskRef, {
        status: approved ? 'approved' : 'rejected',
        approvedAt: serverTimestamp(),
        pointsAwarded: approved ? points : 0,
        updatedAt: serverTimestamp()
      });

      // If approved, add points to child wallet
      if (approved && points > 0) {
        const taskSnap = await getDoc(taskRef);
        const taskData = taskSnap.data();
        await childWalletService.addPoints(taskData.childId, parentId, points, 'task_completion', taskId);
      }

      const taskSnap = await getDoc(taskRef);
      clearCache(`child_tasks_${taskSnap.data().childId}`);
      return true;
    } catch (error) {
      console.error('Error approving task:', error);
      throw new FirebaseServiceError('Failed to approve task', 'TASK_APPROVE_FAILED');
    }
  },

  // Delete task
  async deleteTask(taskId, childId) {
    try {
      await deleteDoc(doc(db, 'childTasks', taskId));
      clearCache(`child_tasks_${childId}`);
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new FirebaseServiceError('Failed to delete task', 'TASK_DELETE_FAILED');
    }
  }
};

// School & Learning Service
export const childLearningService = {
  // Get homework for child
  async getChildHomework(childId) {
    try {
      const q = query(
        collection(db, 'childHomework'),
        where('childId', '==', childId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        submittedAt: doc.data().submittedAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting homework:', error);
      return [];
    }
  },

  // Add homework (parent)
  async addHomework(parentId, childId, homeworkData) {
    try {
      const docRef = await addDoc(collection(db, 'childHomework'), {
        parentId,
        childId,
        subject: homeworkData.subject,
        title: homeworkData.title,
        description: homeworkData.description || '',
        dueDate: homeworkData.dueDate ? Timestamp.fromDate(new Date(homeworkData.dueDate)) : null,
        status: 'assigned', // assigned, submitted, reviewed
        submittedFiles: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding homework:', error);
      throw new FirebaseServiceError('Failed to add homework', 'HOMEWORK_ADD_FAILED');
    }
  },

  // Submit homework (child)
  async submitHomework(homeworkId, childId, files) {
    try {
      const homeworkRef = doc(db, 'childHomework', homeworkId);
      await updateDoc(homeworkRef, {
        status: 'submitted',
        submittedFiles: files || [],
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error submitting homework:', error);
      throw new FirebaseServiceError('Failed to submit homework', 'HOMEWORK_SUBMIT_FAILED');
    }
  }
};

// Chores Service
export const childChoresService = {
  // Get chores for child
  async getChildChores(childId) {
    try {
      const q = query(
        collection(db, 'childChores'),
        where('childId', '==', childId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dueDate: doc.data().dueDate?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting chores:', error);
      return [];
    }
  },

  // Create chore (parent)
  async createChore(parentId, childId, choreData) {
    try {
      const docRef = await addDoc(collection(db, 'childChores'), {
        parentId,
        childId,
        title: choreData.title,
        description: choreData.description || '',
        frequency: choreData.frequency || 'daily', // daily, weekly, one-time
        reward: choreData.reward || null,
        points: choreData.points || 0,
        status: 'pending',
        streak: 0,
        completedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating chore:', error);
      throw new FirebaseServiceError('Failed to create chore', 'CHORE_CREATE_FAILED');
    }
  },

  // Mark chore complete (child)
  async completeChore(choreId, childId) {
    try {
      const choreRef = doc(db, 'childChores', choreId);
      const choreSnap = await getDoc(choreRef);
      const choreData = choreSnap.data();

      await updateDoc(choreRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        streak: (choreData.streak || 0) + 1,
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error completing chore:', error);
      throw new FirebaseServiceError('Failed to complete chore', 'CHORE_COMPLETE_FAILED');
    }
  }
};

// Child Wallet Service
export const childWalletService = {
  // Get wallet for child
  async getChildWallet(childId, parentId) {
    try {
      const walletRef = doc(db, 'childWallets', childId);
      const walletSnap = await getDoc(walletRef);

      if (walletSnap.exists()) {
        return {
          id: walletSnap.id,
          ...walletSnap.data(),
          createdAt: walletSnap.data().createdAt?.toDate(),
          updatedAt: walletSnap.data().updatedAt?.toDate()
        };
      }

      // Create wallet if doesn't exist
      await setDoc(walletRef, {
        childId,
        parentId,
        balance: 0,
        points: 0,
        savingsGoals: [],
        transactions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: childId,
        childId,
        parentId,
        balance: 0,
        points: 0,
        savingsGoals: [],
        transactions: []
      };
    } catch (error) {
      console.error('Error getting wallet:', error);
      throw new FirebaseServiceError('Failed to get wallet', 'WALLET_GET_FAILED');
    }
  },

  // Add points to wallet
  async addPoints(childId, parentId, points, source, sourceId) {
    try {
      const walletRef = doc(db, 'childWallets', childId);
      const walletSnap = await getDoc(walletRef);
      const currentPoints = walletSnap.exists() ? (walletSnap.data().points || 0) : 0;

      await setDoc(walletRef, {
        childId,
        parentId,
        points: currentPoints + points,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Add transaction
      await addDoc(collection(db, 'childWalletTransactions'), {
        childId,
        parentId,
        type: 'points_earned',
        amount: points,
        source,
        sourceId,
        createdAt: serverTimestamp()
      });

      clearCache(`child_wallet_${childId}`);
      return true;
    } catch (error) {
      console.error('Error adding points:', error);
      throw new FirebaseServiceError('Failed to add points', 'POINTS_ADD_FAILED');
    }
  },

  // Request money (child)
  async requestMoney(childId, parentId, amount, reason) {
    try {
      const docRef = await addDoc(collection(db, 'childMoneyRequests'), {
        childId,
        parentId,
        amount: parseFloat(amount),
        reason: reason || '',
        status: 'pending', // pending, approved, denied
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error requesting money:', error);
      throw new FirebaseServiceError('Failed to request money', 'MONEY_REQUEST_FAILED');
    }
  },

  // Approve/deny money request (parent)
  async handleMoneyRequest(requestId, parentId, approved) {
    try {
      const requestRef = doc(db, 'childMoneyRequests', requestId);
      const requestSnap = await getDoc(requestRef);
      const requestData = requestSnap.data();

      await updateDoc(requestRef, {
        status: approved ? 'approved' : 'denied',
        updatedAt: serverTimestamp()
      });

      if (approved) {
        const walletRef = doc(db, 'childWallets', requestData.childId);
        const walletSnap = await getDoc(walletRef);
        const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0;

        await setDoc(walletRef, {
          childId: requestData.childId,
          parentId,
          balance: currentBalance + requestData.amount,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      return true;
    } catch (error) {
      console.error('Error handling money request:', error);
      throw new FirebaseServiceError('Failed to handle request', 'MONEY_REQUEST_HANDLE_FAILED');
    }
  }
};

// Behavior Tracker Service
export const childBehaviorService = {
  // Get behavior records for child
  async getChildBehavior(childId) {
    try {
      const q = query(
        collection(db, 'childBehavior'),
        where('childId', '==', childId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting behavior:', error);
      return [];
    }
  },

  // Add behavior note (parent or child)
  async addBehaviorNote(childId, userId, noteData) {
    try {
      const docRef = await addDoc(collection(db, 'childBehavior'), {
        childId,
        addedBy: userId,
        type: noteData.type || 'note', // note, achievement, badge
        title: noteData.title,
        description: noteData.description || '',
        points: noteData.points || 0,
        mood: noteData.mood || null,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // If points awarded, add to wallet
      if (noteData.points > 0) {
        const userProfile = await userService.getUserProfile(userId);
        await childWalletService.addPoints(childId, userId, noteData.points, 'behavior', docRef.id);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error adding behavior note:', error);
      throw new FirebaseServiceError('Failed to add behavior note', 'BEHAVIOR_ADD_FAILED');
    }
  }
};

// Rewards Service
export const childRewardsService = {
  // Get rewards for child
  async getChildRewards(childId) {
    try {
      const q = query(
        collection(db, 'childRewards'),
        where('childId', '==', childId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting rewards:', error);
      return [];
    }
  },

  // Create reward (parent)
  async createReward(parentId, childId, rewardData) {
    try {
      const docRef = await addDoc(collection(db, 'childRewards'), {
        parentId,
        childId,
        name: rewardData.name,
        description: rewardData.description || '',
        type: rewardData.type || 'item', // item, activity, privilege
        cost: rewardData.cost || 0, // points or money
        costType: rewardData.costType || 'points', // points, money
        status: 'available', // available, redeemed, expired
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating reward:', error);
      throw new FirebaseServiceError('Failed to create reward', 'REWARD_CREATE_FAILED');
    }
  },

  // Redeem reward (child)
  async redeemReward(rewardId, childId) {
    try {
      const rewardRef = doc(db, 'childRewards', rewardId);
      const rewardSnap = await getDoc(rewardRef);
      const rewardData = rewardSnap.data();

      if (rewardData.status !== 'available') {
        throw new FirebaseServiceError('Reward not available', 'REWARD_NOT_AVAILABLE');
      }

      // Check if child has enough points/money
      const wallet = await childWalletService.getChildWallet(childId, rewardData.parentId);
      const hasEnough = rewardData.costType === 'points'
        ? wallet.points >= rewardData.cost
        : wallet.balance >= rewardData.cost;

      if (!hasEnough) {
        throw new FirebaseServiceError('Insufficient balance', 'INSUFFICIENT_BALANCE');
      }

      // Update reward status
      await updateDoc(rewardRef, {
        status: 'pending_approval',
        redeemedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  },

  // Approve reward redemption (parent)
  async approveRewardRedemption(rewardId, parentId, approved) {
    try {
      const rewardRef = doc(db, 'childRewards', rewardId);
      const rewardSnap = await getDoc(rewardRef);
      const rewardData = rewardSnap.data();

      if (approved) {
        // Deduct cost from wallet
        const wallet = await childWalletService.getChildWallet(rewardData.childId, parentId);
        if (rewardData.costType === 'points') {
          // Deduct points logic would go here
        } else {
          // Deduct money logic would go here
        }

        await updateDoc(rewardRef, {
          status: 'redeemed',
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(rewardRef, {
          status: 'available',
          updatedAt: serverTimestamp()
        });
      }

      return true;
    } catch (error) {
      console.error('Error approving reward:', error);
      throw new FirebaseServiceError('Failed to approve reward', 'REWARD_APPROVE_FAILED');
    }
  }
};

// Screen Time Management Service
export const childScreenTimeService = {
  // Get screen time settings for child
  async getScreenTimeSettings(childId, parentId) {
    try {
      const settingsRef = doc(db, 'childScreenTime', childId);
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        return {
          id: settingsSnap.id,
          ...settingsSnap.data(),
          updatedAt: settingsSnap.data().updatedAt?.toDate()
        };
      }

      // Create default settings
      const defaultSettings = {
        childId,
        parentId,
        dailyLimit: 120, // minutes
        allowedSections: ['tasks', 'homework', 'messages', 'calendar'],
        blockedSections: [],
        focusModeEnabled: false,
        schoolHoursBlocked: true,
        schoolStartTime: '08:00',
        schoolEndTime: '15:00',
        updatedAt: serverTimestamp()
      };

      await setDoc(settingsRef, defaultSettings);
      return { id: childId, ...defaultSettings };
    } catch (error) {
      console.error('Error getting screen time settings:', error);
      throw new FirebaseServiceError('Failed to get settings', 'SCREENTIME_GET_FAILED');
    }
  },

  // Update screen time settings (parent)
  async updateScreenTimeSettings(childId, parentId, settings) {
    try {
      const settingsRef = doc(db, 'childScreenTime', childId);
      await setDoc(settingsRef, {
        childId,
        parentId,
        ...settings,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Error updating screen time:', error);
      throw new FirebaseServiceError('Failed to update settings', 'SCREENTIME_UPDATE_FAILED');
    }
  }
};

// Safety & Emergency Service
export const childSafetyService = {
  // Send SOS alert (child)
  async sendSOS(childId, parentId, location) {
    try {
      const docRef = await addDoc(collection(db, 'childSOSAlerts'), {
        childId,
        parentId,
        location: location || null,
        status: 'active',
        createdAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error sending SOS:', error);
      throw new FirebaseServiceError('Failed to send SOS', 'SOS_FAILED');
    }
  },

  // Share location (child)
  async shareLocation(childId, parentId, location) {
    try {
      await addDoc(collection(db, 'childLocationShares'), {
        childId,
        parentId,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error sharing location:', error);
      throw new FirebaseServiceError('Failed to share location', 'LOCATION_SHARE_FAILED');
    }
  },

  // Get safe locations for child
  async getSafeLocations(childId, parentId) {
    try {
      const q = query(
        collection(db, 'childSafeLocations'),
        where('childId', '==', childId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting safe locations:', error);
      return [];
    }
  }
};

// Child Games Service
export const childGamesService = {
  // Get approved games for child
  async getChildGames(childId) {
    try {
      const q = query(
        collection(db, 'childGames'),
        where('childId', '==', childId),
        where('approved', '==', true)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
    } catch (error) {
      console.error('Error getting games:', error);
      return [];
    }
  }
};

// Export cache utilities
export const cacheUtils = {
  clearCache,
  clearAllCache: () => cache.clear()
};