// src/components/FamilyInviteManager.jsx
// Component for managing family invitations and invite codes

import React, { useState, useEffect } from 'react';
import { Users, Copy, CheckCircle, RefreshCw, Mail, Share2, X, Key, UserPlus } from 'lucide-react';
import { familyInviteCodeService } from '../services/familyInviteCodeService';
import toast from 'react-hot-toast';
import { SkeletonLoader } from './SkeletonLoader';

const FamilyInviteManager = ({ userId, familyId, onInviteSent }) => {
  const [inviteCode, setInviteCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    relationship: 'Family Member',
  });

  useEffect(() => {
    if (familyId && userId) {
      loadInviteCode();
    } else {
      setLoading(false);
    }
  }, [familyId, userId]);

  const loadInviteCode = async () => {
    if (!userId) {
      console.warn('Cannot load invite code: missing userId');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use familyId if available, otherwise use userId as familyId (for users without a family yet)
      const effectiveFamilyId = familyId || userId;
      console.log('Loading invite code for:', { effectiveFamilyId, userId });
      const code = await familyInviteCodeService.createOrGetInviteCode(effectiveFamilyId, userId);
      setInviteCode(code);
    } catch (error) {
      console.error('Error loading invite code:', error);
      toast.error(error.message || 'Failed to load invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    
    try {
      setCopying(true);
      await navigator.clipboard.writeText(inviteCode);
      toast.success('Invite code copied to clipboard!');
      setTimeout(() => setCopying(false), 2000);
    } catch (error) {
      console.error('Error copying:', error);
      toast.error('Failed to copy code');
      setCopying(false);
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;

    const shareText = `Join my family on Family Housing Hub! Use invite code: ${inviteCode}`;
    const shareUrl = `${window.location.origin}/register?invite=${inviteCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join My Family',
          text: shareText,
          url: shareUrl,
        });
        toast.success('Invitation shared!');
      } catch (error) {
        // User cancelled
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success('Invitation link copied to clipboard!');
    }
  };

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      const newCode = await familyInviteCodeService.regenerateInviteCode(familyId, userId);
      setInviteCode(newCode);
      toast.success('New invite code generated!');
    } catch (error) {
      console.error('Error regenerating code:', error);
      toast.error('Failed to regenerate code');
    } finally {
      setLoading(false);
    }
  };

  const inviteCodeUrl = inviteCode ? `${window.location.origin}/register?invite=${inviteCode}` : '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Family Invitations
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Invite family members to join your group
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {showInviteForm ? (
            <X className="h-5 w-5 text-gray-500" />
          ) : (
            <UserPlus className="h-5 w-5 text-gray-500" />
          )}
        </button>
      </div>

      {loading ? (
        <SkeletonLoader className="h-32" />
      ) : (
        <div className="space-y-4">
          {/* Invite Code Display */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Family Invite Code
                </span>
              </div>
              <button
                onClick={handleRegenerate}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                title="Regenerate code"
              >
                <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-lg text-lg font-mono tracking-widest text-center text-blue-900 dark:text-blue-100">
                {inviteCode}
              </code>
              <button
                onClick={handleCopyCode}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  copying
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copying ? (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 inline mr-2" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Share this code with family members to join your family group
            </p>
          </div>

          {/* Share Options */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Share2 className="h-4 w-4" />
              <span>Share Invitation</span>
            </button>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Link */}
          {inviteCodeUrl && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Quick Link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteCodeUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCodeUrl);
                    toast.success('Link copied!');
                  }}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FamilyInviteManager;

