// src/pages/Maintenance.jsx - Enhanced Maintenance Request Management
import React, { useState, useMemo } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Filter,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Camera,
  X,
  ChevronDown,
  MessageCircle,
  Phone,
  User,
  ArrowRight,
  Zap,
  Home,
  Droplet,
  Thermometer,
  Lightbulb,
  Lock,
  Bug,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

export default function Maintenance() {
  const { maintenanceRequests = [], submitMaintenanceRequest, loading } = useFamily();
  const { isDark } = useTheme();
  const { userProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'normal',
    location: 'general',
    images: []
  });

  // Categories
  const categories = [
    { id: 'plumbing', label: 'Plumbing', icon: Droplet, color: 'text-blue-600 bg-blue-100' },
    { id: 'electrical', label: 'Electrical', icon: Lightbulb, color: 'text-yellow-600 bg-yellow-100' },
    { id: 'hvac', label: 'HVAC', icon: Thermometer, color: 'text-red-600 bg-red-100' },
    { id: 'appliance', label: 'Appliances', icon: Settings, color: 'text-purple-600 bg-purple-100' },
    { id: 'lock', label: 'Locks/Security', icon: Lock, color: 'text-gray-600 bg-gray-100 dark:bg-gray-700' },
    { id: 'pest', label: 'Pest Control', icon: Bug, color: 'text-green-600 bg-green-100' },
    { id: 'general', label: 'General', icon: Wrench, color: 'text-orange-600 bg-orange-100' }
  ];

  // Locations
  const locations = [
    'Kitchen', 'Living Room', 'Bedroom', 'Bathroom', 'Laundry', 'Garage', 'Exterior', 'General'
  ];

  // Filter requests
  const filteredRequests = useMemo(() => {
    return maintenanceRequests.filter(request => {
      const matchesSearch = request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [maintenanceRequests, searchTerm, statusFilter, priorityFilter]);

  // Stats
  const stats = useMemo(() => {
    const submitted = maintenanceRequests.filter(r => r.status === 'submitted').length;
    const inProgress = maintenanceRequests.filter(r => r.status === 'in-progress').length;
    const completed = maintenanceRequests.filter(r => r.status === 'completed').length;
    const urgent = maintenanceRequests.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;
    return { submitted, inProgress, completed, urgent, total: maintenanceRequests.length };
  }, [maintenanceRequests]);

  // Status config
  const getStatusConfig = (status) => {
    const configs = {
      submitted: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: Wrench },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800', icon: XCircle }
    };
    return configs[status] || configs.submitted;
  };

  // Priority config
  const getPriorityConfig = (priority) => {
    const configs = {
      low: { label: 'Low', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
      normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
      high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
      urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' }
    };
    return configs[priority] || configs.normal;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await submitMaintenanceRequest(formData);
      setFormData({
        title: '',
        description: '',
        category: 'general',
        priority: 'normal',
        location: 'general',
        images: []
      });
      setIsModalOpen(false);
      toast.success('Maintenance request submitted!');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Maintenance Requests</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage repair requests for your home</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="h-5 w-5" />
          <span>New Request</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Submitted</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.submitted}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Urgent</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.urgent}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Alert */}
      {stats.urgent > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">
            You have <span className="font-semibold">{stats.urgent} urgent request(s)</span> that need attention.
          </p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {loading?.maintenance ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRequests.map((request) => {
            const statusConfig = getStatusConfig(request.status);
            const priorityConfig = getPriorityConfig(request.priority);
            const category = categories.find(c => c.id === request.category) || categories[categories.length - 1];
            const CategoryIcon = category.icon;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={request.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border-2 p-5 hover:shadow-lg transition-all cursor-pointer group ${
                  request.priority === 'urgent' ? 'border-red-200' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedRequest(request)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${category.color}`}>
                    <CategoryIcon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityConfig.color}`}>
                      {priorityConfig.label}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusConfig.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                  {request.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                  {request.description}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{request.location || 'General'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(request.createdAt)}</span>
                  </div>
                </div>

                {/* Scheduled Date */}
                {request.scheduledDate && request.status === 'in-progress' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center space-x-2 text-blue-700 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Scheduled: {formatDate(request.scheduledDate)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
              ? 'No matching requests' 
              : 'No maintenance requests'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Submit your first maintenance request when you need something fixed'}
          </p>
          {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Submit First Request</span>
            </button>
          )}
        </div>
      )}

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Maintenance Request</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of the issue"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.slice(0, 4).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1 ${
                        formData.category === cat.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <cat.icon className={`h-5 w-5 ${
                        formData.category === cat.id ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
                      }`} />
                      <span className={`text-xs font-medium ${
                        formData.category === cat.id ? 'text-blue-700' : 'text-gray-600'
                      }`}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'normal', 'high', 'urgent'].map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority }))}
                      className={`py-2.5 rounded-xl border-2 transition-all capitalize text-sm font-medium ${
                        formData.priority === priority
                          ? priority === 'urgent' ? 'border-red-500 bg-red-50 text-red-700' :
                            priority === 'high' ? 'border-orange-500 bg-orange-50 text-orange-700' :
                            priority === 'normal' ? 'border-blue-500 bg-blue-50 text-blue-700' :
                            'border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc.toLowerCase()}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                  placeholder="Please provide details about the issue..."
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photos (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload photos</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB each</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 space-y-6">
              {/* Status & Priority */}
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getStatusConfig(selectedRequest.status).color}`}>
                  {getStatusConfig(selectedRequest.status).label}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getPriorityConfig(selectedRequest.priority).color}`}>
                  {getPriorityConfig(selectedRequest.priority).label} Priority
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedRequest.title}</h3>
                <p className="text-gray-600">{selectedRequest.description}</p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Category</p>
                  <p className="font-medium capitalize">{selectedRequest.category || 'General'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Location</p>
                  <p className="font-medium capitalize">{selectedRequest.location || 'General'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Submitted</p>
                  <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                {selectedRequest.scheduledDate && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600 mb-1">Scheduled</p>
                    <p className="font-medium text-blue-800">{formatDate(selectedRequest.scheduledDate)}</p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {selectedRequest.notes && selectedRequest.notes.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Updates</h4>
                  <div className="space-y-3">
                    {selectedRequest.notes.map((note, index) => (
                      <div key={index} className="flex space-x-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                        <div>
                          <p className="text-sm text-gray-600">{note.text}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatDate(note.date)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
