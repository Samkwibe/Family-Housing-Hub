/**
 * Enhanced Messaging Service
 * Revolutionary family messaging platform with advanced features
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

class MessagingService {
  /**
   * Create a group chat with permissions
   */
  async createGroupChat(data) {
    try {
      const groupData = {
        name: data.name,
        description: data.description || '',
        createdBy: data.createdBy,
        createdAt: serverTimestamp(),
        members: data.members || [], // Array of {userId, role, permissions}
        type: 'group',
        settings: {
          allowInvites: data.settings?.allowInvites ?? true,
          allowFileSharing: data.settings?.allowFileSharing ?? true,
          allowVoiceMessages: data.settings?.allowVoiceMessages ?? true,
          requireAdminApproval: data.settings?.requireAdminApproval ?? false,
          maxMembers: data.settings?.maxMembers ?? 50
        },
        avatar: data.avatar || null,
        lastActivity: serverTimestamp()
      };

      const groupRef = await addDoc(collection(db, 'groupChats'), groupData);
      
      toast.success(`Group "${data.name}" created!`);
      return { success: true, groupId: groupRef.id, ...groupData };
    } catch (error) {
      console.error('Error creating group chat:', error);
      toast.error('Failed to create group');
      throw error;
    }
  }

  /**
   * Send emergency broadcast (high priority alert to all family members)
   */
  async sendEmergencyBroadcast(data) {
    try {
      const broadcastData = {
        senderId: data.senderId,
        senderName: data.senderName,
        message: data.message,
        type: 'emergency',
        priority: 'urgent',
        recipients: data.recipients, // Array of user IDs
        location: data.location || null,
        createdAt: serverTimestamp(),
        expiresAt: data.expiresAt || null,
        requiresAcknowledgment: true,
        acknowledgments: [] // Track who acknowledged
      };

      const broadcastRef = await addDoc(collection(db, 'broadcasts'), broadcastData);

      // Create individual messages for each recipient
      const messagePromises = data.recipients.map(recipientId =>
        addDoc(collection(db, 'messages'), {
          senderId: data.senderId,
          receiverId: recipientId,
          message: data.message,
          type: 'emergency',
          priority: 'urgent',
          broadcastId: broadcastRef.id,
          read: false,
          createdAt: serverTimestamp(),
          location: data.location || null
        })
      );

      await Promise.all(messagePromises);

      // Send push notifications (if configured)
      await this.sendPushNotifications({
        title: '🚨 EMERGENCY ALERT',
        body: data.message,
        recipients: data.recipients,
        priority: 'high',
        sound: 'emergency'
      });

      toast.success('Emergency broadcast sent to all family members!');
      return { success: true, broadcastId: broadcastRef.id };
    } catch (error) {
      console.error('Error sending emergency broadcast:', error);
      toast.error('Failed to send emergency broadcast');
      throw error;
    }
  }

  /**
   * Schedule a message for future delivery
   */
  async scheduleMessage(data) {
    try {
      const scheduledData = {
        senderId: data.senderId,
        receiverId: data.receiverId,
        groupId: data.groupId || null,
        message: data.message,
        scheduledFor: Timestamp.fromDate(new Date(data.scheduledFor)),
        createdAt: serverTimestamp(),
        status: 'scheduled',
        type: data.type || 'standard',
        attachments: data.attachments || [],
        recurring: data.recurring || null // {frequency: 'daily/weekly/monthly', until: Date}
      };

      const scheduleRef = await addDoc(collection(db, 'scheduledMessages'), scheduledData);
      
      toast.success(`Message scheduled for ${new Date(data.scheduledFor).toLocaleString()}`);
      return { success: true, scheduleId: scheduleRef.id };
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error('Failed to schedule message');
      throw error;
    }
  }

  /**
   * Send location-based message (geofencing)
   */
  async sendLocationMessage(data) {
    try {
      const locationData = {
        senderId: data.senderId,
        message: data.message,
        location: {
          lat: data.location.lat,
          lng: data.location.lng,
          address: data.location.address || null,
          radius: data.location.radius || 100 // meters
        },
        trigger: data.trigger || 'arrive', // 'arrive' or 'leave'
        recipients: data.recipients,
        createdAt: serverTimestamp(),
        expiresAt: data.expiresAt || null,
        triggered: false
      };

      const locationRef = await addDoc(collection(db, 'locationMessages'), locationData);
      
      toast.success('Location-based message created!');
      return { success: true, locationMessageId: locationRef.id };
    } catch (error) {
      console.error('Error creating location message:', error);
      toast.error('Failed to create location message');
      throw error;
    }
  }

  /**
   * Translate message in real-time
   */
  async translateMessage(messageId, targetLanguage) {
    try {
      // Use Google Translate API or AWS Translate
      const messageDoc = await getDoc(doc(db, 'messages', messageId));
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const message = messageDoc.data();
      
      // Call translation API (you'll need to implement this)
      const translatedText = await this.callTranslationAPI(message.message, targetLanguage);

      // Store translation
      await updateDoc(doc(db, 'messages', messageId), {
        translations: {
          ...message.translations,
          [targetLanguage]: translatedText
        }
      });

      return { success: true, translatedText };
    } catch (error) {
      console.error('Error translating message:', error);
      toast.error('Translation failed');
      throw error;
    }
  }

  /**
   * Configure smart notifications
   */
  async updateNotificationSettings(userId, settings) {
    try {
      const notificationSettings = {
        priorityLevels: {
          urgent: settings.urgent ?? { enabled: true, sound: true, vibrate: true },
          high: settings.high ?? { enabled: true, sound: true, vibrate: false },
          normal: settings.normal ?? { enabled: true, sound: false, vibrate: false },
          low: settings.low ?? { enabled: true, sound: false, vibrate: false }
        },
        silentHours: {
          enabled: settings.silentHours?.enabled ?? false,
          start: settings.silentHours?.start ?? '22:00',
          end: settings.silentHours?.end ?? '07:00',
          allowUrgent: settings.silentHours?.allowUrgent ?? true
        },
        digestMode: {
          enabled: settings.digestMode?.enabled ?? false,
          frequency: settings.digestMode?.frequency ?? 'daily', // 'hourly', 'daily', 'weekly'
          time: settings.digestMode?.time ?? '18:00'
        },
        drivingMode: {
          enabled: settings.drivingMode?.enabled ?? false,
          autoReply: settings.drivingMode?.autoReply ?? 'I\'m driving, will reply soon!',
          allowCalls: settings.drivingMode?.allowCalls ?? true
        },
        meetingMode: {
          enabled: settings.meetingMode?.enabled ?? false,
          autoReply: settings.meetingMode?.autoReply ?? 'I\'m in a meeting, will reply later.',
          allowUrgent: settings.meetingMode?.allowUrgent ?? true
        },
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'users', userId), {
        notificationSettings: notificationSettings
      });

      toast.success('Notification settings updated!');
      return { success: true, settings: notificationSettings };
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update settings');
      throw error;
    }
  }

  /**
   * Create a family event with voting
   */
  async createFamilyEvent(data) {
    try {
      const eventData = {
        title: data.title,
        description: data.description || '',
        createdBy: data.createdBy,
        type: data.type || 'event', // 'event', 'task', 'poll'
        proposedDates: data.proposedDates || [], // Array of dates for voting
        location: data.location || null,
        participants: data.participants || [],
        votes: {}, // {userId: {dateIndex, vote}}
        voting: {
          enabled: data.voting ?? false,
          deadline: data.votingDeadline || null,
          type: 'multiple-choice' // 'yes-no', 'multiple-choice', 'ranking'
        },
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const eventRef = await addDoc(collection(db, 'familyEvents'), eventData);
      
      toast.success('Event created! Family members can now vote.');
      return { success: true, eventId: eventRef.id };
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
      throw error;
    }
  }

  /**
   * Delegate task with rewards
   */
  async delegateTask(data) {
    try {
      const taskData = {
        title: data.title,
        description: data.description || '',
        assignedTo: data.assignedTo,
        assignedBy: data.assignedBy,
        dueDate: data.dueDate ? Timestamp.fromDate(new Date(data.dueDate)) : null,
        priority: data.priority || 'normal',
        reward: {
          type: data.reward?.type || 'points', // 'points', 'money', 'privilege'
          amount: data.reward?.amount || 0,
          description: data.reward?.description || ''
        },
        status: 'pending',
        category: data.category || 'general',
        recurring: data.recurring || null,
        createdAt: serverTimestamp(),
        completedAt: null
      };

      const taskRef = await addDoc(collection(db, 'familyTasks'), taskData);
      
      // Send notification to assignee
      await addDoc(collection(db, 'messages'), {
        senderId: data.assignedBy,
        receiverId: data.assignedTo,
        message: `New task assigned: ${data.title}`,
        type: 'task',
        taskId: taskRef.id,
        priority: data.priority,
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success('Task delegated successfully!');
      return { success: true, taskId: taskRef.id };
    } catch (error) {
      console.error('Error delegating task:', error);
      toast.error('Failed to delegate task');
      throw error;
    }
  }

  /**
   * Book a family resource (car, room, etc.)
   */
  async bookResource(data) {
    try {
      const bookingData = {
        resourceId: data.resourceId,
        resourceName: data.resourceName,
        userId: data.userId,
        userName: data.userName,
        startTime: Timestamp.fromDate(new Date(data.startTime)),
        endTime: Timestamp.fromDate(new Date(data.endTime)),
        purpose: data.purpose || '',
        status: 'confirmed',
        createdAt: serverTimestamp()
      };

      // Check for conflicts
      const conflictQuery = query(
        collection(db, 'resourceBookings'),
        where('resourceId', '==', data.resourceId),
        where('status', '==', 'confirmed')
      );
      
      const conflictDocs = await getDocs(conflictQuery);
      const hasConflict = conflictDocs.docs.some(doc => {
        const booking = doc.data();
        const start = booking.startTime.toDate();
        const end = booking.endTime.toDate();
        const requestStart = new Date(data.startTime);
        const requestEnd = new Date(data.endTime);
        
        return (requestStart < end && requestEnd > start);
      });

      if (hasConflict) {
        toast.error('Resource is already booked for this time!');
        return { success: false, error: 'Conflict' };
      }

      const bookingRef = await addDoc(collection(db, 'resourceBookings'), bookingData);
      
      toast.success(`${data.resourceName} booked successfully!`);
      return { success: true, bookingId: bookingRef.id };
    } catch (error) {
      console.error('Error booking resource:', error);
      toast.error('Failed to book resource');
      throw error;
    }
  }

  /**
   * Create meal plan with collaboration
   */
  async createMealPlan(data) {
    try {
      const mealPlanData = {
        createdBy: data.createdBy,
        week: data.week, // Week number
        year: data.year,
        meals: data.meals || {}, // {day: {breakfast, lunch, dinner}}
        shoppingList: data.shoppingList || [],
        assignments: data.assignments || {}, // Who cooks what
        budget: data.budget || null,
        preferences: data.preferences || [],
        restrictions: data.restrictions || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const mealPlanRef = await addDoc(collection(db, 'mealPlans'), mealPlanData);
      
      toast.success('Meal plan created!');
      return { success: true, mealPlanId: mealPlanRef.id };
    } catch (error) {
      console.error('Error creating meal plan:', error);
      toast.error('Failed to create meal plan');
      throw error;
    }
  }

  /**
   * Set up chore rotation automation
   */
  async setupChoreRotation(data) {
    try {
      const rotationData = {
        name: data.name,
        chores: data.chores || [], // Array of chore objects
        members: data.members || [], // Array of user IDs
        rotation: data.rotation || 'weekly', // 'daily', 'weekly', 'monthly'
        startDate: Timestamp.fromDate(new Date(data.startDate)),
        currentAssignments: {},
        history: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const rotationRef = await addDoc(collection(db, 'choreRotations'), rotationData);
      
      // Create initial assignments
      await this.rotateChores(rotationRef.id);
      
      toast.success('Chore rotation set up successfully!');
      return { success: true, rotationId: rotationRef.id };
    } catch (error) {
      console.error('Error setting up chore rotation:', error);
      toast.error('Failed to set up chore rotation');
      throw error;
    }
  }

  /**
   * Rotate chores to next person
   */
  async rotateChores(rotationId) {
    try {
      const rotationDoc = await getDoc(doc(db, 'choreRotations', rotationId));
      if (!rotationDoc.exists()) {
        throw new Error('Rotation not found');
      }

      const rotation = rotationDoc.data();
      const newAssignments = {};

      // Simple rotation algorithm
      rotation.chores.forEach((chore, index) => {
        const memberIndex = index % rotation.members.length;
        newAssignments[chore.id] = rotation.members[memberIndex];
      });

      await updateDoc(doc(db, 'choreRotations', rotationId), {
        currentAssignments: newAssignments,
        history: [
          ...rotation.history,
          {
            assignments: newAssignments,
            date: serverTimestamp()
          }
        ],
        updatedAt: serverTimestamp()
      });

      return { success: true, assignments: newAssignments };
    } catch (error) {
      console.error('Error rotating chores:', error);
      throw error;
    }
  }

  /**
   * Helper: Call translation API (placeholder - implement with actual API)
   */
  async callTranslationAPI(text, targetLanguage) {
    // TODO: Implement with Google Translate API or AWS Translate
    // For now, return original text
    console.log(`Would translate "${text}" to ${targetLanguage}`);
    return text;
  }

  /**
   * Helper: Send push notifications
   */
  async sendPushNotifications(data) {
    // TODO: Implement with FCM or similar
    console.log('Sending push notifications:', data);
    return { success: true };
  }

  /**
   * Listen to group chat messages
   */
  listenToGroupChat(groupId, callback) {
    const messagesQuery = query(
      collection(db, 'groupMessages'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      callback(messages);
    });
  }

  /**
   * Get user's notification settings
   */
  async getNotificationSettings(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      return userDoc.data().notificationSettings || this.getDefaultNotificationSettings();
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return this.getDefaultNotificationSettings();
    }
  }

  /**
   * Get default notification settings
   */
  getDefaultNotificationSettings() {
    return {
      priorityLevels: {
        urgent: { enabled: true, sound: true, vibrate: true },
        high: { enabled: true, sound: true, vibrate: false },
        normal: { enabled: true, sound: false, vibrate: false },
        low: { enabled: true, sound: false, vibrate: false }
      },
      silentHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
        allowUrgent: true
      },
      digestMode: {
        enabled: false,
        frequency: 'daily',
        time: '18:00'
      },
      drivingMode: {
        enabled: false,
        autoReply: 'I\'m driving, will reply soon!',
        allowCalls: true
      },
      meetingMode: {
        enabled: false,
        autoReply: 'I\'m in a meeting, will reply later.',
        allowUrgent: true
      }
    };
  }
}

export default new MessagingService();








