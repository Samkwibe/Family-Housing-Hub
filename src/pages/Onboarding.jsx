// src/pages/Onboarding.jsx - OPTIMIZED VERSION
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Home, 
  Phone, 
  MapPin, 
  Users, 
  Calendar,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  X,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Onboarding() {
  const { userProfile, completeProfile, addFamilyMember, updateLeaseInfo, uploadProfilePhoto } = useAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  // Form data state
  const [formData, setFormData] = useState({
    // Personal Info (Step 1)
    firstName: userProfile?.firstName || '',
    lastName: userProfile?.lastName || '',
    phone: userProfile?.phone || '',
    email: userProfile?.email || '',
    dateOfBirth: '',
    
    // Address Info (Step 2)
    street: '',
    unit: '',
    city: '',
    state: '',
    zipCode: '',
    
    // Family Members (Step 3)
    familyMembers: [],
    
    // Lease Info (Step 4)
    monthlyRent: '',
    leaseStartDate: '',
    leaseEndDate: '',
    securityDeposit: ''
  });

  const [tempFamilyMember, setTempFamilyMember] = useState({
    name: '',
    relationship: '',
    age: '',
    phoneNumber: ''
  });

  const totalSteps = 4;

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  // Handle profile image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add family member
  const handleAddFamilyMember = () => {
    if (!tempFamilyMember.name || !tempFamilyMember.relationship) {
      toast.error('Please fill in name and relationship');
      return;
    }

    setFormData(prev => ({
      ...prev,
      familyMembers: [
        ...prev.familyMembers,
        { ...tempFamilyMember, id: `temp_${Date.now()}` }
      ]
    }));

    setTempFamilyMember({
      name: '',
      relationship: '',
      age: '',
      phoneNumber: ''
    });

    toast.success('Family member added!');
  };

  // Remove family member
  const handleRemoveFamilyMember = (id) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter(m => m.id !== id)
    }));
  };

  // Validate current step
  const validateStep = () => {
    setError(null);
    
    switch (currentStep) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.phone) {
          setError('Please fill in all required fields');
          return false;
        }
        const phoneDigits = formData.phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          setError('Please enter a valid 10-digit phone number');
          return false;
        }
        return true;
        
      case 2:
        if (!formData.street || !formData.city || !formData.state || !formData.zipCode) {
          setError('Please fill in all address fields');
          return false;
        }
        if (!/^\d{5}$/.test(formData.zipCode)) {
          setError('Please enter a valid 5-digit ZIP code');
          return false;
        }
        return true;
        
      case 3:
        // Family members are optional
        return true;
        
      case 4:
        if (!formData.monthlyRent || !formData.leaseStartDate) {
          setError('Please fill in rent amount and lease start date');
          return false;
        }
        if (parseFloat(formData.monthlyRent) <= 0) {
          setError('Please enter a valid rent amount');
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  // Handle form submission with better error handling
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Starting profile completion...');

      // Step 1: Upload profile photo (if exists)
      let photoURL = null;
      if (profileImage) {
        try {
          console.log('Uploading profile photo...');
          photoURL = await uploadProfilePhoto(profileImage);
          console.log('Photo uploaded:', photoURL);
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          // Don't fail the whole process if photo fails
          toast.error('Photo upload failed, but continuing with profile setup');
        }
      }

      // Step 2: Complete basic profile
      console.log('Updating profile...');
      await completeProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth || null,
        photoURL,
        address: {
          street: formData.street.trim(),
          unit: formData.unit.trim(),
          city: formData.city.trim(),
          state: formData.state,
          zipCode: formData.zipCode.trim(),
          country: 'USA'
        }
      });
      console.log('Profile updated');

      // Step 3: Add family members (if any)
      if (formData.familyMembers.length > 0) {
        console.log('Adding family members...');
        for (const member of formData.familyMembers) {
          try {
            await addFamilyMember({
              name: member.name.trim(),
              relationship: member.relationship,
              age: member.age ? parseInt(member.age) : null,
              phoneNumber: member.phoneNumber?.trim() || null
            });
          } catch (memberError) {
            console.error('Error adding family member:', memberError);
            // Continue with other members
          }
        }
        console.log('Family members added');
      }

      // Step 4: Update lease info
      console.log('Updating lease info...');
      await updateLeaseInfo({
        monthlyRent: parseFloat(formData.monthlyRent),
        startDate: new Date(formData.leaseStartDate),
        endDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : null,
        securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0
      });
      console.log('Lease info updated');

      // Success!
      toast.success('Profile completed successfully!');
      
      // Small delay to show success message
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);

    } catch (error) {
      console.error('Error completing profile:', error);
      
      // Better error messages
      let errorMessage = 'Failed to complete profile. ';
      
      if (error.message?.includes('permission')) {
        errorMessage += 'Permission denied. Please check your Firebase rules.';
      } else if (error.message?.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else if (error.message?.includes('quota')) {
        errorMessage += 'Storage quota exceeded. Please contact support.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Skip onboarding
  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip? You can complete your profile later in Settings.')) {
      navigate('/', { replace: true });
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
              <p className="text-gray-600">Let's start with your basic information</p>
            </div>

            {/* Profile Photo Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-lg">
                  <Upload className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth (Optional)
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Address Information</h2>
              <p className="text-gray-600">Where are you currently living?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit/Apt # (Optional)
                </label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  placeholder="Apt 4B"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="New York"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select State</option>
                    <option value="AL">Alabama</option>
                    <option value="AK">Alaska</option>
                    <option value="AZ">Arizona</option>
                    <option value="AR">Arkansas</option>
                    <option value="CA">California</option>
                    <option value="CO">Colorado</option>
                    <option value="CT">Connecticut</option>
                    <option value="DE">Delaware</option>
                    <option value="FL">Florida</option>
                    <option value="GA">Georgia</option>
                    <option value="HI">Hawaii</option>
                    <option value="ID">Idaho</option>
                    <option value="IL">Illinois</option>
                    <option value="IN">Indiana</option>
                    <option value="IA">Iowa</option>
                    <option value="KS">Kansas</option>
                    <option value="KY">Kentucky</option>
                    <option value="LA">Louisiana</option>
                    <option value="ME">Maine</option>
                    <option value="MD">Maryland</option>
                    <option value="MA">Massachusetts</option>
                    <option value="MI">Michigan</option>
                    <option value="MN">Minnesota</option>
                    <option value="MS">Mississippi</option>
                    <option value="MO">Missouri</option>
                    <option value="MT">Montana</option>
                    <option value="NE">Nebraska</option>
                    <option value="NV">Nevada</option>
                    <option value="NH">New Hampshire</option>
                    <option value="NJ">New Jersey</option>
                    <option value="NM">New Mexico</option>
                    <option value="NY">New York</option>
                    <option value="NC">North Carolina</option>
                    <option value="ND">North Dakota</option>
                    <option value="OH">Ohio</option>
                    <option value="OK">Oklahoma</option>
                    <option value="OR">Oregon</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="RI">Rhode Island</option>
                    <option value="SC">South Carolina</option>
                    <option value="SD">South Dakota</option>
                    <option value="TN">Tennessee</option>
                    <option value="TX">Texas</option>
                    <option value="UT">Utah</option>
                    <option value="VT">Vermont</option>
                    <option value="VA">Virginia</option>
                    <option value="WA">Washington</option>
                    <option value="WV">West Virginia</option>
                    <option value="WI">Wisconsin</option>
                    <option value="WY">Wyoming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="12345"
                    maxLength="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Family Members</h2>
              <p className="text-gray-600">Add other people living with you (optional)</p>
            </div>

            {/* Add Family Member Form */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={tempFamilyMember.name}
                  onChange={(e) => setTempFamilyMember({...tempFamilyMember, name: e.target.value})}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={tempFamilyMember.relationship}
                  onChange={(e) => setTempFamilyMember({...tempFamilyMember, relationship: e.target.value})}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Relationship</option>
                  <option value="spouse">Spouse</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="number"
                  placeholder="Age (optional)"
                  value={tempFamilyMember.age}
                  onChange={(e) => setTempFamilyMember({...tempFamilyMember, age: e.target.value})}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  value={tempFamilyMember.phoneNumber}
                  onChange={(e) => setTempFamilyMember({...tempFamilyMember, phoneNumber: e.target.value})}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="button"
                onClick={handleAddFamilyMember}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 font-medium"
              >
                <Users className="w-4 h-4" />
                <span>Add Family Member</span>
              </button>
            </div>

            {/* Family Members List */}
            {formData.familyMembers.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Added Family Members:</h3>
                {formData.familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">
                        {member.relationship}{member.age && `, Age ${member.age}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveFamilyMember(member.id)}
                      className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formData.familyMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No family members added yet</p>
                <p className="text-sm">You can skip this step if you live alone</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lease Information</h2>
              <p className="text-gray-600">Tell us about your rental agreement</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rent Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleChange}
                    placeholder="1200.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Start Date *
                  </label>
                  <input
                    type="date"
                    name="leaseStartDate"
                    value={formData.leaseStartDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease End Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="leaseEndDate"
                    value={formData.leaseEndDate}
                    onChange={handleChange}
                    min={formData.leaseStartDate}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    name="securityDeposit"
                    value={formData.securityDeposit}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <Home className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Family Housing Hub!</h1>
          <p className="text-gray-600">Let's set up your account</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < currentStep ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            <span className="w-24 text-center">Personal</span>
            <span className="w-24 text-center">Address</span>
            <span className="w-24 text-center">Family</span>
            <span className="w-24 text-center">Lease</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1 || loading}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${
                currentStep === 1 || loading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:bg-blue-400"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Complete Setup</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-4">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-gray-600 hover:text-gray-800 text-sm disabled:text-gray-400"
          >
            Skip for now, I'll complete this later
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="font-semibold text-gray-900">Setting up your profile...</p>
                  <p className="text-sm text-gray-600">This should only take a moment</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}