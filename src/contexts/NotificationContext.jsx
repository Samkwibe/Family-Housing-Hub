// src/contexts/NotificationContext.jsx - Enhanced Notification System
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Load notifications from Firestore
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Set up real-time listener for notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
        setLoading(false);

        // Show toast for new notifications
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && !change.doc.data().read) {
            const data = change.doc.data();
            if (data.showToast !== false) {
              toast(data.message || data.title, {
                icon: getNotificationEmoji(data.type),
                duration: 4000
              });
            }
          }
        });
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        setLoading(false);
        // Fall back to local notifications if Firestore fails
        loadDefaultNotifications();
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Get emoji for notification type
  const getNotificationEmoji = (type) => {
    switch (type) {
      case 'maintenance': return '🔧';
      case 'rent': return '💰';
      case 'message': return '💬';
      case 'document': return '📄';
      case 'alert': return '⚠️';
      case 'calendar': return '📅';
      case 'health': return '❤️';
      case 'success': return '✅';
      default: return '🔔';
    }
  };

  // Load default notifications (fallback)
  const loadDefaultNotifications = () => {
    const defaultNotifs = [
      {
        id: 'welcome',
        type: 'info',
        title: 'Welcome to FamilyHub!',
        message: 'Complete your profile to get personalized resources.',
        timestamp: new Date(),
        read: false
      }
    ];
    setNotifications(defaultNotifs);
    setUnreadCount(1);
  };

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Update locally first for instant feedback
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Update in Firestore if it's not a local-only notification
      if (currentUser && !notificationId.toString().startsWith('local_')) {
        await updateDoc(doc(db, 'notifications', notificationId), {
          read: true,
          readAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [currentUser]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);

      // Update all in Firestore
      if (currentUser) {
        const unreadNotifs = notifications.filter(n => !n.read);
        await Promise.all(
          unreadNotifs.map(notif => 
            updateDoc(doc(db, 'notifications', notif.id), {
              read: true,
              readAt: serverTimestamp()
            }).catch(() => {}) // Ignore errors for individual updates
          )
        );
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [currentUser, notifications]);

  // Add new notification
  const addNotification = useCallback(async (notification) => {
    const newNotif = {
      userId: currentUser?.uid,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      read: false,
      timestamp: serverTimestamp(),
      priority: notification.priority || 'normal',
      link: notification.link || null,
      showToast: notification.showToast !== false
    };

    try {
      if (currentUser) {
        await addDoc(collection(db, 'notifications'), newNotif);
      } else {
        // Local only notification
        const localNotif = {
          id: `local_${Date.now()}`,
          ...newNotif,
          timestamp: new Date()
        };
        setNotifications(prev => [localNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error adding notification:', error);
      // Add locally as fallback
      const localNotif = {
        id: `local_${Date.now()}`,
        ...newNotif,
        timestamp: new Date()
      };
      setNotifications(prev => [localNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    }
  }, [currentUser]);

  // Clear a notification
  const clearNotification = useCallback(async (notificationId) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (currentUser && !notificationId.toString().startsWith('local_')) {
        await deleteDoc(doc(db, 'notifications', notificationId));
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  }, [currentUser]);

  // Clear all notifications
  const clearAllNotifications = useCallback(async () => {
    try {
      if (currentUser) {
        const notifIds = notifications.map(n => n.id);
        await Promise.all(
          notifIds.map(id => 
            deleteDoc(doc(db, 'notifications', id)).catch(() => {})
          )
        );
      }
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }, [currentUser, notifications]);

  // Notify for specific events
  const notifyRentDue = useCallback((daysUntilDue, amount) => {
    addNotification({
      type: 'rent',
      title: 'Rent Payment Reminder',
      message: `Your rent of $${amount} is due in ${daysUntilDue} days.`,
      priority: daysUntilDue <= 3 ? 'high' : 'normal'
    });
  }, [addNotification]);

  const notifyMaintenanceUpdate = useCallback((title, status) => {
    addNotification({
      type: 'maintenance',
      title: 'Maintenance Update',
      message: `Your request "${title}" has been ${status}.`,
      priority: 'normal'
    });
  }, [addNotification]);

  const notifyNewMessage = useCallback((from, subject) => {
    addNotification({
      type: 'message',
      title: 'New Message',
      message: `${from}: ${subject}`,
      priority: 'normal'
    });
  }, [addNotification]);

  const notifyDocumentExpiring = useCallback((docName, daysUntilExpiry) => {
    addNotification({
      type: 'document',
      title: 'Document Expiring Soon',
      message: `Your "${docName}" expires in ${daysUntilExpiry} days.`,
      priority: daysUntilExpiry <= 7 ? 'high' : 'normal'
    });
  }, [addNotification]);

  const notifyAppointment = useCallback((title, date) => {
    addNotification({
      type: 'calendar',
      title: 'Upcoming Appointment',
      message: `${title} on ${new Date(date).toLocaleDateString()}`,
      priority: 'normal'
    });
  }, [addNotification]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotification,
    clearAllNotifications,
    // Event-specific notifiers
    notifyRentDue,
    notifyMaintenanceUpdate,
    notifyNewMessage,
    notifyDocumentExpiring,
    notifyAppointment
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
