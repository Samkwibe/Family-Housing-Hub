// src/components/StatCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  status, 
  trend,
  onClick 
}) {
  const statusColors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    pending: 'bg-orange-50 border-orange-200 text-orange-700'
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border-2 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer ${
        statusColors[status] || statusColors.info
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-white bg-opacity-50">
          <Icon className={`h-6 w-6 ${
            status === 'success' ? 'text-green-600' :
            status === 'warning' ? 'text-yellow-600' :
            status === 'error' ? 'text-red-600' :
            status === 'pending' ? 'text-orange-600' :
            'text-blue-600'
          }`} />
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          status === 'success' ? 'bg-green-100 text-green-800' :
          status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          status === 'error' ? 'bg-red-100 text-red-800' :
          status === 'pending' ? 'bg-orange-100 text-orange-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {status === 'success' ? 'Good' : 
           status === 'warning' ? 'Attention' :
           status === 'error' ? 'Issue' :
           status === 'pending' ? 'Pending' : 'Info'}
        </span>
      </div>
      
      <h3 className="text-2xl font-bold mb-1">{value}</h3>
      <p className="text-lg font-semibold mb-2">{title}</p>
      <p className="text-sm opacity-75 mb-3">{subtitle}</p>
      
      {trend && (
        <div className="flex items-center text-sm">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}