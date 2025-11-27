// src/pages/ParentChildrenManagement.jsx - Comprehensive Parent Child Control Dashboard
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    userService,
    childrenService,
    messageService,
    uploadService,
    childTasksService,
    childChoresService,
    childLearningService,
    childWalletService,
    childBehaviorService,
    childRewardsService,
    childScreenTimeService,
    childSafetyService
} from '../services/firebaseService';
import {
    UserPlus, Edit3, Trash2, User, Camera, X, Save, CheckCircle, XCircle,
    Smartphone, Lock, Unlock, Eye, EyeOff, Mail, Phone, Calendar, GraduationCap,
    Upload, AlertCircle, Power, PowerOff, Activity, MapPin, MessageSquare,
    BookOpen, Award, Wallet, Shield, Clock, Settings, BarChart3, FileText,
    Video, Target, TrendingUp, Heart, Pill, Bell, Globe, Home, School,
    Plus, Minus, Check, X as XIcon, Send, Download, Play, Pause
} from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, limit, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function ParentChildrenManagement() {
    const { currentUser, userProfile, createChildAccount, uploadProfilePhoto } = useAuth();
    const [loading, setLoading] = useState(true);
    const [childAccounts, setChildAccounts] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingChild, setEditingChild] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Child form state
    const [childForm, setChildForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        dateOfBirth: '',
        grade: '',
        photoURL: null,
        enabled: true
    });

    // Activity tracking
    const [childActivity, setChildActivity] = useState({});
    const [realTimeStatus, setRealTimeStatus] = useState({});

    useEffect(() => {
        if (currentUser && userProfile && userProfile?.role !== 'child') {
            loadChildAccounts();
        } else if (currentUser && !userProfile) {
            // Wait for profile to load
        } else {
            setLoading(false);
        }
    }, [currentUser, userProfile]);

    useEffect(() => {
        if (selectedChild) {
            loadChildData(selectedChild.uid);
            startActivityTracking(selectedChild.uid);
        }
        return () => {
            // Cleanup activity tracking
        };
    }, [selectedChild]);

    const loadChildAccounts = async () => {
        setLoading(true);
        try {
            // Use childrenService to get children instead of userService.getChildrenByParent
            const children = await childrenService.getChildren(currentUser.uid);
            
            // Convert children to account format
            const accounts = children.map(child => ({
                id: child.id,
                uid: child.id,
                firstName: child.name?.split(' ')[0] || child.name || '',
                lastName: child.name?.split(' ').slice(1).join(' ') || '',
                email: child.email || '',
                dateOfBirth: child.dateOfBirth,
                grade: child.grade || '',
                photoURL: child.photoURL || null,
                enabled: true,
                screenTimeSettings: null,
                isOnline: false,
                focusModeEnabled: false
            }));

            setChildAccounts(accounts);
            if (accounts.length > 0 && !selectedChild) {
                setSelectedChild(accounts[0]);
            }
        } catch (error) {
            console.error('Error loading child accounts:', error);
            toast.error('Failed to load child accounts');
        } finally {
            setLoading(false);
        }
    };

    const loadChildData = async (childId) => {
        try {
            // Load available child data
            // Note: Some services are not yet implemented, using placeholders
            const messages = await messageService.getUserMessages(childId).catch(() => []);
            
            const [tasksData, choresData, homeworkData, walletData, behaviorData, rewardsData, locationData] = await Promise.all([
                childTasksService.getChildTasks(childId, currentUser.uid).catch(() => []),
                childChoresService.getChildChores(childId).catch(() => []),
                childLearningService.getChildHomework(childId).catch(() => []),
                childWalletService.getChildWallet(childId, currentUser.uid).catch(() => ({ balance: 0, transactions: [] })),
                childBehaviorService.getChildBehavior(childId).catch(() => []),
                childRewardsService.getChildRewards(childId).catch(() => []),
                getLocationHistory(childId).catch(() => [])
            ]);

            setChildActivity(prev => ({
                ...prev,
                [childId]: {
                    tasks: tasksData,
                    chores: choresData,
                    homework: homeworkData,
                    wallet: walletData,
                    behavior: behaviorData,
                    rewards: rewardsData,
                    messages: messages || [],
                    locationHistory: locationData
                }
            }));
        } catch (error) {
            console.error('Error loading child data:', error);
        }
    };


    const startActivityTracking = (childId) => {
        // Real-time activity tracking would go here
        // For now, we'll set up listeners for tasks, messages, etc.
    };

    const handleAddChild = async (e) => {
        e.preventDefault();
        if (!childForm.email || !childForm.password || !childForm.firstName) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (childForm.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setSubmitting(true);
        try {
            const userCredential = await createChildAccount(
                childForm.email,
                childForm.password,
                {
                    firstName: childForm.firstName,
                    lastName: childForm.lastName,
                    phone: childForm.phone || '',
                    dateOfBirth: childForm.dateOfBirth || null,
                    photoURL: childForm.photoURL
                }
            );

            await childrenService.addChild(currentUser.uid, {
                name: `${childForm.firstName} ${childForm.lastName}`,
                dateOfBirth: childForm.dateOfBirth,
                gender: '',
                notes: `Grade: ${childForm.grade || 'N/A'}`
            });

            // Update child profile with grade
            if (childForm.grade) {
                await userService.updateUserProfile(userCredential.user.uid, {
                    grade: childForm.grade
                });
            }

            toast.success('Child account created successfully!');
            setShowAddModal(false);
            resetForm();
            loadChildAccounts();
        } catch (error) {
            console.error('Error creating child account:', error);
            toast.error(error.message || 'Failed to create child account');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditChild = async (e) => {
        e.preventDefault();
        if (!editingChild) return;

        setSubmitting(true);
        try {
            let photoURL = editingChild.photoURL;
            if (childForm.photoFile) {
                const uploadResult = await uploadProfilePhoto(editingChild.uid, childForm.photoFile);
                photoURL = uploadResult.url;
            }

            await userService.updateUserProfile(editingChild.uid, {
                firstName: childForm.firstName,
                lastName: childForm.lastName,
                phone: childForm.phone || '',
                dateOfBirth: childForm.dateOfBirth || null,
                photoURL: photoURL,
                grade: childForm.grade || '',
                enabled: childForm.enabled
            });

            toast.success('Child account updated!');
            setEditingChild(null);
            resetForm();
            loadChildAccounts();
        } catch (error) {
            console.error('Error updating child:', error);
            toast.error('Failed to update child account');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteChild = async (childId) => {
        if (!window.confirm('Are you sure you want to disable this child account? You can re-enable it later.')) {
            return;
        }

        try {
            await userService.updateUserProfile(childId, {
                enabled: false
            });

            toast.success('Child account disabled');
            loadChildAccounts();
        } catch (error) {
            console.error('Error disabling child:', error);
            toast.error('Failed to disable child account');
        }
    };

    const handleToggleEnabled = async (childId, currentStatus) => {
        try {
            await userService.updateUserProfile(childId, {
                enabled: !currentStatus
            });
            toast.success(`Child account ${!currentStatus ? 'enabled' : 'disabled'}`);
            loadChildAccounts();
        } catch (error) {
            console.error('Error toggling child status:', error);
            toast.error('Failed to update child status');
        }
    };

    const startEditing = (child) => {
        setEditingChild(child);
        setChildForm({
            firstName: child.firstName || '',
            lastName: child.lastName || '',
            email: child.email || '',
            password: '',
            phone: child.phone || '',
            dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : '',
            grade: child.grade || '',
            photoURL: child.photoURL || null,
            photoFile: null,
            enabled: child.enabled !== false
        });
        setShowAddModal(true);
    };

    const resetForm = () => {
        setChildForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: '',
            dateOfBirth: '',
            grade: '',
            photoURL: null,
            photoFile: null,
            enabled: true
        });
        setEditingChild(null);
    };

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

    // Allow access for all non-child users (parents, renters, owners)
    if (userProfile && userProfile?.role === 'child') {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Parent Access Only</h2>
                <p className="text-gray-600">This page is only available for parent accounts. Children should use the child dashboard.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading child accounts...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'tasks', label: 'Tasks & Chores', icon: CheckCircle },
        { id: 'school', label: 'School & Learning', icon: GraduationCap },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'location', label: 'Location & Safety', icon: MapPin },
        { id: 'behavior', label: 'Behavior & Health', icon: Heart },
        { id: 'rewards', label: 'Rewards', icon: Award },
        { id: 'wallet', label: 'Wallet', icon: Wallet },
        { id: 'screentime', label: 'Screen Time', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'security', label: 'Security', icon: Shield }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Manage Children</h1>
                    <p className="text-gray-600 mt-1">Complete control and monitoring for your children's accounts</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <UserPlus className="h-5 w-5" />
                    <span>Add Child Account</span>
                </button>
            </div>

            {/* Children Selector */}
            {childAccounts.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center space-x-4 overflow-x-auto">
                        {childAccounts.map((child) => (
                            <button
                                key={child.uid}
                                onClick={() => setSelectedChild(child)}
                                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${selectedChild?.uid === child.uid
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {child.photoURL ? (
                                    <img src={child.photoURL} alt={child.firstName} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="h-6 w-6 text-blue-600" />
                                    </div>
                                )}
                                <div className="text-left">
                                    <div className="font-semibold">{child.firstName} {child.lastName}</div>
                                    <div className={`text-xs ${selectedChild?.uid === child.uid ? 'text-blue-100' : 'text-gray-500'}`}>
                                        {child.isOnline ? 'Online' : 'Offline'} {child.focusModeEnabled && '• Focus Mode'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {selectedChild ? (
                <div className="bg-white rounded-xl border border-gray-200">
                    {/* Tabs */}
                    <div className="border-b border-gray-200 p-4">
                        <div className="flex space-x-2 overflow-x-auto">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'overview' && (
                            <OverviewTab child={selectedChild} activity={childActivity[selectedChild.uid]} />
                        )}
                        {activeTab === 'profile' && (
                            <ProfileTab child={selectedChild} onUpdate={loadChildAccounts} />
                        )}
                        {activeTab === 'activity' && (
                            <ActivityTab child={selectedChild} activity={childActivity[selectedChild.uid]} />
                        )}
                        {activeTab === 'tasks' && (
                            <TasksTab child={selectedChild} parentId={currentUser.uid} onUpdate={() => loadChildData(selectedChild.uid)} />
                        )}
                        {activeTab === 'school' && (
                            <SchoolTab child={selectedChild} parentId={currentUser.uid} onUpdate={() => loadChildData(selectedChild.uid)} />
                        )}
                        {activeTab === 'messages' && (
                            <MessagesTab child={selectedChild} parentId={currentUser.uid} />
                        )}
                        {activeTab === 'location' && (
                            <LocationTab child={selectedChild} parentId={currentUser.uid} />
                        )}
                        {activeTab === 'behavior' && (
                            <BehaviorTab child={selectedChild} parentId={currentUser.uid} onUpdate={() => loadChildData(selectedChild.uid)} />
                        )}
                        {activeTab === 'rewards' && (
                            <RewardsTab child={selectedChild} parentId={currentUser.uid} onUpdate={() => loadChildData(selectedChild.uid)} />
                        )}
                        {activeTab === 'wallet' && (
                            <WalletTab child={selectedChild} parentId={currentUser.uid} onUpdate={() => loadChildData(selectedChild.uid)} />
                        )}
                        {activeTab === 'screentime' && (
                            <ScreenTimeTab child={selectedChild} parentId={currentUser.uid} />
                        )}
                        {activeTab === 'calendar' && (
                            <CalendarTab child={selectedChild} parentId={currentUser.uid} />
                        )}
                        {activeTab === 'security' && (
                            <SecurityTab child={selectedChild} parentId={currentUser.uid} />
                        )}
                    </div>
                </div>
            ) : childAccounts.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Child Accounts Yet</h3>
                    <p className="text-gray-600 mb-6">Create a child account to get started</p>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Add Your First Child
                    </button>
                </div>
            ) : null}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <AddEditChildModal
                    childForm={childForm}
                    setChildForm={setChildForm}
                    editingChild={editingChild}
                    onSubmit={editingChild ? handleEditChild : handleAddChild}
                    onClose={() => {
                        setShowAddModal(false);
                        resetForm();
                    }}
                    submitting={submitting}
                />
            )}
        </div>
    );
}

// Overview Tab Component
function OverviewTab({ child, activity }) {
    const completedTasks = activity?.tasks?.filter(t => t.status === 'completed' || t.status === 'approved').length || 0;
    const pendingTasks = activity?.tasks?.filter(t => t.status === 'pending').length || 0;
    const totalPoints = activity?.wallet?.points || 0;
    const balance = activity?.wallet?.balance || 0;
    const recentMessages = activity?.messages?.slice(0, 5) || [];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Overview - {child.firstName}</h2>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-blue-600 font-medium">Completed Tasks</div>
                    <div className="text-2xl font-bold text-blue-900">{completedTasks}</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-sm text-yellow-600 font-medium">Pending Tasks</div>
                    <div className="text-2xl font-bold text-yellow-900">{pendingTasks}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-600 font-medium">Points Earned</div>
                    <div className="text-2xl font-bold text-green-900">{totalPoints}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-purple-600 font-medium">Wallet Balance</div>
                    <div className="text-2xl font-bold text-purple-900">${balance.toFixed(2)}</div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Messages</h3>
                {recentMessages.length > 0 ? (
                    <div className="space-y-2">
                        {recentMessages.map(msg => (
                            <div key={msg.id} className="bg-white rounded p-3 text-sm">
                                <div className="font-medium">{msg.subject || 'Message'}</div>
                                <div className="text-gray-600 text-xs mt-1">
                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Recently'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No recent messages</p>
                )}
            </div>
        </div>
    );
}

// Profile Tab Component
function ProfileTab({ child, onUpdate }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    phone: child.phone || '',
    grade: child.grade || '',
    dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : ''
  });
  const [photoFile, setPhotoFile] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let photoURL = child.photoURL;
      if (photoFile) {
        const uploadResult = await uploadService.uploadFile(
          `child-profiles/${child.uid}`,
          photoFile
        );
        photoURL = uploadResult.url;
      }

      await userService.updateUserProfile(child.uid, {
        ...formData,
        photoURL,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null
      });

      toast.success('Profile updated!');
      setEditMode(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Management</h2>
          <p className="text-gray-600">Edit child information, name, age, picture, and grade</p>
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit3 className="h-4 w-4 inline mr-2" />
            Edit Profile
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center space-x-4">
          {child.photoURL ? (
            <img src={child.photoURL} alt={child.firstName} className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-12 w-12 text-blue-600" />
            </div>
          )}
          {editMode && (
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files[0])}
                className="text-sm"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
            <input
              type="text"
              value={formData.grade}
              onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            disabled={!editMode}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
          />
        </div>

        {editMode && (
          <div className="flex space-x-3">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setFormData({
                  firstName: child.firstName || '',
                  lastName: child.lastName || '',
                  phone: child.phone || '',
                  grade: child.grade || '',
                  dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : ''
                });
                setPhotoFile(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ child, activity }) {
  const [timeRange, setTimeRange] = useState('today'); // today, week, month
  const [realTimeStatus, setRealTimeStatus] = useState('offline');

  const completedTasks = activity?.tasks?.filter(t => t.status === 'completed' || t.status === 'approved').length || 0;
  const pendingTasks = activity?.tasks?.filter(t => t.status === 'pending').length || 0;
  const missedTasks = activity?.tasks?.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due < new Date() && t.status === 'pending';
  }).length || 0;
  const totalMessages = activity?.messages?.length || 0;
  const completedChores = activity?.chores?.filter(c => {
    const lastCompleted = c.lastCompleted?.toDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lastCompleted && new Date(lastCompleted).setHours(0, 0, 0, 0) >= today;
  }).length || 0;

  const recentActivity = [
    ...(activity?.tasks?.slice(0, 10).map(t => ({ type: 'task', item: t, time: t.createdAt || t.completedAt })) || []),
    ...(activity?.messages?.slice(0, 10).map(m => ({ type: 'message', item: m, time: m.createdAt })) || []),
    ...(activity?.homework?.slice(0, 5).map(h => ({ type: 'homework', item: h, time: h.submittedAt || h.createdAt })) || [])
  ].sort((a, b) => {
    const aTime = a.time ? new Date(a.time).getTime() : 0;
    const bTime = b.time ? new Date(b.time).getTime() : 0;
    return bTime - aTime;
  }).slice(0, 20);

  // Calculate daily/weekly stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const todayTasks = activity?.tasks?.filter(t => {
    const created = t.createdAt ? new Date(t.createdAt) : null;
    return created && created >= today;
  }).length || 0;

  const weekTasks = activity?.tasks?.filter(t => {
    const created = t.createdAt ? new Date(t.createdAt) : null;
    return created && created >= weekStart;
  }).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Monitoring</h2>
          <p className="text-gray-600">Real-time activity tracking and reports for {child.firstName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
            realTimeStatus === 'online' ? 'bg-green-100 text-green-700' :
            realTimeStatus === 'focus' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {realTimeStatus === 'online' ? '🟢 Online' :
             realTimeStatus === 'focus' ? '🔵 Focus Mode' :
             '⚫ Offline'}
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Real-time Status */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Current Status</h3>
            <p className="text-gray-600">
              {realTimeStatus === 'online' ? 'Child is currently active on the dashboard' :
               realTimeStatus === 'focus' ? 'Child is in focus mode (homework/tasks only)' :
               'Child is offline or not using the app'}
            </p>
          </div>
          <Activity className="h-12 w-12 text-blue-500" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Completed Tasks</div>
          <div className="text-2xl font-bold text-blue-900">{completedTasks}</div>
          <div className="text-xs text-gray-500 mt-1">Total</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-sm text-yellow-600 font-medium">Pending Tasks</div>
          <div className="text-2xl font-bold text-yellow-900">{pendingTasks}</div>
          <div className="text-xs text-gray-500 mt-1">Waiting</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Missed Tasks</div>
          <div className="text-2xl font-bold text-red-900">{missedTasks}</div>
          <div className="text-xs text-gray-500 mt-1">Overdue</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Completed Chores</div>
          <div className="text-2xl font-bold text-green-900">{completedChores}</div>
          <div className="text-xs text-gray-500 mt-1">Today</div>
        </div>
      </div>

      {/* Time Range Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Tasks Today</div>
          <div className="text-2xl font-bold text-gray-900">{todayTasks}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Tasks This Week</div>
          <div className="text-2xl font-bold text-gray-900">{weekTasks}</div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity Feed
        </h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity.map((act, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start space-x-3">
                  {act.type === 'task' ? (
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  ) : act.type === 'homework' ? (
                    <BookOpen className="h-5 w-5 text-purple-600 mt-0.5" />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {act.type === 'task' ? `Task: ${act.item.title}` :
                       act.type === 'homework' ? `Homework: ${act.item.title}` :
                       'Message sent/received'}
                    </div>
                    {act.type === 'task' && (
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {act.item.status} • 
                        {act.item.points > 0 && ` ${act.item.points} points`}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {act.time ? new Date(act.time).toLocaleString() : 'Recently'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
        )}
      </div>

      {/* Daily/Weekly Report */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
        <h3 className="font-semibold text-gray-900 mb-3">Activity Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Messages: </span>
            <span className="font-semibold">{totalMessages}</span>
          </div>
          <div>
            <span className="text-gray-600">Homework Submitted: </span>
            <span className="font-semibold">{activity?.homework?.filter(h => h.status === 'submitted').length || 0}</span>
          </div>
          <div>
            <span className="text-gray-600">Tasks Completed: </span>
            <span className="font-semibold">{completedTasks}</span>
          </div>
          <div>
            <span className="text-gray-600">Chores Done Today: </span>
            <span className="font-semibold">{completedChores}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tasks Tab Component
function TasksTab({ child, parentId, onUpdate }) {
    const [tasks, setTasks] = useState([]);
    const [chores, setChores] = useState([]);
    const [showAddTaskModal, setShowAddTaskModal] = useState(false);
    const [showAddChoreModal, setShowAddChoreModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [editingChore, setEditingChore] = useState(null);
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        dueDate: '',
        points: 0,
        reward: ''
    });
    const [choreForm, setChoreForm] = useState({
        title: '',
        description: '',
        scheduleDay: 'daily',
        points: 0,
        reward: '',
        punishment: ''
    });

    useEffect(() => {
        loadTasks();
        loadChores();
    }, [child]);

    const loadTasks = async () => {
        try {
            const childTasks = await childTasksService.getChildTasks(child.uid, parentId);
            setTasks(childTasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            toast.error('Failed to load tasks');
        }
    };

    const loadChores = async () => {
        try {
            const childChores = await childChoresService.getChildChores(child.uid);
            setChores(childChores);
        } catch (error) {
            console.error('Error loading chores:', error);
            toast.error('Failed to load chores');
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        try {
            await childTasksService.createTask(parentId, child.uid, {
                ...taskForm,
                dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null
            });
            toast.success('Task added!');
            setShowAddTaskModal(false);
            setTaskForm({ title: '', description: '', dueDate: '', points: 0, reward: '' });
            loadTasks();
            onUpdate();
        } catch (error) {
            console.error('Error adding task:', error);
            toast.error('Failed to add task');
        }
    };

    const handleAddChore = async (e) => {
        e.preventDefault();
        try {
            await childChoresService.createChore(parentId, child.uid, choreForm);
            toast.success('Chore added!');
            setShowAddChoreModal(false);
            setChoreForm({ title: '', description: '', scheduleDay: 'daily', points: 0, reward: '', punishment: '' });
            loadChores();
            onUpdate();
        } catch (error) {
            console.error('Error adding chore:', error);
            toast.error('Failed to add chore');
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;
        try {
            // Note: Delete function would need to be added to childTasksService
            toast.info('Delete functionality coming soon');
            loadTasks();
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const handleApproveTask = async (taskId, approved) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            await childTasksService.approveTask(taskId, parentId, approved, task?.points || 10);
            toast.success(`Task ${approved ? 'approved' : 'rejected'}`);
            loadTasks();
            onUpdate();
        } catch (error) {
            console.error('Error approving task:', error);
            toast.error('Failed to update task');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Tasks & Chores</h2>
                    <p className="text-gray-600">Assign, edit, and approve tasks for {child.firstName}</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            setEditingTask(null);
                            setTaskForm({ title: '', description: '', dueDate: '', points: 0, reward: '' });
                            setShowAddTaskModal(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Task</span>
                    </button>
                    <button
                        onClick={() => {
                            setEditingChore(null);
                            setChoreForm({ title: '', description: '', scheduleDay: 'daily', points: 0, reward: '', punishment: '' });
                            setShowAddChoreModal(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Chore</span>
                    </button>
                </div>
            </div>

            {/* Tasks Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Tasks</h3>
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            task.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            task.status === 'completed' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                        {task.dueDate && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Due: {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                        )}
                                        {task.points > 0 && (
                                            <span className="flex items-center gap-1">
                                                <Star className="h-3 w-3 text-yellow-500" />
                                                {task.points} points
                                            </span>
                                        )}
                                        {task.reward && (
                                            <span>Reward: {task.reward}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex space-x-2 ml-4">
                                    {task.status === 'completed' && (
                                        <>
                                            <button
                                                onClick={() => handleApproveTask(task.id, true)}
                                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleApproveTask(task.id, false)}
                                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {tasks.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No tasks assigned yet</p>
                    )}
                </div>
            </div>

            {/* Chores Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Chores</h3>
                <div className="space-y-3">
                    {chores.map(chore => (
                        <div key={chore.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{chore.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{chore.description}</p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs">
                                        <span className="text-gray-500">Schedule: {chore.scheduleDay}</span>
                                        {chore.streak > 0 && (
                                            <span className="text-orange-600 font-semibold">🔥 Streak: {chore.streak} days</span>
                                        )}
                                        {chore.points > 0 && (
                                            <span className="text-yellow-600">⭐ {chore.points} points</span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteTask(chore.id)}
                                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 ml-4"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {chores.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No chores assigned yet</p>
                    )}
                </div>
            </div>

            {/* Add Task Modal */}
            {showAddTaskModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'Add Task'}</h3>
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                <input
                                    type="datetime-local"
                                    value={taskForm.dueDate}
                                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={taskForm.points}
                                        onChange={(e) => setTaskForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Reward</label>
                                    <input
                                        type="text"
                                        value={taskForm.reward}
                                        onChange={(e) => setTaskForm(prev => ({ ...prev, reward: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="e.g., Extra screen time"
                                    />
                                </div>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTaskModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingTask ? 'Update' : 'Add'} Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Chore Modal */}
            {showAddChoreModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">{editingChore ? 'Edit Chore' : 'Add Chore'}</h3>
                        <form onSubmit={handleAddChore} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={choreForm.title}
                                    onChange={(e) => setChoreForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={choreForm.description}
                                    onChange={(e) => setChoreForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                                <select
                                    value={choreForm.scheduleDay}
                                    onChange={(e) => setChoreForm(prev => ({ ...prev, scheduleDay: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monday">Monday</option>
                                    <option value="tuesday">Tuesday</option>
                                    <option value="wednesday">Wednesday</option>
                                    <option value="thursday">Thursday</option>
                                    <option value="friday">Friday</option>
                                    <option value="saturday">Saturday</option>
                                    <option value="sunday">Sunday</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={choreForm.points}
                                        onChange={(e) => setChoreForm(prev => ({ ...prev, points: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Reward</label>
                                    <input
                                        type="text"
                                        value={choreForm.reward}
                                        onChange={(e) => setChoreForm(prev => ({ ...prev, reward: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Punishment (if not done)</label>
                                <input
                                    type="text"
                                    value={choreForm.punishment}
                                    onChange={(e) => setChoreForm(prev => ({ ...prev, punishment: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddChoreModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    {editingChore ? 'Update' : 'Add'} Chore
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// School Tab Component
function SchoolTab({ child, parentId, onUpdate }) {
  const [homework, setHomework] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [homeworkForm, setHomeworkForm] = useState({
    subject: '',
    title: '',
    description: '',
    dueDate: ''
  });
  const [studyGoals, setStudyGoals] = useState([]);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    subject: '',
    goal: '',
    targetDate: ''
  });

  useEffect(() => {
    loadHomework();
    loadStudyGoals();
  }, [child]);

  const loadHomework = async () => {
    try {
      const hw = await childLearningService.getChildHomework(child.uid);
      setHomework(hw);
    } catch (error) {
      console.error('Error loading homework:', error);
      toast.error('Failed to load homework');
    }
  };

  const loadStudyGoals = async () => {
    // TODO: Implement study goals service
    setStudyGoals([]);
  };

  const handleAddHomework = async (e) => {
    e.preventDefault();
    try {
      await childLearningService.addHomework(parentId, child.uid, {
        ...homeworkForm,
        dueDate: homeworkForm.dueDate ? new Date(homeworkForm.dueDate) : null
      });
      toast.success('Homework added!');
      setShowAddModal(false);
      setHomeworkForm({ subject: '', title: '', description: '', dueDate: '' });
      loadHomework();
      onUpdate();
    } catch (error) {
      console.error('Error adding homework:', error);
      toast.error('Failed to add homework');
    }
  };

  const handleReviewHomework = async (homeworkId, approved) => {
    try {
      // TODO: Implement review functionality
      toast.info('Review functionality coming soon');
      loadHomework();
    } catch (error) {
      toast.error('Failed to review homework');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School & Learning</h2>
          <p className="text-gray-600">Manage homework, study schedules, and learning materials for {child.firstName}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Add Homework</span>
          </button>
          <button
            onClick={() => setShowGoalModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Target className="h-5 w-5" />
            <span>Set Study Goal</span>
          </button>
        </div>
      </div>

      {/* Study Goals */}
      {studyGoals.length > 0 && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-3">Weekly Study Goals</h3>
          <div className="space-y-2">
            {studyGoals.map((goal, idx) => (
              <div key={idx} className="bg-white rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{goal.subject}: </span>
                    <span>{goal.goal}</span>
                  </div>
                  {goal.targetDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Homework List */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Homework Assignments</h3>
        <div className="space-y-3">
          {homework.map(hw => (
            <div key={hw.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{hw.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      hw.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                      hw.status === 'reviewed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {hw.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Subject:</span> {hw.subject}
                  </p>
                  {hw.description && (
                    <p className="text-sm text-gray-600 mt-1">{hw.description}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    {hw.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {new Date(hw.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {hw.submittedPhotos && hw.submittedPhotos.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {hw.submittedPhotos.length} photo(s) submitted
                      </span>
                    )}
                  </div>
                  {hw.submittedPhotos && hw.submittedPhotos.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {hw.submittedPhotos.map((photo, idx) => (
                        <img key={idx} src={photo} alt={`Submission ${idx + 1}`} className="w-20 h-20 object-cover rounded border" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {hw.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleReviewHomework(hw.id, true)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReviewHomework(hw.id, false)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {homework.length === 0 && (
            <p className="text-center text-gray-500 py-8">No homework assigned yet</p>
          )}
        </div>
      </div>

      {/* Add Homework Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Add Homework</h3>
            <form onSubmit={handleAddHomework} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={homeworkForm.subject}
                  onChange={(e) => setHomeworkForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Math, Science, English"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={homeworkForm.title}
                  onChange={(e) => setHomeworkForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Chapter 5 Exercises"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={homeworkForm.description}
                  onChange={(e) => setHomeworkForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Instructions or notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={homeworkForm.dueDate}
                  onChange={(e) => setHomeworkForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Homework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Study Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Set Weekly Study Goal</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              toast.info('Study goals feature coming soon');
              setShowGoalModal(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  required
                  value={goalForm.subject}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal *</label>
                <textarea
                  required
                  value={goalForm.goal}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="e.g., Complete 5 math exercises daily"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                <input
                  type="date"
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Set Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Messages Tab Component
function MessagesTab({ child, parentId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [messageSettings, setMessageSettings] = useState({
    messagingEnabled: true,
    callsEnabled: true,
    locationSharingEnabled: true
  });

  useEffect(() => {
    loadMessages();
    loadSettings();
  }, [child]);

  const loadMessages = async () => {
    try {
      const msgs = await messageService.getUserMessages(child.uid);
      // Filter messages between parent and child
      const filtered = msgs.filter(msg => 
        (msg.senderId === child.uid && msg.receiverId === parentId) ||
        (msg.senderId === parentId && msg.receiverId === child.uid)
      );
      setMessages(filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const loadSettings = async () => {
    // TODO: Load from child settings
    setMessageSettings({
      messagingEnabled: true,
      callsEnabled: true,
      locationSharingEnabled: true
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await messageService.sendMessage(parentId, child.uid, {
        subject: 'Message from Parent',
        message: newMessage,
        type: 'parent_to_child'
      });
      toast.success('Message sent!');
      setNewMessage('');
      setShowSendModal(false);
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleToggleSetting = async (setting) => {
    try {
      const newSettings = { ...messageSettings, [setting]: !messageSettings[setting] };
      setMessageSettings(newSettings);
      // TODO: Save to child settings
      toast.success(`Messaging ${newSettings[setting] ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages & Communication</h2>
          <p className="text-gray-600">Read and send messages to {child.firstName}</p>
        </div>
        <button
          onClick={() => setShowSendModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Send className="h-5 w-5" />
          <span>Send Message</span>
        </button>
      </div>

      {/* Communication Controls */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Communication Controls</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Messaging</label>
              <p className="text-xs text-gray-500">Allow child to send/receive messages</p>
            </div>
            <button
              onClick={() => handleToggleSetting('messagingEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                messageSettings.messagingEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  messageSettings.messagingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Calls</label>
              <p className="text-xs text-gray-500">Allow child to call parents</p>
            </div>
            <button
              onClick={() => handleToggleSetting('callsEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                messageSettings.callsEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  messageSettings.callsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Location Sharing</label>
              <p className="text-xs text-gray-500">Allow child to share location</p>
            </div>
            <button
              onClick={() => handleToggleSetting('locationSharingEnabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                messageSettings.locationSharingEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  messageSettings.locationSharingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Message History</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg border ${
                msg.senderId === parentId ? 'bg-blue-50 border-blue-200 ml-8' : 'bg-gray-50 border-gray-200 mr-8'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {msg.senderId === parentId ? 'You' : child.firstName}
                    </p>
                    {msg.type === 'call' && (
                      <Phone className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-gray-700 mt-1">{msg.message || msg.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Recently'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-gray-500 py-8">No messages yet</p>
          )}
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Send Message to {child.firstName}</h3>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                <textarea
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={4}
                  placeholder="Type your message..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Location Tab Component
function LocationTab({ child, parentId }) {
  const [locationHistory, setLocationHistory] = useState([]);
  const [safeLocations, setSafeLocations] = useState([]);
  const [showAddSafeZone, setShowAddSafeZone] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [safeZoneForm, setSafeZoneForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: 100
  });

  useEffect(() => {
    loadLocationData();
    // Set up real-time location listener
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'childLocationShares'),
        where('childId', '==', child.uid),
        orderBy('timestamp', 'desc'),
        limit(1)
      ),
      (snapshot) => {
        if (!snapshot.empty) {
          const latest = snapshot.docs[0].data();
          setCurrentLocation({
            ...latest,
            timestamp: latest.timestamp?.toDate()
          });
        }
      }
    );
    return () => unsubscribe();
  }, [child]);

  const loadLocationData = async () => {
    try {
      const [history, safe] = await Promise.all([
        getLocationHistory(child.uid),
        childSafetyService.getSafeLocations(child.uid, parentId)
      ]);
      setLocationHistory(history);
      setSafeLocations(safe);
    } catch (error) {
      console.error('Error loading location data:', error);
    }
  };

  const getLocationHistory = async (childId) => {
    try {
      const q = query(
        collection(db, 'childLocationShares'),
        where('childId', '==', childId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
    } catch (error) {
      console.error('Error getting location history:', error);
      return [];
    }
  };

  const handleAddSafeZone = async (e) => {
    e.preventDefault();
    try {
      await childSafetyService.addSafeLocation(parentId, child.uid, {
        ...safeZoneForm,
        latitude: parseFloat(safeZoneForm.latitude),
        longitude: parseFloat(safeZoneForm.longitude)
      });
      toast.success('Safe zone added!');
      setShowAddSafeZone(false);
      setSafeZoneForm({ name: '', address: '', latitude: '', longitude: '', radius: 100 });
      loadLocationData();
    } catch (error) {
      console.error('Error adding safe zone:', error);
      toast.error('Failed to add safe zone');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Location & Safety</h2>
          <p className="text-gray-600">Track location and manage safety zones for {child.firstName}</p>
        </div>
        <button
          onClick={() => setShowAddSafeZone(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Safe Zone</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Location History</h3>
          {locationHistory.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {locationHistory.slice(0, 10).map(loc => (
                <div key={loc.id} className="bg-white rounded p-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">
                        {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {loc.timestamp ? new Date(loc.timestamp).toLocaleString() : 'Recently'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No location history available</p>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Safe Zones</h3>
          {safeLocations.length > 0 ? (
            <div className="space-y-2">
              {safeLocations.map(zone => (
                <div key={zone.id} className="bg-white rounded p-2 text-sm">
                  <div className="font-medium">{zone.name || 'Safe Zone'}</div>
                  <div className="text-xs text-gray-500">{zone.address || 'No address'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No safe zones set up</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Behavior Tab Component
function BehaviorTab({ child, parentId, onUpdate }) {
  const [behavior, setBehavior] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [behaviorForm, setBehaviorForm] = useState({
    type: 'note',
    title: '',
    description: '',
    points: 0,
    mood: null
  });

  useEffect(() => {
    loadBehavior();
  }, [child]);

  const loadBehavior = async () => {
    try {
      const beh = await childBehaviorService.getChildBehavior(child.uid);
      setBehavior(beh);
    } catch (error) {
      console.error('Error loading behavior:', error);
    }
  };

  const handleAddBehavior = async (e) => {
    e.preventDefault();
    try {
      await childBehaviorService.addBehaviorNote(child.uid, parentId, behaviorForm);
      toast.success('Behavior note added!');
      setShowAddModal(false);
      setBehaviorForm({ type: 'note', title: '', description: '', points: 0, mood: null });
      loadBehavior();
      onUpdate();
    } catch (error) {
      console.error('Error adding behavior:', error);
      toast.error('Failed to add behavior note');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Behavior & Health</h2>
          <p className="text-gray-600">Track behavior, mood, and health for {child.firstName}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Note</span>
        </button>
      </div>

      <div className="space-y-3">
        {behavior.map(beh => (
          <div key={beh.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{beh.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{beh.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Type: {beh.type}</span>
                  {beh.points > 0 && <span>Points: +{beh.points}</span>}
                  {beh.mood && <span>Mood: {beh.mood}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {behavior.length === 0 && (
          <p className="text-center text-gray-500 py-8">No behavior notes yet</p>
        )}
      </div>
    </div>
  );
}

// Rewards Tab Component
function RewardsTab({ child, parentId, onUpdate }) {
  const [rewards, setRewards] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    type: 'item',
    cost: 0,
    costType: 'points'
  });

  useEffect(() => {
    loadRewards();
  }, [child]);

  const loadRewards = async () => {
    try {
      const rew = await childRewardsService.getChildRewards(child.uid);
      setRewards(rew);
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const handleApproveRedemption = async (rewardId, approved) => {
    try {
      await childRewardsService.approveRewardRedemption(rewardId, parentId, approved);
      toast.success(`Reward ${approved ? 'approved' : 'rejected'}`);
      loadRewards();
      onUpdate();
    } catch (error) {
      console.error('Error approving reward:', error);
      toast.error('Failed to update reward');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rewards & Motivation</h2>
          <p className="text-gray-600">Create rewards and approve redemption requests</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Reward</span>
        </button>
      </div>

      <div className="space-y-3">
        {rewards.map(reward => (
          <div key={reward.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Cost: {reward.cost} {reward.costType}</span>
                  <span>Status: {reward.status}</span>
                </div>
              </div>
              {reward.status === 'pending_approval' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApproveRedemption(reward.id, true)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproveRedemption(reward.id, false)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {rewards.length === 0 && (
          <p className="text-center text-gray-500 py-8">No rewards created yet</p>
        )}
      </div>
    </div>
  );
}

// Wallet Tab Component
function WalletTab({ child, parentId, onUpdate }) {
  const [wallet, setWallet] = useState(null);
  const [moneyRequests, setMoneyRequests] = useState([]);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyForm, setAddMoneyForm] = useState({ amount: '', reason: '' });

  useEffect(() => {
    loadWalletData();
  }, [child]);

  const loadWalletData = async () => {
    try {
      const [wal, requests] = await Promise.all([
        childWalletService.getChildWallet(child.uid, parentId),
        childWalletService.getMoneyRequests(parentId)
      ]);
      setWallet(wal);
      setMoneyRequests(requests.filter(r => r.childId === child.uid));
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    try {
      await childWalletService.addPoints(child.uid, parentId, parseFloat(addMoneyForm.amount), addMoneyForm.reason);
      toast.success('Money added!');
      setShowAddMoney(false);
      setAddMoneyForm({ amount: '', reason: '' });
      loadWalletData();
      onUpdate();
    } catch (error) {
      console.error('Error adding money:', error);
      toast.error('Failed to add money');
    }
  };

  const handleMoneyRequest = async (requestId, approved) => {
    try {
      await childWalletService.handleMoneyRequest(requestId, parentId, approved);
      toast.success(`Request ${approved ? 'approved' : 'denied'}`);
      loadWalletData();
      onUpdate();
    } catch (error) {
      console.error('Error handling request:', error);
      toast.error('Failed to update request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wallet & Finance</h2>
          <p className="text-gray-600">Manage money and approve requests for {child.firstName}</p>
        </div>
        <button
          onClick={() => setShowAddMoney(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          <span>Add Money</span>
        </button>
      </div>

      {wallet && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Points</div>
              <div className="text-3xl font-bold text-gray-900">{wallet.points || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Balance</div>
              <div className="text-3xl font-bold text-gray-900">${(wallet.balance || 0).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Money Requests</h3>
        <div className="space-y-3">
          {moneyRequests.filter(r => r.status === 'pending').map(request => (
            <div key={request.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">${request.amount}</div>
                  <p className="text-sm text-gray-600 mt-1">{request.reason || 'No reason provided'}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Recently'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleMoneyRequest(request.id, true)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleMoneyRequest(request.id, false)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
          {moneyRequests.filter(r => r.status === 'pending').length === 0 && (
            <p className="text-center text-gray-500 py-4">No pending money requests</p>
          )}
        </div>
      </div>

      {showAddMoney && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Add Money</h3>
            <form onSubmit={handleAddMoney} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={addMoneyForm.amount}
                  onChange={(e) => setAddMoneyForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <input
                  type="text"
                  value={addMoneyForm.reason}
                  onChange={(e) => setAddMoneyForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Allowance, Reward"
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMoney(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Money
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Screen Time Tab Component
function ScreenTimeTab({ child, parentId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [child]);

  const loadSettings = async () => {
    try {
      const s = await childScreenTimeService.getScreenTimeSettings(child.uid, parentId);
      setSettings(s);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates) => {
    try {
      await childScreenTimeService.updateScreenTimeSettings(child.uid, parentId, {
        ...screenTimeForm
      });
      // toast.success('Settings updated!');
      loadSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Screen Time & Access Control</h2>
        <p className="text-gray-600">Set limits and control access for {child.firstName}</p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Daily Screen Time Limit (minutes)
          </label>
          <input
            type="number"
            min="0"
            value={settings.dailyLimit || 120}
            onChange={(e) => handleUpdateSettings({ dailyLimit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Focus Mode</label>
              <p className="text-xs text-gray-500">Only show homework and tasks</p>
            </div>
            <button
              onClick={() => handleUpdateSettings({ focusModeEnabled: !settings.focusModeEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                settings.focusModeEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  settings.focusModeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Calendar Tab Component
function CalendarTab({ child, parentId }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Family Calendar</h2>
      <p className="text-gray-600">Add events and assign them to {child.firstName}</p>
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-600">Calendar integration will be implemented here</p>
      </div>
    </div>
  );
}

// Security Tab Component
function SecurityTab({ child, parentId }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Permissions & Security</h2>
      <p className="text-gray-600">Reset password, enable 2FA, and control access for {child.firstName}</p>
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-600">Security settings will be implemented here</p>
      </div>
    </div>
  );
}

// Add/Edit Child Modal Component
function AddEditChildModal({ childForm, setChildForm, editingChild, onSubmit, onClose, submitting }) {
    const fileInputRef = React.useRef(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setChildForm(prev => ({ ...prev, photoFile: file }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {editingChild ? 'Edit Child Account' : 'Add New Child Account'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                            <input
                                type="text"
                                required
                                value={childForm.firstName}
                                onChange={(e) => setChildForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                            <input
                                type="text"
                                required
                                value={childForm.lastName}
                                onChange={(e) => setChildForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input
                                type="email"
                                required
                                disabled={!!editingChild}
                                value={childForm.email}
                                onChange={(e) => setChildForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                        </div>
                        {!editingChild && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={childForm.password}
                                    onChange={(e) => setChildForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                            <input
                                type="date"
                                value={childForm.dateOfBirth}
                                onChange={(e) => setChildForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                            <input
                                type="text"
                                value={childForm.grade}
                                onChange={(e) => setChildForm(prev => ({ ...prev, grade: e.target.value }))}
                                placeholder="e.g., 3rd Grade"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                        <input
                            type="tel"
                            value={childForm.phone}
                            onChange={(e) => setChildForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoChange}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Camera className="h-5 w-5" />
                            <span>{childForm.photoFile ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>
                    </div>

                    {editingChild && (
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="enabled"
                                checked={childForm.enabled}
                                onChange={(e) => setChildForm(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
                                Account Enabled
                            </label>
                        </div>
                    )}

                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : editingChild ? 'Save Changes' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
