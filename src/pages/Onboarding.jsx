// src/pages/Onboarding.jsx - REDIRECTS TO SPECIFIC ONBOARDING PAGES OR DASHBOARDS
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userDataService } from '../services/userDataService';
import LoadingScreen from '../components/LoadingScreen';

export default function Onboarding() {
  const { currentUser, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (loading) {
        return; // Still loading, wait
      }

      if (!currentUser) {
        // Not logged in - redirect to login
        navigate('/login', { replace: true });
        return;
      }

      try {
        // First, check if onboarding is already complete
        if (userProfile?.onboardingComplete || userProfile?.profileComplete) {
          // User has completed onboarding - redirect to appropriate dashboard
          const userType = userProfile?.userType || userProfile?.role;
          
          if (userType === 'owner') {
            navigate('/owner-dashboard', { replace: true });
            return;
          } else if (userType === 'renter') {
            navigate('/dashboard', { replace: true });
            return;
          } else if (userType === 'child') {
            navigate('/child-dashboard', { replace: true });
            return;
          }
          
          // If userType not set but onboarding complete, try to get from data
          try {
            const ownerData = await userDataService.getOwnerData(currentUser.uid);
            if (ownerData) {
              navigate('/owner-dashboard', { replace: true });
              return;
            }
            
            const renterData = await userDataService.getRenterData(currentUser.uid);
            if (renterData) {
              navigate('/dashboard', { replace: true });
              return;
            }
          } catch (dataError) {
            console.log('Could not determine user type from data:', dataError);
          }
        }

        // If onboarding not complete, redirect to specific onboarding based on userType
        const userType = userProfile?.userType || userProfile?.role;
        
        if (userType === 'owner') {
          navigate('/owner-onboarding', { replace: true });
          return;
        } else if (userType === 'renter') {
          navigate('/renter-onboarding', { replace: true });
          return;
        } else if (userType === 'child') {
          navigate('/child-dashboard', { replace: true });
          return;
        }
        
        // If no userType is set, check if user just registered
        // Default new users to renter onboarding
        if (!userProfile?.userType && !userProfile?.role) {
          // New user without userType - default to renter onboarding
          console.log('No userType set, defaulting to renter onboarding');
          navigate('/renter-onboarding', { replace: true });
          return;
        }
        
        setChecking(false);
      } catch (error) {
        console.error('Error in onboarding redirect:', error);
        // On error, default to renter onboarding for safety
        navigate('/renter-onboarding', { replace: true });
      }
    };

    checkAndRedirect();
  }, [userProfile, loading, currentUser, navigate]);

  if (loading || checking) {
    return <LoadingScreen message="Loading onboarding..." />;
  }

  // If userType is not set, show a message or redirect to register
  if (!userProfile?.userType && !userProfile?.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Account Setup Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please complete your account registration first to set up your account type.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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
