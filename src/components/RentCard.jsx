// src/components/RentCard.jsx
import React, { useState } from 'react';
import { DollarSign, Calendar, Clock, CheckCircle, AlertTriangle, Eye, Receipt } from 'lucide-react';

export default function RentCard({ 
  amount = 1200, 
  dueDate = '2024-03-01', 
  status = 'pending',
  paidDate = null,
  lateFee = 0,
  onClick = () => {} 
}) {
  const [showDetails, setShowDetails] = useState(false);

  const statusConfig = {
    paid: {
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50 border-green-200',
      badgeColor: 'bg-green-100 text-green-800',
      label: 'Paid'
    },
    pending: {
      icon: Clock,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      badgeColor: 'bg-orange-100 text-orange-800',
      label: 'Pending'
    },
    overdue: {
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50 border-red-200',
      badgeColor: 'bg-red-100 text-red-800',
      label: 'Overdue'
    }
  };

  const StatusIcon = statusConfig[status].icon;
  const dueDateObj = new Date(dueDate);
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDateObj - today) / (1000 * 60 * 60 * 24));
  
  const getDueText = () => {
    if (status === 'paid') {
      return `Paid on ${paidDate ? new Date(paidDate).toLocaleDateString() : 'N/A'}`;
    }
    
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    if (daysUntilDue > 1) return `Due in ${daysUntilDue} days`;
    if (daysUntilDue < 0) return `Overdue by ${Math.abs(daysUntilDue)} days`;
    
    return `Due ${dueDateObj.toLocaleDateString()}`;
  };

  const getDueColor = () => {
    if (status === 'paid') return 'text-green-600';
    if (status === 'overdue') return 'text-red-600';
    if (daysUntilDue <= 3) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div 
      className={`card border-2 cursor-pointer transition-all hover:shadow-lg ${
        statusConfig[status].color
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-white bg-opacity-50">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Rent Payment</h3>
            <p className="text-sm text-gray-600">Monthly rent</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[status].badgeColor}`}>
          {statusConfig[status].label}
        </span>
      </div>

      {/* Amount and Due Date */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">${amount}</p>
          <p className={`text-sm font-medium ${getDueColor()}`}>
            {getDueText()}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-1 text-gray-600 mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {dueDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <StatusIcon className="h-6 w-6 ml-auto" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {status === 'pending' && (
          <button className="flex-1 bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center space-x-1">
            <DollarSign className="h-4 w-4" />
            <span>Pay Now</span>
          </button>
        )}
        
        {status === 'paid' && (
          <button className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors flex items-center justify-center space-x-1">
            <Receipt className="h-4 w-4" />
            <span>View Receipt</span>
          </button>
        )}
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
        >
          <Eye className="h-4 w-4" />
          <span>Details</span>
        </button>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Due Date:</span>
            <span className="font-medium">{dueDateObj.toLocaleDateString()}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium capitalize">{status}</span>
          </div>
          
          {lateFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Late Fee:</span>
              <span className="font-medium text-red-600">${lateFee}</span>
            </div>
          )}
          
          {paidDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Date:</span>
              <span className="font-medium">{new Date(paidDate).toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Payment Method:</span>
            <span className="font-medium">Credit Card ****4242</span>
          </div>
        </div>
      )}

      {/* Progress bar for pending payments */}
      {status === 'pending' && daysUntilDue <= 7 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Time until due</span>
            <span>{Math.max(0, daysUntilDue)} days left</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                daysUntilDue <= 1 ? 'bg-red-500' :
                daysUntilDue <= 3 ? 'bg-orange-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${Math.max(0, Math.min(100, (1 - (daysUntilDue / 30)) * 100))}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}