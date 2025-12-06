// src/components/MessageReactions.jsx
// Message reactions component with emoji picker

import React, { useState } from 'react';
import { Smile, X } from 'lucide-react';

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

const MessageReactions = ({ message, currentUserId, onAddReaction, onRemoveReaction }) => {
  const [showPicker, setShowPicker] = useState(false);
  const reactions = message.reactions || {};

  const handleReactionClick = (emoji) => {
    const userReaction = Object.entries(reactions).find(
      ([userId, e]) => userId === currentUserId && e === emoji
    );

    if (userReaction) {
      // Remove reaction
      onRemoveReaction(message.id, currentUserId, emoji);
    } else {
      // Add reaction
      onAddReaction(message.id, currentUserId, emoji);
    }
    setShowPicker(false);
  };

  // Count reactions by emoji
  const reactionCounts = {};
  Object.values(reactions).forEach((emoji) => {
    reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
  });

  const userHasReacted = (emoji) => {
    return Object.entries(reactions).some(
      ([userId, e]) => userId === currentUserId && e === emoji
    );
  };

  return (
    <div className="relative">
      {/* Reaction Button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Add reaction"
      >
        <Smile className="h-4 w-4 text-gray-400" />
      </button>

      {/* Reaction Picker */}
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50">
          <div className="flex gap-1">
            {COMMON_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={`w-8 h-8 text-lg hover:scale-125 transition-transform rounded ${
                  userHasReacted(emoji)
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="absolute top-1 right-1 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Display Reactions */}
      {Object.keys(reactionCounts).length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                userHasReacted(emoji)
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <span>{emoji}</span>
              {count > 1 && <span className="ml-1">{count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;

