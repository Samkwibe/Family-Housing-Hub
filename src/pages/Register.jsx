// src/pages/Register.jsx - Role Selection First, Then Registration Form
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, Users, Baby, ArrowRight, ArrowLeft } from 'lucide-react';
import { familyInvitationService } from '../services/firebaseService';
import toast from 'react-hot-toast';

export default function Register() {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get('invitation');
  const roleParam = searchParams.get('role'); // Get role from URL if coming from login page

  // Step 1: Role selection (Parent or Child)
  // If role is in URL, skip role selection and go straight to form
  const [selectedRole, setSelectedRole] = useState(roleParam === 'family' ? 'family' : roleParam === 'child' ? 'child' : null);
  const [showForm, setShowForm] = useState(!!roleParam); // Show form immediately if role is in URL

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    parentEmail: '' // For child accounts to link to parent
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // If role is selected, show the form
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setShowForm(true);
  };

  // Go back to role selection
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

  async function handleSubmit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password should be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      toast.loading(selectedRole === 'child' ? 'Creating your account...' : 'Creating account...', { id: 'signup' });

      // For child accounts, skip invitation check to speed up signup
      let invitations = [];
      let parentId = null;
      
      if (selectedRole !== 'child') {
        // Only check invitations for parent accounts
        invitations = await familyInvitationService.getInvitationsByEmail(formData.email);
      } else if (selectedRole === 'child' && formData.parentEmail) {
        // For children, just store parent email - linking can happen later
        // This speeds up the signup process
      }

      // Create account with optimized data
      const userCredential = await signup(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || '', // Make phone optional for children
        role: selectedRole,
        parentId: parentId,
        parentEmail: selectedRole === 'child' ? formData.parentEmail : null,
        familyMembers: selectedRole === 'child' ? undefined : [] // Don't store for children
      });

      // If there's a pending invitation, accept it automatically (only for parents)
      if (invitations.length > 0 && selectedRole !== 'child') {
        try {
          await familyInvitationService.acceptInvitation(invitations[0].id, userCredential.user.uid);
          toast.success('Welcome! You\'ve been added to the family account.', { id: 'signup' });
        } catch (invError) {
          console.error('Error accepting invitation:', invError);
        }
      } else {
        toast.success(selectedRole === 'child' ? 'Account created! Welcome!' : 'Account created successfully!', { id: 'signup' });
      }

      // Redirect based on role
      if (selectedRole === 'child') {
        // Children go straight to child dashboard (no onboarding)
        navigate('/child-dashboard');
      } else {
        // Parents go to onboarding or dashboard
        navigate('/');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account', { id: 'signup' });
    } finally {
      setLoading(false);
    }
  }

  // If form is not shown, show role selection
  if (!showForm) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-4 rounded-3xl shadow-2xl">
                  <Home className="h-12 w-12 text-white" />
                </div>
              </div>
              <h1 className="text-5xl font-black text-gray-900 mb-4">
                Welcome to FamilyHub
              </h1>
              <p className="text-xl text-gray-600">
                Choose your account type to get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Parent Option */}
              <button
                onClick={() => handleRoleSelect('family')}
                className="group relative bg-white rounded-3xl p-8 border-4 border-transparent hover:border-purple-500 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">Parent</h2>
                  <p className="text-gray-600 mb-6">
                    Full access to all features. Manage your family, rent, maintenance, and more.
                  </p>
                  <div className="space-y-2 text-left mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Complete dashboard access</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Manage children accounts</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>All housing features</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform">
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </div>
                </div>
              </button>

              {/* Child Option */}
              <button
                onClick={() => handleRoleSelect('child')}
                className="group relative bg-white rounded-3xl p-8 border-4 border-transparent hover:border-blue-500 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Baby className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">Child</h2>
                  <p className="text-gray-600 mb-6">
                    Child-friendly dashboard. Tasks, chores, rewards, and fun activities!
                  </p>
                  <div className="space-y-2 text-left mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Simple, kid-friendly interface</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Tasks & rewards</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      <span>Parent-controlled features</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                    <span>Get Started</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </div>
                </div>
              </button>
            </div>

            <div className="text-center mt-8">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-purple-600 hover:text-purple-700 transition-colors underline decoration-2 underline-offset-2">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes blob {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  // Show registration form after role selection
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800"></div>
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            <div className="flex items-center mb-8">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl mr-4">
                <Home className="h-10 w-10 text-white" />
              </div>
              <span className="text-5xl font-bold">FamilyHub</span>
            </div>
            <h1 className="text-6xl font-extrabold mb-6">
              {selectedRole === 'child' ? 'Welcome, Kid!' : 'Join Our Community'}
            </h1>
            <p className="text-xl text-emerald-100 mb-10">
              {selectedRole === 'child' 
                ? 'Create your account and start earning rewards!'
                : 'Create your account and start managing your housing needs in one convenient place.'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-emerald-600 to-cyan-600 p-3 rounded-2xl shadow-lg">
                <Home className="h-8 w-8 text-white" />
              </div>
              <span className="text-3xl font-bold">FamilyHub</span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            {/* Back Button */}
            <button
              onClick={handleBackToRoleSelection}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span>Back to role selection</span>
            </button>

            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                {selectedRole === 'child' ? 'Create Child Account' : 'Create Parent Account'}
              </h2>
              <p className="text-gray-600 text-lg">Fill in your information</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'firstName' ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('firstName')}
                      onBlur={() => setFocusedField(null)}
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'lastName' ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('lastName')}
                      onBlur={() => setFocusedField(null)}
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'email' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Parent Email (for children only) */}
              {selectedRole === 'child' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Parent Email (Optional)
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'parentEmail' ? 'text-emerald-600' : 'text-gray-400'}`}>
                      <Users className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      name="parentEmail"
                      value={formData.parentEmail}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('parentEmail')}
                      onBlur={() => setFocusedField(null)}
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                      placeholder="Parent's email to link accounts"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    If you have a parent account, enter their email to link your account
                  </p>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'phone' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'password' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${focusedField === 'confirmPassword' ? 'text-emerald-600' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white/50"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="flex items-start pt-2">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded mt-1 cursor-pointer"
                />
                <label htmlFor="terms" className="ml-3 block text-sm text-gray-700 cursor-pointer">
                  I agree to the{' '}
                  <a href="#" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                    Terms and Conditions
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-4 px-4 rounded-xl font-bold text-lg hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-4 focus:ring-emerald-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    <span>Create Account</span>
                    <CheckCircle className="ml-2 w-5 h-5" />
                  </span>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors underline decoration-2 underline-offset-2">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
