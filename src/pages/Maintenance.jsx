// src/pages/Maintenance.jsx
import React, { useState } from 'react'
import { useFamily } from '../contexts/FamilyContext'
import { Plus, Search, Filter } from 'lucide-react'
import MaintenanceRequestCard from '../components/MaintenanceRequestCard'
import NewRequestModal from '../components/NewRequestModal'

export default function Maintenance() {
  const { maintenanceRequests, submitMaintenanceRequest } = useFamily()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredRequests = maintenanceRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = statusFilter === 'all' || request.status === statusFilter
    return matchesSearch && matchesFilter
  })

  const handleNewRequest = async (requestData) => {
    await submitMaintenanceRequest(requestData)
    setIsModalOpen(false)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-gray-600">Track and manage repair requests</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Request</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRequests.map((request) => (
          <MaintenanceRequestCard key={request.id} request={request} />
        ))}
      </div>

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Get started by creating your first maintenance request'
            }
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Create First Request
            </button>
          )}
        </div>
      )}

      {/* New Request Modal */}
      <NewRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNewRequest}
      />
    </div>
  )
}