// src/pages/Security.jsx - Comprehensive Security Management
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { securityService } from '../services/firebaseService';
import {
  Shield,
  Lock,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Eye,
  EyeOff,
  LogOut,
  Trash2,
  RefreshCw,
  Bell,
  Settings,
  Activity,
  AlertCircle,
  Info,
  Check,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Security() {
  const { currentUser, userProfile, updateUserPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [securitySettings, setSecuritySettings] = useState(null);
  
  // Password change form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Load all data
  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [history, sessions, alerts, settings] = await Promise.all([
        securityService.getLoginHistory(currentUser.uid),
        securityService.getActiveSessions(currentUser.uid),
        securityService.getSecurityAlerts(currentUser.uid),
        securityService.getSecuritySettings(currentUser.uid)
      ]);

      setLoginHistory(history);
      setActiveSessions(sessions);
      setSecurityAlerts(alerts);
      setSecuritySettings(settings);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate password strength
  useEffect(() => {
    if (passwordForm.newPassword) {
      let strength = 0;
      const password = passwordForm.newPassword;

      if (password.length >= 8) strength += 1;
      if (password.length >= 12) strength += 1;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
      if (/\d/.test(password)) strength += 1;
      if (/[^a-zA-Z\d]/.test(password)) strength += 1;

      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [passwordForm.newPassword]);

  // Handle password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordStrength < 3) {
      toast.error('Password is too weak. Please use a stronger password.');
      return;
    }

    setSubmitting(true);
    try {
      await updateUserPassword(passwordForm.newPassword, passwordForm.currentPassword);
      toast.success('Password updated successfully!');
      setShowPasswordForm(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Add security alert
      await securityService.addSecurityAlert(currentUser.uid, {
        type: 'password_change',
        title: 'Password Changed',
        message: 'Your account password was successfully changed.',
        severity: 'medium'
      });
      
      await loadAllData();
    } catch (error) {
      console.error('Password change error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // End session
  const handleEndSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to end this session?')) return;
    
    try {
      await securityService.endSession(sessionId, currentUser.uid);
      toast.success('Session ended');
      await loadAllData();
    } catch (error) {
      toast.error('Failed to end session');
    }
  };

  // Mark alert as read
  const handleMarkAlertAsRead = async (alertId) => {
    try {
      await securityService.markSecurityAlertAsRead(alertId);
      await loadAllData();
    } catch (error) {
      toast.error('Failed to update alert');
    }
  };

  // Get device icon
  const getDeviceIcon = (userAgent) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    if (ua.includes('tablet') || ua.includes('ipad')) {
      return Tablet;
    }
    return Monitor;
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-orange-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  // Get password strength text
  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Very Weak';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const unreadAlerts = securityAlerts.filter(a => !a.read).length;
  const recentLogins = loginHistory.slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          Security & Privacy
        </h1>
        <p className="text-gray-600 mt-1">Manage your account security and privacy settings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{activeSessions.length}</span>
          </div>
          <p className="text-sm text-gray-600">Active Sessions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{loginHistory.length}</span>
          </div>
          <p className="text-sm text-gray-600">Total Logins</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{unreadAlerts}</span>
          </div>
          <p className="text-sm text-gray-600">Unread Alerts</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <span className={`text-2xl font-bold ${securitySettings?.twoFactorEnabled ? 'text-green-600' : 'text-gray-400'}`}>
              {securitySettings?.twoFactorEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <p className="text-sm text-gray-600">2FA Status</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'sessions', label: 'Active Sessions', icon: Monitor },
          { id: 'history', label: 'Login History', icon: Clock },
          { id: 'alerts', label: 'Security Alerts', icon: Bell },
          { id: 'password', label: 'Change Password', icon: Key },
          { id: 'settings', label: 'Security Settings', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === 'alerts' && unreadAlerts > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recent Logins */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Recent Login Activity
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {recentLogins.length > 0 ? (
                recentLogins.map((login) => {
                  const DeviceIcon = getDeviceIcon(login.userAgent);
                  return (
                    <div key={login.id} className="p-4 flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${login.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {login.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <DeviceIcon className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{login.device || 'Unknown Device'}</p>
                        <p className="text-sm text-gray-500">{login.location || 'Unknown Location'}</p>
                        <p className="text-xs text-gray-400">
                          {login.timestamp ? new Date(login.timestamp).toLocaleString() : 'Unknown time'}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        login.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {login.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-gray-500">No login history available</div>
              )}
            </div>
            {loginHistory.length > 5 && (
              <div className="p-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Login History →
                </button>
              </div>
            )}
          </div>

          {/* Security Alerts Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                Recent Security Alerts
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {securityAlerts.slice(0, 3).length > 0 ? (
                securityAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className={`p-4 border-l-4 ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                          {!alert.read && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">New</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown time'}
                        </p>
                      </div>
                      {!alert.read && (
                        <button
                          onClick={() => handleMarkAlertAsRead(alert.id)}
                          className="ml-4 p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-500">No security alerts</div>
              )}
            </div>
            {securityAlerts.length > 3 && (
              <div className="p-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All Alerts →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-600" />
              Active Sessions
            </h2>
            <button
              onClick={loadAllData}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {activeSessions.length > 0 ? (
              activeSessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.userAgent);
                const isCurrentSession = session.sessionId === `session_${Date.now()}`; // Simplified check
                return (
                  <div key={session.id} className="p-6 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <DeviceIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{session.device || 'Unknown Device'}</h3>
                        {isCurrentSession && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{session.location || 'Unknown Location'}</p>
                      <p className="text-xs text-gray-500">
                        IP: {session.ipAddress || 'Unknown'} • Last active: {
                          session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'Unknown'
                        }
                      </p>
                    </div>
                    {!isCurrentSession && (
                      <button
                        onClick={() => handleEndSession(session.sessionId)}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        End Session
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-500">No active sessions</div>
            )}
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Login History
            </h2>
            <p className="text-sm text-gray-600 mt-1">View all your account login attempts</p>
          </div>
          <div className="divide-y divide-gray-100">
            {loginHistory.length > 0 ? (
              loginHistory.map((login) => {
                const DeviceIcon = getDeviceIcon(login.userAgent);
                return (
                  <div key={login.id} className="p-4 flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${login.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {login.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>
                    <DeviceIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{login.device || 'Unknown Device'}</p>
                      <p className="text-sm text-gray-500">{login.location || 'Unknown Location'}</p>
                      <p className="text-xs text-gray-400">
                        {login.timestamp ? new Date(login.timestamp).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        login.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {login.success ? 'Success' : 'Failed'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">{login.ipAddress || 'Unknown IP'}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-500">No login history available</div>
            )}
          </div>
        </div>
      )}

      {/* Security Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Security Alerts
            </h2>
            <p className="text-sm text-gray-600 mt-1">Important security notifications and events</p>
          </div>
          <div className="divide-y divide-gray-100">
            {securityAlerts.length > 0 ? (
              securityAlerts.map((alert) => (
                <div key={alert.id} className={`p-6 border-l-4 ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'high' ? 'text-orange-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        {!alert.read && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">New</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'Unknown time'}
                      </p>
                    </div>
                    {!alert.read && (
                      <button
                        onClick={() => handleMarkAlertAsRead(alert.id)}
                        className="ml-4 p-2 hover:bg-gray-100 rounded-lg"
                        title="Mark as read"
                      >
                        <Check className="h-5 w-5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">No security alerts</div>
            )}
          </div>
        </div>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Key className="h-5 w-5 text-blue-600" />
            Change Password
          </h2>

          {!showPasswordForm ? (
            <div className="text-center py-12">
              <div className="p-4 bg-blue-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Lock className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Update Your Password</h3>
              <p className="text-gray-600 mb-6">Keep your account secure with a strong password</p>
              <button
                onClick={() => setShowPasswordForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700"
              >
                Change Password
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordForm.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password Strength</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength <= 2 ? 'text-red-600' :
                        passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p className={passwordForm.newPassword.length >= 8 ? 'text-green-600' : ''}>
                        {passwordForm.newPassword.length >= 8 ? '✓' : '○'} At least 8 characters
                      </p>
                      <p className={/[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                        {/[a-z]/.test(passwordForm.newPassword) && /[A-Z]/.test(passwordForm.newPassword) ? '✓' : '○'} Upper and lowercase letters
                      </p>
                      <p className={/\d/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                        {/\d/.test(passwordForm.newPassword) ? '✓' : '○'} At least one number
                      </p>
                      <p className={/[^a-zA-Z\d]/.test(passwordForm.newPassword) ? 'text-green-600' : ''}>
                        {/[^a-zA-Z\d]/.test(passwordForm.newPassword) ? '✓' : '○'} At least one special character
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || passwordStrength < 3 || passwordForm.newPassword !== passwordForm.confirmPassword}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'settings' && securitySettings && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-blue-600" />
            Security Settings
          </h2>

          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-600 mt-1">Add an extra layer of security to your account</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    securitySettings.twoFactorEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={async () => {
                      const newValue = !securitySettings.twoFactorEnabled;
                      try {
                        await securityService.updateSecuritySettings(currentUser.uid, {
                          twoFactorEnabled: newValue
                        });
                        setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: newValue }));
                        toast.success(`2FA ${newValue ? 'enabled' : 'disabled'}`);
                      } catch (error) {
                        toast.error('Failed to update setting');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    {securitySettings.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>

            {/* Login Alerts */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Bell className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Login Alerts</h3>
                    <p className="text-sm text-gray-600 mt-1">Get notified when someone logs into your account</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !securitySettings.loginAlerts;
                    try {
                      await securityService.updateSecuritySettings(currentUser.uid, {
                        loginAlerts: newValue
                      });
                      setSecuritySettings(prev => ({ ...prev, loginAlerts: newValue }));
                      toast.success(`Login alerts ${newValue ? 'enabled' : 'disabled'}`);
                    } catch (error) {
                      toast.error('Failed to update setting');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.loginAlerts ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      securitySettings.loginAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Suspicious Activity Alerts */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Suspicious Activity Alerts</h3>
                    <p className="text-sm text-gray-600 mt-1">Get notified about unusual account activity</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const newValue = !securitySettings.suspiciousActivityAlerts;
                    try {
                      await securityService.updateSecuritySettings(currentUser.uid, {
                        suspiciousActivityAlerts: newValue
                      });
                      setSecuritySettings(prev => ({ ...prev, suspiciousActivityAlerts: newValue }));
                      toast.success(`Suspicious activity alerts ${newValue ? 'enabled' : 'disabled'}`);
                    } catch (error) {
                      toast.error('Failed to update setting');
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    securitySettings.suspiciousActivityAlerts ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      securitySettings.suspiciousActivityAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

