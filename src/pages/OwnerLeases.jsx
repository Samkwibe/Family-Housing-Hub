// Owner Lease Management Page
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { userDataService } from '../services/userDataService';
import {
  FileText, Plus, Edit, Trash2, Search, Calendar, DollarSign, User,
  Building, CheckCircle, X, AlertCircle, Filter, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OwnerLeases() {
  const { currentUser } = useAuth();
  const [leases, setLeases] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [leaseForm, setLeaseForm] = useState({
    tenantId: '',
    propertyId: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    securityDeposit: '',
    status: 'active',
    terms: '',
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load properties
      const ownerData = await userDataService.getOwnerData(currentUser.uid);
      if (ownerData?.properties) {
        setProperties(ownerData.properties);
      }

      // Load tenants
      const tenantsQuery = query(
        collection(db, 'tenants'),
        where('ownerId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(tenantsQuery);
      const tenantsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTenants(tenantsList);

      // Load leases
      const leasesQuery = query(
        collection(db, 'leases'),
        where('ownerId', '==', currentUser.uid)
      );
      const leasesSnapshot = await getDocs(leasesQuery);
      const leasesList = leasesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeases(leasesList);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load leases');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const leaseData = {
        ...leaseForm,
        ownerId: currentUser.uid,
        monthlyRent: parseFloat(leaseForm.monthlyRent) || 0,
        securityDeposit: parseFloat(leaseForm.securityDeposit) || 0,
        createdAt: editingLease ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingLease) {
        await updateDoc(doc(db, 'leases', editingLease.id), leaseData);
        toast.success('Lease updated successfully!');
      } else {
        await addDoc(collection(db, 'leases'), leaseData);
        toast.success('Lease created successfully!');
      }

      setShowAddModal(false);
      setEditingLease(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving lease:', error);
      toast.error('Failed to save lease');
    }
  };

  const handleDelete = async (leaseId) => {
    if (!window.confirm('Are you sure you want to delete this lease?')) return;

    try {
      await deleteDoc(doc(db, 'leases', leaseId));
      toast.success('Lease deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting lease:', error);
      toast.error('Failed to delete lease');
    }
  };

  const resetForm = () => {
    setLeaseForm({
      tenantId: '',
      propertyId: '',
      startDate: '',
      endDate: '',
      monthlyRent: '',
      securityDeposit: '',
      status: 'active',
      terms: '',
      notes: ''
    });
  };

  const openEditModal = (lease) => {
    setEditingLease(lease);
    setLeaseForm({
      tenantId: lease.tenantId || '',
      propertyId: lease.propertyId || '',
      startDate: lease.startDate || '',
      endDate: lease.endDate || '',
      monthlyRent: lease.monthlyRent?.toString() || '',
      securityDeposit: lease.securityDeposit?.toString() || '',
      status: lease.status || 'active',
      terms: lease.terms || '',
      notes: lease.notes || ''
    });
    setShowAddModal(true);
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? tenant.fullName || `${tenant.firstName} ${tenant.lastName}` : 'Unknown';
  };

  const getPropertyName = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property) return 'Unknown Property';
    return `${property.address?.street || ''}, ${property.address?.city || ''}`.trim() || 'Property';
  };

  const getDaysUntilExpiry = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredLeases = leases.filter(lease => {
    const tenantName = getTenantName(lease.tenantId).toLowerCase();
    const propertyName = getPropertyName(lease.propertyId).toLowerCase();
    return tenantName.includes(searchTerm.toLowerCase()) || propertyName.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lease Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage lease agreements and terms</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingLease(null);
            setShowAddModal(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all"
        >
          <Plus className="h-5 w-5" />
          Create Lease
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Leases</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{leases.length}</p>
            </div>
            <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{leases.filter(l => l.status === 'active').length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
              <p className="text-2xl font-bold text-orange-600">
                {leases.filter(l => {
                  const days = getDaysUntilExpiry(l.endDate);
                  return days !== null && days > 0 && days <= 30;
                }).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Income</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${leases.filter(l => l.status === 'active').reduce((sum, l) => sum + (l.monthlyRent || 0), 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search leases by tenant or property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Leases List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredLeases.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leases Found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {leases.length === 0 ? 'Create your first lease agreement' : 'No leases match your search'}
            </p>
            {leases.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Create First Lease
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLeases.map(lease => {
              const daysUntilExpiry = getDaysUntilExpiry(lease.endDate);
              return (
                <div key={lease.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {getTenantName(lease.tenantId)}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          lease.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {lease.status || 'active'}
                        </span>
                        {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                            Expires in {daysUntilExpiry} days
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Building className="h-4 w-4" />
                          {getPropertyName(lease.propertyId)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <DollarSign className="h-4 w-4" />
                          ${lease.monthlyRent || 0}/mo
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {lease.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {lease.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(lease)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lease.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingLease ? 'Edit Lease' : 'Create New Lease'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLease(null);
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tenant *</label>
                <select
                  required
                  value={leaseForm.tenantId}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, tenantId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Tenant</option>
                  {tenants.map(tenant => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.fullName || `${tenant.firstName} ${tenant.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property *</label>
                <select
                  required
                  value={leaseForm.propertyId}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select Property</option>
                  {properties.map(prop => (
                    <option key={prop.id || prop.address?.street} value={prop.id || prop.address?.street}>
                      {prop.address?.street || 'Property'} - {prop.address?.city || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaseForm.startDate}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaseForm.endDate}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Monthly Rent *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={leaseForm.monthlyRent}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, monthlyRent: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Security Deposit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={leaseForm.securityDeposit}
                    onChange={(e) => setLeaseForm(prev => ({ ...prev, securityDeposit: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={leaseForm.status}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Terms & Conditions</label>
                <textarea
                  value={leaseForm.terms}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, terms: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter lease terms and conditions..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={leaseForm.notes}
                  onChange={(e) => setLeaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLease(null);
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
                  {editingLease ? 'Update Lease' : 'Create Lease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


