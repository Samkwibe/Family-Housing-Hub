// src/pages/Profile.jsx - Enhanced User Profile
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
  Check,
  MapPin,
  Users,
  Calendar,
  DollarSign,
  Home,
  Plus,
  Trash2,
  Clock,
  Activity,
  FileText,
  Star,
  Award,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const { 
    userProfile, 
    currentUser,
    updateUserProfile, 
    uploadProfilePhoto,
    addFamilyMember,
    removeFamilyMember,
    updateLeaseInfo
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState({});
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  // New family member form
  const [newMember, setNewMember] = useState({
    name: '',
    relationship: '',
    age: '',
    phoneNumber: ''
  });

  // Format date helper
  const formatDate = (date) => {
    if (!date) return 'Not set';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate days until lease end
  const getDaysUntilLeaseEnd = () => {
    if (!userProfile?.lease?.endDate) return null;
    const end = new Date(userProfile.lease.endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Profile Photo Section
  const ProfilePhotoSection = () => {
    const [uploading, setUploading] = useState(false);

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

      setUploading(true);
      try {
        const previewURL = URL.createObjectURL(file);
        setPhotoPreview(previewURL);
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
      <div className="relative">
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 shadow-xl">
          <div className="w-full h-full rounded-xl bg-white overflow-hidden flex items-center justify-center">
            {userProfile?.photoURL || photoPreview ? (
              <img 
                src={photoPreview || userProfile.photoURL} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">
                  {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                </span>
              </div>
            )}
          </div>
        </div>
        <label 
          htmlFor="photo-upload" 
          className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-3 rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-lg hover:scale-110"
        >
          <Camera className="h-5 w-5" />
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        {uploading && (
          <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  };

  // Personal Info Form
  const PersonalInfoForm = () => {
    const [localData, setLocalData] = useState({
      firstName: userProfile?.firstName || '',
      lastName: userProfile?.lastName || '',
      phone: userProfile?.phone || '',
      dateOfBirth: userProfile?.dateOfBirth || '',
      address: userProfile?.address || {
        street: '',
        unit: '',
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
      } catch (error) {
        console.error('Error updating personal info:', error);
      } finally {
        setLoading(false);
      }
    };

    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
            <input
              type="text"
              required
              value={localData.firstName}
              onChange={(e) => setLocalData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
            <input
              type="text"
              required
              value={localData.lastName}
              onChange={(e) => setLocalData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={localData.phone}
            onChange={(e) => setLocalData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="+1 (555) 123-4567"
          />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
            <input
              type="date"
              value={localData.dateOfBirth}
              onChange={(e) => setLocalData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <span>Address Information</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
              <input
                type="text"
                value={localData.address.street}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit/Apt</label>
              <input
                type="text"
                value={localData.address.unit}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, unit: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Apt 2B"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={localData.address.city}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <select
                value={localData.address.state}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Select</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
              <input
                type="text"
                value={localData.address.zipCode}
                onChange={(e) => setLocalData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, zipCode: e.target.value }
                }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 flex items-center space-x-2"
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

  // Family Members Section
  const FamilyMembersSection = () => {
    const handleAddMember = async (e) => {
      e.preventDefault();
      if (!newMember.name || !newMember.relationship) {
        toast.error('Please fill in name and relationship');
        return;
      }

      setLoading(true);
      try {
        await addFamilyMember(newMember);
        setNewMember({ name: '', relationship: '', age: '', phoneNumber: '' });
        setShowAddMember(false);
      } catch (error) {
        console.error('Error adding family member:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleRemoveMember = async (memberId) => {
      if (!window.confirm('Are you sure you want to remove this family member?')) return;
      
      try {
        await removeFamilyMember(memberId);
      } catch (error) {
        console.error('Error removing family member:', error);
      }
    };

    const familyMembers = userProfile?.familyMembers || [];

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Family Members</span>
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
              {familyMembers.length}
            </span>
          </h3>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Add Member Form */}
        {showAddMember && (
          <form onSubmit={handleAddMember} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-4">Add New Family Member</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                <select
                  value={newMember.relationship}
                  onChange={(e) => setNewMember(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select...</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input
                  type="number"
                  value={newMember.age}
                  onChange={(e) => setNewMember(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="25"
                  min="0"
                  max="120"
              />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input
                  type="tel"
                  value={newMember.phoneNumber}
                  onChange={(e) => setNewMember(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            <button
              type="submit"
              disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? 'Adding...' : 'Add Member'}
            </button>
            </div>
          </form>
        )}

        {/* Members List */}
        {familyMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyMembers.map((member, index) => (
              <div 
                key={member.id || index}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{member.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">{member.relationship}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
                  {member.age && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>{member.age} years old</span>
                    </div>
                  )}
                  {member.phoneNumber && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{member.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No family members added yet</p>
            <p className="text-sm text-gray-400">Click "Add Member" to add family members</p>
          </div>
        )}
      </div>
    );
  };

  // Lease Information Section (with Rent vs Own toggle)
  const LeaseInfoSection = () => {
    const [editLease, setEditLease] = useState(false);
    const [housingStatus, setHousingStatus] = useState(userProfile?.housingStatus || 'rent');
    const [leaseData, setLeaseData] = useState({
      startDate: userProfile?.lease?.startDate || '',
      endDate: userProfile?.lease?.endDate || '',
      monthlyRent: userProfile?.lease?.monthlyRent || '',
      securityDeposit: userProfile?.lease?.securityDeposit || '',
      landlordName: userProfile?.landlord?.name || '',
      landlordPhone: userProfile?.landlord?.phone || '',
      landlordEmail: userProfile?.landlord?.email || '',
      // For homeowners
      mortgageAmount: userProfile?.mortgage?.monthlyPayment || '',
      propertyValue: userProfile?.property?.value || '',
      purchaseDate: userProfile?.property?.purchaseDate || ''
    });

    const handleSaveLease = async (e) => {
      e.preventDefault();
      setLoading(true);
      try {
        const updateData = {
          housingStatus,
          lease: {
            startDate: leaseData.startDate,
            endDate: leaseData.endDate,
            monthlyRent: leaseData.monthlyRent,
            securityDeposit: leaseData.securityDeposit
          },
          landlord: {
            name: leaseData.landlordName,
            phone: leaseData.landlordPhone,
            email: leaseData.landlordEmail
          }
        };
        
        if (housingStatus === 'own') {
          updateData.mortgage = { monthlyPayment: leaseData.mortgageAmount };
          updateData.property = { 
            value: leaseData.propertyValue,
            purchaseDate: leaseData.purchaseDate
          };
        }
        
        await updateUserProfile(updateData);
        setEditLease(false);
        toast.success('Housing information updated!');
      } catch (error) {
        console.error('Error updating housing info:', error);
      } finally {
        setLoading(false);
      }
    };

    const daysUntilEnd = getDaysUntilLeaseEnd();
    const currentHousingStatus = userProfile?.housingStatus || 'rent';

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Home className="h-5 w-5 text-green-600" />
            <span>Housing Information</span>
          </h3>
          <button
            onClick={() => setEditLease(!editLease)}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
          >
            <Edit3 className="h-4 w-4" />
            <span>{editLease ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {editLease ? (
          <form onSubmit={handleSaveLease} className="space-y-6">
            {/* Housing Status Toggle */}
            <div className="bg-gray-50 rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">Housing Status</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setHousingStatus('rent')}
                  className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold transition-all flex flex-col items-center ${
                    housingStatus === 'rent'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="h-8 w-8 mb-2" />
                  <span>I Rent</span>
                  <span className="text-xs font-normal mt-1 opacity-75">Tenant / Renter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHousingStatus('own')}
                  className={`flex-1 py-4 px-6 rounded-xl border-2 font-semibold transition-all flex flex-col items-center ${
                    housingStatus === 'own'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Home className="h-8 w-8 mb-2" />
                  <span>I Own</span>
                  <span className="text-xs font-normal mt-1 opacity-75">Homeowner</span>
                </button>
              </div>
            </div>

            {/* Renter Fields */}
            {housingStatus === 'rent' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start Date</label>
                    <input
                      type="date"
                      value={leaseData.startDate}
                      onChange={(e) => setLeaseData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lease End Date</label>
                    <input
                      type="date"
                      value={leaseData.endDate}
                      onChange={(e) => setLeaseData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={leaseData.monthlyRent}
                        onChange={(e) => setLeaseData(prev => ({ ...prev, monthlyRent: e.target.value }))}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={leaseData.securityDeposit}
                        onChange={(e) => setLeaseData(prev => ({ ...prev, securityDeposit: e.target.value }))}
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Landlord Info */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-3">Landlord Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={leaseData.landlordName}
                        onChange={(e) => setLeaseData(prev => ({ ...prev, landlordName: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="Landlord name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={leaseData.landlordPhone}
                        onChange={(e) => setLeaseData(prev => ({ ...prev, landlordPhone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={leaseData.landlordEmail}
                        onChange={(e) => setLeaseData(prev => ({ ...prev, landlordEmail: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                        placeholder="landlord@email.com"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Homeowner Fields */}
            {housingStatus === 'own' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={leaseData.purchaseDate}
                    onChange={(e) => setLeaseData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={leaseData.propertyValue}
                      onChange={(e) => setLeaseData(prev => ({ ...prev, propertyValue: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Mortgage Payment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={leaseData.mortgageAmount}
                      onChange={(e) => setLeaseData(prev => ({ ...prev, mortgageAmount: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                housingStatus === 'own'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? 'Saving...' : 'Save Housing Info'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Housing Status Badge */}
            <div className={`inline-flex items-center px-4 py-2 rounded-full font-medium ${
              currentHousingStatus === 'own'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {currentHousingStatus === 'own' ? (
                <><Home className="h-4 w-4 mr-2" /> Homeowner</>
              ) : (
                <><DollarSign className="h-4 w-4 mr-2" /> Renter</>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentHousingStatus === 'rent' ? (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-green-700 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Lease Period</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatDate(userProfile?.lease?.startDate)} - {formatDate(userProfile?.lease?.endDate)}
                    </p>
                    {daysUntilEnd !== null && (
                      <p className={`text-sm mt-1 ${daysUntilEnd < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                        {daysUntilEnd > 0 ? `${daysUntilEnd} days remaining` : 'Lease expired'}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-blue-700 mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Monthly Rent</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(userProfile?.lease?.monthlyRent)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-purple-700 mb-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Security Deposit</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(userProfile?.lease?.securityDeposit)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-orange-700 mb-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Landlord</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {userProfile?.landlord?.name || 'Not set'}
                    </p>
                    {userProfile?.landlord?.phone && (
                      <p className="text-sm text-gray-600">{userProfile.landlord.phone}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-green-700 mb-2">
                      <Home className="h-4 w-4" />
                      <span className="text-sm font-medium">Property Value</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(userProfile?.property?.value)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-blue-700 mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Monthly Mortgage</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(userProfile?.mortgage?.monthlyPayment)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 md:col-span-2">
                    <div className="flex items-center space-x-2 text-purple-700 mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Purchase Date</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {formatDate(userProfile?.property?.purchaseDate)}
                    </p>
                  </div>
                </>
              )}

              <div className={`bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4 ${currentHousingStatus === 'own' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center space-x-2 text-gray-700 mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Property Address</span>
                </div>
                <p className="font-semibold text-gray-900">
                  {userProfile?.address?.street || 'Address not set'}
                </p>
                {userProfile?.address?.city && (
                  <p className="text-sm text-gray-600">
                    {userProfile.address.city}, {userProfile.address.state} {userProfile.address.zipCode}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Account Stats
  const accountStats = [
    {
      label: 'Member Since',
      value: formatDate(userProfile?.createdAt),
      icon: Calendar,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      label: 'Profile Status',
      value: userProfile?.profileComplete ? 'Complete' : 'Incomplete',
      icon: userProfile?.profileComplete ? Check : AlertCircle,
      color: userProfile?.profileComplete ? 'text-green-600 bg-green-100' : 'text-orange-600 bg-orange-100'
    },
    {
      label: 'Family Size',
      value: `${(userProfile?.familyMembers?.length || 0) + 1} members`,
      icon: Users,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      label: 'Last Login',
      value: formatDate(userProfile?.lastLogin),
      icon: Clock,
      color: 'text-gray-600 bg-gray-100'
    }
  ];

  // Navigation tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'personal', label: 'Personal Info', icon: Edit3 },
    { id: 'family', label: 'Family', icon: Users },
    { id: 'lease', label: 'Lease', icon: Home },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          <ProfilePhotoSection />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {userProfile?.firstName} {userProfile?.lastName}
            </h1>
            <p className="text-blue-100 mb-4">{userProfile?.email}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {userProfile?.phone && (
                <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                  <Phone className="h-3 w-3 mr-1" />
                  {userProfile.phone}
                </span>
              )}
              {userProfile?.address?.city && (
                <span className="inline-flex items-center px-3 py-1 bg-white/20 rounded-full text-sm">
                  <MapPin className="h-3 w-3 mr-1" />
                  {userProfile.address.city}, {userProfile.address.state}
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                userProfile?.profileComplete 
                  ? 'bg-green-500/30 text-green-100' 
                  : 'bg-orange-500/30 text-orange-100'
              }`}>
                {userProfile?.profileComplete ? (
                  <><Check className="h-3 w-3 mr-1" /> Verified</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Complete Profile</>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {accountStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-2`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="font-semibold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
                </button>
              ))}
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Info */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Quick Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Full Name</span>
                      <span className="font-medium">{userProfile?.firstName} {userProfile?.lastName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Email</span>
                      <span className="font-medium">{userProfile?.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Phone</span>
                      <span className="font-medium">{userProfile?.phone || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Role</span>
                      <span className="font-medium capitalize">{userProfile?.role || 'Family'}</span>
                    </div>
                  </div>
                </div>

                {/* Lease Summary */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Home className="h-5 w-5 text-green-600" />
                    <span>Lease Summary</span>
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Monthly Rent</span>
                      <span className="text-xl font-bold text-green-700">
                        {formatCurrency(userProfile?.lease?.monthlyRent)}
                      </span>
                    </div>
                    {getDaysUntilLeaseEnd() !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Days Remaining</span>
                        <span className={`font-semibold ${getDaysUntilLeaseEnd() < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                          {getDaysUntilLeaseEnd()} days
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveTab('lease')}
                    className="mt-4 text-green-700 hover:text-green-800 font-medium flex items-center space-x-1"
                  >
                    <span>View Details</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Family Preview */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <span>Family Members ({(userProfile?.familyMembers?.length || 0) + 1})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('family')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                  >
                    <span>Manage</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center px-3 py-2 bg-white rounded-lg border border-gray-200">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                      <span className="text-blue-600 font-semibold text-sm">
                        {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                      </span>
                    </div>
                    <span className="font-medium">{userProfile?.firstName} (You)</span>
                  </div>
                  {(userProfile?.familyMembers || []).slice(0, 3).map((member, index) => (
                    <div key={member.id || index} className="inline-flex items-center px-3 py-2 bg-white rounded-lg border border-gray-200">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                        <User className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  ))}
                  {(userProfile?.familyMembers?.length || 0) > 3 && (
                    <div className="inline-flex items-center px-3 py-2 bg-gray-100 rounded-lg text-gray-600">
                      +{userProfile.familyMembers.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                  {!editMode.personal && (
                    <button
                      onClick={() => setEditMode(prev => ({ ...prev, personal: true }))}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                    </button>
                  )}
                </div>
                {editMode.personal ? (
                  <PersonalInfoForm />
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                      <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">First Name</label>
                      <p className="text-lg font-medium text-gray-900">{userProfile?.firstName || 'Not set'}</p>
                      </div>
                      <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Last Name</label>
                      <p className="text-lg font-medium text-gray-900">{userProfile?.lastName || 'Not set'}</p>
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                      <p className="text-lg font-medium text-gray-900">{userProfile?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                      <p className="text-lg font-medium text-gray-900">{userProfile?.phone || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                      {userProfile?.address?.street ? (
                        <div className="text-lg font-medium text-gray-900">
                          <p>{userProfile.address.street}{userProfile.address.unit && `, ${userProfile.address.unit}`}</p>
                          <p>{userProfile.address.city}, {userProfile.address.state} {userProfile.address.zipCode}</p>
                        </div>
                      ) : (
                        <p className="text-lg font-medium text-gray-400">Not set</p>
                      )}
                    </div>
                      <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Date of Birth</label>
                      <p className="text-lg font-medium text-gray-900">{formatDate(userProfile?.dateOfBirth)}</p>
                      </div>
                  </div>
                  </div>
                )}
              </div>
            )}

          {/* Family Tab */}
          {activeTab === 'family' && <FamilyMembersSection />}

          {/* Lease Tab */}
          {activeTab === 'lease' && <LeaseInfoSection />}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Security Settings</h2>
              
              {/* Change Password */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-blue-100">
                    <Lock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Password</h3>
                    <p className="text-gray-600 text-sm mt-1">Change your account password</p>
                    <a 
                      href="/settings" 
                      className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Change Password
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Two Factor */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-green-100">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">Add an extra layer of security to your account</p>
                  </div>
                </div>
              </div>

              {/* Account Activity */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="p-3 rounded-xl bg-purple-100">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Account Activity</h3>
                    <p className="text-gray-600 text-sm mt-1">View your recent account activity</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Last login</span>
                        <span className="font-medium">{formatDate(userProfile?.lastLogin)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Account created</span>
                        <span className="font-medium">{formatDate(userProfile?.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600">Profile updated</span>
                        <span className="font-medium">{formatDate(userProfile?.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
