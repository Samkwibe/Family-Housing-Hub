// src/pages/ParentChildrenManagement.jsx - Parent Children Account Management
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userService, childrenService, childScreenTimeService } from '../services/firebaseService';
import {
  UserPlus,
  Edit3,
  Trash2,
  User,
  Camera,
  X,
  Save,
  CheckCircle,
  XCircle,
  Smartphone,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Upload,
  AlertCircle,
  Power,
  PowerOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParentChildrenManagement() {
  const { currentUser, userProfile, createChildAccount } = useAuth();
  const [loading, setLoading] = useState(true);
  const [childAccounts, setChildAccounts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (currentUser && userProfile?.role === 'family') {
      loadChildAccounts();
    } else {
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  const loadChildAccounts = async () => {
    setLoading(true);
    try {
      // Get all child accounts for this parent
      const accounts = await userService.getChildrenByParent(currentUser.uid);
      
      // Enrich with screen time settings and status
      const enrichedAccounts = await Promise.all(
        accounts.map(async (account) => {
          try {
            // Get screen time settings for status
            let screenTimeSettings = null;
            try {
              screenTimeSettings = await childScreenTimeService.getScreenTimeSettings(account.id, currentUser.uid);
            } catch (error) {
              console.error('Error loading screen time:', error);
            }
            
            return {
              ...account,
              uid: account.id,
              screenTimeSettings,
              isOnline: false, // Would be determined by active sessions
              focusModeEnabled: screenTimeSettings?.focusModeEnabled || false
            };
          } catch (error) {
            console.error(`Error enriching account ${account.id}:`, error);
            return {
              ...account,
              uid: account.id,
              screenTimeSettings: null,
              isOnline: false,
              focusModeEnabled: false
            };
          }
        })
      );

      setChildAccounts(enrichedAccounts);
    } catch (error) {
      console.error('Error loading child accounts:', error);
      toast.error('Failed to load child accounts');
    } finally {
      setLoading(false);
    }
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

      // Child account is automatically linked via parentId in the user profile
      // No need to store separately

      // Also create a child profile entry for compatibility
      await childrenService.addChild(currentUser.uid, {
        name: `${childForm.firstName} ${childForm.lastName}`,
        dateOfBirth: childForm.dateOfBirth,
        gender: '',
        notes: `Grade: ${childForm.grade || 'N/A'}`
      });

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
      await userService.updateUserProfile(editingChild.uid, {
        firstName: childForm.firstName,
        lastName: childForm.lastName,
        phone: childForm.phone || '',
        dateOfBirth: childForm.dateOfBirth || null,
        photoURL: childForm.photoURL,
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
      // Disable the child account (don't delete, just mark as disabled)
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
      password: '', // Don't show password
      phone: child.phone || '',
      dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : '',
      grade: child.grade || '',
      photoURL: child.photoURL || null,
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

  if (userProfile?.role !== 'family') {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Parent Access Only</h2>
        <p className="text-gray-600">This page is only available for parent accounts.</p>
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Children</h1>
          <p className="text-gray-600 mt-1">Add, edit, and manage your children's accounts</p>
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

      {/* Children Grid */}
      {childAccounts.length === 0 ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {childAccounts.map((child) => (
            <div
              key={child.uid}
              className={`bg-white rounded-xl border-2 p-6 ${
                child.enabled === false ? 'opacity-60 border-gray-300' : 'border-gray-200 hover:border-blue-300'
              } transition-all`}
            >
              {/* Child Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    {child.photoURL ? (
                      <img
                        src={child.photoURL}
                        alt={child.firstName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                    {/* Online/Offline Status */}
                    <div
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                        child.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={child.isOnline ? 'Online' : 'Offline'}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {child.firstName} {child.lastName}
                    </h3>
                    {child.dateOfBirth && (
                      <p className="text-sm text-gray-600">Age {calculateAge(child.dateOfBirth)}</p>
                    )}
                    {child.grade && (
                      <p className="text-sm text-gray-600">Grade {child.grade}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {child.focusModeEnabled && (
                    <div className="p-2 bg-yellow-100 rounded-lg" title="Focus Mode Enabled">
                      <Lock className="h-4 w-4 text-yellow-600" />
                    </div>
                  )}
                  {child.enabled === false && (
                    <div className="p-2 bg-gray-100 rounded-lg" title="Account Disabled">
                      <PowerOff className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Status Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${child.enabled !== false ? 'text-green-600' : 'text-gray-500'}`}>
                    {child.enabled !== false ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {child.screenTimeSettings && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Screen Time:</span>
                    <span className="font-medium text-blue-600">
                      {child.screenTimeSettings.dailyLimit || 120} min/day
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Open child dashboard in new tab (child would need to log in)
                    toast.info(`To view ${child.firstName}'s dashboard, they need to log in with their account: ${child.email}`);
                  }}
                  className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  title="Child must log in to view their dashboard"
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  View
                </button>
                <button
                  onClick={() => startEditing(child)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <Edit3 className="h-4 w-4 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleEnabled(child.uid, child.enabled)}
                  className="px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title={child.enabled !== false ? 'Disable Account' : 'Enable Account'}
                >
                  {child.enabled !== false ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteChild(child.uid)}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  title="Delete Account"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingChild ? 'Edit Child Account' : 'Add New Child Account'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingChild ? handleEditChild : handleAddChild} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={childForm.firstName}
                    onChange={(e) => setChildForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={childForm.lastName}
                    onChange={(e) => setChildForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!!editingChild}
                    value={childForm.email}
                    onChange={(e) => setChildForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
                {!editingChild && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={childForm.password}
                      onChange={(e) => setChildForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={childForm.dateOfBirth}
                    onChange={(e) => setChildForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade
                  </label>
                  <input
                    type="text"
                    value={childForm.grade}
                    onChange={(e) => setChildForm(prev => ({ ...prev, grade: e.target.value }))}
                    placeholder="e.g., 3rd Grade"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={childForm.phone}
                  onChange={(e) => setChildForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : editingChild ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

