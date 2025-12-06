// src/components/MessageSearch.jsx
// Advanced message search component

import React, { useState, useMemo } from 'react';
import { Search, X, Filter, Calendar, User, FileText } from 'lucide-react';
import { searchMessages, formatRelativeTime } from '../utils/messageUtils';

const MessageSearch = ({ messages, onSelectMessage, onClose }) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, text, files, images
  const [filterDate, setFilterDate] = useState('all'); // all, today, week, month

  const filteredMessages = useMemo(() => {
    let results = messages;

    // Apply text search
    if (query.trim()) {
      results = searchMessages(results, query);
    }

    // Apply type filter
    if (filterType !== 'all') {
      results = results.filter((msg) => {
        if (filterType === 'files' && msg.attachments) {
          return msg.attachments.some((att) => att.type !== 'image');
        }
        if (filterType === 'images' && msg.attachments) {
          return msg.attachments.some((att) => att.type === 'image');
        }
        if (filterType === 'text') {
          return msg.message && !msg.attachments;
        }
        return true;
      });
    }

    // Apply date filter
    if (filterDate !== 'all') {
      const now = new Date();
      const filterDateMap = {
        today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      };
      const filterDateValue = filterDateMap[filterDate];
      
      results = results.filter((msg) => {
        const msgDate = msg.createdAt?.toDate 
          ? msg.createdAt.toDate() 
          : new Date(msg.createdAt || msg.sentAt);
        return msgDate >= filterDateValue;
      });
    }

    return results;
  }, [messages, query, filterType, filterDate]);

  const handleSelectMessage = (message) => {
    if (onSelectMessage) {
      onSelectMessage(message);
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Messages</option>
              <option value="text">Text Only</option>
              <option value="files">Files</option>
              <option value="images">Images</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages found</p>
              {query && <p className="text-sm mt-2">Try a different search term</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {message.senderPhotoURL ? (
                        <img
                          src={message.senderPhotoURL}
                          alt={message.senderName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {message.senderName || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatRelativeTime(message.createdAt || message.sentAt)}
                        </p>
                      </div>
                      {message.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {message.message}
                        </p>
                      )}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} found
        </div>
      </div>
    </div>
  );
};

export default MessageSearch;

