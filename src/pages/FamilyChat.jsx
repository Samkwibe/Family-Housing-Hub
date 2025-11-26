// src/pages/FamilyChat.jsx - Family Communication Hub
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle,
  Send,
  Image,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Users,
  Plus,
  X,
  Search,
  Check,
  CheckCheck,
  Clock,
  Heart,
  ThumbsUp,
  Star,
  Pin,
  Trash2,
  Reply,
  Forward,
  Copy,
  Bell,
  BellOff,
  Settings,
  Edit3,
  Mic,
  Camera,
  File,
  ChevronDown,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Quick reactions
const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

// Message categories
const CHAT_CATEGORIES = [
  { id: 'family', label: 'Family Chat', icon: Users, color: 'bg-blue-500' },
  { id: 'important', label: 'Important', icon: Star, color: 'bg-yellow-500' },
  { id: 'reminders', label: 'Reminders', icon: Bell, color: 'bg-purple-500' },
  { id: 'shopping', label: 'Shopping', icon: MessageCircle, color: 'bg-green-500' }
];

export default function FamilyChat() {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('family');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    
    // Set up real-time listener
    const q = query(
      collection(db, 'familyChat'),
      where('userId', '==', currentUser.uid),
      where('category', '==', selectedCategory)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      setMessages(msgs);
      setPinnedMessages(msgs.filter(m => m.pinned));
      setLoading(false);
    }, (error) => {
      console.error('Error loading messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedCategory]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const messageData = {
        userId: currentUser.uid,
        senderName: userProfile?.firstName || 'You',
        senderAvatar: userProfile?.avatarColor || '#3B82F6',
        content: newMessage,
        category: selectedCategory,
        timestamp: serverTimestamp(),
        reactions: {},
        pinned: false,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content.slice(0, 50),
          senderName: replyingTo.senderName
        } : null
      };

      await addDoc(collection(db, 'familyChat'), messageData);
      
      setNewMessage('');
      setReplyingTo(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Add reaction
  const handleReaction = async (messageId, emoji) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = { ...message.reactions };
      const userKey = currentUser.uid;

      if (reactions[userKey] === emoji) {
        delete reactions[userKey];
      } else {
        reactions[userKey] = emoji;
      }

      await updateDoc(doc(db, 'familyChat', messageId), { reactions });
      setShowReactions(null);
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  // Pin message
  const handlePin = async (messageId, currentPinned) => {
    try {
      await updateDoc(doc(db, 'familyChat', messageId), { pinned: !currentPinned });
      toast.success(currentPinned ? 'Message unpinned' : 'Message pinned');
    } catch (error) {
      toast.error('Failed to pin message');
    }
  };

  // Delete message
  const handleDelete = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    
    try {
      await deleteDoc(doc(db, 'familyChat', messageId));
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  // Copy message
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied!');
  };

  // Format time
  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (messageDate.toDateString() === new Date(now - 86400000).toDateString()) {
      return 'Yesterday ' + messageDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get reaction counts
  const getReactionCounts = (reactions) => {
    const counts = {};
    Object.values(reactions || {}).forEach(emoji => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return counts;
  };

  // Filter messages by search
  const filteredMessages = searchQuery
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Get category info
  const getCategoryInfo = (id) => CHAT_CATEGORIES.find(c => c.id === id) || CHAT_CATEGORIES[0];
  const currentCategory = getCategoryInfo(selectedCategory);

  return (
    <div className="p-6 max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 ${currentCategory.color} rounded-2xl shadow-lg`}>
            <currentCategory.icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{currentCategory.label}</h1>
            <p className="text-sm text-gray-500">{messages.length} messages</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinned(!showPinned)}
              className={`p-2 rounded-lg transition-colors ${showPinned ? 'bg-yellow-100 text-yellow-600' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Pinned messages"
            >
              <Pin className="h-5 w-5" />
              <span className="text-xs ml-1">{pinnedMessages.length}</span>
            </button>
          )}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CHAT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedCategory === cat.id
                ? `${cat.color} text-white shadow-lg`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Pinned Messages */}
      {showPinned && pinnedMessages.length > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700 flex items-center gap-1">
              <Pin className="h-4 w-4" />
              Pinned Messages
            </span>
            <button onClick={() => setShowPinned(false)} className="text-yellow-600">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {pinnedMessages.slice(0, 3).map((msg) => (
              <div key={msg.id} className="bg-white rounded-lg p-2 text-sm">
                <span className="font-medium text-gray-900">{msg.senderName}: </span>
                <span className="text-gray-600">{msg.content.slice(0, 50)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMessages.length > 0 ? (
            <>
              {filteredMessages.map((message, index) => {
                const isOwn = message.senderName === (userProfile?.firstName || 'You');
                const reactions = getReactionCounts(message.reactions);
                const showDateDivider = index === 0 || 
                  (message.timestamp && filteredMessages[index - 1]?.timestamp &&
                   message.timestamp.toDateString() !== filteredMessages[index - 1].timestamp.toDateString());

                return (
                  <React.Fragment key={message.id}>
                    {showDateDivider && message.timestamp && (
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                          {message.timestamp.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                    )}

                    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
                        {/* Reply Preview */}
                        {message.replyTo && (
                          <div className={`mb-1 px-3 py-1 rounded-lg bg-gray-100 text-xs ${isOwn ? 'text-right' : 'text-left'}`}>
                            <span className="text-gray-500">↩ {message.replyTo.senderName}: </span>
                            <span className="text-gray-600">{message.replyTo.content}...</span>
                          </div>
                        )}

                        <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          {!isOwn && (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                              style={{ backgroundColor: message.senderAvatar || '#3B82F6' }}
                            >
                              {message.senderName?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}

                          <div>
                            {/* Sender Name */}
                            {!isOwn && (
                              <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
                            )}

                            {/* Message Bubble */}
                            <div className="relative">
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isOwn
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-white border border-gray-200 rounded-bl-md shadow-sm'
                                } ${message.pinned ? 'ring-2 ring-yellow-400' : ''}`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>

                              {/* Pinned indicator */}
                              {message.pinned && (
                                <Pin className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                              )}

                              {/* Reactions */}
                              {Object.keys(reactions).length > 0 && (
                                <div className={`absolute -bottom-3 ${isOwn ? 'left-0' : 'right-0'} flex gap-1`}>
                                  {Object.entries(reactions).map(([emoji, count]) => (
                                    <span
                                      key={emoji}
                                      className="bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm"
                                    >
                                      {emoji} {count > 1 && count}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Time & Actions */}
                            <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-gray-400">{formatTime(message.timestamp)}</span>
                              
                              {/* Message Actions */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="React"
                                >
                                  <Smile className="h-3 w-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(message);
                                    inputRef.current?.focus();
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Reply"
                                >
                                  <Reply className="h-3 w-3 text-gray-400" />
                                </button>
                                <button
                                  onClick={() => handlePin(message.id, message.pinned)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title={message.pinned ? 'Unpin' : 'Pin'}
                                >
                                  <Pin className={`h-3 w-3 ${message.pinned ? 'text-yellow-500' : 'text-gray-400'}`} />
                                </button>
                                <button
                                  onClick={() => handleCopy(message.content)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Copy"
                                >
                                  <Copy className="h-3 w-3 text-gray-400" />
                                </button>
                                {isOwn && (
                                  <button
                                    onClick={() => handleDelete(message.id)}
                                    className="p-1 hover:bg-red-100 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-400" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Reaction Picker */}
                            {showReactions === message.id && (
                              <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} mt-1 bg-white rounded-full shadow-lg border border-gray-200 p-1 flex gap-1 z-10`}>
                                {REACTIONS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(message.id, emoji)}
                                    className="w-8 h-8 hover:bg-gray-100 rounded-full transition-transform hover:scale-125"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400">Start the conversation!</p>
              </div>
            </div>
          )}
        </div>

        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Replying to <strong>{replyingTo.senderName}</strong>: {replyingTo.content.slice(0, 30)}...
              </span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-blue-600 hover:text-blue-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-3">
            {/* Attachment Button */}
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
              
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border border-gray-200 p-2 min-w-[140px] z-10">
                  <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                    <Image className="h-4 w-4 text-green-600" />
                    Photo
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                    <Camera className="h-4 w-4 text-blue-600" />
                    Camera
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                    <File className="h-4 w-4 text-orange-600" />
                    Document
                  </button>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="w-full px-4 py-3 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

