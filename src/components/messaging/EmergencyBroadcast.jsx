/**
 * Emergency Broadcast Component
 * Send urgent alerts to all family members
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  MapPin,
  Send,
  X,
  Siren,
  Phone,
  Navigation,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import messagingService from '../../services/messagingService';

export default function EmergencyBroadcast({ currentUser, familyMembers, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [includeLocation, setIncludeLocation] = useState(false);
  const [location, setLocation] = useState(null);
  const [sending, setSending] = useState(false);

  // Emergency templates
  const emergencyTemplates = [
    { id: 1, text: '🚨 EMERGENCY - Need immediate help!', icon: Siren },
    { id: 2, text: '🏥 Medical emergency - calling 911', icon: AlertCircle },
    { id: 3, text: '🚗 Car accident - I\'m okay but need assistance', icon: AlertCircle },
    { id: 4, text: '🏠 Home emergency - please come home', icon: AlertCircle },
    { id: 5, text: '⚠️ Safety concern - please call me ASAP', icon: Phone }
  ];

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIncludeLocation(true);
        toast.success('Location captured');
      },
      (error) => {
        console.error('Location error:', error);
        toast.error('Failed to get location');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      await messagingService.sendEmergencyBroadcast({
        senderId: currentUser.uid,
        senderName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email,
        message: message,
        recipients: familyMembers.map(m => m.id || m.userId),
        location: includeLocation && location ? location : null
      });

      toast.success('Emergency broadcast sent!');
      onSent?.();
      onClose();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                <Siren className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Emergency Broadcast</h3>
                <p className="text-sm text-red-600">High priority alert to all family</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quick Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="grid grid-cols-1 gap-2">
              {emergencyTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => setMessage(template.text)}
                    className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-all text-left"
                  >
                    <Icon className="h-5 w-5 text-red-600 flex-shrink-0" />
                    <span className="text-sm text-gray-900">{template.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emergency Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the emergency situation..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">Include my location</span>
              </label>
              {!location && (
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Navigation className="h-4 w-4" />
                  Get Location
                </button>
              )}
            </div>

            {location && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-900 font-medium">Location captured</p>
                    <p className="text-gray-600 text-xs mt-1">
                      Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recipients Info */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-900 mb-1">
                  This alert will be sent to {familyMembers.length} family member{familyMembers.length !== 1 ? 's' : ''}
                </p>
                <ul className="text-gray-600 space-y-1">
                  <li>• High priority notification</li>
                  <li>• Bypasses "Do Not Disturb" mode</li>
                  <li>• Requires acknowledgment</li>
                  <li>• Includes your contact info</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-white transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:from-red-700 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Siren className="h-5 w-5" />
                  Send Emergency Alert
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}










