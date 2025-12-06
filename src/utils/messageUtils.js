// src/utils/messageUtils.js
// Utility functions for messaging features

import { validateFileUpload } from './security';

/**
 * Validate and process file for message attachment
 * @param {File} file - File to validate
 * @returns {Promise<Object>} Processed file data or error
 */
export const processMessageFile = async (file) => {
  // Validate file
  const validation = validateFileUpload(file, {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx',
    ],
  });

  if (!validation.valid) {
    return { error: validation.error };
  }

  // Determine file type
  let fileType = 'file';
  if (file.type.startsWith('image/')) {
    fileType = 'image';
  } else if (file.type.startsWith('video/')) {
    fileType = 'video';
  } else if (file.type.startsWith('audio/')) {
    fileType = 'audio';
  }

  // Create preview if image
  let preview = null;
  if (fileType === 'image') {
    preview = URL.createObjectURL(file);
  }

  return {
    file,
    type: fileType,
    name: file.name,
    size: file.size,
    preview,
    mimeType: file.type,
  };
};

/**
 * Search messages by text
 * @param {Array} messages - Array of message objects
 * @param {string} query - Search query
 * @returns {Array} Filtered messages
 */
export const searchMessages = (messages, query) => {
  if (!query || !query.trim()) {
    return messages;
  }

  const searchTerm = query.toLowerCase().trim();
  
  return messages.filter((message) => {
    // Search in message text
    if (message.message && message.message.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in sender name
    if (message.senderName && message.senderName.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // Search in attachment names
    if (message.attachments && Array.isArray(message.attachments)) {
      return message.attachments.some(
        (att) => att.name && att.name.toLowerCase().includes(searchTerm)
      );
    }

    return false;
  });
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get file icon based on type
 * @param {string} type - File type
 * @returns {string} Icon name
 */
export const getFileIcon = (type) => {
  if (type === 'image') return 'Image';
  if (type === 'video') return 'Video';
  if (type === 'audio') return 'Mic';
  if (type === 'pdf') return 'FileText';
  return 'File';
};

/**
 * Check if message is unread
 * @param {Object} message - Message object
 * @param {string} currentUserId - Current user ID
 * @returns {boolean} True if unread
 */
export const isMessageUnread = (message, currentUserId) => {
  if (!message) return false;
  if (message.senderId === currentUserId) return false;
  return !message.read || message.read === false;
};

/**
 * Group messages by date
 * @param {Array} messages - Array of message objects
 * @returns {Object} Grouped messages by date
 */
export const groupMessagesByDate = (messages) => {
  const grouped = {};
  
  messages.forEach((message) => {
    const date = message.createdAt?.toDate 
      ? message.createdAt.toDate() 
      : new Date(message.createdAt || message.sentAt);
    const dateKey = date.toDateString();
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(message);
  });
  
  return grouped;
};

/**
 * Format relative time
 * @param {Date|Timestamp} date - Date to format
 * @returns {string} Formatted time
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const messageDate = date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  const diffMs = now - messageDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return messageDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

