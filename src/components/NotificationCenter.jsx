// src/components/NotificationCenter.jsx - Notification Center Component
import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Wrench,
  DollarSign,
  MessageCircle,
  FileText,
  AlertTriangle,
  Calendar,
  Heart,
  Trash2,
  Clock
} from 'lucide-react';

// Get icon based on notification type
const getNotificationIcon = (type) => {
  switch (type) {
    case 'maintenance':
      return { icon: Wrench, color: 'bg-orange-100 text-orange-600' };
    case 'rent':
      return { icon: DollarSign, color: 'bg-green-100 text-green-600' };
    case 'message':
      return { icon: MessageCircle, color: 'bg-blue-100 text-blue-600' };
    case 'document':
      return { icon: FileText, color: 'bg-purple-100 text-purple-600' };
    case 'alert':
      return { icon: AlertTriangle, color: 'bg-red-100 text-red-600' };
    case 'calendar':
      return { icon: Calendar, color: 'bg-indigo-100 text-indigo-600' };
    case 'health':
      return { icon: Heart, color: 'bg-pink-100 text-pink-600' };
    default:
      return { icon: Bell, color: 'bg-gray-100 text-gray-600' };
  }
};

// Format time ago
const formatTimeAgo = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
};

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors relative"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Notifications</h3>
                  <p className="text-blue-100 text-sm">
                    {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => {
                    const { icon: Icon, color } = getNotificationIcon(notification.type);

                    return (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                          !notification.read ? 'bg-blue-50/50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-xl ${color} flex-shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-medium text-gray-900 ${!notification.read ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No notifications</p>
                  <p className="text-gray-400 text-sm">You're all caught up!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    // Could navigate to a full notifications page
                    setIsOpen(false);
                  }}
                  className="w-full text-center text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

