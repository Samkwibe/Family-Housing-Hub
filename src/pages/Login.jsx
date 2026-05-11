// LOGIN PAGE - FROSTED GLASS OVERLAY DESIGN - MATCHING USER'S IMAGE
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Eye, EyeOff, Mail, Lock, Users, Camera, User, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { isFeatureEnabled } from '../services/featureFlags';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, signInWithGoogle, sendMagicLink, completeMagicLink, userProfile, currentUser } = useAuth();
  const magicLinkEnabled = isFeatureEnabled('magic_link_login_enabled');
  const navigate = useNavigate();

  // Track if we just logged in to trigger redirect
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Redirect after login based on user role - optimized without artificial delays
  useEffect(() => {
    if (justLoggedIn && currentUser && !hasRedirected) {
      // If we have userProfile, redirect immediately
      if (userProfile) {
        setHasRedirected(true);
        if (userProfile.role === 'child') {
          navigate('/child-dashboard', { replace: true });
        } else if (userProfile.userType === 'owner') {
          navigate('/owner-dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        setJustLoggedIn(false);
        setLoading(false);
      } else if (!loading) {
        // If not loading and no profile, redirect to onboarding to let it handle routing
        setHasRedirected(true);
        navigate('/onboarding', { replace: true });
        setJustLoggedIn(false);
        setLoading(false);
      }
    }
  }, [justLoggedIn, currentUser, userProfile, loading, navigate, hasRedirected]);

  useEffect(() => {
    const maybeCompleteMagicLink = async () => {
      try {
        const completed = await completeMagicLink(window.location.href);
        if (completed) {
          setJustLoggedIn(true);
        }
      } catch {
        // handled in auth context
      }
    };
    maybeCompleteMagicLink();
  }, [completeMagicLink]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await login(identifier, password);
      
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      setJustLoggedIn(true);
      toast.success('Welcome back! 🎉');
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Failed to login. Please check your credentials.');
      setLoading(false);
      setJustLoggedIn(false);
      setHasRedirected(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
      setJustLoggedIn(true);
      toast.success('Signed in with Google! 🎉');
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      setError(error.message || 'Failed to sign in with Google');
      setGoogleLoading(false);
      setJustLoggedIn(false);
      setHasRedirected(false);
    }
  };

  const handleMagicLink = async () => {
    const email = String(identifier || '').trim().toLowerCase();
    if (!email.includes('@')) {
      setError('Enter your email to receive a magic link.');
      return;
    }
    setError(null);
    await sendMagicLink(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image - Luxury Backyard */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&h=1080&fit=crop')`,
        }}
      >
        {/* Subtle overlay for better readability */}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Sparkle Icon */}
      <div className="absolute bottom-8 right-8 z-10">
        <Sparkles className="w-8 h-8 text-white/80 animate-pulse" />
      </div>

      {/* Main Card - Frosted Glass Effect */}
      <div className="relative z-20 w-full max-w-6xl mx-4 my-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/40 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Welcome & Features */}
            <div className="p-12 lg:p-16 flex flex-col justify-center">
              {/* Logo */}
              <div className="flex items-center space-x-3 mb-12">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-full shadow-lg">
                  <Home className="h-7 w-7 text-white" />
                </div>
                <span className="text-3xl font-black text-gray-900">FamilyHub</span>
              </div>

              {/* Welcome Heading */}
              <div className="mb-12">
                <div className="flex items-center space-x-3 mb-4">
                  <h1 className="text-5xl font-black text-gray-900">Welcome Home</h1>
                  <Home className="w-10 h-10 text-gray-700" />
                </div>
                <p className="text-xl text-gray-600 font-medium">
                  Simplify, Organize, Connect - Together.
                </p>
              </div>

              {/* Feature Buttons */}
              <div className="space-y-4">
                <button className="w-full bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 rounded-2xl p-5 flex items-center space-x-4 transition-all shadow-md hover:shadow-lg border border-gray-200">
                  <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-xl">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">Family Dashboard</span>
                </button>

                <button className="w-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 hover:from-blue-400/30 hover:to-cyan-400/30 rounded-2xl p-5 flex items-center space-x-4 transition-all shadow-md hover:shadow-lg border-2 border-blue-400/50">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-xl">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">Smart Home</span>
                </button>

                <button className="w-full bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 rounded-2xl p-5 flex items-center space-x-4 transition-all shadow-md hover:shadow-lg border border-gray-200">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">Memories</span>
                </button>
              </div>
            </div>

            {/* Right Side - Sign In Form */}
            <div className="p-12 lg:p-16 bg-white/60 backdrop-blur-md flex flex-col justify-center">
              <h2 className="text-4xl font-black text-gray-900 mb-8">Sign In</h2>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email or phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email or mobile number
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Use the email on your account, or the same mobile number you verified at sign-up (US numbers).
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-4 pr-4 py-4 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                      placeholder="you@example.com or (555) 555-0100"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-12 py-4 bg-white/70 backdrop-blur-sm border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-500"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="flex items-center justify-end">
                  <Link to="#" className="flex items-center space-x-2 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors">
                    <User className="w-4 h-4" />
                    <span>Forgot password?</span>
                  </Link>
                </div>

                {/* Log In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 hover:from-blue-500 hover:via-blue-600 hover:to-purple-600 text-white py-5 px-4 rounded-xl font-black text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <span>Log In</span>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/60 backdrop-blur-sm text-gray-600 font-medium">Or continue with</span>
                  </div>
                </div>

                {magicLinkEnabled && (
                  <button
                    type="button"
                    onClick={handleMagicLink}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-semibold transition-all shadow-md"
                  >
                    Send Magic Link
                  </button>
                )}

                {/* Social Login Buttons */}
                <div className="space-y-3">
                  {/* Google Login */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                    className="w-full bg-white/70 backdrop-blur-sm hover:bg-white/90 border-2 border-gray-300 rounded-xl py-4 px-4 font-bold text-gray-900 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-3 disabled:opacity-50"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Apple Login */}
                  <button
                    type="button"
                    className="w-full bg-white/70 backdrop-blur-sm hover:bg-white/90 border-2 border-gray-300 rounded-xl py-4 px-4 font-bold text-gray-900 transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-3"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span>Continue with Apple</span>
                  </button>
                </div>
              </form>

              {/* Sign Up Link */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 transition-colors underline">
                    Sign Up
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
