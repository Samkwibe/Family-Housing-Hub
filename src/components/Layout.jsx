// src/components/Layout.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  DollarSign,
  Wrench,
  FileText,
  MessageCircle,
  Building,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Shield,
  PiggyBank,
  Heart,
  Wallet,
  Calendar,
  Users,
  Zap,
  ShoppingCart,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useLanguage } from '../contexts/LanguageContext';
import LangSwitch from './LangSwitch';
import NotificationCenter from './NotificationCenter';

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Rent', href: '/rent', icon: DollarSign },
  { name: 'Budget', href: '/budget', icon: Wallet },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Shopping & Meals', href: '/shopping', icon: ShoppingCart },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Children', href: '/children', icon: PiggyBank },
  { name: 'Health', href: '/health', icon: Heart },
  { name: 'Safety', href: '/safety', icon: AlertTriangle },
  { name: 'AI Assistant', href: '/assistant', icon: Zap },
  { name: 'Resources', href: '/resources', icon: Users },
  { name: 'Landlord', href: '/landlord', icon: Building },
  { name: 'Profile', href: '/profile', icon: User },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { userProfile, logout } = useAuth();
  const { messages } = useFamily();
  const location = useLocation();
  const navigate = useNavigate();

  // FIX: Add null check for messages to prevent the filter error
  const unreadMessages = messages?.filter(m => !m.read).length || 0;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userMenuItems = [
    { name: 'Your Profile', icon: User, action: () => navigate('/profile') },
    { name: 'Settings', icon: Settings, action: () => navigate('/settings') },
    { name: 'Security', icon: Shield, action: () => navigate('/security') },
    { name: 'Help & Support', icon: HelpCircle, action: () => navigate('/help') },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <Home className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold text-gray-900">FamilyHub</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-blue-100 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
                {item.name === 'Messages' && unreadMessages > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile user section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={`${userProfile?.firstName || 'User'}'s avatar`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.firstName} {userProfile?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">Family Account</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-5">
            <Home className="h-8 w-8 text-blue-600 mr-2" />
            <span className="text-xl font-bold text-gray-900">FamilyHub</span>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Icon className={`h-5 w-5 mr-3 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  {item.name}
                  {item.name === 'Messages' && unreadMessages > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex items-center flex-1 min-w-0">
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={`${userProfile?.firstName || 'User'}'s avatar`}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                    </span>
                  </div>
                )}
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userProfile?.firstName} {userProfile?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">Family Account</p>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="ml-3 p-2 text-gray-400 hover:text-gray-500 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <Settings className="h-5 w-5" />
                </button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      {userMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              item.action();
                              setUserMenuOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            {item.name}
                          </button>
                        );
                      })}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-6 w-6 text-gray-600" />
              </button>
              <div className="ml-4">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  {location.pathname === '/' && 'Your housing overview'}
                  {location.pathname === '/rent' && 'Manage rent payments'}
                  {location.pathname === '/maintenance' && 'Track repair requests'}
                  {location.pathname === '/documents' && 'Store important files'}
                  {location.pathname === '/messages' && 'Communicate with support'}
                  {location.pathname === '/landlord' && 'Contact information'}
                  {location.pathname === '/profile' && 'Manage your account'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Language Switch */}
              <LangSwitch />

              {/* Notifications */}
              <NotificationCenter />

              {/* User profile */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {userProfile?.firstName} {userProfile?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">Family</p>
                  </div>
                  {userProfile?.photoURL ? (
                    <img
                      src={userProfile.photoURL}
                      alt={`${userProfile?.firstName || 'User'}'s avatar`}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                      </span>
                    </div>
                  )}
                </button>

                {/* User dropdown menu for desktop */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Account</p>
                        <p className="text-xs text-gray-500 truncate">{userProfile?.email}</p>
                      </div>
                      {userMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              item.action();
                              setUserMenuOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Icon className="h-4 w-4 mr-3" />
                            {item.name}
                          </button>
                        );
                      })}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              © 2024 FamilyHub. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Privacy
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Terms
              </button>
              <button className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Help
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}