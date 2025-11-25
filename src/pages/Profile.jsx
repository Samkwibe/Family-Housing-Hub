// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Save, 
  Edit3, 
  Lock, 
  Shield,
  Upload,
  X,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { userProfile, updateUserProfile, uploadProfilePhoto, updateUserEmail, updateUserPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [editMode, setEditMode] = useState({});
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Personal Information Form
  const PersonalInfoForm = () => {
    const [localData, setLocalData] = useState({
      firstName: userProfile?.firstName || '',
      lastName: userProfile?.lastName || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      }
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      
      try {
        await updateUserProfile(localData);
        setEditMode(prev => ({ ...prev, personal: false }));
        toast.success('Personal information updated!');
      } catch (error) {
        console.error('Error updating personal info:', error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              required
              value={localData.firstName}
              onChange={(e) => setLocalData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={localData.lastName}
              onChange={(e) => setLocalData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={localData.phone}
            onChange={(e) => setLocalData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={localData.address.street}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                value={localData.address.city}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                value={localData.address.state}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={localData.address.zipCode}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, zipCode: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
          </button>
          <button
            type="button"
            onClick={() => setEditMode(prev => ({ ...prev, personal: false }))}
            className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  // Profile Photo Upload
  const ProfilePhotoSection = () => {
    const [uploading, setUploading] = useState(false);

    const handlePhotoUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }

      setUploading(true);
      try {
        // Create preview
        const previewURL = URL.createObjectURL(file);
        setPhotoPreview(previewURL);

        // Upload to Firebase
        await uploadProfilePhoto(file);
        
        toast.success('Profile photo updated!');
      } catch (error) {
        console.error('Error uploading photo:', error);
        toast.error('Failed to upload profile photo');
      } finally {
        setUploading(false);
      }
    };

    return (
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold relative overflow-hidden">
            {userProfile?.photoURL ? (
              <img 
                src={userProfile.photoURL} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-10 w-10" />
            )}
          </div>
          <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
            <Camera className="h-4 w-4" />
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">Profile Photo</h3>
          <p className="text-sm text-gray-600">
            {uploading ? 'Uploading...' : 'Click the camera icon to update your photo'}
          </p>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF • Max 5MB</p>
        </div>
      </div>
    );
  };

  // Security Settings
  const SecuritySettings = () => {
    const [emailForm, setEmailForm] = useState({
      newEmail: '',
      password: ''
    });
    const [passwordForm, setPasswordForm] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    const handleEmailUpdate = async (e) => {
      e.preventDefault();
      if (!emailForm.newEmail || !emailForm.password) {
        toast.error('Please fill all fields');
        return;
      }

      setLoading(true);
      try {
        await updateUserEmail(emailForm.newEmail, emailForm.password);
        setEmailForm({ newEmail: '', password: '' });
        toast.success('Email updated successfully!');
      } catch (error) {
        // Error handled in the function
      } finally {
        setLoading(false);
      }
    };

    const handlePasswordUpdate = async (e) => {
      e.preventDefault();
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        toast.error('Password should be at least 6 characters');
        return;
      }

      setLoading(true);
      try {
        await updateUserPassword(passwordForm.newPassword, passwordForm.currentPassword);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toast.success('Password updated successfully!');
      } catch (error) {
        // Error handled in the function
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-8">
        {/* Email Update */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Update Email Address</span>
          </h4>
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Email
              </label>
              <input
                type="email"
                value={userProfile?.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={emailForm.password}
                onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your current password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Update Email
            </button>
          </form>
        </div>

        {/* Password Update */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Lock className="h-5 w-5 text-green-600" />
            <span>Change Password</span>
          </h4>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <ProfilePhotoSection />
            
            <nav className="mt-8 space-y-2">
              {[
                { id: 'personal', label: 'Personal Info', icon: User },
                { id: 'security', label: 'Security', icon: Shield }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeTab === 'personal' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
                  {!editMode.personal && (
                    <button
                      onClick={() => setEditMode(prev => ({ ...prev, personal: true }))}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit Information</span>
                    </button>
                  )}
                </div>

                {editMode.personal ? (
                  <PersonalInfoForm />
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <p className="text-gray-900 font-medium">{userProfile?.firstName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <p className="text-gray-900 font-medium">{userProfile?.lastName}</p>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <p className="text-gray-900 font-medium">{userProfile?.email}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <p className="text-gray-900 font-medium">{userProfile?.phone || 'Not provided'}</p>
                    </div>

                    {userProfile?.address?.street && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <p className="text-gray-900 font-medium">
                          {userProfile.address.street}<br />
                          {userProfile.address.city}, {userProfile.address.state} {userProfile.address.zipCode}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && <SecuritySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}