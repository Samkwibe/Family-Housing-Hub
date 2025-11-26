// src/pages/Onboarding.jsx - ENHANCED WITH DISTINCT OWNER/RENTER FLOWS
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
  AlertCircle,
  Building2,
  Key,
  FileText,
  TrendingUp,
  Shield,
  CreditCard,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Onboarding() {
  const { userProfile, completeProfile, addFamilyMember, updateLeaseInfo, updatePropertyInfo, uploadProfilePhoto } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  // Determine if user is owner or renter
  const isOwner = userProfile?.userType === 'owner';

  // Different step counts and labels for owners vs renters
  const ownerSteps = [
    { number: 1, label: 'Personal Info', icon: User },
    { number: 2, label: 'Property Address', icon: Home },
    { number: 3, label: 'Property Details', icon: Building2 },
    { number: 4, label: 'Mortgage Info', icon: CreditCard },
    { number: 5, label: 'Family Members', icon: Users }
  ];

  const renterSteps = [
    { number: 1, label: 'Personal Info', icon: User },
    { number: 2, label: 'Rental Address', icon: Home },
    { number: 3, label: 'Lease Details', icon: FileText },
    { number: 4, label: 'Family Members', icon: Users }
  ];

  const steps = isOwner ? ownerSteps : renterSteps;
  const totalSteps = steps.length;

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

    // Property Info (Step 3 - for owners)
    purchaseDate: '',
    purchasePrice: '',
    currentValue: '',
    propertyType: 'single_family', // single_family, condo, townhouse, multi_family
    bedrooms: '',
    bathrooms: '',
    squareFootage: '',
    yearBuilt: '',

    // Mortgage Info (Step 4 - for owners)
    hasMortgage: false,
    mortgageLender: '',
    mortgageLoanAmount: '',
    mortgageMonthlyPayment: '',
    mortgageInterestRate: '',
    mortgageStartDate: '',
    mortgageEndDate: '',
    downPayment: '',

    // Lease Info (Step 3 - for renters)
    monthlyRent: '',
    leaseStartDate: '',
    leaseEndDate: '',
    securityDeposit: '',
    landlordName: '',
    landlordPhone: '',
    landlordEmail: '',
    utilitiesIncluded: false,
    utilitiesCost: '',

    // Family Members (Step 4/5)
    familyMembers: []
  });

  const [tempFamilyMember, setTempFamilyMember] = useState({
    name: '',
    relationship: '',
    age: '',
    phoneNumber: ''
  });

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
  };

  // Handle profile image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setProfileImage(file);
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
    setTempFamilyMember({ name: '', relationship: '', age: '', phoneNumber: '' });
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
        if (isOwner) {
          // Owner: Property Details
          if (!formData.purchaseDate || !formData.purchasePrice) {
            setError('Please fill in purchase date and purchase price');
            return false;
          }
          if (parseFloat(formData.purchasePrice) <= 0) {
            setError('Please enter a valid purchase price');
            return false;
          }
          return true;
        } else {
          // Renter: Lease Details
          if (!formData.monthlyRent || !formData.leaseStartDate) {
            setError('Please fill in rent amount and lease start date');
            return false;
          }
          if (parseFloat(formData.monthlyRent) <= 0) {
            setError('Please enter a valid rent amount');
            return false;
          }
          return true;
        }

      case 4:
        if (isOwner) {
          // Owner: Mortgage Info (optional)
          if (formData.hasMortgage) {
            if (!formData.mortgageLender || !formData.mortgageLoanAmount || !formData.mortgageMonthlyPayment) {
              setError('Please fill in all mortgage fields');
              return false;
            }
          }
          return true;
        } else {
          // Renter: Family Members (optional)
          return true;
        }

      case 5:
        // Owner: Family Members (optional)
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

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError(null);

    try {
      // Upload profile photo
      let photoURL = null;
      if (profileImage) {
        try {
          photoURL = await uploadProfilePhoto(profileImage);
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          toast.error('Photo upload failed, but continuing with profile setup');
        }
      }

      // Complete basic profile
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

      // Add family members
      if (formData.familyMembers.length > 0) {
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
          }
        }
      }

      // Update property info (owners) or lease info (renters)
      if (isOwner) {
        await updatePropertyInfo({
          address: {
            street: formData.street.trim(),
            unit: formData.unit.trim(),
            city: formData.city.trim(),
            state: formData.state,
            zipCode: formData.zipCode.trim(),
            country: 'USA'
          },
          purchaseDate: formData.purchaseDate,
          purchasePrice: parseFloat(formData.purchasePrice),
          currentValue: formData.currentValue ? parseFloat(formData.currentValue) : 0,
          propertyType: formData.propertyType,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : null,
          yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : null,
          mortgage: {
            hasMortgage: formData.hasMortgage,
            lender: formData.mortgageLender?.trim() || '',
            loanAmount: formData.mortgageLoanAmount ? parseFloat(formData.mortgageLoanAmount) : 0,
            monthlyPayment: formData.mortgageMonthlyPayment ? parseFloat(formData.mortgageMonthlyPayment) : 0,
            interestRate: formData.mortgageInterestRate ? parseFloat(formData.mortgageInterestRate) : 0,
            loanStartDate: formData.mortgageStartDate || null,
            loanEndDate: formData.mortgageEndDate || null,
            downPayment: formData.downPayment ? parseFloat(formData.downPayment) : 0
          }
        });
      } else {
        await updateLeaseInfo({
          monthlyRent: parseFloat(formData.monthlyRent),
          startDate: new Date(formData.leaseStartDate),
          endDate: formData.leaseEndDate ? new Date(formData.leaseEndDate) : null,
          securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
          landlordName: formData.landlordName?.trim() || null,
          landlordPhone: formData.landlordPhone?.trim() || null,
          landlordEmail: formData.landlordEmail?.trim() || null,
          utilitiesIncluded: formData.utilitiesIncluded,
          utilitiesCost: formData.utilitiesCost ? parseFloat(formData.utilitiesCost) : 0
        });
      }

      toast.success('Profile completed successfully!');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);

    } catch (error) {
      console.error('Error completing profile:', error);
      let errorMessage = 'Failed to complete profile. ';
      if (error.message?.includes('permission')) {
        errorMessage += 'Permission denied. Please check your Firebase rules.';
      } else if (error.message?.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.';
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
    // Step 1: Personal Information (Same for both)
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
            <p className="text-gray-600">Let's start with your basic information</p>
          </div>

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
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth (Optional)</label>
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
    }

    // Step 2: Address (Different labels for owners vs renters)
    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isOwner ? 'Property Address' : 'Rental Address'}
            </h2>
            <p className="text-gray-600">
              {isOwner
                ? 'Where is your property located?'
                : 'Where are you currently renting?'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Street Address *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit/Apt # (Optional)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select State</option>
                  {/* States list - keeping it short for brevity */}
                  {['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'].map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label>
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
    }

    // Step 3: Property Details (Owners) or Lease Details (Renters)
    if (currentStep === 3) {
      if (isOwner) {
        // OWNER: Property Details
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Details</h2>
              <p className="text-gray-600">Tell us about your property</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date *</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      placeholder="250000.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Estimated Value (Optional)</label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    name="currentValue"
                    value={formData.currentValue}
                    onChange={handleChange}
                    placeholder="300000.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                  <select
                    name="propertyType"
                    value={formData.propertyType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="single_family">Single Family Home</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="multi_family">Multi-Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year Built (Optional)</label>
                  <input
                    type="number"
                    name="yearBuilt"
                    value={formData.yearBuilt}
                    onChange={handleChange}
                    placeholder="2020"
                    min="1800"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms (Optional)</label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    placeholder="3"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms (Optional)</label>
                  <input
                    type="number"
                    name="bathrooms"
                    value={formData.bathrooms}
                    onChange={handleChange}
                    placeholder="2.5"
                    step="0.5"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Square Footage (Optional)</label>
                  <input
                    type="number"
                    name="squareFootage"
                    value={formData.squareFootage}
                    onChange={handleChange}
                    placeholder="2000"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        // RENTER: Lease Details
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Lease Information</h2>
              <p className="text-gray-600">Tell us about your rental agreement</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent Amount *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start Date *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease End Date (Optional)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit (Optional)</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Landlord Information (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Landlord Name</label>
                    <input
                      type="text"
                      name="landlordName"
                      value={formData.landlordName}
                      onChange={handleChange}
                      placeholder="John Smith"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Landlord Phone</label>
                    <input
                      type="tel"
                      name="landlordPhone"
                      value={formData.landlordPhone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Landlord Email</label>
                    <input
                      type="email"
                      name="landlordEmail"
                      value={formData.landlordEmail}
                      onChange={handleChange}
                      placeholder="landlord@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="utilitiesIncluded"
                    checked={formData.utilitiesIncluded}
                    onChange={handleChange}
                    name="utilitiesIncluded"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="utilitiesIncluded" className="ml-2 block text-sm font-medium text-gray-700">
                    Utilities included in rent
                  </label>
                </div>
                {!formData.utilitiesIncluded && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Utilities Cost (Optional)</label>
                    <div className="relative">
                      <Receipt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="number"
                        name="utilitiesCost"
                        value={formData.utilitiesCost}
                        onChange={handleChange}
                        placeholder="150.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
    }

    // Step 4: Mortgage Info (Owners) or Family Members (Renters)
    if (currentStep === 4) {
      if (isOwner) {
        // OWNER: Mortgage Info
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mortgage Information</h2>
              <p className="text-gray-600">Do you have a mortgage on this property?</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="hasMortgage"
                  checked={formData.hasMortgage}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasMortgage: e.target.checked }))}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="hasMortgage" className="ml-3 block text-sm font-medium text-gray-700">
                  I have a mortgage on this property
                </label>
              </div>

              {formData.hasMortgage && (
                <div className="space-y-4 bg-purple-50 p-6 rounded-lg border border-purple-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mortgage Lender *</label>
                    <input
                      type="text"
                      name="mortgageLender"
                      value={formData.mortgageLender}
                      onChange={handleChange}
                      placeholder="Bank Name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required={formData.hasMortgage}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="number"
                          name="mortgageLoanAmount"
                          value={formData.mortgageLoanAmount}
                          onChange={handleChange}
                          placeholder="200000.00"
                          step="0.01"
                          min="0"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required={formData.hasMortgage}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Payment *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="number"
                          name="mortgageMonthlyPayment"
                          value={formData.mortgageMonthlyPayment}
                          onChange={handleChange}
                          placeholder="1200.00"
                          step="0.01"
                          min="0"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required={formData.hasMortgage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%) (Optional)</label>
                      <input
                        type="number"
                        name="mortgageInterestRate"
                        value={formData.mortgageInterestRate}
                        onChange={handleChange}
                        placeholder="3.5"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Start Date (Optional)</label>
                      <input
                        type="date"
                        name="mortgageStartDate"
                        value={formData.mortgageStartDate}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Loan End Date (Optional)</label>
                      <input
                        type="date"
                        name="mortgageEndDate"
                        value={formData.mortgageEndDate}
                        onChange={handleChange}
                        min={formData.mortgageStartDate}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment (Optional)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="number"
                        name="downPayment"
                        value={formData.downPayment}
                        onChange={handleChange}
                        placeholder="50000.00"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      } else {
        // RENTER: Family Members
        return renderFamilyMembersStep();
      }
    }

    // Step 5: Family Members (Owners only)
    if (currentStep === 5) {
      return renderFamilyMembersStep();
    }

    return null;
  };

  // Render Family Members Step (shared between owners and renters)
  const renderFamilyMembersStep = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Family Members</h2>
          <p className="text-gray-600">Add other people living with you (optional)</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name"
              value={tempFamilyMember.name}
              onChange={(e) => setTempFamilyMember({ ...tempFamilyMember, name: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={tempFamilyMember.relationship}
              onChange={(e) => setTempFamilyMember({ ...tempFamilyMember, relationship: e.target.value })}
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
              onChange={(e) => setTempFamilyMember({ ...tempFamilyMember, age: e.target.value })}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={tempFamilyMember.phoneNumber}
              onChange={(e) => setTempFamilyMember({ ...tempFamilyMember, phoneNumber: e.target.value })}
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
  };

  // Theme colors based on user type
  const themeColor = isOwner ? 'emerald' : 'blue';
  const gradientBg = isOwner
    ? 'from-emerald-50 via-teal-50 to-cyan-50'
    : 'from-blue-50 via-indigo-50 to-purple-50';

  // Button classes based on theme
  const primaryButtonClass = isOwner
    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400';

  const progressCompletedClass = isOwner
    ? 'bg-emerald-500'
    : 'bg-blue-500';

  const progressCurrentClass = isOwner
    ? 'bg-emerald-600 ring-emerald-200'
    : 'bg-blue-600 ring-blue-200';

  const progressBarClass = isOwner
    ? 'bg-emerald-500'
    : 'bg-blue-500';

  const loadingSpinnerClass = isOwner
    ? 'border-emerald-600'
    : 'border-blue-600';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${gradientBg} py-12 px-4`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className={`bg-white p-3 rounded-full shadow-lg ring-4 ${isOwner ? 'ring-emerald-200' : 'ring-blue-200'}`}>
              {isOwner ? (
                <Building2 className={`w-10 h-10 text-emerald-600`} />
              ) : (
                <Key className={`w-10 h-10 text-blue-600`} />
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Family Housing Hub!
          </h1>
          <p className="text-gray-600">
            {isOwner
              ? 'Let\'s set up your property owner account'
              : 'Let\'s set up your renter account'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = step.number < currentStep;
              const isCurrent = step.number === currentStep;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${isCompleted
                      ? `${progressCompletedClass} text-white`
                      : isCurrent
                        ? `${progressCurrentClass} text-white ring-4`
                        : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all ${isCompleted ? progressBarClass : 'bg-gray-200'
                        }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2">
            {steps.map((step) => (
              <span key={step.number} className="w-24 text-center">{step.label}</span>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
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
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors ${currentStep === 1 || loading
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
                className={`px-6 py-3 ${primaryButtonClass} text-white rounded-lg transition-colors flex items-center space-x-2`}
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-6 py-3 ${primaryButtonClass} text-white rounded-lg transition-colors flex items-center space-x-2 disabled:cursor-not-allowed`}
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
                <div className={`w-8 h-8 border-4 ${loadingSpinnerClass} border-t-transparent rounded-full animate-spin`} />
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
