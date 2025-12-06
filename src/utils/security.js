// src/utils/security.js
// Security utilities for sanitization, validation, and protection

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Unsanitized HTML string
 * @param {Object} options - DOMPurify options
 * @returns {string} Sanitized HTML string
 */
export const sanitizeHTML = (dirty, options = {}) => {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };

  return DOMPurify.sanitize(dirty, { ...defaultOptions, ...options });
};

/**
 * Sanitize plain text (removes all HTML)
 * @param {string} text - Text that may contain HTML
 * @returns {string} Plain text
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
};

/**
 * Validate file upload
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'],
  } = options;

  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));
  if (!hasValidExtension) {
    return { valid: false, error: 'Invalid file extension' };
  }

  // Check for malicious file names
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'Invalid file name' };
  }

  return { valid: true };
};

/**
 * Validate URL to prevent malicious links
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe
 */
export const validateURL = (url) => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Only allow http, https, mailto, tel
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Sanitize URL
 * @param {string} url - URL to sanitize
 * @returns {string} Sanitized URL or empty string
 */
export const sanitizeURL = (url) => {
  if (!validateURL(url)) {
    return '';
  }
  return url;
};

/**
 * Rate limiting helper
 * @param {string} key - Unique key for rate limiting
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} True if request is allowed
 */
export const checkRateLimit = (key, maxRequests = 5, windowMs = 15000) => {
  const storageKey = `rateLimit_${key}`;
  const now = Date.now();

  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const requests = data.requests || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter((timestamp) => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add current request
    validRequests.push(now);
    localStorage.setItem(storageKey, JSON.stringify({ requests: validRequests }));
    return true;
  } catch (e) {
    // If localStorage fails, allow the request (fail open)
    return true;
  }
};

/**
 * Generate Content Security Policy headers
 * @returns {string} CSP header string
 */
export const generateCSP = () => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com",
    "frame-src 'self' https://*.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
};

/**
 * Escape special characters for safe HTML attribute values
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export const escapeHTML = (str) => {
  if (!str || typeof str !== 'string') {
    return '';
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
};

