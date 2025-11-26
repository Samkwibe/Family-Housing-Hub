// src/pages/Login.jsx - PREMIUM ENHANCED DESIGN
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Eye, EyeOff, Mail, Lock, Sparkles, Shield, Zap, Users, Heart, Star, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  const handleDemoLogin = () => {
    setEmail('demo@familyhub.com');
    setPassword('demo123');
    toast.success('Demo credentials filled!');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-10 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob"></div>
        <div className="absolute top-1/2 -right-10 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-500/20 rounded-full mix-blend-soft-light filter blur-3xl animate-blob animation-delay-4000"></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40zm0-40h2l-2 2V0zm0 4l4-4h2l-6 6V4zm0 4l8-8h2l-10 10V8zm0 4L52 0h2l-14 14v-2zm0 4L56 0h2l-18 18v-2zm0 4L60 0h2l-22 22v-2zm0 4L64 0h2l-26 26v-2zm0 4L68 0h2l-30 30v-2zm0 4L72 0h2l-34 34v-2zm0 4L76 0h2l-38 38v-2zm0 4L80 0v2l-40 40v-2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px'
          }}></div>
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-float-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Left Side - Premium Branding with House Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-purple-900/90 to-indigo-900/90"></div>

        {/* Modern House Illustration */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <div className="relative w-96 h-96">
            {/* House Structure */}
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-64 h-40 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-t-2xl border border-white/20 backdrop-blur-sm shadow-2xl"></div>
            {/* Roof */}
            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-72 h-16 bg-gradient-to-r from-purple-500/30 to-pink-500/30" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
            {/* Windows */}
            <div className="absolute top-28 left-1/4 w-8 h-8 bg-cyan-300/40 rounded border border-cyan-200/50 animate-pulse"></div>
            <div className="absolute top-28 right-1/4 w-8 h-8 bg-cyan-300/40 rounded border border-cyan-200/50 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            {/* Door */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-20 bg-gradient-to-b from-amber-400/40 to-amber-600/40 rounded-t border border-amber-300/50"></div>
          </div>
        </div>

        {/* Floating Feature Cards */}
        <div className="absolute top-20 left-20 w-64 h-32 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 transform rotate-3 animate-float hover:scale-105 transition-transform duration-300 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Family Sync</p>
              <p className="text-blue-100 text-sm">Connect everyone together</p>
            </div>
          </div>
        </div>

        <div className="absolute top-40 right-16 w-56 h-28 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 transform -rotate-2 animate-float-delayed hover:scale-105 transition-transform duration-300 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Smart Home</p>
              <p className="text-blue-100 text-sm">Living made easy</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-32 left-1/3 w-60 h-24 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 transform rotate-6 animate-float-slow hover:scale-105 transition-transform duration-300 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Schedule</p>
              <p className="text-blue-100 text-sm">Never miss a thing</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="max-w-lg">
            <div className="flex items-center mb-8 group cursor-pointer">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 backdrop-blur-sm p-4 rounded-3xl mr-4 group-hover:scale-110 transition-all duration-300 shadow-2xl">
                <Home className="h-8 w-8 text-white" />
              </div>
              <span className="text-5xl font-black bg-gradient-to-r from-white via-blue-100 to-cyan-200 bg-clip-text text-transparent">
                FamilyHub
              </span>
            </div>

            <h1 className="text-7xl font-black mb-6 leading-tight">
              Welcome
              <span className="block text-6xl mt-3 bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
                Home
              </span>
            </h1>

            <p className="text-xl text-blue-100 mb-12 leading-relaxed font-light">
              The ultimate family management platform. Organize your home life, manage schedules, track expenses, and create beautiful memories together.
            </p>

            <div className="space-y-6">
              {[
                { icon: Users, text: 'Family member management', color: 'from-green-400 to-cyan-500' },
                { icon: CheckCircle, text: 'Smart task automation', color: 'from-blue-400 to-indigo-500' },
                { icon: Star, text: 'Premium family features', color: 'from-purple-400 to-pink-500' },
                { icon: Shield, text: 'Secure family space', color: 'from-orange-400 to-red-500' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center space-x-4 group transform hover:translate-x-2 transition-transform duration-300 cursor-pointer">
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg text-white font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Enhanced Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-xl">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-2xl">
                <Home className="h-8 w-8 text-white" />
              </div>
              <span className="text-3xl font-black bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                FamilyHub
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-white mb-3">Welcome Back</h2>
              <p className="text-blue-100 text-lg font-light">Continue your family journey with us</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl flex items-start space-x-3 animate-slide-down">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm flex-1">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Email Input */}
              <div className="group">
                <label className="block text-sm font-semibold text-white mb-3">
                  Email Address
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 ${focusedField === 'email' ? 'text-cyan-400 scale-110' : 'text-gray-400'}`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-12 pr-4 py-5 bg-white/5 border-2 border-white/10 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-white/10"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="group">
                <label className="block text-sm font-semibold text-white mb-3">
                  Password
                </label>
                <div className="relative">
                  <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-all duration-300 ${focusedField === 'password' ? 'text-cyan-400 scale-110' : 'text-gray-400'}`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="block w-full pl-12 pr-12 py-5 bg-white/5 border-2 border-white/10 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300 text-white placeholder-gray-400 backdrop-blur-sm hover:bg-white/10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-125 transition-transform duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-cyan-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-5 w-5 text-cyan-500 focus:ring-cyan-500 border-white/30 bg-white/5 rounded cursor-pointer"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-white cursor-pointer font-medium">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors duration-200">
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white py-5 px-4 rounded-2xl font-black text-lg hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-[1.02] active:scale-[0.98] group"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-[3px] border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    <span>Access Family Hub</span>
                    <Zap className="ml-3 w-5 h-5 group-hover:scale-125 transition-transform" />
                  </span>
                )}
              </button>
            </form>

            {/* Demo Login Button */}
            <button
              onClick={handleDemoLogin}
              className="w-full mt-6 bg-white/5 hover:bg-white/10 text-white py-4 px-4 rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-300 border-2 border-white/10 hover:border-white/20 backdrop-blur-sm"
            >
              Try Demo Experience
            </button>

            {/* Sign Up Link */}
            <div className="mt-10 text-center">
              <p className="text-blue-100">
                New to FamilyHub?{' '}
                <Link to="/register" className="font-black text-cyan-400 hover:text-cyan-300 transition-colors duration-200 underline decoration-2 underline-offset-4">
                  Start your family journey
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations and shapes */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -30px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-25px) rotate(3deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-20px) rotate(-2deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(6deg); }
          50% { transform: translateY(-15px) rotate(6deg); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
        }
        @keyframes slide-down {
          0% { transform: translateY(-10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
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
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 10s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
          animation-delay: 2s;
        }
        .animate-float-particle {
          animation: float-particle linear infinite;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
