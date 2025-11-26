// src/pages/FamilyHealth.jsx - Family Health Records Management
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { healthService, appointmentsService } from '../services/firebaseService';
import {
  Heart,
  Plus,
  Calendar,
  Pill,
  AlertTriangle,
  Syringe,
  FileText,
  User,
  Users,
  Edit3,
  Trash2,
  X,
  Check,
  Clock,
  Activity,
  Stethoscope,
  ThermometerSun,
  ShieldCheck,
  Bell,
  ChevronRight,
  Filter,
  Search,
  Baby,
  UserCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FamilyHealth() {
  const { currentUser, userProfile } = useAuth();
  const [healthRecords, setHealthRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Get family members (including user)
  const familyMembers = useMemo(() => {
    const members = [
      {
        id: 'self',
        name: `${userProfile?.firstName || 'You'} ${userProfile?.lastName || ''}`.trim() || 'You',
        role: 'self',
        isUser: true
      }
    ];
    
    if (userProfile?.familyMembers) {
      userProfile.familyMembers.forEach(member => {
        members.push({
          id: member.id,
          name: member.name,
          role: member.relationship,
          age: member.age
        });
      });
    }
    
    return members;
  }, [userProfile]);

  // Record types
  const recordTypes = [
    { id: 'condition', label: 'Condition', icon: Activity, color: 'text-blue-600 bg-blue-100' },
    { id: 'allergy', label: 'Allergy', icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
    { id: 'medication', label: 'Medication', icon: Pill, color: 'text-purple-600 bg-purple-100' },
    { id: 'vaccine', label: 'Vaccine', icon: Syringe, color: 'text-green-600 bg-green-100' },
    { id: 'note', label: 'Note', icon: FileText, color: 'text-gray-600 bg-gray-100' }
  ];

  // Appointment types
  const appointmentTypes = [
    { id: 'checkup', label: 'Check-up', icon: Stethoscope },
    { id: 'dental', label: 'Dental', icon: Activity },
    { id: 'vaccine', label: 'Vaccination', icon: Syringe },
    { id: 'specialist', label: 'Specialist', icon: UserCircle },
    { id: 'therapy', label: 'Therapy', icon: Heart },
    { id: 'other', label: 'Other', icon: Calendar }
  ];

  // Record form
  const [recordForm, setRecordForm] = useState({
    memberId: '',
    memberName: '',
    type: 'condition',
    title: '',
    description: '',
    severity: 'normal',
    startDate: '',
    isActive: true,
    notes: ''
  });

  // Appointment form
  const [appointmentForm, setAppointmentForm] = useState({
    memberId: '',
    memberName: '',
    title: '',
    type: 'checkup',
    doctorName: '',
    location: '',
    dateTime: '',
    duration: 30,
    notes: '',
    reminder: true
  });

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [records, appts] = await Promise.all([
        healthService.getFamilyHealthRecords(currentUser.uid),
        appointmentsService.getAppointments(currentUser.uid)
      ]);
      setHealthRecords(records);
      setAppointments(appts);
    } catch (error) {
      console.error('Error loading health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    let records = healthRecords;
    
    if (selectedMember) {
      records = records.filter(r => r.memberId === selectedMember);
    }
    
    if (filterType !== 'all') {
      records = records.filter(r => r.type === filterType);
    }
    
    return records;
  }, [healthRecords, selectedMember, filterType]);

  // Get upcoming appointments
  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(a => new Date(a.dateTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      .slice(0, 5);
  }, [appointments]);

  // Stats
  const stats = useMemo(() => {
    const allergies = healthRecords.filter(r => r.type === 'allergy' && r.isActive).length;
    const conditions = healthRecords.filter(r => r.type === 'condition' && r.isActive).length;
    const medications = healthRecords.filter(r => r.type === 'medication' && r.isActive).length;
    const vaccines = healthRecords.filter(r => r.type === 'vaccine').length;
    
    return { allergies, conditions, medications, vaccines };
  }, [healthRecords]);

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format datetime
  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Handle add record
  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!recordForm.memberId || !recordForm.title) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      const member = familyMembers.find(m => m.id === recordForm.memberId);
      const data = {
        ...recordForm,
        memberName: member?.name || 'Unknown'
      };

      if (editingRecord) {
        await healthService.updateHealthRecord(editingRecord.id, currentUser.uid, data);
        toast.success('Record updated!');
      } else {
        await healthService.addHealthRecord(currentUser.uid, data);
        toast.success('Health record added!');
      }
      
      await loadData();
      setShowAddRecord(false);
      setEditingRecord(null);
      resetRecordForm();
    } catch (error) {
      toast.error('Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add appointment
  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!appointmentForm.memberId || !appointmentForm.title || !appointmentForm.dateTime) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      const member = familyMembers.find(m => m.id === appointmentForm.memberId);
      const data = {
        ...appointmentForm,
        memberName: member?.name || 'Unknown'
      };

      if (editingAppointment) {
        await appointmentsService.updateAppointment(editingAppointment.id, currentUser.uid, data);
        toast.success('Appointment updated!');
      } else {
        await appointmentsService.createAppointment(currentUser.uid, data);
        toast.success('Appointment scheduled!');
      }
      
      await loadData();
      setShowAddAppointment(false);
      setEditingAppointment(null);
      resetAppointmentForm();
    } catch (error) {
      toast.error('Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete record
  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      await healthService.deleteHealthRecord(recordId, currentUser.uid);
      await loadData();
      toast.success('Record deleted');
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;

    try {
      await appointmentsService.deleteAppointment(appointmentId, currentUser.uid);
      await loadData();
      toast.success('Appointment deleted');
    } catch (error) {
      toast.error('Failed to delete appointment');
    }
  };

  // Reset forms
  const resetRecordForm = () => {
    setRecordForm({
      memberId: '',
      memberName: '',
      type: 'condition',
      title: '',
      description: '',
      severity: 'normal',
      startDate: '',
      isActive: true,
      notes: ''
    });
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      memberId: '',
      memberName: '',
      title: '',
      type: 'checkup',
      doctorName: '',
      location: '',
      dateTime: '',
      duration: 30,
      notes: '',
      reminder: true
    });
  };

  // Edit record
  const openEditRecord = (record) => {
    setRecordForm({
      memberId: record.memberId,
      memberName: record.memberName,
      type: record.type,
      title: record.title,
      description: record.description || '',
      severity: record.severity || 'normal',
      startDate: record.startDate ? new Date(record.startDate).toISOString().split('T')[0] : '',
      isActive: record.isActive !== false,
      notes: record.notes || ''
    });
    setEditingRecord(record);
    setShowAddRecord(true);
  };

  // Edit appointment
  const openEditAppointment = (appointment) => {
    setAppointmentForm({
      memberId: appointment.memberId,
      memberName: appointment.memberName,
      title: appointment.title,
      type: appointment.type || 'checkup',
      doctorName: appointment.doctorName || '',
      location: appointment.location || '',
      dateTime: appointment.dateTime ? new Date(appointment.dateTime).toISOString().slice(0, 16) : '',
      duration: appointment.duration || 30,
      notes: appointment.notes || '',
      reminder: appointment.reminder !== false
    });
    setEditingAppointment(appointment);
    setShowAddAppointment(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-100 to-pink-100 rounded-xl">
              <Heart className="h-8 w-8 text-red-600" />
            </div>
            Family Health
          </h1>
          <p className="text-gray-600 mt-1">Track health records, medications, and appointments for your family</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              resetAppointmentForm();
              setEditingAppointment(null);
              setShowAddAppointment(true);
            }}
            className="bg-white border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-5 w-5" />
            <span>Schedule</span>
          </button>
          <button
            onClick={() => {
              resetRecordForm();
              setEditingRecord(null);
              setShowAddRecord(true);
            }}
            className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-red-700 hover:to-pink-700 transition-all shadow-lg shadow-red-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Allergies</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.allergies}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Conditions</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.conditions}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Medications</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.medications}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Pill className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Vaccines</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.vaccines}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Syringe className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments Alert */}
      {upcomingAppointments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-800">Upcoming Appointments</p>
                <p className="text-sm text-blue-600">
                  Next: {upcomingAppointments[0].title} - {formatDateTime(upcomingAppointments[0].dateTime)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('appointments')}
              className="text-blue-600 font-medium hover:text-blue-700 flex items-center"
            >
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Family Members Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Family Members</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              <button
                onClick={() => setSelectedMember(null)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                  !selectedMember ? 'bg-red-50 border-l-4 border-red-600' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-pink-400 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">All Members</p>
                  <p className="text-sm text-gray-500">{healthRecords.length} records</p>
                </div>
              </button>

              {familyMembers.map((member) => {
                const memberRecords = healthRecords.filter(r => r.memberId === member.id);
                
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                      selectedMember === member.id ? 'bg-red-50 border-l-4 border-red-600' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500 capitalize">
                        {member.role} • {memberRecords.length} records
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            {[
              { id: 'overview', label: 'All Records', icon: FileText },
              { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
              { id: 'conditions', label: 'Conditions', icon: Activity },
              { id: 'medications', label: 'Medications', icon: Pill },
              { id: 'vaccines', label: 'Vaccines', icon: Syringe },
              { id: 'appointments', label: 'Appointments', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFilterType(tab.id === 'overview' ? 'all' : 
                    tab.id === 'appointments' ? 'all' : 
                    tab.id === 'allergies' ? 'allergy' :
                    tab.id === 'conditions' ? 'condition' :
                    tab.id === 'medications' ? 'medication' :
                    tab.id === 'vaccines' ? 'vaccine' : 'all');
                }}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'appointments' ? (
            /* Appointments View */
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Scheduled Appointments</h3>
              </div>

              <div className="divide-y divide-gray-100">
                {appointments.length > 0 ? (
                  appointments.map((appointment) => {
                    const appointmentType = appointmentTypes.find(t => t.id === appointment.type) || appointmentTypes[5];
                    const AppointmentIcon = appointmentType.icon;
                    const isPast = new Date(appointment.dateTime) < new Date();

                    return (
                      <div key={appointment.id} className={`p-4 ${isPast ? 'bg-gray-50' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${isPast ? 'bg-gray-200' : 'bg-blue-100'}`}>
                              <AppointmentIcon className={`h-5 w-5 ${isPast ? 'text-gray-500' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{appointment.title}</h4>
                              <p className="text-sm text-gray-500">{appointment.memberName}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {formatDateTime(appointment.dateTime)}
                                </span>
                                {appointment.location && (
                                  <span>{appointment.location}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditAppointment(appointment)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteAppointment(appointment.id)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No appointments scheduled</p>
                    <button
                      onClick={() => setShowAddAppointment(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                    >
                      Schedule Appointment
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Health Records View */
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  {activeTab === 'overview' ? 'All Health Records' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
                </h3>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((record) => {
                    const recordType = recordTypes.find(t => t.id === record.type) || recordTypes[4];
                    const RecordIcon = recordType.icon;

                    return (
                      <div key={record.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${recordType.color}`}>
                              <RecordIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{record.title}</h4>
                                {record.severity === 'severe' && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Severe</span>
                                )}
                                {!record.isActive && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{record.memberName}</p>
                              {record.description && (
                                <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                <span className="capitalize">{record.type}</span>
                                {record.startDate && (
                                  <span>Since: {formatDate(record.startDate)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditRecord(record)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No health records found</p>
                    <button
                      onClick={() => setShowAddRecord(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700"
                    >
                      Add Health Record
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Record Modal */}
      {showAddRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingRecord ? 'Edit Health Record' : 'Add Health Record'}
                </h2>
                <button
                  onClick={() => { setShowAddRecord(false); setEditingRecord(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddRecord} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Family Member *</label>
                <select
                  required
                  value={recordForm.memberId}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, memberId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                >
                  <option value="">Select member...</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Record Type *</label>
                <div className="grid grid-cols-5 gap-2">
                  {recordTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setRecordForm(prev => ({ ...prev, type: type.id }))}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                        recordForm.type === type.id
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`h-5 w-5 ${recordForm.type === type.id ? 'text-red-600' : 'text-gray-500'}`} />
                      <span className="text-xs mt-1">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={recordForm.title}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="e.g., Peanut Allergy, Asthma, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={recordForm.description}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Additional details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <select
                    value={recordForm.severity}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  >
                    <option value="mild">Mild</option>
                    <option value="normal">Normal</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={recordForm.startDate}
                    onChange={(e) => setRecordForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={recordForm.isActive}
                  onChange={(e) => setRecordForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">Currently active</label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddRecord(false); setEditingRecord(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-3 rounded-xl font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingRecord ? 'Update' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingAppointment ? 'Edit Appointment' : 'Schedule Appointment'}
                </h2>
                <button
                  onClick={() => { setShowAddAppointment(false); setEditingAppointment(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddAppointment} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Family Member *</label>
                <select
                  required
                  value={appointmentForm.memberId}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, memberId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select member...</option>
                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Title *</label>
                <input
                  type="text"
                  required
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Annual Check-up"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={appointmentForm.type}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {appointmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={appointmentForm.dateTime}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, dateTime: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name</label>
                  <input
                    type="text"
                    value={appointmentForm.doctorName}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, doctorName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dr. Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={appointmentForm.location}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City Hospital"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Any preparation notes..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="reminder"
                  checked={appointmentForm.reminder}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, reminder: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="reminder" className="text-sm text-gray-700">Send reminder notification</label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddAppointment(false); setEditingAppointment(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingAppointment ? 'Update' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

