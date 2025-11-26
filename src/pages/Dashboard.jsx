// src/pages/Dashboard.jsx
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
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
  Wallet
} from 'lucide-react';

// Safe data processing with useMemo for performance
export default function Dashboard() {
  const { maintenanceRequests = [], rentPayments = [], documents = [], messages = [], loading } = useFamily();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Determine user type (owner or renter)
  const userType = userProfile?.userType || 'renter';
  const isOwner = userType === 'owner';
  const isRenter = userType === 'renter';

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
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className={`bg-gradient-to-r rounded-2xl p-6 text-white relative overflow-hidden ${
        isOwner 
          ? 'from-emerald-600 to-teal-600' 
          : 'from-blue-600 to-purple-600'
      }`}>
        <div className="relative z-10">
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
              <div className={`rounded-2xl border-2 p-6 hover:shadow-lg transition-all duration-200 ${stat.bgColor}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white bg-opacity-50 shadow-sm">
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    stat.status === 'paid' || stat.status === 'clear' || stat.status === 'read' 
                      ? 'bg-green-100 text-green-800' :
                    stat.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' :
                    stat.status === 'urgent' || stat.status === 'unread' || stat.status === 'overdue'
                      ? 'bg-red-100 text-red-800' :
                    stat.status === 'expiring'
                      ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                  }`}>
                    {stat.status.charAt(0).toUpperCase() + stat.status.slice(1)}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-lg font-semibold text-gray-900 mb-2">{stat.title}</p>
                <p className="text-sm text-gray-600">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.link}
                    className="flex items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group transform hover:scale-105"
                  >
                    <div className={`p-3 rounded-lg ${action.color} text-white mr-4 group-hover:scale-110 transition-transform shadow-md`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                        {action.badge && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Rent Overview - Only for Renters */}
          {isRenter && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Rent Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Next Payment Card */}
                <div className={`p-6 rounded-xl border-2 ${
                  nextRentDue ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Next Payment</h3>
                    <DollarSign className={`h-5 w-5 ${nextRentDue ? 'text-orange-600' : 'text-green-600'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      {nextRentDue ? `$${nextRentDue.amount || '0'}` : 'All Paid'}
                    </p>
                    <p className={`text-sm font-medium ${
                      nextRentDue ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {nextRentDue ? 
                        `Due ${new Date(nextRentDue.dueDate).toLocaleDateString()}` : 
                        'No pending payments'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/rent')}
                    className={`w-full mt-4 py-2 rounded-lg font-semibold transition-colors ${
                      nextRentDue 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {nextRentDue ? 'Pay Now' : 'View History'}
                  </button>
                </div>

                {/* Payment Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Total Paid This Year</p>
                      <p className="text-sm text-gray-600">{new Date().getFullYear()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${rentPayments
                          .filter(p => p.status === 'paid')
                          .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-green-600">On track</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Payment History</p>
                      <p className="text-sm text-gray-600">Last 12 months</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {rentPayments.filter(p => p.status === 'paid').length}
                      </p>
                      <p className="text-sm text-blue-600">Payments</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Property Overview - Only for Owners */}
          {isOwner && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Property Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Property Value Card */}
                <div className="p-6 rounded-xl border-2 bg-blue-50 border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Property Value</h3>
                    <Home className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      ${((userProfile?.property?.currentValue || 0) / 1000).toFixed(0)}k
                    </p>
                    <p className="text-sm font-medium text-blue-600">
                      Current estimated value
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full mt-4 py-2 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    View Details
                  </button>
                </div>

                {/* Mortgage Summary */}
                <div className="space-y-4">
                  {userProfile?.property?.mortgage?.hasMortgage ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">Mortgage Balance</p>
                          <p className="text-sm text-gray-600">Remaining loan</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${((userProfile?.property?.mortgage?.loanAmount || 0) / 1000).toFixed(0)}k
                          </p>
                          <p className="text-sm text-purple-600">Outstanding</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">Monthly Payment</p>
                          <p className="text-sm text-gray-600">Mortgage payment</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            ${userProfile?.property?.mortgage?.monthlyPayment || 0}
                          </p>
                          <p className="text-sm text-green-600">Per month</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">Mortgage Status</p>
                        <p className="text-sm text-gray-600">No active mortgage</p>
                      </div>
                      <div className="text-right">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <p className="text-sm text-green-600 mt-1">Owned</p>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
              <Bell className="h-5 w-5 text-gray-400" />
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
                      className="flex items-start space-x-3 group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      onClick={() => navigate(`/${activity.type}`)}
                    >
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.time).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <StatusIcon className={`h-3 w-3 ${statusConfig.color.replace('text-', 'text-').replace('bg-', '')}`} />
                        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.color}`}>
                          {statusConfig.text}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">
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
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Emergency Assistance</h3>
                <p className="text-red-600 text-sm">24/7 support available</p>
              </div>
            </div>
            <div className="space-y-3">
              <button className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Emergency Help</span>
              </button>
              <button className="w-full bg-white text-red-600 border border-red-600 py-2 px-4 rounded-lg font-semibold hover:bg-red-50 transition-colors">
                Emergency Contacts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Alerts */}
      {urgentMaintenance > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-orange-800">Urgent Maintenance Needed</h3>
                <p className="text-orange-600">You have {urgentMaintenance} urgent maintenance request(s) requiring attention</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/maintenance')}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              View Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );
}