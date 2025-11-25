// src/components/MaintenanceMode.jsx
import React from 'react';
import { Wrench, Clock, Home, Mail } from 'lucide-react';

const MaintenanceMode = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wrench className="h-8 w-8 text-orange-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Under Maintenance</h1>
          <p className="text-gray-600 mb-6">
            Family Housing Hub is currently undergoing scheduled maintenance. We'll be back soon!
          </p>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-center space-x-3 text-gray-600">
              <Clock className="h-5 w-5" />
              <span>Expected back: 2:00 PM EST</span>
            </div>
            <div className="flex items-center justify-center space-x-3 text-gray-600">
              <Mail className="h-5 w-5" />
              <span>support@familyhousinghub.com</span>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              We're working hard to improve your experience. Thank you for your patience!
            </p>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <Home className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceMode;