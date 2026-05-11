// src/pages/Dashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { userDataService } from '../services/userDataService';
import {
  DollarSign,
  Wrench,
  FileText,
  MessageCircle,
  AlertTriangle,
  Calendar,
  Home,
  Plus,
  Bell,
  TrendingUp,
  Users,
  Shield,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  Key,
  TrendingDown,
  BarChart3,
  Wallet,
  Sun,
  Moon,
  Monitor,
  User
} from 'lucide-react';

// Safe data processing with useMemo for performance
export default function Dashboard({ dashboardData: onboardingData }) {
  const { maintenanceRequests = [], rentPayments = [], documents = [], messages = [], loading } = useFamily();
  const { userProfile, currentUser } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  
  const [renterData, setRenterData] = useState(onboardingData || {});
  const [loadingRenterData, setLoadingRenterData] = useState(false);

  // Determine user type (owner or renter)
  const userType = userProfile?.userType || 'renter';
  const isOwner = userType === 'owner';
  const isRenter = userType === 'renter';

  // Load renter data from Firestore if not provided via props - optimized with caching
  useEffect(() => {
    const loadRenterData = async () => {
      if (!currentUser || !isRenter) return;
      
      // If we already have data from props, use it
      if (onboardingData && Object.keys(onboardingData).length > 0) {
        setRenterData(onboardingData);
        return;
      }

      // Check cache first to avoid unnecessary Firestore reads
      const cacheKey = `renter_data_${currentUser.uid}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Use cached data if less than 5 minutes old
          const cacheTime = parsed._cacheTime || 0;
          if (Date.now() - cacheTime < 5 * 60 * 1000) {
            setRenterData(parsed);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to load
        }
      }

      // Otherwise, load from Firestore
      try {
        setLoadingRenterData(true);
        const data = await userDataService.getRenterData(currentUser.uid);
        if (data) {
          // Cache the data with timestamp
          const dataWithCache = { ...data, _cacheTime: Date.now() };
          sessionStorage.setItem(cacheKey, JSON.stringify(dataWithCache));
          setRenterData(data);
          console.log('Renter data loaded:', data);
        }
      } catch (error) {
        console.error('Error loading renter data:', error);
      } finally {
        setLoadingRenterData(false);
      }
    };

    loadRenterData();
  }, [currentUser, isRenter, onboardingData]);

  // Memoized calculations for better performance
  const dashboardData = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const pendingMaintenance = maintenanceRequests.filter(r => r.status === 'submitted' || r.status === 'pending').length;
    const urgentMaintenance = maintenanceRequests.filter(r => r.priority === 'urgent' && (r.status === 'submitted' || r.status === 'pending')).length;
    const unreadMessages = messages.filter(m => !m.read).length;

    // Find next rent due (real data)
    const nextRentDue = rentPayments
      .filter(p => p.status === 'pending' || p.status === 'due')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    // Documents expiring soon (real calculation)
    const expiringDocuments = documents.filter(d => {
      if (!d.expiryDate) return false;
      const expiry = new Date(d.expiryDate);
      return expiry <= thirtyDaysFromNow && expiry >= now;
    }).length;

    // Recent activities with real timestamps
    const recentActivities = [
      ...maintenanceRequests.slice(0, 3).map(request => ({
        id: request.id,
        type: 'maintenance',
        title: request.title || 'Maintenance Request',
        description: request.description ? request.description.substring(0, 40) + '...' : 'No description',
        time: request.createdAt || request.submittedAt || new Date(),
        status: request.status || 'submitted',
        priority: request.priority,
        icon: Wrench
      })),
      // Only include rent payments for renters
      ...(isRenter ? rentPayments.slice(0, 2).map(payment => ({
        id: payment.id,
        type: 'rent',
        title: `Rent ${payment.status === 'paid' ? 'Paid' : 'Due'}`,
        description: `$${payment.amount || '0'}`,
        time: payment.paidDate || payment.dueDate || new Date(),
        status: payment.status || 'pending',
        icon: DollarSign
      })) : []),
      ...messages.slice(0, 2).map(message => ({
        id: message.id,
        type: 'message',
        title: message.subject || 'New Message',
        description: message.content ? message.content.substring(0, 30) + '...' : 'No content',
        time: message.createdAt || message.timestamp || new Date(),
        status: message.read ? 'read' : 'unread',
        icon: MessageCircle
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    return {
      pendingMaintenance,
      urgentMaintenance,
      unreadMessages,
      nextRentDue,
      expiringDocuments,
      recentActivities,
      totalDocuments: documents.length
    };
  }, [maintenanceRequests, rentPayments, documents, messages]);

  const { pendingMaintenance, urgentMaintenance, unreadMessages, nextRentDue, expiringDocuments, recentActivities, totalDocuments } = dashboardData;

  // Owner-specific stats
  const ownerStats = useMemo(() => {
    const property = userProfile?.property || {};
    const mortgage = property?.mortgage || {};
    const propertyValue = property?.currentValue || 0;
    const mortgageBalance = mortgage?.loanAmount || 0;
    const monthlyMortgage = mortgage?.monthlyPayment || 0;
    const equity = propertyValue - mortgageBalance;

    return [
      {
        title: 'Property Value',
        value: `$${(propertyValue / 1000).toFixed(0)}k`,
        subtitle: 'Current estimated value',
        icon: Home,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        link: '/profile',
        status: 'active'
      },
      {
        title: 'Mortgage Balance',
        value: `$${(mortgageBalance / 1000).toFixed(0)}k`,
        subtitle: monthlyMortgage > 0 ? `$${monthlyMortgage}/mo` : 'No mortgage',
        icon: Key,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50 border-purple-200',
        link: '/profile',
        status: mortgageBalance > 0 ? 'active' : 'paid'
      },
      {
        title: 'Home Equity',
        value: `$${(equity / 1000).toFixed(0)}k`,
        subtitle: equity > 0 ? 'Positive equity' : 'Negative equity',
        icon: TrendingUp,
        color: equity > 0 ? 'text-green-600' : 'text-red-600',
        bgColor: equity > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
        link: '/profile',
        status: equity > 0 ? 'positive' : 'negative'
      },
      {
        title: 'Maintenance',
        value: pendingMaintenance,
        subtitle: `${urgentMaintenance} urgent`,
        icon: Wrench,
        color: 'text-orange-600',
        bgColor: urgentMaintenance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200',
        link: '/maintenance',
        status: urgentMaintenance > 0 ? 'urgent' : pendingMaintenance > 0 ? 'pending' : 'clear'
      }
    ];
  }, [userProfile?.property, pendingMaintenance, urgentMaintenance]);

  // Renter stats (existing)
  const renterStats = [
    {
      title: 'Rent Status',
      value: nextRentDue ? `$${nextRentDue.amount || '0'}` : 'Paid',
      subtitle: nextRentDue ?
        `Due ${new Date(nextRentDue.dueDate).toLocaleDateString()}` :
        'All caught up',
      icon: DollarSign,
      color: nextRentDue ? 'text-orange-600' : 'text-green-600',
      bgColor: nextRentDue ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200',
      link: '/rent',
      status: nextRentDue ? 'pending' : 'paid'
    },
    {
      title: 'Maintenance',
      value: pendingMaintenance,
      subtitle: `${urgentMaintenance} urgent`,
      icon: Wrench,
      color: 'text-blue-600',
      bgColor: urgentMaintenance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200',
      link: '/maintenance',
      status: urgentMaintenance > 0 ? 'urgent' : pendingMaintenance > 0 ? 'pending' : 'clear'
    },
    {
      title: 'Documents',
      value: totalDocuments,
      subtitle: `${expiringDocuments} expiring soon`,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: expiringDocuments > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-purple-50 border-purple-200',
      link: '/documents',
      status: expiringDocuments > 0 ? 'expiring' : 'current'
    },
    {
      title: 'Messages',
      value: unreadMessages,
      subtitle: 'Unread messages',
      icon: MessageCircle,
      color: 'text-red-600',
      bgColor: unreadMessages > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200',
      link: '/messages',
      status: unreadMessages > 0 ? 'unread' : 'read'
    }
  ];

  // Use appropriate stats based on user type
  const stats = isOwner ? ownerStats : renterStats;

  // Owner quick actions
  const ownerQuickActions = [
    {
      title: 'Property Management',
      description: 'Manage your property',
      icon: Building2,
      link: '/profile',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'View Maintenance',
      description: 'Track maintenance requests',
      icon: Wrench,
      link: '/maintenance',
      color: 'bg-orange-500 hover:bg-orange-600',
      badge: urgentMaintenance > 0 ? `${urgentMaintenance} urgent` : null
    },
    {
      title: 'Financial Overview',
      description: 'View budget & expenses',
      icon: BarChart3,
      link: '/budget',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Messages',
      description: 'View messages',
      icon: MessageCircle,
      link: '/messages',
      color: 'bg-red-500 hover:bg-red-600',
      badge: unreadMessages > 0 ? `${unreadMessages} new` : null
    }
  ];

  // Renter quick actions
  const renterQuickActions = [
    {
      title: 'Pay Rent',
      description: 'Make a rent payment',
      icon: DollarSign,
      link: '/rent',
      color: 'bg-green-500 hover:bg-green-600',
      badge: nextRentDue ? 'Due Soon' : null
    },
    {
      title: 'Request Repair',
      description: 'Submit maintenance request',
      icon: Wrench,
      link: '/maintenance',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Upload Document',
      description: 'Add new document',
      icon: FileText,
      link: '/documents',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Contact Support',
      description: 'Send a message',
      icon: MessageCircle,
      link: '/messages',
      color: 'bg-red-500 hover:bg-red-600',
      badge: unreadMessages > 0 ? `${unreadMessages} new` : null
    }
  ];

  // Use appropriate quick actions based on user type
  const quickActions = isOwner ? ownerQuickActions : renterQuickActions;

  const getStatusConfig = (status) => {
    const configs = {
      paid: { color: 'text-green-600 bg-green-100', text: 'Paid', icon: CheckCircle },
      completed: { color: 'text-green-600 bg-green-100', text: 'Completed', icon: CheckCircle },
      read: { color: 'text-green-600 bg-green-100', text: 'Read', icon: CheckCircle },
      pending: { color: 'text-yellow-600 bg-yellow-100', text: 'Pending', icon: Clock },
      submitted: { color: 'text-yellow-600 bg-yellow-100', text: 'Submitted', icon: Clock },
      due: { color: 'text-orange-600 bg-orange-100', text: 'Due', icon: AlertCircle },
      overdue: { color: 'text-red-600 bg-red-100', text: 'Overdue', icon: AlertCircle },
      unread: { color: 'text-red-600 bg-red-100', text: 'Unread', icon: AlertCircle },
      urgent: { color: 'text-red-600 bg-red-100', text: 'Urgent', icon: AlertCircle },
      'in-progress': { color: 'text-blue-600 bg-blue-100', text: 'In Progress', icon: Clock },
      default: { color: 'text-gray-600 bg-gray-100', text: status, icon: Clock }
    };

    return configs[status] || configs.default;
  };

  if (loading.maintenance || loading.rent || loading.documents) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 min-h-screen transition-colors duration-200 ${!isDark
        ? 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
        : 'bg-gray-900'
      }`}>
      {/* Welcome Header with Theme Toggle */}
      <div className={`bg-gradient-to-r rounded-2xl p-6 text-white relative overflow-hidden ${isOwner
        ? 'from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-700'
        : 'from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700'
        }`}>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {userProfile?.firstName || 'Family'}! 👋
            </h1>
            <p className="text-white/80 text-lg">
              {isOwner ? 'Property Owner Dashboard' : 'Renter Dashboard'} • {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 hover:scale-110 shadow-lg"
            title={`Current theme: ${theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}. Click to toggle.`}
          >
            {theme === 'system' ? (
              <Monitor className="h-6 w-6 text-white" />
            ) : isDark ? (
              <Moon className="h-6 w-6 text-white" />
            ) : (
              <Sun className="h-6 w-6 text-white" />
            )}
          </button>
        </div>
        <div className="absolute right-6 top-6 opacity-20">
          {isOwner ? <Building2 className="h-24 w-24" /> : <Home className="h-24 w-24" />}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => navigate(stat.link)}
              className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
            >
              <div className={`rounded-2xl border-2 p-6 hover:shadow-lg transition-all duration-200 dark:border-gray-700 ${stat.bgColor} dark:bg-gray-800`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white dark:bg-gray-700 bg-opacity-50 dark:bg-opacity-100 shadow-sm">
                    <Icon className={`h-6 w-6 ${stat.color} dark:text-gray-200`} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${stat.status === 'paid' || stat.status === 'clear' || stat.status === 'read'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    stat.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                      stat.status === 'urgent' || stat.status === 'unread' || stat.status === 'overdue'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                        stat.status === 'expiring'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}>
                    {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{stat.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h2>
              <TrendingUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.link}
                    className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group transform hover:scale-105 bg-white dark:bg-gray-700"
                  >
                    <div className={`p-3 rounded-lg ${action.color} text-white mr-4 group-hover:scale-110 transition-transform shadow-md`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{action.title}</h3>
                        {action.badge && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full font-medium">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Renter Information Card - Shows onboarding data */}
          {isRenter && renterData && Object.keys(renterData).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Your Family Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Family Info */}
                {renterData.family && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Family
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Family Size:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{renterData.family.size || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Adults:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{renterData.family.adults || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Children:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{renterData.family.children || 0}</span>
                      </div>
                      {renterData.family.hasPets && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pets:</span>
                          <span className="font-medium text-gray-900 dark:text-white">Yes</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Housing Info */}
                {renterData.housing && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <Home className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                      Housing
                    </h3>
                    <div className="space-y-2 text-sm">
                      {renterData.housing.address && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Address:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {renterData.housing.address.street || ''}
                            {renterData.housing.address.city && `, ${renterData.housing.address.city}`}
                            {renterData.housing.address.state && `, ${renterData.housing.address.state}`}
                            {renterData.housing.address.zipCode && ` ${renterData.housing.address.zipCode}`}
                          </p>
                        </div>
                      )}
                      {renterData.housing.moveInDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Move-in Date:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(renterData.housing.moveInDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {renterData.housing.leaseDuration && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Lease Duration:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{renterData.housing.leaseDuration} months</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Financial Info */}
                {renterData.financial && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                      Financial
                    </h3>
                    <div className="space-y-2 text-sm">
                      {renterData.financial.monthlyIncome && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Monthly Income:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${renterData.financial.monthlyIncome.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {renterData.financial.rentBudget && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Rent Budget:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${renterData.financial.rentBudget.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {renterData.financial.employmentStatus && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Employment:</span>
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {renterData.financial.employmentStatus}
                          </span>
                        </div>
                      )}
                      {renterData.financial.employer && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Employer:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{renterData.financial.employer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal Info */}
                {renterData.personal && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      <User className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                      Personal
                    </h3>
                    <div className="space-y-2 text-sm">
                      {renterData.personal.occupation && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Occupation:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{renterData.personal.occupation}</span>
                        </div>
                      )}
                      {renterData.personal.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{renterData.personal.phone}</span>
                        </div>
                      )}
                      {renterData.personal.emergencyContact && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Emergency Contact:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {renterData.personal.emergencyContact.name}
                            {renterData.personal.emergencyContact.relationship && ` (${renterData.personal.emergencyContact.relationship})`}
                          </p>
                          {renterData.personal.emergencyContact.phone && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{renterData.personal.emergencyContact.phone}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rent Overview - Only for Renters */}
          {isRenter && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Rent Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Next Payment Card */}
                <div className={`p-6 rounded-xl border-2 dark:border-gray-700 ${nextRentDue ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Next Payment</h3>
                    <DollarSign className={`h-5 w-5 ${nextRentDue ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {nextRentDue ? `$${nextRentDue.amount || '0'}` : 'All Paid'}
                    </p>
                    <p className={`text-sm font-medium ${nextRentDue ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                      {nextRentDue ?
                        `Due ${new Date(nextRentDue.dueDate).toLocaleDateString()}` :
                        'No pending payments'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/rent')}
                    className={`w-full mt-4 py-2 rounded-lg font-semibold transition-colors ${nextRentDue
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                  >
                    {nextRentDue ? 'Pay Now' : 'View History'}
                  </button>
                </div>

                {/* Payment Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Total Paid This Year</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{new Date().getFullYear()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ${rentPayments
                          .filter(p => p.status === 'paid')
                          .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">On track</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Payment History</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Last 12 months</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {rentPayments.filter(p => p.status === 'paid').length}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Payments</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Property Overview - Only for Owners */}
          {isOwner && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Property Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Value Card */}
                <div className="p-6 rounded-xl border-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Property Value</h3>
                    <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      ${((userProfile?.property?.currentValue || 0) / 1000).toFixed(0)}k
                    </p>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Current estimated value
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full mt-4 py-2 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                  >
                    View Details
                  </button>
                </div>

                {/* Mortgage Summary */}
                <div className="space-y-4">
                  {userProfile?.property?.mortgage?.hasMortgage ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Mortgage Balance</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Remaining loan</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${((userProfile?.property?.mortgage?.loanAmount || 0) / 1000).toFixed(0)}k
                          </p>
                          <p className="text-sm text-purple-600 dark:text-purple-400">Outstanding</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">Monthly Payment</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Mortgage payment</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ${userProfile?.property?.mortgage?.monthlyPayment || 0}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">Per month</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Mortgage Status</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">No active mortgage</p>
                      </div>
                      <div className="text-right">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">Owned</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              <Bell className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => {
                  const Icon = activity.icon;
                  const statusConfig = getStatusConfig(activity.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                      onClick={() => navigate(`/${activity.type}`)}
                    >
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(activity.time).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <StatusIcon className={`h-3 w-3 ${statusConfig.color.replace('text-', 'text-').replace('bg-', '')} dark:text-gray-300`} />
                        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.color} dark:bg-opacity-30`}>
                          {statusConfig.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {isOwner
                      ? 'Get started by managing your property or viewing maintenance requests'
                      : 'Get started by paying rent or submitting a request'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Emergency Section */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Emergency Assistance</h3>
                <p className="text-red-600 dark:text-red-400 text-sm">24/7 support available</p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-red-600 dark:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-colors flex items-center justify-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Emergency Help</span>
              </button>
              <button className="w-full bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-700 py-2 px-4 rounded-lg font-semibold hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                Emergency Contacts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Alerts */}
      {urgentMaintenance > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/40 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300">Urgent Maintenance Needed</h3>
                <p className="text-orange-600 dark:text-orange-400">You have {urgentMaintenance} urgent maintenance request(s) requiring attention</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/maintenance')}
              className="bg-orange-600 dark:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors"
            >
              View Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );
}