// SIGNUP PAGE - FROSTED GLASS OVERLAY DESIGN - MATCHING LOGIN
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Eye, EyeOff, Mail, Lock, User, Phone, Building2, Users, Baby, ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { familyInvitationService } from '../services/firebaseService';
import { familyInviteCodeService } from '../services/familyInviteCodeService';
import { verificationService, validateEmail, validatePhoneNumber } from '../services/verificationService';
import EmailVerificationStep from '../components/EmailVerificationStep';
import PhoneVerificationStep from '../components/PhoneVerificationStep';
import toast from 'react-hot-toast';

export default function Register() {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get('invitation');
  const inviteCode = searchParams.get('invite'); // New invite code parameter
  const roleParam = searchParams.get('role');

  // Map URL roles to actual roles
  const mapRole = (role) => {
    if (role === 'family' || role === 'renter') return 'renter';
    if (role === 'owner') return 'owner';
    if (role === 'child') return 'child';
    return null;
  };

  const [selectedRole, setSelectedRole] = useState(mapRole(roleParam));
  const [showForm, setShowForm] = useState(!!roleParam);
  const [language, setLanguage] = useState('en');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    parentEmail: '',
    termsAccepted: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [verificationStep, setVerificationStep] = useState(null); // 'email', 'phone', null
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowForm(true);
    toast.success(`Great choice! Let's set up your ${role === 'owner' ? 'property owner' : role === 'renter' ? 'renter' : 'child'} account! 🎉`);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setShowForm(false);
  };

  function handleChange(e) {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  }

  const handleGoogleSignUp = async () => {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      toast.success('Signed up with Google! 🎉');
      navigate('/');
    } catch (error) {
      console.error('Google Sign-Up failed:', error);
      toast.error(error.message || 'Failed to sign up with Google');
      setGoogleLoading(false);
    }
  };

  // Validate email and phone before proceeding
  const validateFormData = () => {
    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.message);
      return false;
    }

    // Validate phone (required for all roles except child)
    if (selectedRole !== 'child') {
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.isValid) {
        toast.error(phoneValidation.message);
        return false;
      }
    }

    return true;
  };

  // Handle email verification
  const handleEmailVerified = () => {
    setEmailVerified(true);
    setVerificationStep(null);
    
    // If phone is required and not verified, move to phone verification
    if (selectedRole !== 'child' && !phoneVerified && formData.phone) {
      setVerificationStep('phone');
    } else {
      // Both verified, proceed with signup
      proceedWithSignup();
    }
  };

  // Handle phone verification
  const handlePhoneVerified = () => {
    setPhoneVerified(true);
    setVerificationStep(null);
    
    // Both verified, proceed with signup
    proceedWithSignup();
  };

  // Proceed with actual account creation
  const proceedWithSignup = async () => {
    try {
      setLoading(true);
      toast.loading(selectedRole === 'child' ? 'Creating your account...' : 'Creating account...', { id: 'signup' });

      let invitations = [];
      let parentId = null;

      if (selectedRole !== 'child') {
        invitations = await familyInvitationService.getInvitationsByEmail(formData.email);
      }

      const userCredential = await signup(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || '',
        role: selectedRole,
        userType: selectedRole,
        parentId: parentId,
        parentEmail: selectedRole === 'child' ? formData.parentEmail : null,
        familyMembers: selectedRole === 'child' ? undefined : [],
        emailVerified: emailVerified,
        phoneVerified: phoneVerified,
        // Children profiles are auto-complete - no onboarding needed
        profileComplete: selectedRole === 'child' ? true : false
      });

      // Handle invite code if provided
      if (inviteCode && selectedRole !== 'child') {
        try {
          await familyInviteCodeService.acceptInviteCode(inviteCode, userCredential.user.uid);
          toast.success('Welcome! You\'ve been added to the family!', { id: 'signup' });
        } catch (invError) {
          console.error('Error accepting invite code:', invError);
          toast.error('Failed to join family. You can join later in settings.', { id: 'signup' });
        }
      } else if (invitations.length > 0 && selectedRole !== 'child') {
        // Handle old invitation system
        try {
          await familyInvitationService.acceptInvitation(invitations[0].id, userCredential.user.uid);
          toast.success('Welcome! You\'ve been added to the family account.', { id: 'signup' });
        } catch (invError) {
          console.error('Error accepting invitation:', invError);
        }
      } else {
        toast.success(selectedRole === 'child' ? 'Account created! Welcome!' : 'Account created successfully!', { id: 'signup' });
      }

      // Navigate based on role
      if (selectedRole === 'child') {
        toast.success('🎉 Welcome! Your child account is ready!', { id: 'signup' });
        navigate('/child-dashboard');
      } else if (selectedRole === 'owner') {
        toast.success('Account created! Let\'s set up your property business.', { id: 'signup' });
        navigate('/owner-onboarding');
      } else {
        toast.success('Account created! Let\'s set up your family profile.', { id: 'signup' });
        navigate('/renter-onboarding');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account', { id: 'signup' });
    } finally {
      setLoading(false);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();

    // Validate form data
    if (!validateFormData()) {
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password should be at least 6 characters');
      return;
    }

    if (!formData.termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    // Check if email is already verified
    if (!emailVerified) {
      // Start email verification
      setVerificationStep('email');
      return;
    }

    // Check if phone is required and verified
    if (selectedRole !== 'child' && !phoneVerified && formData.phone) {
      setVerificationStep('phone');
      return;
    }

    // Both verified, proceed with signup
    proceedWithSignup();
  }

  // Show verification step if needed
  if (verificationStep === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <EmailVerificationStep
          email={formData.email}
          onVerified={handleEmailVerified}
          onSkip={null} // Don't allow skipping email verification
        />
      </div>
    );
  }

  if (verificationStep === 'phone') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-50">
        <PhoneVerificationStep
          phone={formData.phone}
          onVerified={handlePhoneVerified}
          onSkip={null} // Don't allow skipping phone verification
        />
      </div>
    );
  }

  // Role Selection Screen
  if (!showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop')`,
          }}
        >
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Sparkle Icon */}
        <div className="absolute bottom-8 right-8 z-10">
          <Sparkles className="w-8 h-8 text-white/80 animate-pulse" />
        </div>

        {/* Main Card */}
        <div className="relative z-20 w-full max-w-6xl mx-4 my-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/40 p-12 lg:p-16">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-3 mb-12">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-full shadow-lg">
                <Home className="h-10 w-10 text-white" />
              </div>
              <span className="text-4xl font-black text-gray-900">FamilyHub</span>
            </div>

            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4">
                Choose Your Role
              </h1>
              <p className="text-xl text-gray-600 font-medium">
                Select the account type that best describes you
              </p>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Owner Card */}
              <button
                onClick={() => handleRoleSelect('owner')}
                className="group bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 rounded-3xl p-8 border-2 border-indigo-200 hover:border-indigo-400 transition-all shadow-lg hover:shadow-2xl transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">Property Owner</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Manage properties, tenants, and rent collection professionally
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Property management tools</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Tenant tracking & payments</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Business analytics</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-indigo-600 font-bold group-hover:translate-x-2 transition-transform">
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </div>
                </div>
              </button>

              {/* Renter Card */}
              <button
                onClick={() => handleRoleSelect('renter')}
                className="group bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-3xl p-8 border-2 border-purple-200 hover:border-purple-400 transition-all shadow-lg hover:shadow-2xl transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">Renter/Family</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Organize family life, manage budget, and track housing needs
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Family dashboard</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Budget & expense tracking</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Children management</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-purple-600 font-bold group-hover:translate-x-2 transition-transform">
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </div>
                </div>
              </button>

              {/* Child Card */}
              <button
                onClick={() => handleRoleSelect('child')}
                className="group bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-3xl p-8 border-2 border-blue-200 hover:border-blue-400 transition-all shadow-lg hover:shadow-2xl transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <Baby className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3">Child Account</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Fun kid-friendly dashboard with tasks, rewards, and games
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Simple, colorful interface</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Tasks & rewards system</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span>Parent-controlled safety</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-blue-600 font-bold group-hover:translate-x-2 transition-transform">
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </div>
                </div>
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop')`,
        }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Sparkle Icon */}
      <div className="absolute bottom-8 right-8 z-10">
        <Sparkles className="w-8 h-8 text-white/80 animate-pulse" />
      </div>

      {/* Main Card */}
      <div className="relative z-20 w-full max-w-5xl mx-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden">
          <div className="p-12 lg:p-16">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-full shadow-lg">
                  <Home className="h-7 w-7 text-white" />
                </div>
                <span className="text-3xl font-black text-gray-900">FamilyHub</span>
              </div>
              <button
                onClick={handleBackToRoleSelection}
                className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
              >
                ← Back
              </button>
            </div>

            <div className="max-w-2xl mx-auto">
              <h2 className="text-4xl font-black text-gray-900 mb-2 text-center">
                Create Your Account
              </h2>
              <p className="text-gray-600 mb-8 text-center font-medium">
                {selectedRole === 'owner' ? 'Property Owner' : selectedRole === 'child' ? 'Child Account' : 'Renter/Family Account'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Parent Email for Children */}
                {selectedRole === 'child' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Parent Email (Optional)</label>
                    <input
                      type="email"
                      name="parentEmail"
                      value={formData.parentEmail}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                      placeholder="parent@example.com"
                    />
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 pr-12 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start">
                  <input
                    id="terms"
                    name="termsAccepted"
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5 cursor-pointer"
                    required
                  />
                  <label htmlFor="terms" className="ml-3 block text-sm text-gray-700 cursor-pointer">
                    I agree to the{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold underline">
                      Terms and Conditions
                    </a>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 hover:from-blue-500 hover:via-blue-600 hover:to-purple-600 text-white py-4 px-4 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <span>Create Account</span>
                      <CheckCircle className="ml-2 w-5 h-5" />
                    </span>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/60 backdrop-blur-sm text-gray-600 font-medium">Or sign up with</span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading}
                  className="w-full bg-white/70 backdrop-blur-sm hover:bg-white/90 border-2 border-gray-300 rounded-xl py-4 px-4 font-bold text-gray-900 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  {googleLoading ? (
                    <>
                      <div className="w-6 h-6 border-[3px] border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
