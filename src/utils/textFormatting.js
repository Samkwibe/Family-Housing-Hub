// src/utils/textFormatting.js
// Text formatting utilities for rich text in messages

import { sanitizeHTML, validateURL } from './security';

/**
 * Extract URLs from text
 * @param {string} text - Text to extract URLs from
 * @returns {Array} Array of URL objects with start, end, and url
 */
export const extractURLs = (text) => {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (validateURL(match[0])) {
      urls.push({
        url: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return urls;
};

/**
 * Format text with links, mentions, and basic formatting
 * @param {string} text - Text to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted HTML
 */
export const formatMessageText = (text, options = {}) => {
  if (!text) return '';

  const {
    linkify = true,
    mentionify = true,
    preserveLineBreaks = true,
  } = options;

  let formatted = sanitizeHTML(text);

  // Preserve line breaks
  if (preserveLineBreaks) {
    formatted = formatted.replace(/\n/g, '<br>');
  }

  // Convert URLs to links
  if (linkify) {
    const urls = extractURLs(text);
    // Process in reverse to maintain indices
    urls.reverse().forEach(({ url, start, end }) => {
      const before = formatted.substring(0, start);
      const after = formatted.substring(end);
      formatted = `${before}<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${url}</a>${after}`;
    });
  }

  // Convert @mentions (if mentionify is enabled)
  if (mentionify) {
    const mentionRegex = /@(\w+)/g;
    formatted = formatted.replace(mentionRegex, '<span class="font-semibold text-blue-600 dark:text-blue-400">@$1</span>');
  }

  // Convert **bold** and *italic*
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return formatted;
};

/**
 * Detect if text contains only URLs
 * @param {string} text - Text to check
 * @returns {boolean} True if text is only URLs
 */
export const isOnlyURLs = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  const urls = extractURLs(trimmed);
  if (urls.length === 0) return false;
  
  // Check if text is only URLs (with optional whitespace)
  const urlText = urls.map(u => u.url).join(' ');
  return trimmed.replace(/\s+/g, ' ').trim() === urlText.replace(/\s+/g, ' ').trim();
};

/**
 * Extract mentions from text
 * @param {string} text - Text to extract mentions from
 * @returns {Array} Array of mention usernames
 */
export const extractMentions = (text) => {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
};

/**
 * Highlight search terms in text
 * @param {string} text - Text to highlight
 * @param {string} searchTerm - Term to highlight
 * @returns {string} Text with highlighted terms
 */
export const highlightSearchTerm = (text, searchTerm) => {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>');
};

