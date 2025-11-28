// src/pages/ChildDashboard.jsx - Comprehensive Child Dashboard with All Features
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  childrenService,
  savingsService,
  childTasksService,
  childChoresService,
  childLearningService,
  childWalletService,
  childBehaviorService,
  childRewardsService,
  childScreenTimeService,
  childSafetyService,
  messageService,
  uploadService
} from '../services/firebaseService';
import {
  PiggyBank, Target, Star, Trophy, Gift, Sparkles, TrendingUp, DollarSign, Award, Rocket,
  Heart, Zap, Calendar, CheckCircle, Coins, Gem, Crown, Rainbow, Sun, Moon, Cloud, Flower2,
  PartyPopper, BookOpen, ClipboardCheck, Home, MessageSquare, Phone, MapPin, AlertTriangle,
  Clock, Play, Pause, Lock, Unlock, Upload, Image, Video, Gamepad2, Settings, User, Smile,
  Activity, Pill, Bell, Shield, GamepadIcon, Menu, X, ChevronRight, Plus, Minus, Edit3,
  LogOut, Camera, Mail, Volume2, VolumeX, Globe, Eye, EyeOff, Palette, Sparkles as SparklesIcon,
  Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChildDashboard() {
  const { currentUser, userProfile, logout, uploadProfilePhoto } = useAuth();
  const { theme, setTheme: setThemeMode, effectiveTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [childData, setChildData] = useState(null);
  const [parentId, setParentId] = useState(null);

  // Data states
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [chores, setChores] = useState([]);
  const [homework, setHomework] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0, points: 0, transactions: [] });
  const [behavior, setBehavior] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [messages, setMessages] = useState([]);
  const [screenTimeSettings, setScreenTimeSettings] = useState(null);
  const [safeLocations, setSafeLocations] = useState([]);
  const [mood, setMood] = useState('happy');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showChoreModal, setShowChoreModal] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showMoneyRequestModal, setShowMoneyRequestModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  // Form states
  const [moneyRequestForm, setMoneyRequestForm] = useState({ amount: '', reason: '' });
  const [homeworkPhotos, setHomeworkPhotos] = useState([]);

  // Themes
  const themes = [
    { name: 'Rainbow', colors: ['from-pink-500', 'via-purple-500', 'to-blue-500'], icon: Rainbow },
    { name: 'Sunshine', colors: ['from-yellow-400', 'to-orange-500'], icon: Sun },
    { name: 'Ocean', colors: ['from-cyan-400', 'to-blue-600'], icon: Cloud },
    { name: 'Garden', colors: ['from-green-400', 'to-emerald-600'], icon: Flower2 },
    { name: 'Space', colors: ['from-indigo-500', 'via-purple-500', 'to-pink-500'], icon: Rocket },
    { name: 'Sunset', colors: ['from-orange-400', 'via-pink-500', 'to-red-500'], icon: Sun },
    { name: 'Forest', colors: ['from-green-500', 'to-teal-600'], icon: Flower2 },
    { name: 'Galaxy', colors: ['from-purple-600', 'via-pink-500', 'to-blue-600'], icon: Sparkles }
  ];
  const [currentTheme, setCurrentTheme] = useState(themes[0]);

  // Load all data
  useEffect(() => {
    if (currentUser && userProfile) {
      loadAllData();
    }
  }, [currentUser, userProfile]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (userProfile?.role === 'child') {
        const child = {
          id: currentUser.uid,
          name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Child',
          dateOfBirth: userProfile.dateOfBirth || null
        };
        setChildData(child);
        setParentId(userProfile.parentId || null);

        // Load all data in parallel
        const [
          goals,
          tasksData,
          choresData,
          homeworkData,
          walletData,
          behaviorData,
          rewardsData,
          messagesData,
          screenTimeData,
          safeLocationsData
        ] = await Promise.all([
          savingsService.getUserSavings(currentUser.uid).catch(() => []),
          childTasksService.getChildTasks(currentUser.uid, userProfile.parentId || '').catch(() => []),
          childChoresService.getChildChores(currentUser.uid).catch(() => []),
          childLearningService.getChildHomework(currentUser.uid).catch(() => []),
          childWalletService.getChildWallet(currentUser.uid, userProfile.parentId || '').catch(() => ({ balance: 0, points: 0, transactions: [] })),
          childBehaviorService.getChildBehavior(currentUser.uid).catch(() => []),
          childRewardsService.getChildRewards(currentUser.uid).catch(() => []),
          messageService.getUserMessages(currentUser.uid).catch(() => []),
          childScreenTimeService.getScreenTimeSettings(currentUser.uid, userProfile.parentId || '').catch(() => null),
          childSafetyService.getSafeLocations(currentUser.uid, userProfile.parentId || '').catch(() => [])
        ]);

        setSavingsGoals(goals);
        setTasks(tasksData);
        setChores(choresData);
        setHomework(homeworkData);
        setWallet(walletData);
        setBehavior(behaviorData);
        setRewards(rewardsData);
        setMessages(messagesData);
        setScreenTimeSettings(screenTimeData);
        setSafeLocations(safeLocationsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSaved = savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const activeTasks = tasks.filter(t => t.status === 'pending' || t.status === 'completed').length;
    const completedTasks = tasks.filter(t => t.status === 'approved').length;
    const pendingChores = chores.filter(c => {
      const lastCompleted = c.lastCompleted?.toDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !lastCompleted || new Date(lastCompleted).setHours(0, 0, 0, 0) < today;
    }).length;
    const pendingHomework = homework.filter(h => h.status === 'pending').length;

    return {
      totalSaved,
      activeTasks,
      completedTasks,
      pendingChores,
      pendingHomework,
      walletBalance: wallet.balance || 0,
      walletPoints: wallet.points || 0
    };
  }, [savingsGoals, tasks, chores, homework, wallet]);

  // Handlers
  const handleCompleteTask = async (taskId) => {
    try {
      await childTasksService.completeTask(taskId, currentUser.uid);
      toast.success('Task marked as completed! Waiting for parent approval.');
      loadAllData();
    } catch (error) {
      toast.error('Failed to complete task');
    }
  };

  const handleMarkChoreDone = async (choreId) => {
    try {
      await childChoresService.markChoreDone(choreId, currentUser.uid);
      toast.success('Chore completed! Great job! 🎉');
      loadAllData();
    } catch (error) {
      toast.error('Failed to mark chore done');
    }
  };

  const handleSubmitHomework = async (homeworkId) => {
    try {
      // Upload photos if any
      const photoUrls = [];
      for (const photo of homeworkPhotos) {
        const url = await uploadService.uploadFile(photo, `homework/${homeworkId}/${Date.now()}`);
        photoUrls.push(url);
      }
      
      await childLearningService.submitHomework(homeworkId, currentUser.uid, photoUrls);
      toast.success('Homework submitted! 📚');
      setHomeworkPhotos([]);
      loadAllData();
    } catch (error) {
      toast.error('Failed to submit homework');
    }
  };

  const handleRequestMoney = async () => {
    try {
      if (!moneyRequestForm.amount || !moneyRequestForm.reason) {
        toast.error('Please fill in amount and reason');
        return;
      }
      await childWalletService.requestMoney(currentUser.uid, parentId, parseFloat(moneyRequestForm.amount), moneyRequestForm.reason);
      toast.success('Money request sent to parent! 💰');
      setMoneyRequestForm({ amount: '', reason: '' });
      setShowMoneyRequestModal(false);
      loadAllData();
    } catch (error) {
      toast.error('Failed to request money');
    }
  };

  const handleRedeemReward = async (rewardId) => {
    try {
      await childRewardsService.redeemReward(rewardId, currentUser.uid);
      toast.success('Reward redeemed! Waiting for parent approval.');
      loadAllData();
    } catch (error) {
      toast.error(error.message || 'Failed to redeem reward');
    }
  };

  const handleSendSOS = async () => {
    try {
      // Get location if available
      let location = null;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        });
      }
      
      await childSafetyService.sendSOS(currentUser.uid, parentId, location);
      toast.success('SOS alert sent to parent! 🆘');
      setShowSOSModal(false);
    } catch (error) {
      toast.error('Failed to send SOS');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle profile photo upload
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      const previewURL = URL.createObjectURL(file);
      setPhotoPreview(previewURL);
      await uploadProfilePhoto(file);
      toast.success('Profile picture updated! 🎉');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload profile picture');
      setPhotoPreview(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      try {
        await logout();
        toast.success('Signed out successfully! 👋');
      } catch (error) {
        toast.error('Failed to sign out');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-8 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-2xl font-bold text-purple-600">Loading your awesome dashboard...</p>
        </div>
      </div>
    );
  }

  if (!childData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-12 text-center max-w-md shadow-2xl">
          <Rocket className="h-20 w-20 text-purple-500 mx-auto mb-6 animate-bounce" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome! 🎉</h2>
          <p className="text-lg text-gray-600 mb-6">Your dashboard is being set up. Ask a parent to add your profile!</p>
        </div>
      </div>
    );
  }

  const childName = childData.name || 'Super Star';

  // Navigation tabs
  const tabs = [
    { id: 'home', name: 'Home', icon: Home },
    { id: 'tasks', name: 'Tasks', icon: ClipboardCheck },
    { id: 'school', name: 'School', icon: BookOpen },
    { id: 'chores', name: 'Chores', icon: Home },
    { id: 'wallet', name: 'Wallet', icon: DollarSign },
    { id: 'rewards', name: 'Rewards', icon: Gift },
    { id: 'messages', name: 'Messages', icon: MessageSquare },
    { id: 'health', name: 'Health', icon: Heart },
    { id: 'behavior', name: 'Behavior', icon: Star },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'safety', name: 'Safety', icon: Shield },
    { id: 'games', name: 'Games', icon: Gamepad2 },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className={`bg-gradient-to-r ${currentTheme.colors.join(' ')} text-white p-6 rounded-b-3xl shadow-xl`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-1">Hi {childName}! 👋</h1>
            <p className="text-white/90">Welcome to your dashboard!</p>
          </div>
          <div className="flex gap-2">
            {themes.map((theme, idx) => {
              const ThemeIcon = theme.icon;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentTheme(theme)}
                  className={`p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all ${
                    currentTheme.name === theme.name ? 'bg-white/30 scale-110' : ''
                  }`}
                >
                  <ThemeIcon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.activeTasks}</p>
            <p className="text-xs text-white/80">Tasks</p>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.pendingChores}</p>
            <p className="text-xs text-white/80">Chores</p>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{formatCurrency(stats.walletBalance)}</p>
            <p className="text-xs text-white/80">Money</p>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{stats.walletPoints}</p>
            <p className="text-xs text-white/80">Points</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 overflow-x-auto">
        <div className="flex space-x-1 p-2 max-w-7xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="hidden sm:inline">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Savings Goals */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <PiggyBank className="h-6 w-6 text-purple-600" />
                  Savings Goals
                </h2>
                {savingsGoals.length > 0 ? (
                  <div className="space-y-3">
                    {savingsGoals.slice(0, 3).map((goal) => {
                      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                      return (
                        <div key={goal.id} className="border rounded-lg p-3">
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">{goal.goalName}</span>
                            <span className="text-sm text-gray-600">{progress.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">No savings goals yet</p>
                )}
              </div>

              {/* Pending Tasks */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <ClipboardCheck className="h-6 w-6 text-blue-600" />
                  My Tasks
                </h2>
                {tasks.filter(t => t.status === 'pending').length > 0 ? (
                  <div className="space-y-2">
                    {tasks.filter(t => t.status === 'pending').slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium">{task.title}</span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500">{formatDate(task.dueDate)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No pending tasks! Great job! 🎉</p>
                )}
              </div>

              {/* Pending Chores */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Home className="h-6 w-6 text-green-600" />
                  My Chores
                </h2>
                {chores.filter(c => {
                  const lastCompleted = c.lastCompleted?.toDate();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return !lastCompleted || new Date(lastCompleted).setHours(0, 0, 0, 0) < today;
                }).length > 0 ? (
                  <div className="space-y-2">
                    {chores.filter(c => {
                      const lastCompleted = c.lastCompleted?.toDate();
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return !lastCompleted || new Date(lastCompleted).setHours(0, 0, 0, 0) < today;
                    }).slice(0, 3).map((chore) => (
                      <div key={chore.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium">{chore.title}</span>
                        {chore.streak > 0 && (
                          <span className="text-xs text-green-600">🔥 {chore.streak}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">All chores done! Awesome! ⭐</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="p-4 bg-blue-100 rounded-xl hover:bg-blue-200 transition-colors text-center"
                >
                  <ClipboardCheck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold">View Tasks</p>
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="p-4 bg-green-100 rounded-xl hover:bg-green-200 transition-colors text-center"
                >
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold">My Wallet</p>
                </button>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="p-4 bg-yellow-100 rounded-xl hover:bg-yellow-200 transition-colors text-center"
                >
                  <Gift className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-semibold">Rewards</p>
                </button>
                <button
                  onClick={() => setShowSOSModal(true)}
                  className="p-4 bg-red-100 rounded-xl hover:bg-red-200 transition-colors text-center"
                >
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="font-semibold">SOS</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <ClipboardCheck className="h-8 w-8 text-blue-600" />
              My Tasks
            </h2>
            <div className="space-y-4">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border-2 rounded-xl p-4 ${
                      task.status === 'approved' ? 'border-green-300 bg-green-50' :
                      task.status === 'completed' ? 'border-yellow-300 bg-yellow-50' :
                      'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{task.title}</h3>
                        {task.description && (
                          <p className="text-gray-600 mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {task.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                          {task.points > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              {task.points} points
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                          >
                            Mark Done ✓
                          </button>
                        )}
                        {task.status === 'completed' && (
                          <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold">
                            Waiting Approval
                          </span>
                        )}
                        {task.status === 'approved' && (
                          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Approved!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No tasks assigned yet!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCHOOL TAB */}
        {activeTab === 'school' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-purple-600" />
              School & Learning
            </h2>
            <div className="space-y-4">
              {homework.length > 0 ? (
                homework.map((hw) => (
                  <div key={hw.id} className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{hw.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">Subject: {hw.subject}</p>
                        {hw.description && (
                          <p className="text-gray-700 mb-2">{hw.description}</p>
                        )}
                        {hw.dueDate && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Due: {formatDate(hw.dueDate)}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        {hw.status === 'pending' && (
                          <button
                            onClick={() => {
                              setShowHomeworkModal(true);
                              // Set current homework for submission
                            }}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
                          >
                            Submit Work
                          </button>
                        )}
                        {hw.status === 'submitted' && (
                          <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold">
                            Submitted
                          </span>
                        )}
                        {hw.status === 'reviewed' && (
                          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                            Reviewed ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No homework assigned yet!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHORES TAB */}
        {activeTab === 'chores' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Home className="h-8 w-8 text-green-600" />
              My Chores
            </h2>
            <div className="space-y-4">
              {chores.length > 0 ? (
                chores.map((chore) => {
                  const lastCompleted = chore.lastCompleted?.toDate();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isDone = lastCompleted && new Date(lastCompleted).setHours(0, 0, 0, 0) >= today;

                  return (
                    <div
                      key={chore.id}
                      className={`border-2 rounded-xl p-4 ${
                        isDone ? 'border-green-300 bg-green-50' : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{chore.title}</h3>
                          {chore.description && (
                            <p className="text-gray-600 mb-2">{chore.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            {chore.streak > 0 && (
                              <span className="flex items-center gap-1 text-orange-600 font-semibold">
                                🔥 Streak: {chore.streak} days!
                              </span>
                            )}
                            {chore.points > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500" />
                                {chore.points} points
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          {!isDone ? (
                            <button
                              onClick={() => handleMarkChoreDone(chore.id)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                            >
                              Mark Done ✓
                            </button>
                          ) : (
                            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Done Today!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No chores assigned yet!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WALLET TAB */}
        {activeTab === 'wallet' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              My Wallet
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl p-6">
                <p className="text-gray-600 mb-2">Money Balance</p>
                <p className="text-4xl font-bold text-green-700">{formatCurrency(wallet.balance || 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl p-6">
                <p className="text-gray-600 mb-2">Points</p>
                <p className="text-4xl font-bold text-yellow-700">{wallet.points || 0}</p>
              </div>
            </div>
            <button
              onClick={() => setShowMoneyRequestModal(true)}
              className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold mb-6"
            >
              Request Money from Parent
            </button>
            <div>
              <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
              {wallet.transactions && wallet.transactions.length > 0 ? (
                <div className="space-y-2">
                  {wallet.transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold">{transaction.reason || 'Transaction'}</p>
                        <p className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</p>
                      </div>
                      <p className={`font-bold ${transaction.type === 'points_earned' || transaction.type === 'money_added' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'points_earned' || transaction.type === 'money_added' ? '+' : '-'}
                        {transaction.type.includes('points') ? `${transaction.amount} pts` : formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No transactions yet</p>
              )}
            </div>
          </div>
        )}

        {/* REWARDS TAB */}
        {activeTab === 'rewards' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Gift className="h-8 w-8 text-yellow-600" />
              Rewards & Achievements
            </h2>
            <div className="space-y-4">
              {rewards.length > 0 ? (
                rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`border-2 rounded-xl p-4 ${
                      reward.status === 'available' ? 'border-yellow-200 bg-yellow-50' :
                      reward.status === 'redeemed' ? 'border-blue-200 bg-blue-50' :
                      'border-green-200 bg-green-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1">{reward.name}</h3>
                        {reward.description && (
                          <p className="text-gray-600 mb-2">{reward.description}</p>
                        )}
                        <p className="text-sm font-semibold text-gray-700">
                          Cost: {reward.cost} {reward.type === 'points' ? 'points' : formatCurrency(reward.cost)}
                        </p>
                      </div>
                      <div className="ml-4">
                        {reward.status === 'available' && (
                          <button
                            onClick={() => handleRedeemReward(reward.id)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-semibold"
                          >
                            Redeem
                          </button>
                        )}
                        {reward.status === 'redeemed' && (
                          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                            Waiting Approval
                          </span>
                        )}
                        {reward.status === 'approved' && (
                          <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                            Approved! 🎉
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No rewards available yet!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              Messages
            </h2>
            <div className="space-y-4">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <p className="font-semibold mb-1">{message.subject || 'Message'}</p>
                    <p className="text-gray-600">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(message.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No messages yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HEALTH TAB */}
        {activeTab === 'health' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-600" />
              Health & Well-Being
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">How I Feel Today</h3>
                <div className="grid grid-cols-5 gap-3">
                  {['😊', '😄', '😐', '😔', '😢'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setMood(emoji)}
                      className={`p-4 text-4xl rounded-xl border-2 transition-all ${
                        mood === emoji ? 'border-purple-500 bg-purple-100 scale-110' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4">Medicine Reminders</h3>
                <p className="text-gray-500">No reminders set</p>
              </div>
            </div>
          </div>
        )}

        {/* BEHAVIOR TAB */}
        {activeTab === 'behavior' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Star className="h-8 w-8 text-yellow-600" />
              Behavior & Achievements
            </h2>
            <div className="space-y-4">
              {behavior.length > 0 ? (
                behavior.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      {item.points > 0 && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg font-semibold">
                          +{item.points} points
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-gray-600 mb-2">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-500">{formatDate(item.createdAt)}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No behavior notes yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              Family Calendar
            </h2>
            <p className="text-gray-500">Calendar view coming soon!</p>
          </div>
        )}

        {/* SAFETY TAB */}
        {activeTab === 'safety' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Shield className="h-8 w-8 text-red-600" />
              Safety & Emergency
            </h2>
            <div className="space-y-6">
              <button
                onClick={() => setShowSOSModal(true)}
                className="w-full py-6 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-bold text-xl"
              >
                🆘 SOS - Alert Parent
              </button>
              <div>
                <h3 className="text-xl font-bold mb-4">Safe Places</h3>
                {safeLocations.length > 0 ? (
                  <div className="space-y-2">
                    {safeLocations.map((location) => (
                      <div key={location.id} className="border rounded-lg p-4">
                        <p className="font-semibold">{location.name}</p>
                        <p className="text-sm text-gray-600">{location.address}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No safe locations set</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GAMES TAB */}
        {activeTab === 'games' && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              <Gamepad2 className="h-8 w-8 text-purple-600" />
              Approved Games
            </h2>
            <p className="text-gray-500">Games section coming soon!</p>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-3xl font-bold mb-6 flex items-center gap-2 dark:text-white">
                <User className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                My Profile
              </h2>
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-300 bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                    {userProfile?.photoURL || photoPreview ? (
                      <img
                        src={photoPreview || userProfile.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-purple-600">
                        {userProfile?.firstName?.[0] || 'C'}{userProfile?.lastName?.[0] || ''}
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="child-photo-upload"
                    className="absolute -bottom-1 -right-1 bg-purple-500 text-white p-2 rounded-full cursor-pointer hover:bg-purple-600 transition-all shadow-lg hover:scale-110"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="child-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {userProfile?.firstName || 'Child'} {userProfile?.lastName || ''}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{userProfile?.email || 'No email'}</p>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                      ⭐ Super Star
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {stats.walletPoints || 0} Points
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAccountInfo(!showAccountInfo)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors flex items-center justify-between px-4"
              >
                <span>Account Information</span>
                <ChevronRight className={`h-5 w-5 transition-transform ${showAccountInfo ? 'rotate-90' : ''}`} />
              </button>
              {showAccountInfo && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Email: {userProfile?.email || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Phone: {userProfile?.phone || 'Not set'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">Account Type: Child Account</span>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Customization */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Palette className="h-6 w-6 text-pink-600" />
                Choose Your Theme
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themes.map((theme, idx) => {
                  const ThemeIcon = theme.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentTheme(theme);
                        toast.success(`${theme.name} theme activated! 🌈`);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                        currentTheme.name === theme.name
                          ? 'border-purple-500 bg-purple-50 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ThemeIcon className={`h-8 w-8 mx-auto mb-2 ${
                        currentTheme.name === theme.name ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <p className="font-semibold text-sm">{theme.name}</p>
                      {currentTheme.name === theme.name && (
                        <CheckCircle className="h-5 w-5 text-purple-600 mx-auto mt-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                <SparklesIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="font-semibold dark:text-white">Notifications</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Get alerts for tasks and rewards</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setNotificationsEnabled(!notificationsEnabled);
                      toast.success(notificationsEnabled ? 'Notifications turned off' : 'Notifications turned on');
                    }}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      notificationsEnabled ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      notificationsEnabled ? 'translate-x-7' : ''
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                    <div>
                      <p className="font-semibold dark:text-white">Sounds</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Play sounds for actions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      toast.success(soundEnabled ? 'Sounds turned off' : 'Sounds turned on');
                    }}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      soundEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      soundEnabled ? 'translate-x-7' : ''
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Achievements & Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                My Achievements
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl">
                  <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-700">{stats.completedTasks}</p>
                  <p className="text-sm text-gray-600">Tasks Done</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                  <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">{stats.walletPoints}</p>
                  <p className="text-sm text-gray-600">Total Points</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl">
                  <PiggyBank className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalSaved)}</p>
                  <p className="text-sm text-gray-600">Total Saved</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                  <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-700">{rewards.filter(r => r.status === 'approved').length}</p>
                  <p className="text-sm text-gray-600">Rewards</p>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border-2 border-red-100 dark:border-red-900">
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                <Shield className="h-6 w-6" />
                Account
              </h3>
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
                You'll need to sign in again to access your dashboard
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* Money Request Modal */}
      {showMoneyRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Request Money</h2>
              <button onClick={() => setShowMoneyRequestModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Amount</label>
                <input
                  type="number"
                  value={moneyRequestForm.amount}
                  onChange={(e) => setMoneyRequestForm({ ...moneyRequestForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Reason</label>
                <textarea
                  value={moneyRequestForm.reason}
                  onChange={(e) => setMoneyRequestForm({ ...moneyRequestForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="Why do you need this money?"
                  rows={3}
                />
              </div>
              <button
                onClick={handleRequestMoney}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Send SOS Alert?</h2>
              <p className="text-gray-600">This will notify your parent immediately</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowSOSModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSendSOS}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                Send SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
