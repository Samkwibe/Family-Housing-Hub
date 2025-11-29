 // src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw, Home, Shield, Wifi } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, isBlockedRequest: false };
  }

  static getDerivedStateFromError(error) {
    // Check if error is related to blocked requests (ad blockers)
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    const isBlockedRequest = 
      errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
      errorMessage.includes('blocked') ||
      errorMessage.includes('network') ||
      errorCode === 'unavailable' ||
      errorCode === 'permission-denied' ||
      errorCode === 'cancelled';
    
    return { hasError: true, error, isBlockedRequest };
  }

  componentDidCatch(error, errorInfo) {
    // Don't log blocked request errors as critical
    if (this.state.isBlockedRequest) {
      console.warn('Request blocked - likely due to ad blocker:', error);
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, isBlockedRequest: false });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, isBlockedRequest: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { isBlockedRequest } = this.state;
      
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-200">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className={`w-16 h-16 ${isBlockedRequest ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {isBlockedRequest ? (
                <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isBlockedRequest ? 'Request Blocked' : 'Something went wrong'}
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isBlockedRequest ? (
                <>
                  It looks like an ad blocker or browser extension is blocking some features. 
                  The app needs access to Google services (Maps & Firestore) to function properly.
                  <br /><br />
                  <strong>To fix this:</strong>
                  <br />
                  • Disable your ad blocker for this site
                  <br />
                  • Or add this site to your ad blocker's allowlist
                  <br />
                  • Or try using a different browser
                </>
              ) : (
                'We encountered an unexpected error. This might be due to connectivity issues or a temporary problem.'
              )}
            </p>
            
            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full bg-blue-600 dark:bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reload Page</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Go to Home</span>
              </button>
            </div>
            
            <div className={`mt-6 p-4 rounded-lg ${isBlockedRequest ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className={`text-sm ${isBlockedRequest ? 'text-amber-800 dark:text-amber-300' : 'text-gray-600 dark:text-gray-400'}`}>
                {isBlockedRequest ? (
                  <>
                    <Wifi className="h-4 w-4 inline mr-1" />
                    The app will work in offline mode, but some features require internet access.
                  </>
                ) : (
                  'If the problem persists, check your internet connection or try again later.'
                )}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
