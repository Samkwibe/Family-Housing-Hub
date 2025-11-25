// src/components/MaintenanceRequestCard.jsx
import React from 'react'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'
import StatusBadge from './StatusBadge'

export default function MaintenanceRequestCard({ request }) {
  const priorityIcons = {
    urgent: AlertTriangle,
    high: Clock,
    medium: Clock,
    low: Calendar
  }

  const PriorityIcon = priorityIcons[request.priority] || Calendar

  const priorityColors = {
    urgent: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-blue-600 bg-blue-50 border-blue-200'
  }

  return (
    <div className={`card border-2 ${priorityColors[request.priority]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            request.priority === 'urgent' ? 'bg-red-100' :
            request.priority === 'high' ? 'bg-orange-100' :
            request.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
          }`}>
            <PriorityIcon className={`h-5 w-5 ${
              request.priority === 'urgent' ? 'text-red-600' :
              request.priority === 'high' ? 'text-orange-600' :
              request.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{request.title}</h3>
            <p className="text-sm text-gray-600 capitalize">{request.priority} priority</p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-2">{request.description}</p>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{request.createdAt.toLocaleDateString()}</span>
        <span className="capitalize">{request.category}</span>
      </div>
    </div>
  )
}