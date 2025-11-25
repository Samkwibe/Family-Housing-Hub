// src/components/LoadingScreen.jsx - ENHANCED VERSION
import React from 'react';
import { Home, Loader } from 'lucide-react';

const LoadingScreen = ({ 
  message = "Loading...", 
  showProgress = false, 
  progress = 0,
  fullScreen = true 
}) => {
  const containerClasses = fullScreen 
    ? "min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <div className="text-center max-w-md w-full">
        {/* Animated Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div className="relative bg-white p-4 rounded-2xl shadow-lg">
              <Home className="h-12 w-12 text-blue-600 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1">
              <Loader className="h-5 w-5 text-white animate-spin" />
            </div>
          </div>
        </div>
        
        {/* App Name */}
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Family Housing Hub
        </h2>
        
        {/* Loading Message */}
        <p className="text-gray-600 mb-6 font-medium">{message}</p>
        
        {/* Progress Bar */}
        {showProgress && (
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-white opacity-30 animate-pulse"></div>
            </div>
          </div>
        )}
        
        {/* Animated Dots */}
        <div className="flex justify-center space-x-2 mb-4">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce shadow-md"></div>
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce shadow-md" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-3 h-3 bg-pink-600 rounded-full animate-bounce shadow-md" style={{ animationDelay: '0.2s' }}></div>
        </div>
        
        {/* Loading Tips (optional) */}
        <div className="mt-6 text-xs text-gray-500 italic">
          <p>💡 Tip: Keep your documents organized for easy access</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;