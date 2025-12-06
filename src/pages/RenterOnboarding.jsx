// RENTER ONBOARDING - ULTRA PROFESSIONAL DESIGN WITH AMAZING FLOW
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Home,
    Users,
    DollarSign,
    Calendar,
    User,
    Phone,
    Mail,
    MapPin,
    FileText,
    Baby,
    Briefcase,
    Heart,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Building,
    Key,
    ShieldCheck,
    Sparkles,
    Award,
    Bell,
    Check,
    Lock,
    Star,
    Zap,
    ChevronRight,
    Smile,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { userDataService } from '../services/userDataService';
import { userService } from '../services/firebaseService';
import FamilyInviteStep from '../components/FamilyInviteStep';
import { familyInviteCodeService } from '../services/familyInviteCodeService';

export default function RenterOnboarding() {
    const { currentUser, userProfile, completeProfile, updateUserProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0); // Start at step 0 (family invite)
    const [loading, setLoading] = useState(false);
    const [animating, setAnimating] = useState(false);
    const [error, setError] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [familyInviteCompleted, setFamilyInviteCompleted] = useState(false);

    // Check if user is logged in and handle redirects
    useEffect(() => {
        if (authLoading) {
            return; // Still loading auth
        }

        if (!currentUser) {
            toast.error('Please log in first');
            navigate('/login', { replace: true });
            return;
        }

        // If user already completed onboarding, redirect to dashboard
        if (userProfile?.onboardingComplete || userProfile?.profileComplete) {
            if (userProfile?.userType === 'renter' || userProfile?.role === 'renter') {
                navigate('/dashboard', { replace: true });
                return;
            }
        }

        // Initialize complete
        setInitializing(false);
    }, [currentUser, userProfile, navigate, authLoading]);

    const [formData, setFormData] = useState({
        // Step 1: Personal Info
        dateOfBirth: '',
        occupation: '',
        phoneNumber: userProfile?.phone || '',
        emergencyContact: {
            name: '',
            relationship: '',
            phone: ''
        },

        // Step 2: Family Info
        familySize: '1',
        adults: '1',
        children: '0',
        pets: 'no',
        petDetails: '',

        // Step 3: Housing Info
        currentAddress: '',
        city: '',
        state: '',
        zipCode: '',
        moveInDate: '',
        leaseDuration: '12',

        // Step 4: Financial Info
        monthlyIncome: '',
        rentBudget: '',
        employmentStatus: 'employed',
        employer: '',

        // Preferences
        preferredContactMethod: 'email',
        notifications: {
            rentReminders: true,
            maintenanceUpdates: true,
            familyMessages: true
        }
    });

    const totalSteps = 5; // Added family invite step

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

    const handleFamilyInviteComplete = async (result) => {
        try {
            if (result.joinedFamily) {
                // User joined an existing family via invite code
                setFamilyInviteCompleted(true);
                toast.success('Family connection established!');
                // Family connection is already saved by acceptInviteCode
            } else if (result.createNew) {
                // User is creating a new family - generate invite code for them
                if (currentUser) {
                    const familyId = currentUser.uid; // User becomes family head
                    await familyInviteCodeService.createOrGetInviteCode(familyId, currentUser.uid);
                    // Set user as family head
                    await updateUserProfile(currentUser.uid, {
                        familyId: familyId,
                    });
                    setFamilyInviteCompleted(true);
                    toast.success('Your family group has been created!');
                }
            }
            // Move to next step
            setCurrentStep(1);
        } catch (error) {
            console.error('Error handling family invite:', error);
            toast.error('Failed to process family invitation');
        }
    };

    const handleFamilyInviteSkip = () => {
        setFamilyInviteCompleted(false);
        setCurrentStep(1);
        toast.info('You can join a family later in Settings');
    };

    const nextStep = () => {
        // Skip validation for step 0 (family invite - handled separately)
        if (currentStep === 0) {
            return; // Family invite step handles its own navigation
        }
        
        // Validation
        if (currentStep === 1) {
            if (!formData.dateOfBirth || !formData.occupation) {
                toast.error('Please fill in all required fields');
                return;
            }
        }
        if (currentStep === 3) {
            if (!formData.currentAddress || !formData.city) {
                toast.error('Please fill in your housing information');
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
        if (currentStep > 0) {
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
            setError(null);

            if (!currentUser || !currentUser.uid) {
                toast.error('User not authenticated. Please log in again.');
                navigate('/login', { replace: true });
                setLoading(false);
                return;
            }

            // Validate required fields
            if (!formData.occupation || !formData.currentAddress || !formData.city) {
                const missingFields = [];
                if (!formData.occupation) missingFields.push('Occupation');
                if (!formData.currentAddress) missingFields.push('Current Address');
                if (!formData.city) missingFields.push('City');
                
                toast.error(`Please fill in: ${missingFields.join(', ')}`);
                setError(`Please complete: ${missingFields.join(', ')}`);
                setLoading(false);
                return;
            }

            // ORGANIZE RENTER DATA SEPARATELY - Don't mix with owner data
            const renterData = {
                // Personal Information (Renter-specific)
                personal: {
                    dateOfBirth: formData.dateOfBirth || null,
                    occupation: formData.occupation || 'Not specified',
                    phone: formData.phoneNumber || null,
                    emergencyContact: (formData.emergencyContact?.name) ? {
                        name: formData.emergencyContact.name,
                        relationship: formData.emergencyContact.relationship || 'Other',
                        phone: formData.emergencyContact.phone || null
                    } : null
                },
                
                // Family Information (Renter-specific)
                family: {
                    size: parseInt(formData.familySize) || 1,
                    adults: parseInt(formData.adults) || 1,
                    children: parseInt(formData.children) || 0,
                    hasPets: formData.pets === 'yes',
                    petDetails: formData.petDetails || null
                },
                
                // Housing Information (Renter-specific)
                housing: {
                    address: {
                        street: formData.currentAddress || '',
                        city: formData.city || '',
                        state: formData.state || '',
                        zipCode: formData.zipCode || '',
                        country: 'USA'
                    },
                    moveInDate: formData.moveInDate || null,
                    leaseDuration: parseInt(formData.leaseDuration) || 12
                },
                
                // Financial Information (Renter-specific)
                financial: {
                    monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
                    rentBudget: formData.rentBudget ? parseFloat(formData.rentBudget) : null,
                    employmentStatus: formData.employmentStatus || 'employed',
                    employer: formData.employer || null
                },
                
                // Preferences (Renter-specific)
                preferences: {
                    contactMethod: formData.preferredContactMethod || 'email',
                    notifications: formData.notifications || {
                        rentReminders: true,
                        maintenanceUpdates: true,
                        familyMessages: true
                    }
                }
            };

            console.log('Saving renter data...', { userId: currentUser.uid, renterData });

            // Step 1: Save renter data using the data organization service
            try {
                const savedData = await userDataService.saveRenterData(currentUser.uid, renterData);
                console.log('Renter data saved successfully:', savedData);
                toast.success('Renter data saved!');
            } catch (saveError) {
                console.error('Error saving renter data:', saveError);
                throw new Error(`Failed to save renter data: ${saveError.message}`);
            }
            
            // Step 2: Update profile completion status
            try {
                const updatedProfile = await updateUserProfile(currentUser.uid, {
                    profileComplete: true,
                    onboardingComplete: true,
                    onboardingCompletedAt: new Date().toISOString(),
                    userType: 'renter', // Ensure userType is set
                    role: 'renter'
                });
                console.log('Profile updated successfully:', updatedProfile);
                toast.success('Profile updated!');
                
                // Step 3: Reload profile from Firestore to ensure we have latest data
                try {
                    const freshProfile = await userService.getUserProfile(currentUser.uid);
                    console.log('Profile reloaded from Firestore:', freshProfile);
                    
                    // Force a small delay to ensure state updates propagate
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (reloadError) {
                    console.warn('Could not reload profile, but continuing:', reloadError);
                }
            } catch (profileError) {
                console.error('Error updating profile:', profileError);
                // Don't throw - data might still be saved
                toast.error('Profile update had issues, but data was saved');
            }

            // Step 4: Verify data was saved (optional check)
            try {
                const verifyData = await userDataService.getRenterData(currentUser.uid);
                if (!verifyData) {
                    console.warn('Data verification: Renter data not found, but continuing...');
                } else {
                    console.log('Data verified successfully:', verifyData);
                }
            } catch (verifyError) {
                console.warn('Could not verify data, but continuing:', verifyError);
            }
            
            toast.success('🎉 Welcome to FamilyHub! Your family account is ready!');
            
            // Step 5: Navigate to renter dashboard
            // Use a longer delay and force navigation with replace to prevent back button issues
            setTimeout(() => {
                console.log('Navigating to renter dashboard...');
                // Use navigate with replace for better React Router integration
                navigate('/dashboard', { replace: true });
            }, 1500);
        } catch (error) {
            console.error('Error completing onboarding:', error);
            setError(error.message || 'Failed to complete setup. Please try again.');
            toast.error(error.message || 'Failed to complete setup. Please try again.');
            setLoading(false);
        }
    };

    const handleSkip = () => {
        toast.success('You can complete this later in Settings');
        navigate('/dashboard', { replace: true });
    };

    const progress = currentStep === 0 ? 0 : ((currentStep) / (totalSteps - 1)) * 100;

    // Show loading while initializing
    if (initializing || authLoading || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg font-medium">Loading onboarding...</p>
                </div>
            </div>
        );
    }

    // Background images for each step - Different from owner
    const stepBackgrounds = [
        'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1920&h=1080&fit=crop', // Step 0: Family Connection
        'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=1920&h=1080&fit=crop', // Step 1: Personal Info
        'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1920&h=1080&fit=crop', // Step 2: Family Details
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&h=1080&fit=crop', // Step 3: Housing Info
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&h=1080&fit=crop' // Step 4: Financial Info
    ];

    // Step titles and descriptions (step 0 is family invite, handled separately)
    const stepInfo = [
        { title: 'Family Connection', desc: 'Join or create your family', icon: Users },
        { title: 'Personal Info', desc: 'Tell us about yourself', icon: User },
        { title: 'Family Details', desc: 'Share your family information', icon: Heart },
        { title: 'Housing Info', desc: 'Your current or desired home', icon: Home },
        { title: 'Financial Info', desc: 'Help us understand your budget', icon: DollarSign }
    ];

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            {/* Background Image with Overlay - Smooth transitions */}
            <div 
                className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out"
                style={{
                    backgroundImage: `url(${stepBackgrounds[currentStep]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                {/* Dynamic Dark Overlay - Different color scheme for renters */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/95 via-pink-900/90 to-blue-900/95 transition-opacity duration-1000"></div>
                
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-10 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob"></div>
                    <div className="absolute top-1/2 -right-10 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-4000"></div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
                <div className="max-w-5xl w-full">
                    {/* Header with smooth animations */}
                    <div className="text-center mb-10 animate-fade-in">
                        <div className="flex items-center justify-center mb-6">
                            <div className="bg-gradient-to-br from-purple-500 via-pink-600 to-blue-500 p-5 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300 ring-4 ring-white/20">
                                <Users className="h-14 w-14 text-white" />
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 drop-shadow-2xl leading-tight">
                            Family Account Setup
                        </h1>
                        <p className="text-xl md:text-2xl text-pink-100 drop-shadow-lg font-medium">
                            Let's set up your family's housing management hub
                        </p>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div className="mb-10">
                        {/* Progress Steps */}
                        <div className="flex items-center justify-between mb-4">
                            {[0, 1, 2, 3, 4].map((step) => {
                                const StepInfo = stepInfo[step];
                                const StepIcon = StepInfo.icon;
                                const isActive = currentStep === step;
                                const isCompleted = currentStep > step;
                                
                                return (
                                    <div key={step} className="flex items-center flex-1 group">
                                        <div className="flex flex-col items-center flex-1">
                                            <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center font-bold transition-all duration-500 transform ${
                                                isActive
                                                    ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-2xl scale-110 ring-4 ring-white/40 z-10'
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
                                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl blur opacity-75 animate-pulse"></div>
                                                )}
                                            </div>
                                            <div className={`mt-3 text-center transition-all duration-300 ${
                                                isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-95'
                                            }`}>
                                                <p className={`text-sm font-bold ${isActive ? 'text-white' : 'text-pink-200'}`}>
                                                    {StepInfo.title}
                                                </p>
                                                <p className="text-xs text-pink-300/80 mt-1 hidden md:block">
                                                    {StepInfo.desc}
                                                </p>
                                            </div>
                                        </div>
                                        {step < 4 && (
                                            <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-500 ${
                                                isCompleted 
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg' 
                                                    : currentStep > step
                                                        ? 'bg-gradient-to-r from-purple-500 to-pink-600'
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
                                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full transition-all duration-500 ease-out shadow-lg"
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

                            {/* Error Display */}
                            {error && (
                                <div className="mb-6 p-4 bg-red-500/20 border-2 border-red-500/50 rounded-2xl backdrop-blur-sm">
                                    <div className="flex items-start space-x-3">
                                        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h3 className="text-red-200 font-bold mb-1">Error Saving Data</h3>
                                            <p className="text-red-100 text-sm">{error}</p>
                                            <button
                                                type="button"
                                                onClick={() => setError(null)}
                                                className="mt-2 text-red-200 hover:text-white text-sm underline"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1: Personal Information */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-slide-in">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-600 to-rose-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                                            <User className="w-12 h-12 text-white" />
                                        </div>
                                        <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">Personal Information</h2>
                                        <p className="text-lg text-pink-200 font-medium">Tell us about yourself</p>
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Star className="w-4 h-4 text-yellow-400 mr-2" />
                                            Date of Birth *
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="date"
                                                name="dateOfBirth"
                                                required
                                                value={formData.dateOfBirth}
                                                onChange={handleChange}
                                                className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                                            />
                                        </div>
                                    </div>

                                    {/* Occupation */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Star className="w-4 h-4 text-yellow-400 mr-2" />
                                            Occupation *
                                        </label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                name="occupation"
                                                required
                                                value={formData.occupation}
                                                onChange={handleChange}
                                                className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                                                placeholder="Software Engineer"
                                            />
                                        </div>
                                    </div>

                                    {/* Phone Number */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Star className="w-4 h-4 text-yellow-400 mr-2" />
                                            Phone Number *
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="phoneNumber"
                                                required
                                                value={formData.phoneNumber}
                                                onChange={handleChange}
                                                className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg font-medium"
                                                placeholder="+1 (555) 123-4567"
                                            />
                                        </div>
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="pt-6 border-t border-white/20">
                                        <h3 className="text-xl font-black text-white mb-5 flex items-center">
                                            <ShieldCheck className="w-6 h-6 mr-3 text-pink-400" />
                                            Emergency Contact (Optional)
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="emergencyContact.name"
                                                    value={formData.emergencyContact.name}
                                                    onChange={handleChange}
                                                    className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg"
                                                    placeholder="Emergency contact name"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <Heart className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="emergencyContact.relationship"
                                                        value={formData.emergencyContact.relationship}
                                                        onChange={handleChange}
                                                        className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg"
                                                        placeholder="Relationship"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        name="emergencyContact.phone"
                                                        value={formData.emergencyContact.phone}
                                                        onChange={handleChange}
                                                        className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 transition-all shadow-lg text-lg"
                                                        placeholder="Phone number"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Family Information */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-slide-in">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-pink-500 via-rose-600 to-red-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                                            <Heart className="w-12 h-12 text-white" />
                                        </div>
                                        <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">Family Information</h2>
                                        <p className="text-lg text-pink-200 font-medium">Tell us about your family</p>
                                    </div>

                                    {/* Family Size */}
                                    <div className="grid grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                Total Family Size
                                            </label>
                                            <input
                                                type="number"
                                                name="familySize"
                                                value={formData.familySize}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30 transition-all shadow-lg text-lg font-medium"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                Adults
                                            </label>
                                            <input
                                                type="number"
                                                name="adults"
                                                value={formData.adults}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30 transition-all shadow-lg text-lg font-medium"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                Children
                                            </label>
                                            <input
                                                type="number"
                                                name="children"
                                                value={formData.children}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30 transition-all shadow-lg text-lg font-medium"
                                                min="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Pets */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Smile className="w-4 h-4 text-pink-400 mr-2" />
                                            Do you have pets?
                                        </label>
                                        <select
                                            name="pets"
                                            value={formData.pets}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                                        >
                                            <option value="no">No Pets</option>
                                            <option value="yes">Yes, I have pets</option>
                                        </select>
                                    </div>

                                    {/* Pet Details */}
                                    {formData.pets === 'yes' && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                Pet Details
                                            </label>
                                            <textarea
                                                name="petDetails"
                                                value={formData.petDetails}
                                                onChange={handleChange}
                                                rows="3"
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-pink-500 focus:ring-4 focus:ring-pink-500/30 transition-all resize-none shadow-lg text-lg"
                                                placeholder="E.g., 1 golden retriever (Max, 3 years old)"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: Housing Information */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-slide-in">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                                            <Home className="w-12 h-12 text-white" />
                                        </div>
                                        <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">Housing Information</h2>
                                        <p className="text-lg text-pink-200 font-medium">Your current or desired housing</p>
                                    </div>

                                    {/* Current Address */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Star className="w-4 h-4 text-yellow-400 mr-2" />
                                            Current Address *
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <input
                                                type="text"
                                                name="currentAddress"
                                                required
                                                value={formData.currentAddress}
                                                onChange={handleChange}
                                                className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg text-lg font-medium"
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
                                                name="city"
                                                required
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg text-lg font-medium"
                                                placeholder="San Francisco"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={formData.state}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg text-lg font-medium uppercase"
                                                placeholder="CA"
                                                maxLength="2"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                Zip Code
                                            </label>
                                            <input
                                                type="text"
                                                name="zipCode"
                                                value={formData.zipCode}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg text-lg font-medium"
                                                placeholder="94102"
                                            />
                                        </div>
                                    </div>

                                    {/* Move-in Date & Lease Duration */}
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                                <Calendar className="w-4 h-4 text-blue-400 mr-2" />
                                                Move-In Date
                                            </label>
                                            <input
                                                type="date"
                                                name="moveInDate"
                                                value={formData.moveInDate}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg text-lg font-medium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                                <Key className="w-4 h-4 text-blue-400 mr-2" />
                                                Lease Duration (months)
                                            </label>
                                            <select
                                                name="leaseDuration"
                                                value={formData.leaseDuration}
                                                onChange={handleChange}
                                                className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                                            >
                                                <option value="6">6 months</option>
                                                <option value="12">12 months</option>
                                                <option value="18">18 months</option>
                                                <option value="24">24 months</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: Financial Information */}
                            {currentStep === 4 && (
                                <div className="space-y-6 animate-slide-in">
                                    <div className="text-center mb-8">
                                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-3xl mb-5 shadow-2xl transform hover:scale-105 transition-transform">
                                            <DollarSign className="w-12 h-12 text-white" />
                                        </div>
                                        <h2 className="text-4xl font-black text-white mb-3 drop-shadow-lg">Financial Information</h2>
                                        <p className="text-lg text-pink-200 font-medium">Help us understand your budget</p>
                                    </div>

                                    {/* Employment Status */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Briefcase className="w-4 h-4 text-green-400 mr-2" />
                                            Employment Status
                                        </label>
                                        <select
                                            name="employmentStatus"
                                            value={formData.employmentStatus}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                                        >
                                            <option value="employed">Employed Full-Time</option>
                                            <option value="part-time">Part-Time</option>
                                            <option value="self-employed">Self-Employed</option>
                                            <option value="unemployed">Unemployed</option>
                                            <option value="student">Student</option>
                                            <option value="retired">Retired</option>
                                        </select>
                                    </div>

                                    {/* Employer */}
                                    {(formData.employmentStatus === 'employed' || formData.employmentStatus === 'part-time') && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2">
                                                Employer
                                            </label>
                                            <div className="relative">
                                                <Building className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="employer"
                                                    value={formData.employer}
                                                    onChange={handleChange}
                                                    className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-4 focus:ring-green-500/30 transition-all shadow-lg text-lg font-medium"
                                                    placeholder="Company name"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Monthly Income & Rent Budget */}
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                                <TrendingUp className="w-4 h-4 text-green-400 mr-2" />
                                                Monthly Income
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="number"
                                                    name="monthlyIncome"
                                                    value={formData.monthlyIncome}
                                                    onChange={handleChange}
                                                    className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-4 focus:ring-green-500/30 transition-all shadow-lg text-lg font-medium"
                                                    placeholder="5000"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                                <Home className="w-4 h-4 text-green-400 mr-2" />
                                                Rent Budget
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="number"
                                                    name="rentBudget"
                                                    value={formData.rentBudget}
                                                    onChange={handleChange}
                                                    className="w-full pl-14 pr-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 placeholder-gray-500 focus:border-green-500 focus:ring-4 focus:ring-green-500/30 transition-all shadow-lg text-lg font-medium"
                                                    placeholder="1500"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preferred Contact Method */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-white mb-2 flex items-center">
                                            <Zap className="w-4 h-4 text-green-400 mr-2" />
                                            Preferred Contact Method
                                        </label>
                                        <select
                                            name="preferredContactMethod"
                                            value={formData.preferredContactMethod}
                                            onChange={handleChange}
                                            className="w-full px-5 py-4 bg-white/95 border-2 border-white/30 rounded-2xl text-gray-900 focus:border-green-500 focus:ring-4 focus:ring-green-500/30 transition-all shadow-lg text-lg font-medium cursor-pointer"
                                        >
                                            <option value="email">Email</option>
                                            <option value="phone">Phone</option>
                                            <option value="text">Text Message</option>
                                            <option value="app">In-App Only</option>
                                        </select>
                                    </div>

                                    {/* Notification Preferences */}
                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-white mb-4 flex items-center">
                                            <Bell className="w-5 h-5 mr-2 text-green-400" />
                                            Notification Preferences
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {[
                                                { key: 'rentReminders', label: 'Rent Payment Reminders', icon: DollarSign },
                                                { key: 'maintenanceUpdates', label: 'Maintenance Updates', icon: FileText },
                                                { key: 'familyMessages', label: 'Family Messages', icon: Users }
                                            ].map((item) => {
                                                const ItemIcon = item.icon;
                                                return (
                                                    <label key={item.key} className="flex items-center space-x-4 text-white cursor-pointer group p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/10 hover:border-white/20">
                                                        <input
                                                            type="checkbox"
                                                            name={`notifications.${item.key}`}
                                                            checked={formData.notifications[item.key]}
                                                            onChange={handleChange}
                                                            className="w-6 h-6 text-purple-500 focus:ring-purple-500 border-white/30 bg-white/10 rounded-lg cursor-pointer"
                                                        />
                                                        <ItemIcon className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors" />
                                                        <span className="group-hover:text-pink-300 transition-colors font-semibold flex-1 text-sm">{item.label}</span>
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
                                        className="px-6 py-4 text-pink-200 hover:text-white font-semibold transition-colors hover:bg-white/5 rounded-xl"
                                    >
                                        Skip for now
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || animating}
                                    className="flex items-center space-x-3 px-10 py-5 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white rounded-2xl font-black text-lg shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : currentStep === totalSteps - 1 ? (
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
                            <Heart className="w-5 h-5 text-pink-400" />
                            <span className="text-sm font-bold">Family Focused</span>
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
