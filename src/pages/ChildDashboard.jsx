// src/pages/ChildDashboard.jsx - Complete Child Dashboard with All Features
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  childTasksService,
  childLearningService,
  childChoresService,
  childWalletService,
  childBehaviorService,
  childRewardsService,
  childScreenTimeService,
  childSafetyService,
  childGamesService,
  messageService,
  uploadService
} from '../services/firebaseService';
import {
  CheckCircle,
  Clock,
  BookOpen,
  Home,
  Wallet,
  MessageCircle,
  Heart,
  Award,
  Calendar,
  Smartphone,
  Shield,
  Gamepad2,
  Star,
  Navigation,
  Settings,
  Plus,
  X,
  Upload,
  MapPin,
  AlertTriangle,
  Send,
  Phone,
  Mic,
  DollarSign,
  TrendingUp,
  Smile,
  Frown,
  Meh,
  Trophy,
  Gift,
  Lock,
  Unlock,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChildDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);

  // State for all features
  const [tasks, setTasks] = useState([]);
  const [homework, setHomework] = useState([]);
  const [chores, setChores] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [behavior, setBehavior] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [screenTimeSettings, setScreenTimeSettings] = useState(null);
  const [games, setGames] = useState([]);
  const [messages, setMessages] = useState([]);

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showChoreModal, setShowChoreModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showMoneyRequestModal, setShowMoneyRequestModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [homeworkFiles, setHomeworkFiles] = useState([]);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);

  // Check if user is a child
  const isChild = userProfile?.role === 'child';
  const parentId = userProfile?.parentId || null;

  useEffect(() => {
    if (currentUser && isChild) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [currentUser, isChild]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [
        tasksData,
        homeworkData,
        choresData,
        walletData,
        behaviorData,
        rewardsData,
        screenTimeData,
        gamesData,
        messagesData
      ] = await Promise.all([
        childTasksService.getChildTasks(currentUser.uid, parentId),
        childLearningService.getChildHomework(currentUser.uid),
        childChoresService.getChildChores(currentUser.uid),
        childWalletService.getChildWallet(currentUser.uid, parentId),
        childBehaviorService.getChildBehavior(currentUser.uid),
        childRewardsService.getChildRewards(currentUser.uid),
        childScreenTimeService.getScreenTimeSettings(currentUser.uid, parentId),
        childGamesService.getChildGames(currentUser.uid),
        messageService.getUserMessages(currentUser.uid)
      ]);

      setTasks(tasksData);
      setHomework(homeworkData);
      setChores(choresData);
      setWallet(walletData);
      setBehavior(behaviorData);
      setRewards(rewardsData);
      setScreenTimeSettings(screenTimeData);
      setGames(gamesData);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Task handlers
  const handleCompleteTask = async (taskId) => {
    try {
      await childTasksService.completeTask(taskId, currentUser.uid);
      toast.success('Task marked as completed!');
      loadAllData();
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  // Chore handlers
  const handleCompleteChore = async (choreId) => {
    try {
      await childChoresService.completeChore(choreId, currentUser.uid);
      toast.success('Chore completed! Great job!');
      loadAllData();
    } catch (error) {
      toast.error('Failed to complete chore');
    }
  };

  // Message handlers
  const handleSendMessage = async (message) => {
    if (!parentId) {
      toast.error('Parent account not linked. Please contact support.');
      return;
    }
    
    try {
      await messageService.sendChildToParentMessage(currentUser.uid, parentId, {
        message,
        subject: 'Message from ' + (userProfile?.firstName || 'Child'),
        priority: 'normal'
      });
      toast.success('Message sent to parent!');
      setShowMessageModal(false);
      loadAllData();
    } catch (error) {
      console.error('Message send error:', error);
      toast.error(error.message || 'Failed to send message. Please try again.');
    }
  };

  // SOS handler
  const handleSOS = async () => {
    try {
      await childSafetyService.sendSOS(currentUser.uid, parentId, null);
      toast.success('SOS alert sent to parent!', { duration: 5000 });
    } catch (error) {
      toast.error('Failed to send SOS');
    }
  };

  // Location share handler
  const handleShareLocation = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await childSafetyService.shareLocation(currentUser.uid, parentId, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            toast.success('Location shared with parent!');
          } catch (error) {
            toast.error('Failed to share location');
          }
        },
        () => toast.error('Unable to get location')
      );
    } else {
      toast.error('Location not supported');
    }
  };

  // Reward redemption
  const handleRedeemReward = async (rewardId) => {
    try {
      await childRewardsService.redeemReward(rewardId, currentUser.uid);
      toast.success('Reward redemption requested! Waiting for parent approval.');
      loadAllData();
    } catch (error) {
      toast.error(error.message || 'Failed to redeem reward');
    }
  };

  // Mood entry
  const handleAddMood = async (mood) => {
    try {
      await childBehaviorService.addBehaviorNote(currentUser.uid, currentUser.uid, {
        type: 'mood',
        title: `Mood: ${mood}`,
        mood,
        points: 0
      });
      toast.success('Mood recorded!');
      loadAllData();
    } catch (error) {
      toast.error('Failed to record mood');
    }
  };

  // Homework upload handler
  const handleUploadHomework = async (homeworkId) => {
    try {
      if (homeworkFiles.length === 0) {
        toast.error('Please select a file to upload');
        return;
      }

      // Upload files
      const uploadedFiles = [];
      for (const file of homeworkFiles) {
        const uploadResult = await uploadService.uploadFile(
          `child-homework/${currentUser.uid}/${homeworkId}`,
          file
        );
        uploadedFiles.push({
          name: file.name,
          url: uploadResult.url,
          type: file.type,
          size: file.size
        });
      }

      // Submit homework
      await childLearningService.submitHomework(homeworkId, currentUser.uid, uploadedFiles);
      toast.success('Homework submitted successfully!');
      setShowHomeworkModal(false);
      setSelectedHomework(null);
      setHomeworkFiles([]);
      loadAllData();
    } catch (error) {
      console.error('Error uploading homework:', error);
      toast.error(error.message || 'Failed to upload homework');
    }
  };

  // Money request handler
  const handleRequestMoney = async (amount, reason) => {
    if (!parentId) {
      toast.error('Parent account not linked');
      return;
    }

    try {
      await childWalletService.requestMoney(currentUser.uid, parentId, amount, reason);
      toast.success('Money request sent to parent!');
      setShowMoneyRequestModal(false);
      loadAllData();
    } catch (error) {
      console.error('Error requesting money:', error);
      toast.error(error.message || 'Failed to request money');
    }
  };

  // Voice note handler
  const handleStartVoiceRecording = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Voice recording not supported on this device');
      return;
    }

    setRecordingVoice(true);
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks = [];

        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setVoiceNote(blob);
          setRecordingVoice(false);
          stream.getTracks().forEach(track => track.stop());
          toast.success('Voice note recorded!');
        };

        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 30000); // 30 second max
      })
      .catch(error => {
        console.error('Error accessing microphone:', error);
        toast.error('Failed to access microphone');
        setRecordingVoice(false);
      });
  };

  const handleSendVoiceNote = async () => {
    if (!voiceNote || !parentId) {
      toast.error('No voice note recorded');
      return;
    }

    try {
      // Upload voice note
      const uploadResult = await uploadService.uploadFile(
        `child-voice-notes/${currentUser.uid}`,
        voiceNote,
        10 * 1024 * 1024 // 10MB max for voice
      );

      // Send message with voice note
      await messageService.sendChildToParentMessage(currentUser.uid, parentId, {
        message: 'Voice message',
        subject: 'Voice Note from ' + (userProfile?.firstName || 'Child'),
        priority: 'normal',
        voiceNote: uploadResult.url
      });

      toast.success('Voice note sent to parent!');
      setVoiceNote(null);
      setShowMessageModal(false);
      loadAllData();
    } catch (error) {
      console.error('Error sending voice note:', error);
      toast.error('Failed to send voice note');
    }
  };

  if (!isChild) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Child Dashboard Only</h2>
        <p className="text-gray-600">This dashboard is only available for child accounts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'school', label: 'School', icon: BookOpen },
    { id: 'chores', label: 'Chores', icon: Home },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'behavior', label: 'Behavior', icon: Award },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'screentime', label: 'Screen Time', icon: Smartphone },
    { id: 'safety', label: 'Safety', icon: Shield },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'rewards', label: 'Rewards', icon: Star }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {userProfile?.firstName || 'Kid'}! 👋
        </h1>
        <p className="text-purple-100">Your personal dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">
              {tasks.filter(t => t.status === 'completed').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Tasks Done</p>
        </div>
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Star className="h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold text-green-600">
              {wallet?.points || 0}
            </span>
          </div>
          <p className="text-sm text-gray-600">Points</p>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Home className="h-5 w-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-600">
              {chores.filter(c => c.status === 'completed').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Chores Done</p>
        </div>
        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-5 w-5 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">
              {rewards.filter(r => r.status === 'redeemed').length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Rewards</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tasks assigned yet!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {task.deadline && (
                            <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                          )}
                          {task.reward && (
                            <span className="text-green-600">🎁 {task.reward}</span>
                          )}
                          {task.points > 0 && (
                            <span className="text-blue-600">⭐ {task.points} points</span>
                          )}
                        </div>
                      </div>
                      {task.status === 'pending' && (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {task.status === 'completed' && (
                        <span className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                          Waiting for approval
                        </span>
                      )}
                      {task.status === 'approved' && (
                        <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                          ✓ Approved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* School Tab */}
        {activeTab === 'school' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">School & Learning</h2>
            </div>
            {homework.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No homework assigned!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {homework.map(hw => (
                  <div
                    key={hw.id}
                    className="border-2 border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{hw.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">Subject: {hw.subject}</p>
                        {hw.dueDate && (
                          <p className="text-sm text-gray-500">
                            Due: {new Date(hw.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {hw.status === 'assigned' && (
                        <button
                          onClick={() => {
                            setSelectedHomework(hw);
                            setShowHomeworkModal(true);
                          }}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Upload Work
                        </button>
                      )}
                      {hw.status === 'submitted' && (
                        <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                          Submitted
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chores Tab */}
        {activeTab === 'chores' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Chores</h2>
            </div>
            {chores.length === 0 ? (
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No chores assigned!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chores.map(chore => (
                  <div
                    key={chore.id}
                    className="border-2 border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{chore.title}</h3>
                        {chore.streak > 0 && (
                          <p className="text-sm text-blue-600 mb-2">
                            🔥 {chore.streak} day streak!
                          </p>
                        )}
                        {chore.points > 0 && (
                          <p className="text-sm text-green-600">⭐ {chore.points} points</p>
                        )}
                      </div>
                      {chore.status === 'pending' && (
                        <button
                          onClick={() => handleCompleteChore(chore.id)}
                          className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Done!
                        </button>
                      )}
                      {chore.status === 'completed' && (
                        <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                          ✓ Completed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && wallet && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Wallet</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-600">{wallet.points || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Points</p>
              </div>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-600">
                  ${(wallet.balance || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Money</p>
              </div>
            </div>
            <button
              onClick={() => setShowMoneyRequestModal(true)}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Request Money from Parent
            </button>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
              <button
                onClick={() => setShowMessageModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="h-4 w-4 inline mr-2" />
                Send Message
              </button>
            </div>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No messages yet</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="border-2 border-gray-200 rounded-xl p-4">
                    <p className="text-gray-900 mb-2">{msg.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Health Tab */}
        {activeTab === 'health' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Health & Well-Being</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => handleAddMood('happy')}
                className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl hover:bg-yellow-100 transition-colors"
              >
                <Smile className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Happy</p>
              </button>
              <button
                onClick={() => handleAddMood('okay')}
                className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Meh className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Okay</p>
              </button>
              <button
                onClick={() => handleAddMood('sad')}
                className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <Frown className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-medium">Sad</p>
              </button>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">How I Feel Today</h3>
              <p className="text-sm text-gray-600">Tap a mood above to record how you're feeling!</p>
            </div>
          </div>
        )}

        {/* Behavior Tab */}
        {activeTab === 'behavior' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Behavior & Achievements</h2>
            {behavior.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No behavior notes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {behavior.map(beh => (
                  <div key={beh.id} className="border-2 border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{beh.title}</h3>
                    {beh.description && (
                      <p className="text-sm text-gray-600 mb-2">{beh.description}</p>
                    )}
                    {beh.points > 0 && (
                      <p className="text-sm text-green-600">⭐ +{beh.points} points</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Family Calendar</h2>
            <p className="text-sm text-gray-600 mb-4">
              View-only: You can see events your parent added, but cannot edit them.
            </p>
            {parentId ? (
              <CalendarView parentId={parentId} />
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No parent linked. Calendar events will appear here once linked.</p>
              </div>
            )}
          </div>
        )}

        {/* Screen Time Tab */}
        {activeTab === 'screentime' && screenTimeSettings && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Screen Time</h2>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Daily Limit</h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {screenTimeSettings.dailyLimit || 120} minutes
                  </p>
                </div>
                <Smartphone className="h-8 w-8 text-blue-600" />
              </div>
              {screenTimeSettings.focusModeEnabled && (
                <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    🔒 Focus Mode is ON - Some features are locked
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Safety Tab */}
        {activeTab === 'safety' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Safety & Emergency</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleSOS}
                className="p-6 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-center"
              >
                <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
                <p className="text-xl font-bold">SOS Button</p>
                <p className="text-sm mt-2">Tap to alert parent</p>
              </button>
              <button
                onClick={handleShareLocation}
                className="p-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-center"
              >
                <MapPin className="h-12 w-12 mx-auto mb-3" />
                <p className="text-xl font-bold">Share Location</p>
                <p className="text-sm mt-2">Send my location to parent</p>
              </button>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Approved Games</h2>
            {games.length === 0 ? (
              <div className="text-center py-8">
                <Gamepad2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No games approved yet</p>
                <p className="text-sm text-gray-500 mt-2">Ask your parent to approve games!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {games.map(game => (
                  <div
                    key={game.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                  >
                    <Gamepad2 className="h-8 w-8 text-blue-600 mb-2" />
                    <h3 className="font-semibold text-gray-900">{game.name}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rewards & Achievements</h2>
            {rewards.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No rewards available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rewards.map(reward => (
                  <div
                    key={reward.id}
                    className="border-2 border-gray-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{reward.name}</h3>
                        {reward.description && (
                          <p className="text-sm text-gray-600 mb-2">{reward.description}</p>
                        )}
                        <p className="text-sm text-blue-600">
                          Cost: {reward.cost} {reward.costType === 'points' ? 'points' : 'dollars'}
                        </p>
                      </div>
                      {reward.status === 'available' && (
                        <button
                          onClick={() => handleRedeemReward(reward.id)}
                          className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Redeem
                        </button>
                      )}
                      {reward.status === 'pending_approval' && (
                        <span className="ml-4 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                          Pending
                        </span>
                      )}
                      {reward.status === 'redeemed' && (
                        <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">
                          ✓ Redeemed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Send Message to Parent</h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <textarea
              placeholder="Type your message..."
              className="w-full border-2 border-gray-200 rounded-lg p-3 mb-4 min-h-32"
              id="messageInput"
            />
            {voiceNote && (
              <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mic className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-700">Voice note recorded</span>
                </div>
                <button
                  onClick={() => setVoiceNote(null)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex space-x-2 mb-4">
              <button
                onClick={recordingVoice ? () => setRecordingVoice(false) : handleStartVoiceRecording}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  recordingVoice
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Mic className="h-4 w-4 inline mr-2" />
                {recordingVoice ? 'Stop Recording' : 'Record Voice'}
              </button>
              {voiceNote && (
                <button
                  onClick={handleSendVoiceNote}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Send Voice Note
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  const input = document.getElementById('messageInput');
                  if (input.value.trim()) {
                    handleSendMessage(input.value);
                    input.value = '';
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send
              </button>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setVoiceNote(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Homework Upload Modal */}
      {showHomeworkModal && selectedHomework && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Upload Homework</h3>
              <button
                onClick={() => {
                  setShowHomeworkModal(false);
                  setSelectedHomework(null);
                  setHomeworkFiles([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>{selectedHomework.title}</strong> - {selectedHomework.subject}
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setHomeworkFiles(Array.from(e.target.files))}
                className="w-full border-2 border-gray-200 rounded-lg p-2"
              />
              {homeworkFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {homeworkFiles.map((file, idx) => (
                    <div key={idx} className="text-sm text-gray-600 flex items-center justify-between">
                      <span>{file.name}</span>
                      <button
                        onClick={() => setHomeworkFiles(files => files.filter((_, i) => i !== idx))}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleUploadHomework(selectedHomework.id)}
                disabled={homeworkFiles.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload & Submit
              </button>
              <button
                onClick={() => {
                  setShowHomeworkModal(false);
                  setSelectedHomework(null);
                  setHomeworkFiles([]);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Money Request Modal */}
      {showMoneyRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Request Money</h3>
              <button
                onClick={() => setShowMoneyRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="moneyAmount"
                  className="w-full border-2 border-gray-200 rounded-lg p-3"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  id="moneyReason"
                  className="w-full border-2 border-gray-200 rounded-lg p-3 min-h-24"
                  placeholder="Why do you need this money?"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  const amount = document.getElementById('moneyAmount').value;
                  const reason = document.getElementById('moneyReason').value;
                  if (amount && parseFloat(amount) > 0) {
                    handleRequestMoney(amount, reason);
                    document.getElementById('moneyAmount').value = '';
                    document.getElementById('moneyReason').value = '';
                  } else {
                    toast.error('Please enter a valid amount');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Send Request
              </button>
              <button
                onClick={() => setShowMoneyRequestModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Calendar View Component (Read-only for children)
function CalendarView({ parentId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadParentEvents();
  }, [parentId, currentDate]);

  const loadParentEvents = async () => {
    setLoading(true);
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      
      const q = query(
        collection(db, 'events'),
        where('userId', '==', parentId)
      );
      
      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = event.date;
      if (!eventDate) return false;
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const calendarDays = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">{monthName}</h3>
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          const dayEvents = day.isCurrentMonth && day.date ? getEventsForDate(day.date) : [];
          return (
            <div
              key={idx}
              className={`min-h-20 p-1 border border-gray-200 rounded-lg ${
                day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.day}
              </div>
              {dayEvents.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  className="text-xs bg-blue-100 text-blue-700 rounded px-1 py-0.5 mb-1 truncate"
                  title={event.title}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 2 && (
                <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Today's Events */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-900 mb-3">Today's Events</h4>
        {getEventsForDate(new Date()).length === 0 ? (
          <p className="text-sm text-gray-500">No events today</p>
        ) : (
          <div className="space-y-2">
            {getEventsForDate(new Date()).map(event => (
              <div key={event.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="font-medium text-gray-900">{event.title}</h5>
                {event.startTime && (
                  <p className="text-sm text-gray-600">Time: {event.startTime}</p>
                )}
                {event.location && (
                  <p className="text-sm text-gray-600">Location: {event.location}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

