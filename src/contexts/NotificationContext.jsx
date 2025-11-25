// src/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
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
  const { currentUser } = useAuth();

  // Simulate receiving notifications (in real app, this would be from Firebase)
  useEffect(() => {
    if (!currentUser) return;

    const mockNotifications = [
      {
        id: 1,
        type: 'maintenance',
        title: 'Maintenance Update',
        message: 'Your repair request has been scheduled',
        timestamp: new Date(),
        read: false
      },
      {
        id: 2,
        type: 'rent',
        title: 'Rent Reminder',
        message: 'Rent payment due in 3 days',
        timestamp: new Date(Date.now() - 86400000),
        read: false
      }
    ];

    setNotifications(mockNotifications);
    setUnreadCount(mockNotifications.filter(n => !n.read).length);
  }, [currentUser]);

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast for important notifications
    if (notification.priority === 'high') {
      toast(notification.message, {
        icon: '🔔',
        duration: 6000
      });
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};