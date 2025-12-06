// src/components/EmailVerificationStep.jsx
// Component for email verification during signup

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, X, RefreshCw, ArrowRight, Clock } from 'lucide-react';
import { verificationService } from '../services/verificationService';
import toast from 'react-hot-toast';

const EmailVerificationStep = ({ email, onVerified, onSkip }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Send verification code on mount
    sendCode();

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const sendCode = async () => {
    try {
      setSending(true);
      await verificationService.sendEmailVerificationCode(email);
      setTimeLeft(600); // Reset timer
      setCanResend(false);
    } catch (error) {
      console.error('Error sending verification code:', error);
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast.error('Please enter a 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      const result = await verificationService.verifyEmailCode(email, code);
      if (result.verified) {
        toast.success('Email verified successfully!');
        onVerified();
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Mail className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Verify Your Email
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          We've sent a verification code to
        </p>
        <p className="text-gray-900 dark:text-white font-semibold mt-1">
          {email}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
              autoFocus
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span>Code expires in: {formatTime(timeLeft)}</span>
          </div>

          {/* Resend Code */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={sendCode}
              disabled={!canResend || sending}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} />
              {sending ? 'Sending...' : 'Resend Code'}
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Skip for now
              </button>
            )}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify Email
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Didn't receive the code?</strong>
          </p>
          <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
            <li>Check your spam/junk folder</li>
            <li>Make sure {email} is correct</li>
            <li>Wait a few minutes and try resending</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationStep;

