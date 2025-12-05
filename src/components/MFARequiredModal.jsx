/**
 * MFA Required Modal
 * Shows when user logs in for the first time and MFA is not set up
 * Forces user to set up MFA before proceeding
 */

import React, { useState } from 'react';
import { Shield, AlertCircle, X, Lock } from 'lucide-react';
import MFASetup from './MFASetup';
import toast from 'react-hot-toast';

export default function MFARequiredModal({ onComplete, onSkip }) {
  const [showSetup, setShowSetup] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [skipCount, setSkipCount] = useState(0);

  const handleSkip = () => {
    setSkipCount(prev => prev + 1);
    
    if (skipCount >= 2) {
      // After 2 skips, allow but show strong warning
      setCanSkip(true);
      toast.error('⚠️ Your account is not secure without MFA. We strongly recommend enabling it.', {
        duration: 8000,
        icon: '🔒'
      });
    } else {
      toast('🔒 Multi-factor authentication is highly recommended for account security. You can set it up later in Settings.', {
        duration: 6000,
        icon: '⚠️'
      });
    }
    
    if (onSkip) {
      onSkip();
    }
  };

  if (showSetup) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <MFASetup
            onComplete={() => {
              setShowSetup(false);
              if (onComplete) onComplete();
            }}
            onCancel={() => {
              setShowSetup(false);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Secure Your Account
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Multi-factor authentication adds an extra layer of security to protect your family's data
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">Why enable MFA?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Protects against unauthorized access</li>
                <li>Required for sensitive family data</li>
                <li>Only takes 2 minutes to set up</li>
                <li>Works with any authenticator app</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setShowSetup(true)}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center space-x-2"
          >
            <Lock className="w-5 h-5" />
            <span>Set Up MFA Now (Recommended)</span>
          </button>

          {skipCount < 3 && (
            <button
              onClick={handleSkip}
              className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Set Up Later
            </button>
          )}

          {canSkip && (
            <button
              onClick={() => {
                toast.error('⚠️ Your account security is at risk without MFA', {
                  duration: 5000
                });
                if (onSkip) onSkip();
              }}
              className="w-full px-6 py-3 border-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Skip (Not Recommended)
            </button>
          )}
        </div>

        <p className="mt-6 text-xs text-center text-gray-500 dark:text-gray-400">
          You can always enable MFA later in Settings → Privacy & Security
        </p>
      </div>
    </div>
  );
}


