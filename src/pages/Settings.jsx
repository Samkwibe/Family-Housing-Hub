// src/pages/Settings.jsx - Complete Settings Page
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  Shield, 
  Smartphone,
  Mail,
  MessageSquare,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Download,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  AlertTriangle,
  Palette,
  Clock,
  Calendar,
  DollarSign,
  Wrench,
  FileText,
  User,
  Lock,
  Key,
  HelpCircle,
  ExternalLink,
  Zap,
  Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('notifications');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Settings state with defaults from userProfile or sensible defaults
  const [settings, setSettings] = useState({
    notifications: {
      email: userProfile?.preferences?.notifications?.email ?? true,
      sms: userProfile?.preferences?.notifications?.sms ?? false,
      push: userProfile?.preferences?.notifications?.push ?? true,
      rentReminders: userProfile?.preferences?.notifications?.rentReminders ?? true,
      maintenanceUpdates: userProfile?.preferences?.notifications?.maintenanceUpdates ?? true,
      documentExpiry: userProfile?.preferences?.notifications?.documentExpiry ?? true,
      weeklyDigest: userProfile?.preferences?.notifications?.weeklyDigest ?? false,
      marketingEmails: userProfile?.preferences?.notifications?.marketingEmails ?? false
    },
    appearance: {
      theme: userProfile?.preferences?.theme || 'system',
      compactMode: userProfile?.preferences?.compactMode ?? false,
      animations: userProfile?.preferences?.animations ?? true,
      highContrast: userProfile?.preferences?.highContrast ?? false
    },
    privacy: {
      showOnlineStatus: userProfile?.preferences?.privacy?.showOnlineStatus ?? true,
      showLastSeen: userProfile?.preferences?.privacy?.showLastSeen ?? true,
      allowAnalytics: userProfile?.preferences?.privacy?.allowAnalytics ?? true,
      shareUsageData: userProfile?.preferences?.privacy?.shareUsageData ?? false
    },
    preferences: {
      language: userProfile?.preferences?.language || 'en',
      currency: userProfile?.preferences?.currency || 'USD',
      dateFormat: userProfile?.preferences?.dateFormat || 'MM/DD/YYYY',
      timezone: userProfile?.preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });

  // Update settings when userProfile changes
  useEffect(() => {
    if (userProfile?.preferences) {
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          ...userProfile.preferences.notifications
        },
        appearance: {
          theme: userProfile.preferences.theme || prev.appearance.theme,
          ...prev.appearance
        },
        preferences: {
          language: userProfile.preferences.language || prev.preferences.language,
          currency: userProfile.preferences.currency || prev.preferences.currency,
          ...prev.preferences
        }
      }));
    }
  }, [userProfile]);

  // Save settings to Firebase
  const saveSettings = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        preferences: {
          ...userProfile?.preferences,
          notifications: settings.notifications,
          theme: settings.appearance.theme,
          compactMode: settings.appearance.compactMode,
          animations: settings.appearance.animations,
          highContrast: settings.appearance.highContrast,
          privacy: settings.privacy,
          language: settings.preferences.language,
          currency: settings.preferences.currency,
          dateFormat: settings.preferences.dateFormat,
          timezone: settings.preferences.timezone
        }
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Toggle a notification setting
  const toggleNotification = (key) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  // Toggle appearance setting
  const toggleAppearance = (key) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [key]: !prev.appearance[key]
      }
    }));
  };

  // Toggle privacy setting
  const togglePrivacy = (key) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key]
      }
    }));
  };

  // Set theme
  const setTheme = (theme) => {
    setSettings(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        theme
      }
    }));
  };

  // Update preference
  const updatePreference = (key, value) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  // Export user data
  const handleExportData = () => {
    const exportData = {
      profile: userProfile,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family-housing-hub-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully!');
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Toggle component
  const Toggle = ({ enabled, onChange, disabled = false }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  // Setting row component
  const SettingRow = ({ icon: Icon, title, description, children, iconColor = 'text-gray-600' }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start space-x-4">
        <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="ml-4">
        {children}
      </div>
    </div>
  );

  // Navigation items
  const navItems = [
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-blue-600' },
    { id: 'appearance', label: 'Appearance', icon: Palette, color: 'text-purple-600' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, color: 'text-green-600' },
    { id: 'preferences', label: 'Preferences', icon: Globe, color: 'text-orange-600' },
    { id: 'account', label: 'Account', icon: User, color: 'text-red-600' }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and application settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-6">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeSection === item.id
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border border-blue-200 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${activeSection === item.id ? item.color : 'text-gray-400'}`} />
                  <span className="font-medium">{item.label}</span>
                  <ChevronRight className={`h-4 w-4 ml-auto transition-transform ${
                    activeSection === item.id ? 'rotate-90 text-blue-600' : 'text-gray-300'
                  }`} />
                </button>
              ))}
            </nav>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account Info</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Member since</span>
                  <span className="font-medium text-gray-900">
                    {userProfile?.createdAt 
                      ? new Date(userProfile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last login</span>
                  <span className="font-medium text-gray-900">
                    {userProfile?.lastLogin 
                      ? new Date(userProfile.lastLogin).toLocaleDateString()
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <Bell className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notification Settings</h2>
                    <p className="text-gray-600">Choose how and when you want to be notified</p>
                  </div>
                </div>

                {/* Notification Channels */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Notification Channels
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <SettingRow
                      icon={Mail}
                      title="Email Notifications"
                      description="Receive updates via email"
                      iconColor="text-blue-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.email}
                        onChange={() => toggleNotification('email')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={MessageSquare}
                      title="SMS Notifications"
                      description="Receive text message alerts"
                      iconColor="text-green-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.sms}
                        onChange={() => toggleNotification('sms')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Smartphone}
                      title="Push Notifications"
                      description="Receive in-app notifications"
                      iconColor="text-purple-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.push}
                        onChange={() => toggleNotification('push')}
                      />
                    </SettingRow>
                  </div>
                </div>

                {/* Notification Types */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Notification Types
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <SettingRow
                      icon={DollarSign}
                      title="Rent Reminders"
                      description="Get notified before rent is due"
                      iconColor="text-green-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.rentReminders}
                        onChange={() => toggleNotification('rentReminders')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Wrench}
                      title="Maintenance Updates"
                      description="Status updates on maintenance requests"
                      iconColor="text-orange-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.maintenanceUpdates}
                        onChange={() => toggleNotification('maintenanceUpdates')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={FileText}
                      title="Document Expiry Alerts"
                      description="Get reminded when documents are expiring"
                      iconColor="text-red-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.documentExpiry}
                        onChange={() => toggleNotification('documentExpiry')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Calendar}
                      title="Weekly Digest"
                      description="Receive a weekly summary of your activity"
                      iconColor="text-blue-600"
                    >
                      <Toggle 
                        enabled={settings.notifications.weeklyDigest}
                        onChange={() => toggleNotification('weeklyDigest')}
                      />
                    </SettingRow>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Section */}
            {activeSection === 'appearance' && (
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-purple-100">
                    <Palette className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
                    <p className="text-gray-600">Customize how the app looks and feels</p>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Theme
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'light', label: 'Light', icon: Sun, gradient: 'from-amber-100 to-orange-100' },
                      { id: 'dark', label: 'Dark', icon: Moon, gradient: 'from-gray-700 to-gray-900' },
                      { id: 'system', label: 'System', icon: Monitor, gradient: 'from-blue-100 to-purple-100' }
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setTheme(theme.id)}
                        className={`relative p-4 rounded-xl border-2 transition-all duration-200 ${
                          settings.appearance.theme === theme.id
                            ? 'border-blue-500 shadow-lg shadow-blue-100'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${theme.gradient} mb-3 flex items-center justify-center`}>
                          <theme.icon className={`h-8 w-8 ${theme.id === 'dark' ? 'text-white' : 'text-gray-700'}`} />
                        </div>
                        <p className="font-medium text-gray-900">{theme.label}</p>
                        {settings.appearance.theme === theme.id && (
                          <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Options */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Display Options
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <SettingRow
                      icon={Zap}
                      title="Compact Mode"
                      description="Reduce spacing and make the interface more dense"
                      iconColor="text-yellow-600"
                    >
                      <Toggle 
                        enabled={settings.appearance.compactMode}
                        onChange={() => toggleAppearance('compactMode')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Zap}
                      title="Animations"
                      description="Enable smooth transitions and animations"
                      iconColor="text-blue-600"
                    >
                      <Toggle 
                        enabled={settings.appearance.animations}
                        onChange={() => toggleAppearance('animations')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Eye}
                      title="High Contrast"
                      description="Increase contrast for better visibility"
                      iconColor="text-purple-600"
                    >
                      <Toggle 
                        enabled={settings.appearance.highContrast}
                        onChange={() => toggleAppearance('highContrast')}
                      />
                    </SettingRow>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy & Security Section */}
            {activeSection === 'privacy' && (
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-green-100">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Privacy & Security</h2>
                    <p className="text-gray-600">Control your data and security settings</p>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Privacy
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <SettingRow
                      icon={Eye}
                      title="Show Online Status"
                      description="Let others see when you're active"
                      iconColor="text-green-600"
                    >
                      <Toggle 
                        enabled={settings.privacy.showOnlineStatus}
                        onChange={() => togglePrivacy('showOnlineStatus')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Clock}
                      title="Show Last Seen"
                      description="Display when you were last active"
                      iconColor="text-blue-600"
                    >
                      <Toggle 
                        enabled={settings.privacy.showLastSeen}
                        onChange={() => togglePrivacy('showLastSeen')}
                      />
                    </SettingRow>
                    <SettingRow
                      icon={Shield}
                      title="Analytics"
                      description="Help improve the app with anonymous usage data"
                      iconColor="text-purple-600"
                    >
                      <Toggle 
                        enabled={settings.privacy.allowAnalytics}
                        onChange={() => togglePrivacy('allowAnalytics')}
                      />
                    </SettingRow>
                  </div>
                </div>

                {/* Security */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                    Security
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <a 
                      href="/profile" 
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          <Lock className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Change Password</p>
                          <p className="text-sm text-gray-500">Update your account password</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </a>
                    <a 
                      href="/profile" 
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-green-50 text-green-600">
                          <Key className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        Coming Soon
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-orange-100">
                    <Globe className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Preferences</h2>
                    <p className="text-gray-600">Set your language, timezone, and format preferences</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.preferences.language}
                      onChange={(e) => updatePreference('language', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="pt">Português</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={settings.preferences.currency}
                      onChange={(e) => updatePreference('currency', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="USD">$ USD - US Dollar</option>
                      <option value="EUR">€ EUR - Euro</option>
                      <option value="GBP">£ GBP - British Pound</option>
                      <option value="CAD">$ CAD - Canadian Dollar</option>
                      <option value="AUD">$ AUD - Australian Dollar</option>
                    </select>
                  </div>

                  {/* Date Format */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={settings.preferences.dateFormat}
                      onChange={(e) => updatePreference('dateFormat', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/25/2025)</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY (25/12/2025)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-25)</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={settings.preferences.timezone}
                      onChange={(e) => updatePreference('timezone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Anchorage">Alaska Time (AKT)</option>
                      <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl bg-red-100">
                    <User className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Account</h2>
                    <p className="text-gray-600">Manage your account and data</p>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="space-y-4">
                  {/* Export Data */}
                  <button
                    onClick={handleExportData}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <Download className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Export Your Data</p>
                        <p className="text-sm text-gray-500">Download all your data in JSON format</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </button>

                  {/* Help & Support */}
                  <a
                    href="/help"
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Help & Support</p>
                        <p className="text-sm text-gray-500">Get help and contact support</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                  </a>

                  {/* Sign Out */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                        <LogOut className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Sign Out</p>
                        <p className="text-sm text-gray-500">Sign out of your account</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
                  </button>

                  {/* Danger Zone */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-4 flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Danger Zone</span>
                    </h3>
                    
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200 hover:border-red-400 hover:bg-red-100 transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-red-100 text-red-600">
                            <Trash2 className="h-5 w-5" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-red-700">Delete Account</p>
                            <p className="text-sm text-red-500">Permanently delete your account and all data</p>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-red-700 font-medium mb-4">
                          Are you sure? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                          >
                            Yes, Delete My Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Save Button - Fixed at bottom */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end space-x-3">
              <button
                onClick={saveSettings}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
