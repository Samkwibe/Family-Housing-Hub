// src/components/NewRequestModal.jsx
import React, { useState } from 'react'
import { X, Wrench, Home, Zap, Thermometer } from 'lucide-react'

export default function NewRequestModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general'
  })

  const categories = [
    { value: 'plumbing', label: 'Plumbing', icon: Wrench },
    { value: 'electrical', label: 'Electrical', icon: Zap },
    { value: 'appliance', label: 'Appliance', icon: Home },
    { value: 'heating', label: 'Heating/Cooling', icon: Thermometer },
    { value: 'general', label: 'General Repair', icon: Wrench }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'general'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">New Maintenance Request</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.category === category.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-6 w-6 mb-2 text-gray-600" />
                    <p className="font-medium text-gray-900">{category.label}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Description
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Please provide detailed information about the issue..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-3">
              {['low', 'medium', 'high', 'urgent'].map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority }))}
                  className={`p-3 border-2 rounded-xl text-center capitalize transition-all ${
                    formData.priority === priority
                      ? priority === 'urgent'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : priority === 'high'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : priority === 'medium'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}