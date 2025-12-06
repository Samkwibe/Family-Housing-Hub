// src/services/notificationService.js
// Push notification service for messaging and app notifications

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import errorLogger from './errorLoggingService';

class NotificationService {
  constructor() {
    this.messaging = null;
    this.fcmToken = null;
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Initialize Firebase Cloud Messaging
   * @returns {Promise<string|null>} FCM token or null
   */
  async initialize() {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return null;
    }

    try {
      const app = getApp();
      this.messaging = getMessaging(app);

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Get FCM token
      const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
      if (!vapidKey) {
        console.warn('FCM VAPID key not configured');
        return null;
      }

      this.fcmToken = await getToken(this.messaging, { vapidKey });
      
      if (this.fcmToken) {
        console.log('FCM token obtained:', this.fcmToken);
        // Store token in localStorage for later use
        localStorage.setItem('fcmToken', this.fcmToken);
        return this.fcmToken;
      }

      return null;
    } catch (error) {
      errorLogger.logError(error, {
        component: 'NotificationService',
        action: 'initialize',
      });
      console.error('Error initializing FCM:', error);
      return null;
    }
  }

  /**
   * Set up message listener for foreground notifications
   * @param {Function} callback - Callback function when message is received
   */
  setupMessageListener(callback) {
    if (!this.messaging) {
      console.warn('Messaging not initialized');
      return;
    }

    onMessage(this.messaging, (payload) => {
      console.log('Message received:', payload);
      
      // Show browser notification
      if (payload.notification) {
        this.showBrowserNotification(
          payload.notification.title,
          payload.notification.body,
          payload.notification.icon,
          payload.data
        );
      }

      // Call custom callback
      if (callback) {
        callback(payload);
      }
    });
  }

  /**
   * Show browser notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {string} icon - Icon URL
   * @param {Object} data - Additional data
   */
  showBrowserNotification(title, body, icon, data = {}) {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: icon || '/vite.svg',
      badge: '/vite.svg',
      tag: data.messageId || 'notification',
      data,
      requireInteraction: data.urgent || false,
      silent: data.silent || false,
    });

    // Handle click
    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      
      // Handle navigation if URL provided
      if (data.url) {
        window.location.href = data.url;
      }

      notification.close();
    };

    // Auto close after 5 seconds (unless urgent)
    if (!data.urgent) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  /**
   * Send local notification (for testing or offline)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} options - Notification options
   */
  sendLocalNotification(title, body, options = {}) {
    if (!this.isSupported) {
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.showBrowserNotification(title, body, options.icon, options.data);
        }
      });
    } else if (Notification.permission === 'granted') {
      this.showBrowserNotification(title, body, options.icon, options.data);
    }
  }

  /**
   * Get FCM token
   * @returns {string|null} FCM token
   */
  getToken() {
    return this.fcmToken || localStorage.getItem('fcmToken');
  }

  /**
   * Check if notifications are enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.isSupported && Notification.permission === 'granted';
  }

  /**
   * Request notification permission
   * @returns {Promise<string>} Permission status
   */
  async requestPermission() {
    if (!this.isSupported) {
      return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Send notification for new message
   * @param {Object} messageData - Message data
   */
  notifyNewMessage(messageData) {
    const { senderName, message, conversationId } = messageData;
    
    this.sendLocalNotification(
      `New message from ${senderName || 'Someone'}`,
      message || 'You have a new message',
      {
        icon: messageData.senderPhotoURL,
        data: {
          type: 'message',
          conversationId,
          messageId: messageData.id,
          url: `/messages?conversation=${conversationId}`,
        },
      }
    );
  }

  /**
   * Send notification for emergency broadcast
   * @param {Object} broadcastData - Broadcast data
   */
  notifyEmergency(broadcastData) {
    this.sendLocalNotification(
      '🚨 EMERGENCY ALERT',
      broadcastData.message || 'Emergency notification',
      {
        icon: '/vite.svg',
        data: {
          type: 'emergency',
          broadcastId: broadcastData.id,
          urgent: true,
          url: '/messages',
        },
        requireInteraction: true,
      }
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;

