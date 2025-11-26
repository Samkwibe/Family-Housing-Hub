// src/pages/Messages.jsx - Real User-to-User Messaging System
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Send,
  User,
  Building,
  MessageCircle,
  Clock,
  CheckCircle,
  CheckCheck,
  Phone,
  Mail,
  MoreVertical,
  Paperclip,
  Smile,
  Search,
  Star,
  Archive,
  Trash2,
  Plus,
  ChevronRight,
  AlertCircle,
  Bell,
  MapPin,
  Navigation,
  Image as ImageIcon,
  FileText,
  Video,
  Mic,
  X,
  Eye,
  EyeOff,
  Pin,
  Reply,
  Forward,
  Copy,
  Download,
  Share2,
  Settings,
  Users,
  Globe,
  Camera,
  File,
  Music,
  Film,
  Link as LinkIcon,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  ImagePlus,
  XCircle,
  Play,
  Pause,
  Volume2,
  UserPlus,
  UserCheck,
  UserX
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  serverTimestamp,
  Timestamp,
  or,
  and
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { messageService } from '../services/firebaseService';

// Message status icons
const MessageStatus = ({ status, readAt }) => {
  if (status === 'sending') {
    return <Clock className="h-3 w-3 text-gray-400" />;
  }
  if (status === 'sent' && !readAt) {
    return <CheckCircle className="h-3 w-3 text-gray-400" />;
  }
  if (status === 'sent' && readAt) {
    return <CheckCheck className="h-3 w-3 text-blue-500" />;
  }
  return null;
};

