// src/pages/Onboarding.jsx - REDIRECTS TO SPECIFIC ONBOARDING PAGES
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

export default function Onboarding() {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // Redirect based on user type
    if (userProfile?.userType === 'owner') {
      navigate('/owner-onboarding', { replace: true });
    } else if (userProfile?.userType === 'renter') {
      navigate('/renter-onboarding', { replace: true });
    } else if (userProfile?.userType === 'child') {
      navigate('/child-dashboard', { replace: true });
    }
    // If no userType is set, keep showing the old onboarding (fallback)
  }, [userProfile, loading, navigate]);

  if (loading) {
    return <LoadingScreen message="Loading onboarding..." />;
  }

  // If userType is not set, show a message or redirect to register
  if (!userProfile?.userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Setup Required</h2>
          <p className="text-gray-600 mb-6">Please complete your account registration first.</p>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Registration
          </button>
        </div>
      </div>
    );
  }

  // Show loading while redirecting
  return <LoadingScreen message="Redirecting to your onboarding..." />;
}
