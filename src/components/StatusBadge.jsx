// src/components/StatusBadge.jsx
import React from 'react'

export default function StatusBadge({ status }) {
  const statusConfig = {
    submitted: {
      label: 'Submitted',
      color: 'bg-yellow-100 text-yellow-800'
    },
    'in-progress': {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-800'
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800'
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800'
    }
  }

  const config = statusConfig[status] || statusConfig.submitted

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}