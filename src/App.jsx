// src/App.jsx - WITH ONBOARDING FLOW
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FamilyProvider } from './contexts/FamilyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import { Toaster } from 'react-hot-toast';

// Lazy loading for better performance
const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Rent = lazy(() => import('./pages/Rent'));
const Maintenance = lazy(() => import('./pages/Maintenance'));
const Documents = lazy(() => import('./pages/Documents'));
const Messages = lazy(() => import('./pages/Messages'));
const Landlord = lazy(() => import('./pages/Landlord'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected Route with Onboarding Check
const ProtectedRoute = ({ children }) => {
  const { currentUser, userProfile, profileComplete, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <LoadingScreen message="Verifying access..." />;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If profile is not complete and not on onboarding page
  if (!profileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  
  // If profile is complete but user is trying to access onboarding
  if (profileComplete && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }
  
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// App Router
const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        
        {/* Onboarding Route (Protected but special) */}
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        } />
        
        {/* Protected Routes with Layout */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/rent" element={
          <ProtectedRoute>
            <Layout>
              <Rent />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/maintenance" element={
          <ProtectedRoute>
            <Layout>
              <Maintenance />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/documents" element={
          <ProtectedRoute>
            <Layout>
              <Documents />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/messages" element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/landlord" element={
          <ProtectedRoute>
            <Layout>
              <Landlord />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/help" element={
          <ProtectedRoute>
            <Layout>
              <HelpCenter />
            </Layout>
          </ProtectedRoute>
        } />
        
        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

// Main App Component
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <AuthProvider>
            <FamilyProvider>
              <NotificationProvider>
                <div className="App">
                  {/* Offline Indicator */}
                  {!isOnline && (
                    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center z-50">
                      <p className="text-sm font-medium">
                        ⚠️ You're currently offline. Some features may be limited.
                      </p>
                    </div>
                  )}
                  
                  {/* Main App Content */}
                  <AppRouter />
                  
                  {/* Global Toast Notifications */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                        borderRadius: '12px',
                        fontSize: '14px',
                        maxWidth: '500px',
                        padding: '16px',
                      },
                      success: {
                        duration: 3000,
                        style: {
                          background: '#10B981',
                        },
                        iconTheme: {
                          primary: '#fff',
                          secondary: '#10B981',
                        },
                      },
                      error: {
                        duration: 5000,
                        style: {
                          background: '#EF4444',
                        },
                        iconTheme: {
                          primary: '#fff',
                          secondary: '#EF4444',
                        },
                      },
                      loading: {
                        style: {
                          background: '#3B82F6',
                        },
                      },
                    }}
                  />
                </div>
              </NotificationProvider>
            </FamilyProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;