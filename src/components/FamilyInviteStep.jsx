// src/components/FamilyInviteStep.jsx
// Component for inviting family members during onboarding

import React, { useState } from 'react';
import { Users, Key, CheckCircle, X, Eye, EyeOff, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { familyInviteCodeService } from '../services/familyInviteCodeService';
import toast from 'react-hot-toast';
import SkeletonLoader from './SkeletonLoader';

const FamilyInviteStep = ({ onComplete, onSkip, userProfile, isAdult = true }) => {
  const [hasFamily, setHasFamily] = useState(null); // null = not answered, true = yes, false = no
  const [inviteCode, setInviteCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [familyInfo, setFamilyInfo] = useState(null);
  const [showCode, setShowCode] = useState(false);

  const handleCodeChange = async (e) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInviteCode(code);

    // Auto-validate when code is complete (format: FAM-XXXX-XXXX)
    if (code.length === 13 && code.startsWith('FAM-')) {
      setValidating(true);
      try {
        const info = await familyInviteCodeService.validateInviteCode(code);
        if (info) {
          setFamilyInfo(info);
          toast.success(`Found family: ${info.familyName}`);
        } else {
          setFamilyInfo(null);
          toast.error('Invalid or expired invite code');
        }
      } catch (error) {
        console.error('Error validating code:', error);
        setFamilyInfo(null);
      } finally {
        setValidating(false);
      }
    } else if (code.length < 13) {
      setFamilyInfo(null);
    }
  };

  const handleJoinFamily = async () => {
    if (!familyInfo) {
      toast.error('Please enter a valid invite code');
      return;
    }

    try {
      setValidating(true);
      await familyInviteCodeService.acceptInviteCode(inviteCode, userProfile?.id || userProfile?.uid);
      toast.success(`Welcome to ${familyInfo.familyName}! 🎉`);
      onComplete({ joinedFamily: true, familyInfo });
    } catch (error) {
      console.error('Error joining family:', error);
      toast.error(error.message || 'Failed to join family');
    } finally {
      setValidating(false);
    }
  };

  const handleCreateNewFamily = () => {
    onComplete({ joinedFamily: false, createNew: true });
  };

  if (hasFamily === null) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Join Your Family
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Connect with your family members to share messages, schedules, and more
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4 mb-6">
            <button
              onClick={() => setHasFamily(true)}
              className="w-full p-6 border-2 border-blue-200 dark:border-blue-800 rounded-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    I have an invite code
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Join an existing family group with an invite code
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
            </button>

            <button
              onClick={() => setHasFamily(false)}
              className="w-full p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                  <Sparkles className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Create a new family
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Start your own family group and invite others later
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
              </div>
            </button>
          </div>

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (hasFamily === true) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Key className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Enter Invite Code
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Ask a family member for your family's invite code
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invite Code
            </label>
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                value={inviteCode}
                onChange={handleCodeChange}
                placeholder="FAM-XXXX-XXXX"
                maxLength={13}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                style={{ letterSpacing: '0.2em' }}
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {showCode ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Format: FAM-XXXX-XXXX
            </p>
          </div>

          {validating && !familyInfo && (
            <div className="mb-6">
              <SkeletonLoader className="h-32" />
            </div>
          )}

          {familyInfo && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    {familyInfo.familyName}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    Family Head: {familyInfo.familyHead.name}
                  </p>
                  {isAdult && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                        Family Members ({familyInfo.memberCount}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {familyInfo.members.map((member, idx) => (
                          <div
                            key={idx}
                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-200"
                          >
                            {member.firstName || member.email || 'Member'}
                          </div>
                        ))}
                        {familyInfo.memberCount > 5 && (
                          <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-800 dark:text-blue-200">
                            +{familyInfo.memberCount - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setHasFamily(null)}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleJoinFamily}
              disabled={!familyInfo || validating}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {validating ? (
                <>Validating...</>
              ) : (
                <>
                  Join Family
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // hasFamily === false (create new family)
  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Create Your Family
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Start your own family group and invite members later
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <UserCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                You'll be the family head
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                You can invite family members after completing onboarding
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setHasFamily(null)}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleCreateNewFamily}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            Create Family
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilyInviteStep;

