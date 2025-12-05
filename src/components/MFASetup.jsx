/**
 * Multi-Factor Authentication Setup Component
 * Guides users through MFA enrollment
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Shield,
    CheckCircle,
    X,
    Copy,
    Smartphone,
    Key,
    AlertCircle,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

export default function MFASetup({ onComplete, onCancel }) {
    const { currentUser, enrollMFA, verifyAndEnrollMFA } = useAuth();
    const [step, setStep] = useState(1); // 1: Info, 2: QR Code, 3: Verify
    const [secret, setSecret] = useState(null);
    const [qrCodeURL, setQrCodeURL] = useState(null);
    const [qrCodeDataURL, setQrCodeDataURL] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [multiFactorSession, setMultiFactorSession] = useState(null);

    // Step 1: Initialize MFA
    useEffect(() => {
        if (step === 2 && !secret) {
            initializeMFA();
        }
    }, [step]);

    const initializeMFA = async () => {
        try {
            setLoading(true);
            const result = await enrollMFA(currentUser);
            setSecret(result.secret);
            setMultiFactorSession(result.session);

            // Use QR code URI from Cognito
            const qrURL = result.qrCodeURI || `otpauth://totp/Family%20Housing%20Hub:${encodeURIComponent(currentUser.email)}?secret=${result.secret}&issuer=Family%20Housing%20Hub`;
            setQrCodeURL(qrURL);

            // Generate QR code image
            try {
                const dataURL = await QRCode.toDataURL(qrURL, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                setQrCodeDataURL(dataURL);
            } catch (qrError) {
                console.warn('Failed to generate QR code image:', qrError);
            }

            setStep(2);
        } catch (error) {
            console.error('Error initializing MFA:', error);
            toast.error(error.message || 'Failed to initialize MFA');
            if (onCancel) onCancel();
        } finally {
            setLoading(false);
        }
    };

    const validateTOTPCode = (code) => {
        return /^\d{6}$/.test(code);
    };

    const handleVerify = async (e) => {
        e.preventDefault();

        if (!validateTOTPCode(verificationCode)) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }

        try {
            setLoading(true);
            await verifyAndEnrollMFA(currentUser, verificationCode, multiFactorSession);
            setStep(3);
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 2000);
        } catch (error) {
            console.error('Error verifying MFA:', error);
            toast.error(error.message || 'Invalid verification code');
            setVerificationCode('');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        if (secret) {
            navigator.clipboard.writeText(secret);
            toast.success('Secret copied to clipboard!');
        }
    };

    if (step === 1) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Enable Multi-Factor Authentication
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Add an extra layer of security to your account
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Enhanced Security</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Your account will require a code from your authenticator app in addition to your password
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Easy Setup</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Scan a QR code with any authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Protect Your Data</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Even if someone gets your password, they can't access your account without your phone
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-4">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => setStep(2)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Scan QR Code
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Use your authenticator app to scan this code
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : (
                    <>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6 mb-6 flex justify-center">
                            {qrCodeDataURL ? (
                                <img
                                    src={qrCodeDataURL}
                                    alt="QR Code"
                                    className="w-64 h-64"
                                />
                            ) : (
                                <div className="w-64 h-64 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center">
                                    <p className="text-gray-500">Generating QR code...</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
                            <div className="flex items-start space-x-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <p className="font-semibold mb-1">Don't have an authenticator app?</p>
                                    <p>Download one of these free apps:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Google Authenticator</li>
                                        <li>Microsoft Authenticator</li>
                                        <li>Authy</li>
                                        <li>1Password</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Manual Entry Secret
                                </label>
                                <button
                                    onClick={copySecret}
                                    className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span>Copy</span>
                                </button>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 font-mono text-sm text-gray-900 dark:text-white break-all">
                                {secret || 'Loading...'}
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            {onCancel && (
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={() => setStep(3)}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                            >
                                I've Scanned the Code
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Key className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Verify Setup
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Enter the 6-digit code from your authenticator app
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
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
                            }}
                            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="000000"
                            autoFocus
                        />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                            Enter the 6-digit code from your authenticator app
                        </p>
                    </div>

                    <div className="flex space-x-4">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading || verificationCode.length !== 6}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Verifying...
                                </div>
                            ) : (
                                'Verify & Enable'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Success step
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                MFA Enabled Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your account is now protected with multi-factor authentication
            </p>
            {onComplete && (
                <button
                    onClick={onComplete}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                    Done
                </button>
            )}
        </div>
    );
}

