// src/components/MessageActions.jsx
// Comprehensive message actions menu

import React, { useState } from 'react';
import {
  MoreVertical,
  Reply,
  Forward,
  Copy,
  Trash2,
  Pin,
  Star,
  Calendar,
  Download,
  Share2,
  Edit,
  Archive,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MessageActions = ({
  message,
  isOwnMessage,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onPin,
  onStar,
  onSchedule,
  onEdit,
  onDownload,
  onShare,
  onArchive,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleCopy = () => {
    if (message.message) {
      navigator.clipboard.writeText(message.message);
      toast.success('Message copied to clipboard');
      setShowMenu(false);
      if (onCopy) onCopy(message);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Message from ${message.senderName || 'Someone'}`,
          text: message.message,
          url: window.location.href,
        });
        setShowMenu(false);
        if (onShare) onShare(message);
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  const actions = [
    {
      icon: Reply,
      label: 'Reply',
      onClick: () => {
        setShowMenu(false);
        if (onReply) onReply(message);
      },
      show: true,
    },
    {
      icon: Forward,
      label: 'Forward',
      onClick: () => {
        setShowMenu(false);
        if (onForward) onForward(message);
      },
      show: true,
    },
    {
      icon: Copy,
      label: 'Copy',
      onClick: handleCopy,
      show: !!message.message,
    },
    {
      icon: Pin,
      label: message.pinned ? 'Unpin' : 'Pin',
      onClick: () => {
        setShowMenu(false);
        if (onPin) onPin(message);
      },
      show: true,
    },
    {
      icon: Star,
      label: message.starred ? 'Unstar' : 'Star',
      onClick: () => {
        setShowMenu(false);
        if (onStar) onStar(message);
      },
      show: true,
    },
    {
      icon: Calendar,
      label: 'Schedule Reply',
      onClick: () => {
        setShowMenu(false);
        if (onSchedule) onSchedule(message);
      },
      show: true,
    },
    {
      icon: Download,
      label: 'Download',
      onClick: () => {
        setShowMenu(false);
        if (onDownload) onDownload(message);
      },
      show: message.attachments && message.attachments.length > 0,
    },
    {
      icon: Share2,
      label: 'Share',
      onClick: handleShare,
      show: true,
    },
    {
      icon: Edit,
      label: 'Edit',
      onClick: () => {
        setShowMenu(false);
        if (onEdit) onEdit(message);
      },
      show: isOwnMessage && !!message.message,
    },
    {
      icon: Archive,
      label: 'Archive',
      onClick: () => {
        setShowMenu(false);
        if (onArchive) onArchive(message);
      },
      show: true,
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: () => {
        setShowMenu(false);
        if (onDelete) onDelete(message);
      },
      show: isOwnMessage,
      danger: true,
    },
  ].filter((action) => action.show);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        title="More actions"
      >
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[180px]">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    action.danger
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MessageActions;

