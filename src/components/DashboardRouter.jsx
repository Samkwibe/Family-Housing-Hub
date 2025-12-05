// Dashboard Router - Intelligently routes users to the correct dashboard based on onboarding data
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userDataService } from '../services/userDataService';
import LoadingScreen from './LoadingScreen';
import Layout from './Layout';
import OwnerDashboard from '../pages/OwnerDashboard';
import Dashboard from '../pages/Dashboard';
import ChildDashboard from '../pages/ChildDashboard';

export default function DashboardRouter() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }

    loadDashboardData();
  }, [currentUser, authLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get userType from profile, or check data directly
      let userType = userProfile?.userType || userProfile?.role;
      
      // If userType not in profile, try to determine from data
      if (!userType) {
        try {
          // Try owner data first
          const ownerData = await userDataService.getOwnerData(currentUser.uid);
          if (ownerData) {
            userType = 'owner';
          } else {
            // Try renter data
            const renterData = await userDataService.getRenterData(currentUser.uid);
            if (renterData) {
              userType = 'renter';
            }
          }
        } catch (checkError) {
          console.log('Could not determine user type from data:', checkError);
        }
      }

      // CHILDREN: Always go to child dashboard
      if (userType === 'child') {
        setDashboardData({ type: 'child' });
        setLoading(false);
        return;
      }

      // OWNERS: Load owner data and determine dashboard type
      if (userType === 'owner') {
        try {
          const ownerData = await userDataService.getOwnerData(currentUser.uid);
          
          // Determine property usage from first property or default to business
          const firstProperty = ownerData?.properties?.[0];
          const propertyUsage = firstProperty?.usage || 'business';

          setDashboardData({
            type: 'owner',
            propertyUsage: propertyUsage, // 'business', 'residence', or 'both'
            properties: ownerData?.properties || [],
            business: ownerData?.business || null,
            paymentPreferences: ownerData?.paymentPreferences || null
          });
        } catch (err) {
          console.error('Error loading owner data:', err);
          // Fallback to default owner dashboard - still show dashboard even if data load fails
          setDashboardData({ 
            type: 'owner',
            propertyUsage: 'business',
            properties: [],
            business: null,
            paymentPreferences: null
          });
        }
        setLoading(false);
        return;
      }

      // RENTERS: Load renter data
      if (userType === 'renter') {
        try {
          const renterData = await userDataService.getRenterData(currentUser.uid);
          
          setDashboardData({
            type: 'renter',
            personal: renterData?.personal || null,
            family: renterData?.family || null,
            housing: renterData?.housing || null,
            financial: renterData?.financial || null,
            preferences: renterData?.preferences || {},
            lease: renterData?.lease || null
          });
        } catch (err) {
          console.error('Error loading renter data:', err);
          // Fallback to default renter dashboard - still show dashboard even if data load fails
          setDashboardData({
            type: 'renter',
            personal: null,
            family: null,
            housing: null,
            financial: null,
            preferences: {},
            lease: null
          });
        }
        setLoading(false);
        return;
      }

      // Default: Check if onboarding is complete
      if (userProfile?.profileComplete || userProfile?.onboardingComplete) {
        // User completed onboarding but userType not set - try to infer from data
        // If we can't determine, default to renter
        setDashboardData({ type: 'renter' });
        setLoading(false);
        return;
      }

      // Not completed onboarding - redirect to onboarding
      console.log('User not onboarded, redirecting to onboarding...');
      navigate('/onboarding', { replace: true });
      setLoading(false);
    } catch (err) {
      console.error('Error in dashboard router:', err);
      setError(err.message || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Reload Page
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Route to appropriate dashboard
  if (dashboardData?.type === 'child') {
    return <ChildDashboard />;
  }

  if (dashboardData?.type === 'owner') {
    // Pass dashboard data as props so OwnerDashboard can adapt
    // Wrap with Layout to show navigation sidebar
    return (
      <Layout>
        <OwnerDashboard dashboardData={dashboardData} />
      </Layout>
    );
  }

  if (dashboardData?.type === 'renter') {
    // Pass dashboard data as props so Dashboard can adapt
    // Dashboard uses Layout component
    return (
      <Layout>
        <Dashboard dashboardData={dashboardData} />
      </Layout>
    );
  }

  // Fallback loading
  return <LoadingScreen message="Setting up your dashboard..." />;
}

