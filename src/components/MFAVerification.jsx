/**
 * MFA Verification Component for Login
 * Displays when user needs to verify MFA code during sign-in
 */

import React, { useState } from 'react';
import { Key, Loader2, AlertCircle } from 'lucide-react';
import { validateTOTPCode } from '../services/mfaService';
import toast from 'react-hot-toast';

export default function MFAVerification({ onVerify, onCancel, error: propError }) {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(propError || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateTOTPCode(verificationCode)) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      await onVerify(verificationCode);
    } catch (err) {
      setError(err.message || 'Invalid verification code');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Multi-Factor Authentication
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength="6"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setVerificationCode(value);
                setError(null);
              }}
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="000000"
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Open your authenticator app and enter the 6-digit code
            </p>
          </div>

          <div className="flex space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Verifying...
                </div>
              ) : (
                'Verify'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-200 text-center">
            <strong>Tip:</strong> The code refreshes every 30 seconds. If it doesn't work, wait for a new code.
          </p>
        </div>
      </div>
    </div>
  );
}


