// src/pages/Register.jsx - ENHANCED DESIGN
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Eye, EyeOff, Mail, Lock, User, Phone, CheckCircle, Sparkles, Users, Shield } from 'lucide-react';
import { familyInvitationService } from '../services/firebaseService';
import toast from 'react-hot-toast';

export default function Register() {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get('invitation');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: '' // 'owner' or 'renter'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [checkingInvitation, setCheckingInvitation] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Check for invitation on mount
  useEffect(() => {
    const checkInvitation = async () => {
      if (invitationId) {
        setCheckingInvitation(true);
        try {
          // In a real app, you'd fetch the invitation by ID
          // For now, we'll check by email when they register
          setCheckingInvitation(false);
        } catch (error) {
          console.error('Error checking invitation:', error);
          setCheckingInvitation(false);
        }
      }
    };
    checkInvitation();
  }, [invitationId]);

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

    if (!formData.userType) {
      toast.error('Please select whether you are an owner or renter');
      return;
    }

    try {
      setLoading(true);

      // Check for pending invitations by email
      const invitations = await familyInvitationService.getInvitationsByEmail(formData.email);

      const userCredential = await signup(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        userType: formData.userType, // 'owner' or 'renter'
        familyMembers: []
      });

      // If there's a pending invitation, accept it automatically
      if (invitations.length > 0) {
        try {
          await familyInvitationService.acceptInvitation(invitations[0].id, userCredential.user.uid);
          toast.success('Welcome! You\'ve been added to the family account.');
        } catch (invError) {
          console.error('Error accepting invitation:', invError);
          // Continue with registration even if invitation acceptance fails
        }
      }

      navigate('/');
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  }

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

        {/* Animated Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        {/* Floating Icons */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-sm transform rotate-12 animate-float">
          <Users className="w-8 h-8 text-white m-4" />
        </div>
        <div className="absolute top-1/3 right-1/4 w-12 h-12 bg-white/10 rounded-xl backdrop-blur-sm transform -rotate-6 animate-float-delayed">
          <Shield className="w-6 h-6 text-white m-3" />
        </div>
        <div className="absolute bottom-1/4 left-1/3 w-14 h-14 bg-white/10 rounded-xl backdrop-blur-sm transform rotate-45 animate-float-slow">
          <Sparkles className="w-7 h-7 text-white m-3.5" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="max-w-md">
            <div className="flex items-center mb-8 group">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl mr-4 group-hover:bg-white/30 transition-all duration-300">
                <Home className="h-10 w-10 text-white" />
              </div>
              <span className="text-5xl font-bold bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                FamilyHub
              </span>
            </div>
            <h1 className="text-6xl font-extrabold mb-6 leading-tight">
              Join Our
              <span className="block text-5xl mt-2 bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                Community
              </span>
            </h1>
            <p className="text-xl text-emerald-100 mb-10 leading-relaxed">
              Create your account and start managing your housing needs in one convenient place. Simple, secure, and designed for families.
            </p>
            <div className="space-y-4">
              {[
                { icon: CheckCircle, text: 'Simple rent tracking & payments' },
                { icon: Shield, text: 'Easy maintenance requests' },
                { icon: Users, text: 'Family-friendly features' },
                { icon: Sparkles, text: '24/7 support & assistance' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center space-x-4 group">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg text-emerald-100 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
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
              <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                FamilyHub
              </span>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h2>
              <p className="text-gray-600 text-lg">Join FamilyHub today and get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focusedField === 'firstName' ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
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
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <div className="relative">
                    <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focusedField === 'lastName' ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
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
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focusedField === 'email' ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
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
                    className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focusedField === 'phone' ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                    <Phone className="h-5 w-5" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-10 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Owner/Renter Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  I am a... <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'owner' }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${formData.userType === 'owner'
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white/50'
                      }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Home className={`h-8 w-8 ${formData.userType === 'owner' ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${formData.userType === 'owner' ? 'text-emerald-700' : 'text-gray-600'}`}>
                        Property Owner
                      </span>
                      <span className={`text-xs ${formData.userType === 'owner' ? 'text-emerald-600' : 'text-gray-500'}`}>
                        I own my home
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, userType: 'renter' }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${formData.userType === 'renter'
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white/50'
                      }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Users className={`h-8 w-8 ${formData.userType === 'renter' ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className={`font-semibold ${formData.userType === 'renter' ? 'text-emerald-700' : 'text-gray-600'}`}>
                        Renter/Tenant
                      </span>
                      <span className={`text-xs ${formData.userType === 'renter' ? 'text-emerald-600' : 'text-gray-500'}`}>
                        I rent my home
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focusedField === 'password' ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
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
                    className="block w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform"
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
                  Confirm Password
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focusedField === 'confirmPassword' ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
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
                    className="block w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:scale-110 transition-transform"
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
                  <a href="#" className="text-emerald-600 hover:text-emerald-700 font-semibold underline decoration-2 underline-offset-2">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-emerald-600 hover:text-emerald-700 font-semibold underline decoration-2 underline-offset-2">
                    Privacy Policy
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
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(12deg); }
          50% { transform: translateY(-20px) rotate(12deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-15px) rotate(-6deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(45deg); }
          50% { transform: translateY(-10px) rotate(45deg); }
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
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
