// src/components/NetworkStatus.jsx
import React from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';

const NetworkStatus = ({ message, type = 'warning', onDismiss }) => {
  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <WifiOff className="h-5 w-5" />;
      case 'success':
        return <Wifi className="h-5 w-5" />;
      case 'warning':
      default:
        return <WifiOff className="h-5 w-5" />;
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 border rounded-lg px-4 py-3 flex items-center space-x-3 shadow-lg ${getStyles()}`}>
      {getIcon()}
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 hover:opacity-70 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;