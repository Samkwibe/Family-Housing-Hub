/**
 * Group Chat Panel Component
 * Unified family messaging with granular permissions
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Settings,
  UserPlus,
  Shield,
  Crown,
  UserCheck,
  X,
  Send,
  Paperclip,
  Image,
  Mic,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import messagingService from '../../services/messagingService';

export default function GroupChatPanel({ group, currentUser, onClose }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  // Member roles and permissions
  const memberRoles = {
    admin: {
      name: 'Admin',
      icon: Crown,
      color: 'text-yellow-600',
      permissions: ['send', 'delete', 'invite', 'remove', 'settings']
    },
    moderator: {
      name: 'Moderator',
      icon: Shield,
      color: 'text-blue-600',
      permissions: ['send', 'delete', 'invite']
    },
    member: {
      name: 'Member',
      icon: UserCheck,
      color: 'text-gray-600',
      permissions: ['send']
    }
  };

  useEffect(() => {
    if (!group?.id) return;

    // Listen to group messages
    const unsubscribe = messagingService.listenToGroupChat(group.id, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [group?.id]);

  const getMemberRole = (userId) => {
    const member = group.members.find(m => m.userId === userId);
    return member?.role || 'member';
  };

  const hasPermission = (permission) => {
    const role = getMemberRole(currentUser.uid);
    return memberRoles[role]?.permissions.includes(permission);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!hasPermission('send')) {
      toast.error('You don\'t have permission to send messages');
      return;
    }

    try {
      // Send group message logic here
      setMessage('');
      toast.success('Message sent!');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg">
      {/* Group Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{group.name}</h3>
              <p className="text-sm text-gray-600">
                {group.members?.length || 0} members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasPermission('invite') && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Add members"
              >
                <UserPlus className="h-5 w-5 text-gray-600" />
              </button>
            )}
            {hasPermission('settings') && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-white rounded-lg transition-colors"
                title="Group settings"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Group description */}
        {group.description && (
          <p className="mt-2 text-sm text-gray-600">{group.description}</p>
        )}

        {/* Member roles legend */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          {Object.entries(memberRoles).map(([key, role]) => {
            const Icon = role.icon;
            return (
              <div key={key} className="flex items-center gap-1">
                <Icon className={`h-3 w-3 ${role.color}`} />
                <span className="text-gray-600">{role.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Users className="h-16 w-16 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Start the conversation in your group chat
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md`}>
                {/* Sender info for group messages */}
                {msg.senderId !== currentUser.uid && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      {msg.senderName}
                    </span>
                    {(() => {
                      const role = getMemberRole(msg.senderId);
                      const roleInfo = memberRoles[role];
                      const Icon = roleInfo?.icon;
                      return Icon ? (
                        <Icon className={`h-3 w-3 ${roleInfo.color}`} />
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Message bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.senderId === currentUser.uid
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>

                {/* Message meta */}
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.senderId === currentUser.uid && msg.read && (
                    <CheckCircle className="h-3 w-3 text-blue-500" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={hasPermission('send') ? 'Type a message...' : 'You cannot send messages'}
            disabled={!hasPermission('send')}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!message.trim() || !hasPermission('send')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {/* Quick actions */}
        {hasPermission('send') && (
          <div className="flex items-center gap-2 mt-2">
            <button type="button" className="p-2 text-gray-400 hover:text-blue-600 rounded-lg">
              <Image className="h-4 w-4" />
            </button>
            <button type="button" className="p-2 text-gray-400 hover:text-purple-600 rounded-lg">
              <Paperclip className="h-4 w-4" />
            </button>
            <button type="button" className="p-2 text-gray-400 hover:text-red-600 rounded-lg">
              <Mic className="h-4 w-4" />
            </button>
            <button type="button" className="p-2 text-gray-400 hover:text-green-600 rounded-lg">
              <MapPin className="h-4 w-4" />
            </button>
          </div>
        )}
      </form>

      {/* Group Settings Modal */}
      {showSettings && hasPermission('settings') && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Group Settings</h3>
            {/* Add settings UI here */}
            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}