// Emoji picker component
const EmojiPicker = ({ onSelect, onClose }) => {
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '👍', '👎', '❤️', '💖', '💗', '💓', '💞', '💕', '💯', '🔥'
  ];

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-80 max-h-64 overflow-y-auto z-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Emoji</h4>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {emojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function Messages() {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Load all users for search (excluding current user)
  useEffect(() => {
    if (!currentUser) return;

    const loadUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(user => user.id !== currentUser.uid)
          .sort((a, b) => {
            const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
            const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
            return nameA.localeCompare(nameB);
          });

        setAllUsers(users);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, [currentUser]);

  // Real-time messages listener - get messages where user is sender OR receiver
  useEffect(() => {
    if (!currentUser) return;

    // Query messages where current user is sender
    const sentQuery = query(
      collection(db, 'messages'),
      where('senderId', '==', currentUser.uid)
    );

    // Query messages where current user is receiver
    const receivedQuery = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUser.uid)
    );

    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      updateMessages(snapshot, 'sent');
    });

    const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
      updateMessages(snapshot, 'received');
    });

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [currentUser]);

  const updateMessages = (snapshot, type) => {
    const newMessages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      readAt: doc.data().readAt?.toDate(),
      sentAt: doc.data().sentAt?.toDate()
    }));

    setMessages(prev => {
      const combined = [...prev, ...newMessages];
      // Remove duplicates
      const unique = combined.filter((msg, index, self) =>
        index === self.findIndex(m => m.id === msg.id)
      );
      return unique.sort((a, b) => (a.createdAt || new Date()) - (b.createdAt || new Date()));
    });
  };

  // Group messages into conversations
  useEffect(() => {
    if (!currentUser || messages.length === 0) {
      setConversations([]);
      return;
    }

    const convosMap = {};

    messages.forEach(msg => {
      // Determine the other user in the conversation
      const otherUserId = msg.senderId === currentUser.uid ? msg.receiverId : msg.senderId;
      const conversationId = [currentUser.uid, otherUserId].sort().join('_');

      if (!convosMap[conversationId]) {
        convosMap[conversationId] = {
          id: conversationId,
          otherUserId: otherUserId,
          otherUser: null,
          messages: [],
          lastMessage: null,
          unreadCount: 0
        };
      }

      convosMap[conversationId].messages.push(msg);

      if (!convosMap[conversationId].lastMessage ||
        (msg.createdAt > convosMap[conversationId].lastMessage.createdAt)) {
        convosMap[conversationId].lastMessage = msg;
      }

      // Count unread (messages sent to current user that aren't read)
      if (msg.receiverId === currentUser.uid && !msg.read) {
        convosMap[conversationId].unreadCount++;
      }
    });

    // Load other user info for each conversation
    const loadUserInfo = async () => {
      const convos = Object.values(convosMap);
      for (const convo of convos) {
        try {
          const userDoc = await getDoc(doc(db, 'users', convo.otherUserId));
          if (userDoc.exists()) {
            convo.otherUser = {
              id: userDoc.id,
              ...userDoc.data()
            };
          }
        } catch (error) {
          console.error('Error loading user info:', error);
        }
      }
      setConversations(convos.sort((a, b) =>
        (b.lastMessage?.createdAt || new Date(0)) - (a.lastMessage?.createdAt || new Date(0))
      ));
    };

    loadUserInfo();
  }, [messages, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConversation]);

  useEffect(() => {
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    }
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [typing]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Get current conversation messages
  const currentConversation = conversations.find(c => c.id === selectedConversation);
  const currentMessages = currentConversation?.messages || [];

  // Get user info for selected conversation
  const otherUser = currentConversation?.otherUser;

  // Search users
  const filteredUsers = allUsers.filter(user => {
    const search = userSearchTerm.toLowerCase();
    const name = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const phone = (user.phone || '').toLowerCase();
    return name.includes(search) || email.includes(search) || phone.includes(search);
  });

  // Start conversation with a user
  const startConversation = (user) => {
    const conversationId = [currentUser.uid, user.id].sort().join('_');
    setSelectedUser(user);
    setSelectedConversation(conversationId);
    setShowUserSearch(false);
    setShowNewMessage(false);
    markConversationRead(conversationId);
  };

  // Get user location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        toast.success('Location captured!');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Failed to get location');
      }
    );
  };

  // Handle file upload
  const handleFileSelect = async (e, type) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      try {
        const fileRef = ref(storage, `messages/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);

        setAttachments(prev => [...prev, {
          id: Date.now() + Math.random(),
          type: type,
          name: file.name,
          size: file.size,
          url: url,
          file: file
        }]);

        toast.success(`${file.name} attached`);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const audioRef = ref(storage, `messages/${currentUser.uid}/audio_${Date.now()}.webm`);
        uploadBytes(audioRef, blob).then(async () => {
          const audioUrl = await getDownloadURL(audioRef);
          setAttachments(prev => [...prev, {
            id: Date.now(),
            type: 'audio',
            name: 'Voice message',
            url: audioUrl,
            blob: blob
          }]);
        });
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setRecording(false);
      setMediaRecorder(null);
      toast.success('Recording stopped');
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!selectedUser && !selectedConversation) {
      toast.error('Please select a user to message');
      return;
    }

    if (!newMessage.trim() && !userLocation && attachments.length === 0) {
      toast.error('Please enter a message, share location, or attach a file');
      return;
    }

    setSending(true);
    try {
      // Determine receiver
      let receiverId;
      if (selectedUser) {
        receiverId = selectedUser.id;
      } else if (currentConversation) {
        receiverId = currentConversation.otherUserId;
      } else {
        toast.error('No recipient selected');
        return;
      }

      // Create conversation ID (sorted user IDs)
      const conversationId = [currentUser.uid, receiverId].sort().join('_');

      // Upload attachments
      const attachmentUrls = [];
      for (const att of attachments) {
        if (att.url) {
          attachmentUrls.push({
            type: att.type,
            name: att.name,
            url: att.url,
            size: att.size
          });
        }
      }

      const messageData = {
        senderId: currentUser.uid,
        receiverId: receiverId,
        conversationId: conversationId,
        message: newMessage.trim(),
        read: false,
        status: 'sent',
        sentAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        location: userLocation ? {
          lat: userLocation.lat,
          lng: userLocation.lng,
          accuracy: userLocation.accuracy,
          timestamp: serverTimestamp()
        } : null,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        // Sender info
        senderName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
        senderEmail: userProfile?.email,
        senderPhone: userProfile?.phone,
        senderPhotoURL: userProfile?.photoURL
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Mark as read for sender (they see it immediately)
      setTimeout(async () => {
        const newMessages = await getDocs(query(
          collection(db, 'messages'),
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', receiverId),
          orderBy('createdAt', 'desc'),
          limit(1)
        ));
        if (!newMessages.empty) {
          await updateDoc(doc(db, 'messages', newMessages.docs[0].id), {
            read: true,
            readAt: serverTimestamp()
          });
        }
      }, 100);

      // Reset form
      setNewMessage('');
      setUserLocation(null);
      setAttachments([]);
      setAudioUrl(null);

      if (selectedUser) {
        setSelectedConversation(conversationId);
        setSelectedUser(null);
      }

      toast.success('Message sent!');
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Mark conversation as read
  const markConversationRead = async (conversationId) => {
    try {
      const unreadMessages = messages.filter(
        m => m.conversationId === conversationId &&
          m.receiverId === currentUser.uid &&
          !m.read
      );

      await Promise.all(
        unreadMessages.map(msg =>
          updateDoc(doc(db, 'messages', msg.id), {
            read: true,
            readAt: serverTimestamp()
          })
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleTyping = () => {
    setTyping(true);
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const handleSelectConversation = (conversationId) => {
    setSelectedConversation(conversationId);
    setShowNewMessage(false);
    setSelectedUser(null);
    markConversationRead(conversationId);
  };

  return (
    <div className="p-6 h-[calc(100vh-100px)]">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              Messages
            </h1>
            <p className="text-gray-600">Chat with other users in real-time</p>
          </div>
          <button
            onClick={() => setShowUserSearch(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200"
          >
            <UserPlus className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex overflow-hidden min-h-0">
          {/* Conversation List */}
          <div className="w-full md:w-80 border-r border-gray-200 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length > 0 ? (
                conversations
                  .filter(conv => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    const userName = conv.otherUser
                      ? `${conv.otherUser.firstName || ''} ${conv.otherUser.lastName || ''}`.toLowerCase()
                      : '';
                    return userName.includes(search);
                  })
                  .map((conversation) => {
                    const lastMsg = conversation.lastMessage;
                    const isSelected = selectedConversation === conversation.id;
                    const otherUser = conversation.otherUser;
                    const userName = otherUser
                      ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.email || 'Unknown User'
                      : 'Loading...';

                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                          }`}
                      >
                        <div className="flex items-start space-x-3">
                          {otherUser?.photoURL ? (
                            <img
                              src={otherUser.photoURL}
                              alt={userName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${conversation.unreadCount > 0 ? 'bg-blue-600' : 'bg-gray-200'
                              }`}>
                              <span className={`text-sm font-semibold ${conversation.unreadCount > 0 ? 'text-white' : 'text-gray-600'
                                }`}>
                                {userName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-medium truncate ${conversation.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-700'
                                }`}>
                                {userName}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ml-2 flex-shrink-0">
                                  {conversation.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 truncate mb-1">
                              {lastMsg?.location ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  Location
                                </span>
                              ) : lastMsg?.attachments?.length > 0 ? (
                                <span className="flex items-center gap-1">
                                  <Paperclip className="h-3 w-3" />
                                  {lastMsg.attachments.length} file{lastMsg.attachments.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                lastMsg?.message?.substring(0, 50) || 'No messages'
                              )}
                              {lastMsg?.message && lastMsg.message.length > 50 ? '...' : ''}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                {formatTime(lastMsg?.createdAt)}
                              </span>
                              {lastMsg?.senderId === currentUser.uid && (
                                <MessageStatus status={lastMsg.status} readAt={lastMsg.readAt} />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
              ) : (
                <div className="p-8 text-center">
                  <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                  <p className="text-gray-400 text-xs mt-1">Start a new chat with another user</p>
                </div>
              )}
            </div>
          </div>

          {/* Message Area */}
          <div className="hidden md:flex flex-1 flex-col">
            {showUserSearch ? (
              /* User Search */
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Find User to Message</h3>
                    <button
                      onClick={() => setShowUserSearch(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or phone..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {filteredUsers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredUsers.map((user) => {
                        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User';
                        return (
                          <button
                            key={user.id}
                            onClick={() => startConversation(user)}
                            className="w-full p-4 text-left hover:bg-gray-50 rounded-xl transition-colors border border-gray-100"
                          >
                            <div className="flex items-center space-x-3">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={userName}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-lg">
                                    {userName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{userName}</p>
                                {user.email && (
                                  <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                )}
                                {user.phone && (
                                  <p className="text-xs text-gray-400 truncate">{user.phone}</p>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No users found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {userSearchTerm ? 'Try a different search term' : 'Start typing to search for users'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedConversation && otherUser ? (
              /* Conversation View */
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {otherUser.photoURL ? (
                        <img
                          src={otherUser.photoURL}
                          alt={`${otherUser.firstName || ''} ${otherUser.lastName || ''}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {`${otherUser.firstName || ''} ${otherUser.lastName || ''}`.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {`${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.email || 'Unknown User'}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {otherUser.email && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {otherUser.email}
                            </p>
                          )}
                          <span className="flex items-center text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                            Online
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {otherUser.phone && (
                        <a
                          href={`tel:${otherUser.phone}`}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Call"
                        >
                          <Phone className="h-5 w-5 text-gray-600" />
                        </a>
                      )}
                      {otherUser.email && (
                        <a
                          href={`mailto:${otherUser.email}`}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Email"
                        >
                          <Mail className="h-5 w-5 text-gray-600" />
                        </a>
                      )}
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreVertical className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                  {currentMessages.map((message, index) => {
                    const isSent = message.senderId === currentUser.uid;

                    return (
                      <div
                        key={message.id || index}
                        className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${isSent ? 'order-2' : 'order-1'}`}>
                          {message.location && (
                            <div className="mb-2 p-3 bg-white border border-gray-200 rounded-xl">
                              <div className="flex items-center gap-2 mb-2">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">Location</span>
                              </div>
                              <a
                                href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                              >
                                <Navigation className="h-3 w-3" />
                                View on Google Maps
                              </a>
                            </div>
                          )}

                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2 space-y-2">
                              {message.attachments.map((att, i) => (
                                <div key={i} className="bg-white border border-gray-200 rounded-xl p-3">
                                  {att.type === 'image' && (
                                    <img src={att.url} alt={att.name} className="w-full rounded-lg mb-2" />
                                  )}
                                  {att.type === 'video' && (
                                    <video src={att.url} controls className="w-full rounded-lg mb-2" />
                                  )}
                                  {att.type === 'audio' && (
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Mic className="h-6 w-6 text-purple-600" />
                                      </div>
                                      <audio src={att.url} controls className="flex-1" />
                                    </div>
                                  )}
                                  {att.type === 'file' && (
                                    <div className="flex items-center gap-3">
                                      <File className="h-8 w-8 text-blue-600" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium">{att.name}</p>
                                        <a href={att.url} download className="text-xs text-blue-600 hover:text-blue-700">
                                          Download
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {message.message && (
                            <div
                              className={`px-4 py-3 rounded-2xl ${isSent
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md'
                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                                }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                          )}

                          <div className={`flex items-center mt-1 space-x-1 ${isSent ? 'justify-end' : 'justify-start'
                            }`}>
                            <p className="text-xs text-gray-400">
                              {formatTime(message.createdAt)}
                            </p>
                            {isSent && (
                              <MessageStatus status={message.status} readAt={message.readAt} />
                            )}
                            {!isSent && message.read && (
                              <Eye className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Enhanced Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
                  {attachments.length > 0 && (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-2">
                      {attachments.map((att) => (
                        <div key={att.id} className="relative flex-shrink-0">
                          {att.type === 'image' && att.url && (
                            <img src={att.url} alt={att.name} className="w-20 h-20 object-cover rounded-lg" />
                          )}
                          {att.type === 'audio' && (
                            <div className="w-20 h-20 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Mic className="h-8 w-8 text-purple-600" />
                            </div>
                          )}
                          {att.type === 'file' && (
                            <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center">
                              <File className="h-8 w-8 text-blue-600" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {userLocation && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-gray-700">Location ready to share</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUserLocation(null)}
                        className="p-1 hover:bg-green-100 rounded"
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end space-x-2">
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Add emoji"
                        >
                          <Smile className="h-5 w-5" />
                        </button>
                        {showEmojiPicker && (
                          <EmojiPicker
                            onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Attach image"
                      >
                        <ImageIcon className="h-5 w-5" />
                      </button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e, 'image')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Attach video"
                      >
                        <Video className="h-5 w-5" />
                      </button>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileSelect(e, 'video')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Attach file"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleFileSelect(e, 'file')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={recording ? stopRecording : startRecording}
                        className={`p-2 rounded-lg transition-colors ${recording
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                        title="Voice message"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Share location"
                      >
                        <MapPin className="h-5 w-5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    {/* ALWAYS VISIBLE SEND BUTTON */}
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !userLocation && attachments.length === 0) || sending}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[48px]"
                      title="Send message"
                    >
                      {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h3>
                  <p className="text-gray-500 mb-6 max-w-xs">
                    Search for a user to start chatting, or select an existing conversation
                  </p>
                  <button
                    onClick={() => setShowUserSearch(true)}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Find User</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
