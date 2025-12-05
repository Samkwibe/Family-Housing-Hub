// OWNER ONBOARDING - ULTRA PROFESSIONAL DESIGN WITH AMAZING FLOW
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Building2,
  DollarSign,
  FileText,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Home,
  MapPin,
  Key,
  Briefcase,
  Phone,
  Mail,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Award,
  CreditCard,
  Bell,
  Check,
  Lock,
  Star,
  Zap,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { userDataService } from '../services/userDataService';

export default function OwnerOnboarding() {
  const { currentUser, userProfile, completeProfile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  
  // Check if user is logged in
  useEffect(() => {
    if (!currentUser) {
      toast.error('Please log in first');
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const [formData, setFormData] = useState({
    // Step 1: Business Info
    businessName: '',
    businessType: 'individual',
    taxId: '',
    yearsInBusiness: '',
    phoneNumber: userProfile?.phone || '',
    
    // Step 2: Property Portfolio
    totalProperties: '1',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
    propertyUsage: 'business', // 'business', 'residence', or 'both'
    propertyType: 'single-family',
    bedrooms: '',
    bathrooms: '',
    monthlyRent: '',
    
    // Step 3: Payment & Preferences
    bankName: '',
    accountType: 'checking',
    preferredPaymentMethod: 'direct-deposit',
    notifications: {
      tenantMessages: true,
      maintenanceRequests: true,
      rentPayments: true,
      leaseRenewals: true
    }
  });

  const totalSteps = 3;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const nextStep = () => {
    // Validation for each step
    if (currentStep === 1) {
      if (!formData.businessName || !formData.yearsInBusiness) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    if (currentStep === 2) {
      if (!formData.propertyAddress || !formData.propertyCity || !formData.propertyUsage) {
        toast.error('Please fill in all required property details');
        return;
      }
      // Monthly rent is only required for business/both properties
      if ((formData.propertyUsage === 'business' || formData.propertyUsage === 'both') && !formData.monthlyRent) {
        toast.error('Please enter monthly rent for business/rental properties');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setAnimating(false);
        toast.success(`Step ${currentStep + 1} of ${totalSteps}! 🎉`);
      }, 300);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setAnimating(false);
      }, 300);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // ORGANIZE OWNER DATA SEPARATELY - Don't mix with renter data
      const ownerData = {
        // Business Information (Owner-specific)
        business: {
          name: formData.businessName,
          type: formData.businessType,
          taxId: formData.taxId || null,
          yearsInBusiness: parseInt(formData.yearsInBusiness) || 0,
          phone: formData.phoneNumber
        },
        
        // Property Portfolio (Owner-specific)
        properties: [{
          address: {
            street: formData.propertyAddress,
            city: formData.propertyCity,
            state: formData.propertyState,
            zipCode: formData.propertyZip,
            country: 'USA'
          },
          usage: formData.propertyUsage, // 'business', 'residence', or 'both'
          type: formData.propertyType,
          bedrooms: parseInt(formData.bedrooms) || 0,
          bathrooms: parseFloat(formData.bathrooms) || 0,
          monthlyRent: parseFloat(formData.monthlyRent) || 0,
          status: 'active',
          addedAt: new Date()
        }],
        
        // Payment Preferences (Owner-specific)
        paymentPreferences: {
          bankName: formData.bankName || null,
          accountType: formData.accountType,
          preferredMethod: formData.preferredPaymentMethod
        },
        
        // Notification Preferences (Owner-specific)
        notifications: formData.notifications
      };

      // Save owner data using the data organization service
      await userDataService.saveOwnerData(currentUser.uid, ownerData);
      
      // Also update profile completion status
      await updateUserProfile(currentUser.uid, {
        profileComplete: true,
        onboardingComplete: true,
        onboardingCompletedAt: new Date().toISOString(),
        userType: 'owner' // Ensure userType is set
      });
      
      toast.success('🎉 Welcome to FamilyHub! Your owner account is ready!');
      
      // Navigate to owner dashboard based on user type
      // Small delay to ensure profile update is saved
      setTimeout(() => {
        navigate('/owner-dashboard', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    toast.success('You can complete this later in Settings');
    navigate('/owner-dashboard', { replace: true });
  };

  // Progress bar calculation
  const progress = (currentStep / totalSteps) * 100;

  // Background images for each step
  const stepBackgrounds = [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop', // Business/Office
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&h=1080&fit=crop', // Property
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&h=1080&fit=crop' // Payment/Finance
  ];

  // Step titles and descriptions
  const stepInfo = [
    { title: 'Business Information', desc: 'Tell us about your property business', icon: Briefcase },
    { title: 'First Property', desc: 'Add your first rental property', icon: Home },
    { title: 'Payment Setup', desc: 'Configure your payment preferences', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background Image with Overlay - Smooth transitions */}
      <div 
        className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `url(${stepBackgrounds[currentStep - 1]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Dynamic Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-blue-900/90 to-purple-900/95 transition-opacity duration-1000"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-10 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob"></div>
          <div className="absolute top-1/2 -right-10 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="max-w-5xl w-full">
          {/* Header with smooth animations */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-5 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300 ring-4 ring-white/20">
                <Building2 className="h-14 w-14 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 drop-shadow-2xl leading-tight">
              Property Owner Setup
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 drop-shadow-lg font-medium">
              Let's set up your professional property management account
            </p>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mb-10">
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3].map((step) => {
                const StepInfo = stepInfo[step - 1];
                const StepIcon = StepInfo.icon;
                const isActive = currentStep === step;
                const isCompleted = currentStep > step;
                
                return (
                  <div key={step} className="flex items-center flex-1 group">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center font-bold transition-all duration-500 transform ${
                        isActive
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl scale-110 ring-4 ring-white/40 z-10'
                          : isCompleted
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl scale-100'
                            : 'bg-white/10 text-white/50 backdrop-blur-sm scale-90'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-7 h-7" />
                        ) : (
                          <StepIcon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-white/50'}`} />
                        )}
                        {isActive && (
                          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-2xl blur opacity-75 animate-pulse"></div>
                        )}
                      </div>
                      <div className={`mt-3 text-center transition-all duration-300 ${
                        isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                      }`}>
                        <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-blue-200'}`}>
                          {StepInfo.title}
                        </p>
                        <p className="text-xs text-blue-300/80 mt-1 hidden md:block">
                          {StepInfo.desc}
                        </p>
                      </div>
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-500 ${
                        isCompleted 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg' 
                          : currentStep > step
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                            : 'bg-white/10'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Progress Bar Fill */}
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{ width: `${progress}%` }}
              >
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Enhanced Form Card with better animations */}
          <div className={`bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20 transition-all duration-500 ${
            animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}>
            <form onSubmit={(e) => { e.preventDefault(); currentStep === totalSteps ? handleSubmit() : nextStep(); }}>
              
              {/* STEP 1: Business Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-slide-in">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                      <Briefcase className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">Business Information</h2>
                    <p className="text-lg text-blue-200 font-medium">Tell us about your property business</p>
                  </div>

                  {/* Business Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-2" />
                      Business Name *
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      required
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg text-lg font-medium"
                      placeholder="Your Property Management LLC"
                    />
                  </div>

                  {/* Business Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Building2 className="w-4 h-4 text-indigo-400 mr-2" />
                      Business Type *
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                    >
                      <option value="individual">Individual Owner</option>
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Tax ID */}
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-white mb-2">
                        Tax ID (Optional)
                      </label>
                      <input
                        type="text"
                        name="taxId"
                        value={formData.taxId}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg text-lg"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>

                    {/* Years in Business */}
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-white mb-2 flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-2" />
                        Years in Business *
                      </label>
                      <input
                        type="number"
                        name="yearsInBusiness"
                        required
                        value={formData.yearsInBusiness}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="5"
                        min="0"
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-2" />
                      Business Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        name="phoneNumber"
                        required
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Property Details */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-slide-in">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-600 to-rose-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                      <Home className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">First Property</h2>
                    <p className="text-lg text-blue-200 font-medium">Add your first property</p>
                  </div>

                  {/* Property Address */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-2" />
                      Property Address *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="propertyAddress"
                        required
                        value={formData.propertyAddress}
                        onChange={handleChange}
                        className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="123 Main Street"
                      />
                    </div>
                  </div>

                  {/* City, State, Zip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-1 space-y-2">
                      <label className="block text-sm font-bold text-white mb-2 flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-2" />
                        City *
                      </label>
                      <input
                        type="text"
                        name="propertyCity"
                        required
                        value={formData.propertyCity}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="San Francisco"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-white mb-2 flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-2" />
                        State *
                      </label>
                      <input
                        type="text"
                        name="propertyState"
                        required
                        value={formData.propertyState}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium uppercase"
                        placeholder="CA"
                        maxLength="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-white mb-2 flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 mr-2" />
                        Zip Code *
                      </label>
                      <input
                        type="text"
                        name="propertyZip"
                        required
                        value={formData.propertyZip}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="94102"
                      />
                    </div>
                  </div>

                  {/* Property Usage - Business, Residence, or Both */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-4 flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-2" />
                      Property Usage *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, propertyUsage: 'business' }))}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center space-y-3 ${
                          formData.propertyUsage === 'business'
                            ? 'border-purple-500 dark:border-purple-400 bg-purple-500/20 dark:bg-purple-900/30 shadow-lg scale-105'
                            : 'border-white/30 dark:border-gray-700 hover:border-white/50 dark:hover:border-gray-600 bg-white/10 dark:bg-gray-800/30'
                        }`}
                      >
                        <Building2 className={`h-8 w-8 ${formData.propertyUsage === 'business' ? 'text-purple-300 dark:text-purple-400' : 'text-white/70 dark:text-gray-400'}`} />
                        <div className="text-center">
                          <p className={`font-bold text-lg ${formData.propertyUsage === 'business' ? 'text-white' : 'text-white/80 dark:text-gray-300'}`}>
                            Business/Rental
                          </p>
                          <p className={`text-sm mt-1 ${formData.propertyUsage === 'business' ? 'text-purple-200' : 'text-white/60 dark:text-gray-400'}`}>
                            Investment property
                          </p>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, propertyUsage: 'residence' }))}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center space-y-3 ${
                          formData.propertyUsage === 'residence'
                            ? 'border-purple-500 dark:border-purple-400 bg-purple-500/20 dark:bg-purple-900/30 shadow-lg scale-105'
                            : 'border-white/30 dark:border-gray-700 hover:border-white/50 dark:hover:border-gray-600 bg-white/10 dark:bg-gray-800/30'
                        }`}
                      >
                        <Home className={`h-8 w-8 ${formData.propertyUsage === 'residence' ? 'text-purple-300 dark:text-purple-400' : 'text-white/70 dark:text-gray-400'}`} />
                        <div className="text-center">
                          <p className={`font-bold text-lg ${formData.propertyUsage === 'residence' ? 'text-white' : 'text-white/80 dark:text-gray-300'}`}>
                            Primary Residence
                          </p>
                          <p className={`text-sm mt-1 ${formData.propertyUsage === 'residence' ? 'text-purple-200' : 'text-white/60 dark:text-gray-400'}`}>
                            Where you live
                          </p>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, propertyUsage: 'both' }))}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center space-y-3 ${
                          formData.propertyUsage === 'both'
                            ? 'border-purple-500 dark:border-purple-400 bg-purple-500/20 dark:bg-purple-900/30 shadow-lg scale-105'
                            : 'border-white/30 dark:border-gray-700 hover:border-white/50 dark:hover:border-gray-600 bg-white/10 dark:bg-gray-800/30'
                        }`}
                      >
                        <Building2 className={`h-8 w-8 ${formData.propertyUsage === 'both' ? 'text-purple-300 dark:text-purple-400' : 'text-white/70 dark:text-gray-400'}`} />
                        <div className="text-center">
                          <p className={`font-bold text-lg ${formData.propertyUsage === 'both' ? 'text-white' : 'text-white/80 dark:text-gray-300'}`}>
                            Both
                          </p>
                          <p className={`text-sm mt-1 ${formData.propertyUsage === 'both' ? 'text-purple-200' : 'text-white/60 dark:text-gray-400'}`}>
                            Live & rent out
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Property Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Building2 className="w-4 h-4 text-purple-400 mr-2" />
                      Property Type *
                    </label>
                    <select
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                    >
                      <option value="single-family">Single Family Home</option>
                      <option value="multi-family">Multi-Family</option>
                      <option value="condo">Condo</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="apartment">Apartment Building</option>
                    </select>
                  </div>

                  {/* Beds, Baths, Rent */}
                  <div className="grid grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-white mb-2">
                        Bedrooms
                      </label>
                      <input
                        type="number"
                        name="bedrooms"
                        value={formData.bedrooms}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="3"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-white mb-2">
                        Bathrooms
                      </label>
                      <input
                        type="number"
                        name="bathrooms"
                        step="0.5"
                        value={formData.bathrooms}
                        onChange={handleChange}
                        className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                        placeholder="2"
                        min="0"
                      />
                    </div>
                    {(formData.propertyUsage === 'business' || formData.propertyUsage === 'both') && (
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 mr-2" />
                          Monthly Rent *
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="number"
                            name="monthlyRent"
                            required={formData.propertyUsage === 'business' || formData.propertyUsage === 'both'}
                            value={formData.monthlyRent}
                            onChange={handleChange}
                            className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                            placeholder="2500"
                            min="0"
                          />
                        </div>
                        <p className="text-xs text-purple-200 mt-1">
                          {formData.propertyUsage === 'both' 
                            ? 'Rent amount for the portion you rent out' 
                            : 'Expected monthly rental income'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Payment & Preferences */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-slide-in">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                      <CreditCard className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">Payment Setup</h2>
                    <p className="text-lg text-blue-200 font-medium">Configure your payment preferences</p>
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Building2 className="w-4 h-4 text-cyan-400 mr-2" />
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/30 transition-all shadow-lg text-lg font-medium"
                      placeholder="Wells Fargo"
                    />
                  </div>

                  {/* Account Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <CreditCard className="w-4 h-4 text-cyan-400 mr-2" />
                      Account Type
                    </label>
                    <select
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="business">Business Account</option>
                    </select>
                  </div>

                  {/* Preferred Payment Method */}
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-white mb-2 flex items-center">
                      <Zap className="w-4 h-4 text-cyan-400 mr-2" />
                      Preferred Payment Method
                    </label>
                    <select
                      name="preferredPaymentMethod"
                      value={formData.preferredPaymentMethod}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                    >
                      <option value="direct-deposit">Direct Deposit (ACH)</option>
                      <option value="check">Check</option>
                      <option value="wire">Wire Transfer</option>
                      <option value="online">Online Payment</option>
                    </select>
                  </div>

                  {/* Notification Preferences */}
                  <div className="space-y-4">
                    <label className="block text-sm font-bold text-white mb-4 flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-cyan-400" />
                      Notification Preferences
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'tenantMessages', label: 'Tenant Messages', icon: Users },
                        { key: 'maintenanceRequests', label: 'Maintenance Requests', icon: FileText },
                        { key: 'rentPayments', label: 'Rent Payment Updates', icon: DollarSign },
                        { key: 'leaseRenewals', label: 'Lease Renewal Reminders', icon: Calendar }
                      ].map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <label key={item.key} className="flex items-center space-x-4 text-white cursor-pointer group p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10 hover:border-white/20">
                            <input
                              type="checkbox"
                              name={`notifications.${item.key}`}
                              checked={formData.notifications[item.key]}
                              onChange={handleChange}
                              className="w-6 h-6 text-indigo-500 focus:ring-indigo-500 border-white/30 bg-white/10 rounded-lg cursor-pointer"
                            />
                            <ItemIcon className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                            <span className="group-hover:text-indigo-300 transition-colors font-semibold flex-1">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Navigation Buttons */}
              <div className="flex items-center justify-between mt-10 pt-8 border-t border-white/20">
                <div className="flex items-center space-x-4">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={animating}
                      className="flex items-center space-x-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all backdrop-blur-sm border border-white/20 hover:border-white/30 disabled:opacity-50"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Back</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-6 py-4 text-blue-200 hover:text-white font-semibold transition-colors hover:bg-white/5 rounded-xl"
                  >
                    Skip for now
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || animating}
                  className="flex items-center space-x-3 px-10 py-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 hover:from-indigo-600 hover:via-purple-600 hover:to-cyan-600 text-white rounded-2xl font-black text-lg shadow-2xl hover:shadow-indigo-500/50 transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : currentStep === totalSteps ? (
                    <>
                      <span>Complete Setup</span>
                      <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Enhanced Trust Badges */}
          <div className="flex items-center justify-center space-x-6 mt-10 flex-wrap gap-4">
            <div className="flex items-center space-x-2 text-white/90 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-all cursor-default">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span className="text-sm font-bold">Secure Setup</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="flex items-center space-x-2 text-white/90 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-all cursor-default">
              <Award className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-bold">Professional Grade</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="flex items-center space-x-2 text-white/90 bg-white/10 backdrop-blur-sm px-5 py-3 rounded-full border border-white/20 hover:bg-white/20 transition-all cursor-default">
              <Lock className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-bold">Data Protected</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes slide-in {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
