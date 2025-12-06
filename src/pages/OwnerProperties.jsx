// Owner Property Management Page
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userDataService } from '../services/userDataService';
import {
  Building, Plus, Edit, Trash2, Search, MapPin, Home, DollarSign,
  Bed, Bath, Calendar, CheckCircle, X, AlertCircle, Eye, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerProperties() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUsage, setFilterUsage] = useState('all');

  const [propertyForm, setPropertyForm] = useState({
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    },
    usage: 'business', // 'business', 'residence', or 'both'
    type: 'single-family',
    bedrooms: '',
    bathrooms: '',
    monthlyRent: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadProperties();
    }
  }, [currentUser]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const ownerData = await userDataService.getOwnerData(currentUser.uid);
      if (ownerData?.properties) {
        setProperties(ownerData.properties.map((prop, index) => ({
          ...prop,
          id: prop.id || `prop_${index}`
        })));
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!propertyForm.address.street || !propertyForm.address.city) {
        toast.error('Please fill in property address');
        return;
      }

      const propertyData = {
        ...propertyForm,
        bedrooms: parseInt(propertyForm.bedrooms) || 0,
        bathrooms: parseFloat(propertyForm.bathrooms) || 0,
        monthlyRent: parseFloat(propertyForm.monthlyRent) || 0,
        addedAt: editingProperty ? editingProperty.addedAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingProperty) {
        // Update existing property
        const updatedProperties = properties.map(p => 
          p.id === editingProperty.id ? { ...p, ...propertyData } : p
        );
        await userDataService.saveOwnerData(currentUser.uid, {
          properties: updatedProperties
        });
        toast.success('Property updated successfully!');
      } else {
        // Add new property
        const newProperty = {
          ...propertyData,
          id: `prop_${Date.now()}`
        };
        await userDataService.saveOwnerData(currentUser.uid, {
          properties: [...properties, newProperty]
        });
        toast.success('Property added successfully!');
      }

      setShowAddModal(false);
      setEditingProperty(null);
      resetForm();
      loadProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property');
    }
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    try {
      const updatedProperties = properties.filter(p => p.id !== propertyId);
      await userDataService.saveOwnerData(currentUser.uid, {
        properties: updatedProperties
      });
      toast.success('Property deleted successfully!');
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const resetForm = () => {
    setPropertyForm({
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      usage: 'business',
      type: 'single-family',
      bedrooms: '',
      bathrooms: '',
      monthlyRent: '',
      status: 'active',
      notes: ''
    });
  };

  const openEditModal = (property) => {
    setEditingProperty(property);
    setPropertyForm({
      address: property.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA'
      },
      usage: property.usage || 'business',
      type: property.type || 'single-family',
      bedrooms: property.bedrooms?.toString() || '',
      bathrooms: property.bathrooms?.toString() || '',
      monthlyRent: property.monthlyRent?.toString() || '',
      status: property.status || 'active',
      notes: property.notes || ''
    });
    setShowAddModal(true);
  };

  const filteredProperties = properties.filter(property => {
    const address = property.address;
    const fullAddress = `${address?.street || ''} ${address?.city || ''} ${address?.state || ''}`.toLowerCase();
    const matchesSearch = fullAddress.includes(searchTerm.toLowerCase());
    const matchesUsage = filterUsage === 'all' || property.usage === filterUsage;
    return matchesSearch && matchesUsage;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Property Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your property portfolio</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingProperty(null);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Property
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{properties.length}</p>
            </div>
            <Building className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Business</p>
              <p className="text-2xl font-bold text-blue-600">{properties.filter(p => p.usage === 'business').length}</p>
            </div>
            <Home className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Residence</p>
              <p className="text-2xl font-bold text-green-600">{properties.filter(p => p.usage === 'residence').length}</p>
            </div>
            <Home className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${properties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <select
          value={filterUsage}
          onChange={(e) => setFilterUsage(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Properties</option>
          <option value="business">Business Only</option>
          <option value="residence">Residence Only</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Properties Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {properties.length === 0 ? 'Add your first property to get started' : 'No properties match your search'}
          </p>
          {properties.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Add First Property
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map(property => (
            <div key={property.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-5 w-5 text-purple-600" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      property.usage === 'business' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : property.usage === 'residence'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                    }`}>
                      {property.usage || 'business'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {property.address?.street || 'Address'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {property.address?.city}, {property.address?.state} {property.address?.zipCode}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(property)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(property.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Bed className="h-4 w-4" />
                  {property.bedrooms || 0} beds
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Bath className="h-4 w-4" />
                  {property.bathrooms || 0} baths
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <DollarSign className="h-4 w-4" />
                  ${property.monthlyRent || 0}/mo
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4" />
                  {property.status || 'active'}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Type: {property.type || 'single-family'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingProperty ? 'Edit Property' : 'Add New Property'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProperty(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Usage *</label>
                <select
                  required
                  value={propertyForm.usage}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, usage: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="business">Business/Rental</option>
                  <option value="residence">Residence (Where I Live)</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Street Address *</label>
                <input
                  type="text"
                  required
                  value={propertyForm.address.street}
                  onChange={(e) => setPropertyForm(prev => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                  <input
                    type="text"
                    required
                    value={propertyForm.address.city}
                    onChange={(e) => setPropertyForm(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                  <input
                    type="text"
                    value={propertyForm.address.state}
                    onChange={(e) => setPropertyForm(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">ZIP Code</label>
                  <input
                    type="text"
                    value={propertyForm.address.zipCode}
                    onChange={(e) => setPropertyForm(prev => ({
                      ...prev,
                      address: { ...prev.address, zipCode: e.target.value }
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Type</label>
                  <select
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="single-family">Single Family</option>
                    <option value="multi-family">Multi Family</option>
                    <option value="apartment">Apartment</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bedrooms</label>
                  <input
                    type="number"
                    value={propertyForm.bedrooms}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, bedrooms: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bathrooms</label>
                  <input
                    type="number"
                    step="0.5"
                    value={propertyForm.bathrooms}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, bathrooms: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {(propertyForm.usage === 'business' || propertyForm.usage === 'both') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monthly Rent</label>
                  <input
                    type="number"
                    step="0.01"
                    value={propertyForm.monthlyRent}
                    onChange={(e) => setPropertyForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={propertyForm.notes}
                  onChange={(e) => setPropertyForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProperty(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  {editingProperty ? 'Update Property' : 'Add Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


