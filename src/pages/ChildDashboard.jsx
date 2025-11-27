// src/pages/ChildDashboard.jsx - Amazing Child Dashboard
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { childrenService, savingsService } from '../services/firebaseService';
import {
  PiggyBank,
  Target,
  Star,
  Trophy,
  Gift,
  Sparkles,
  TrendingUp,
  DollarSign,
  Award,
  Rocket,
  Heart,
  Zap,
  Calendar,
  CheckCircle,
  Coins,
  Gem,
  Crown,
  Rainbow,
  Sun,
  Moon,
  Cloud,
  Flower2,
  PartyPopper
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChildDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [childData, setChildData] = useState(null);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [celebration, setCelebration] = useState(false);

  // Fun colors and themes
  const themes = [
    { name: 'Rainbow', colors: ['from-pink-500', 'via-purple-500', 'to-blue-500'], icon: Rainbow },
    { name: 'Sunshine', colors: ['from-yellow-400', 'to-orange-500'], icon: Sun },
    { name: 'Ocean', colors: ['from-cyan-400', 'to-blue-600'], icon: Cloud },
    { name: 'Garden', colors: ['from-green-400', 'to-emerald-600'], icon: Flower2 }
  ];

  const [currentTheme, setCurrentTheme] = useState(themes[0]);

  // Load child data
  useEffect(() => {
    if (currentUser) {
      loadChildData();
    }
  }, [currentUser]);

  const loadChildData = async () => {
    setLoading(true);
    try {
      // Get all children and find the one matching current user or first child
      const children = await childrenService.getChildren(currentUser.uid);
      const child = children.length > 0 ? children[0] : null;
      
      if (child) {
        setChildData(child);
        // Get savings goals for this child
        const goals = await savingsService.getUserSavings(currentUser.uid);
        const childGoals = goals.filter(g => g.childId === child.id);
        setSavingsGoals(childGoals);
      }
    } catch (error) {
      console.error('Error loading child data:', error);
      toast.error('Failed to load your dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSaved = savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalTarget = savingsGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const activeGoals = savingsGoals.filter(g => g.status === 'active').length;
    const completedGoals = savingsGoals.filter(g => g.status === 'completed').length;
    const progress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    
    return { totalSaved, totalTarget, activeGoals, completedGoals, progress };
  }, [savingsGoals]);

  // Calculate age
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get achievements
  const achievements = useMemo(() => {
    const achieved = [];
    
    if (stats.totalSaved >= 100) achieved.push({ name: 'First Hundred', icon: Coins, color: 'text-yellow-600' });
    if (stats.totalSaved >= 500) achieved.push({ name: 'Half Grand', icon: Gem, color: 'text-purple-600' });
    if (stats.completedGoals >= 1) achieved.push({ name: 'Goal Master', icon: Target, color: 'text-green-600' });
    if (stats.completedGoals >= 3) achieved.push({ name: 'Super Saver', icon: Trophy, color: 'text-blue-600' });
    if (stats.activeGoals >= 5) achieved.push({ name: 'Multi-Goal', icon: Star, color: 'text-pink-600' });
    if (stats.progress >= 50) achieved.push({ name: 'Halfway Hero', icon: Award, color: 'text-orange-600' });
    if (stats.progress >= 100) achieved.push({ name: 'Champion', icon: Crown, color: 'text-indigo-600' });
    
    return achieved;
  }, [stats]);

  // Get motivational message
  const getMotivationalMessage = () => {
    const messages = [
      "You're doing amazing! Keep saving! 🌟",
      "Every dollar counts! You're a superstar! ⭐",
      "Look at you go! You're crushing your goals! 🚀",
      "You're building an awesome future! Keep it up! 💪",
      "Wow! You're a savings champion! 🏆",
      "Amazing progress! You're unstoppable! 🌈"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Check for completed goals to celebrate
  useEffect(() => {
    const justCompleted = savingsGoals.filter(g => {
      const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
      return progress >= 100 && g.status !== 'completed';
    });
    
    if (justCompleted.length > 0) {
      setCelebration(true);
      setTimeout(() => setCelebration(false), 5000);
    }
  }, [savingsGoals]);

  // Generate emoji positions once
  const emojiPositions = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      left: `${(i * 5) % 100}%`,
      top: `${(i * 7) % 100}%`,
      delay: i * 0.1,
      emoji: ['🎉', '🎊', '⭐', '🌟', '✨', '🎈', '🏆', '💫'][i % 8]
    }));
  }, []);

  // Floating emoji component
  const FloatingEmoji = ({ emoji, delay, left, top }) => (
    <div
      className="absolute text-4xl animate-bounce pointer-events-none"
      style={{
        left,
        top,
        animationDelay: `${delay}s`,
        animationDuration: '2s'
      }}
    >
      {emoji}
    </div>
  );

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

  const age = calculateAge(childData.dateOfBirth);
  const childName = childData.name || 'Super Star';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Celebration Animation */}
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="absolute inset-0">
            {emojiPositions.map((pos, i) => (
              <FloatingEmoji
                key={i}
                emoji={pos.emoji}
                delay={pos.delay}
                left={pos.left}
                top={pos.top}
              />
            ))}
          </div>
          <div className="text-center relative z-10">
            <PartyPopper className="h-32 w-32 text-yellow-400 animate-bounce mx-auto mb-4" />
            <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-pulse">
              🎉 CONGRATULATIONS! 🎉
            </h2>
            <p className="text-3xl text-purple-600 font-bold mt-4 animate-pulse">You reached a goal!</p>
            <p className="text-2xl text-pink-600 font-semibold mt-2">You're amazing! 🌟</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`bg-gradient-to-r ${currentTheme.colors.join(' ')} text-white p-8 rounded-b-3xl shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 opacity-20">
          <Sparkles className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold mb-2">
                Hi {childName}! 👋
              </h1>
              <p className="text-xl text-white/90">
                {age !== null ? `${age} years old` : 'Awesome kid'} • {getMotivationalMessage()}
              </p>
            </div>
            <div className="flex gap-2">
              {themes.map((theme, idx) => {
                const ThemeIcon = theme.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentTheme(theme)}
                    className={`p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-all ${
                      currentTheme.name === theme.name ? 'bg-white/30 scale-110' : ''
                    }`}
                  >
                    <ThemeIcon className="h-6 w-6" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Total Savings Card */}
          <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-lg mb-2">Your Total Savings</p>
                <p className="text-5xl font-bold">{formatCurrency(stats.totalSaved)}</p>
                <p className="text-white/70 mt-2">
                  {stats.activeGoals} active goal{stats.activeGoals !== 1 ? 's' : ''} • {stats.completedGoals} completed! 🎉
                </p>
              </div>
              <div className="p-6 bg-white/30 rounded-full">
                <PiggyBank className="h-16 w-16 text-white" />
              </div>
            </div>
            
            {/* Progress Bar */}
            {stats.totalTarget > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-white/90 mb-2">
                  <span className="font-semibold">Overall Progress</span>
                  <span className="font-bold text-xl">{stats.progress.toFixed(0)}%</span>
                </div>
                <div className="h-6 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-300 to-pink-300 rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${Math.min(stats.progress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200 hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-pink-100 rounded-xl group-hover:bg-pink-200 transition-colors">
                <Target className="h-6 w-6 text-pink-600 group-hover:scale-125 transition-transform" />
              </div>
              <Sparkles className="h-5 w-5 text-pink-400 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-pink-600 group-hover:text-pink-700">{stats.activeGoals}</p>
            <p className="text-sm text-gray-600 mt-1">Active Goals</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200 hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                <Trophy className="h-6 w-6 text-green-600 group-hover:scale-125 transition-transform" />
              </div>
              <Star className="h-5 w-5 text-green-400 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-green-600 group-hover:text-green-700">{stats.completedGoals}</p>
            <p className="text-sm text-gray-600 mt-1">Completed!</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <TrendingUp className="h-6 w-6 text-blue-600 group-hover:scale-125 transition-transform" />
              </div>
              <Rocket className="h-5 w-5 text-blue-400 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-blue-600 group-hover:text-blue-700">{formatCurrency(stats.totalSaved)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Saved</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200 hover:scale-110 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <Award className="h-6 w-6 text-purple-600 group-hover:scale-125 transition-transform" />
              </div>
              <Crown className="h-5 w-5 text-purple-400 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700">{achievements.length}</p>
            <p className="text-sm text-gray-600 mt-1">Achievements</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Savings Goals */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-purple-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                  My Savings Goals
                </h2>
              </div>

              {savingsGoals.length > 0 ? (
                <div className="space-y-4">
                  {savingsGoals.map((goal) => {
                    const progress = goal.targetAmount > 0 
                      ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
                      : 0;
                    const isCompleted = progress >= 100;
                    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

                    // Get category icon and color
                    const categoryColors = {
                      education: { bg: 'bg-blue-100', text: 'text-blue-600', icon: '🎓' },
                      health: { bg: 'bg-red-100', text: 'text-red-600', icon: '❤️' },
                      clothes: { bg: 'bg-purple-100', text: 'text-purple-600', icon: '👕' },
                      technology: { bg: 'bg-gray-100', text: 'text-gray-600', icon: '💻' },
                      gifts: { bg: 'bg-pink-100', text: 'text-pink-600', icon: '🎁' },
                      activities: { bg: 'bg-yellow-100', text: 'text-yellow-600', icon: '⭐' },
                      travel: { bg: 'bg-cyan-100', text: 'text-cyan-600', icon: '✈️' },
                      future: { bg: 'bg-green-100', text: 'text-green-600', icon: '🌱' }
                    };

                    const category = categoryColors[goal.category] || categoryColors.future;

                    return (
                      <div
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal)}
                        className={`border-2 rounded-2xl p-6 cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 ${
                          isCompleted 
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100' 
                            : 'border-purple-200 bg-white hover:border-purple-400 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`text-4xl ${category.bg} p-4 rounded-xl`}>
                              {category.icon}
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                {goal.goalName}
                                {isCompleted && (
                                  <span className="text-2xl">🎉</span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-500 capitalize mt-1">{goal.category}</p>
                            </div>
                          </div>
                          {isCompleted && (
                            <div className="p-2 bg-green-100 rounded-full">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-bold text-gray-900">
                              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                            </span>
                            <span className={`font-bold text-lg ${isCompleted ? 'text-green-600' : 'text-purple-600'}`}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ${
                                isCompleted
                                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                  : 'bg-gradient-to-r from-purple-400 to-pink-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Goal Details */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-gray-600">
                            {goal.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(goal.dueDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                          {!isCompleted && (
                            <span className="font-bold text-purple-600">
                              {formatCurrency(remaining)} to go! 💪
                            </span>
                          )}
                          {isCompleted && (
                            <span className="font-bold text-green-600 flex items-center gap-1">
                              <Trophy className="h-4 w-4" />
                              Goal Achieved!
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
                  <Target className="h-16 w-16 text-purple-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No goals yet!</h3>
                  <p className="text-gray-600">Ask a parent to help you set up your first savings goal! 🎯</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements & Fun Stuff */}
          <div className="space-y-6">
            {/* Achievements */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-yellow-100">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Achievements
              </h2>
              {achievements.length > 0 ? (
                <div className="space-y-3">
                  {achievements.map((achievement, idx) => {
                    const Icon = achievement.icon;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200"
                      >
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Icon className={`h-5 w-5 ${achievement.color}`} />
                        </div>
                        <span className="font-semibold text-gray-900">{achievement.name}</span>
                        <Star className="h-4 w-4 text-yellow-400 ml-auto" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Keep saving to unlock achievements! 🌟</p>
                </div>
              )}
            </div>

            {/* Fun Facts */}
            <div className="bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 rounded-3xl p-6 shadow-xl border-2 border-purple-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-purple-600" />
                Fun Facts
              </h2>
              <div className="space-y-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">💰 Your Savings Power</p>
                  <p className="text-xs text-gray-600">
                    You've saved {formatCurrency(stats.totalSaved)}! That's amazing! 🎉
                  </p>
                </div>
                {stats.totalTarget > 0 && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-1">🎯 Progress</p>
                    <p className="text-xs text-gray-600">
                      You're {stats.progress.toFixed(0)}% of the way to all your goals!
                    </p>
                  </div>
                )}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">⭐ You're Awesome!</p>
                  <p className="text-xs text-gray-600">
                    Saving money is a superpower! Keep it up! 🚀
                  </p>
                </div>
              </div>
            </div>

            {/* Motivational Quote */}
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-6 shadow-xl border-2 border-blue-200 text-center">
              <Heart className="h-8 w-8 text-pink-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-900 mb-2">
                "Every great journey starts with a single step!"
              </p>
              <p className="text-sm text-gray-600">
                You're doing amazing! Keep saving and reaching for your dreams! 🌈
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

