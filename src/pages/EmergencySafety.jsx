// src/pages/EmergencySafety.jsx - Emergency & Safety Center
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Phone,
  AlertTriangle,
  Siren,
  Heart,
  Flame,
  Car,
  User,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Star,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  FileText,
  Home,
  Pill,
  Baby,
  Stethoscope,
  Building,
  PhoneCall,
  Copy,
  Check,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Quick dial emergency services
const EMERGENCY_SERVICES = [
  { id: 'emergency', number: '911', label: 'Emergency', icon: Siren, color: 'bg-red-600', description: 'Police, Fire, Medical Emergency' },
  { id: 'police', number: '911', label: 'Police', icon: Shield, color: 'bg-blue-600', description: 'Non-emergency: Check local' },
  { id: 'fire', number: '911', label: 'Fire Dept', icon: Flame, color: 'bg-orange-600', description: 'Fire & Rescue Services' },
  { id: 'poison', number: '1-800-222-1222', label: 'Poison Control', icon: Pill, color: 'bg-purple-600', description: '24/7 Poison Help Line' },
  { id: 'suicide', number: '988', label: 'Crisis Line', icon: Heart, color: 'bg-pink-600', description: 'Suicide & Crisis Lifeline' },
  { id: 'domestic', number: '1-800-799-7233', label: 'Domestic Violence', icon: Home, color: 'bg-teal-600', description: 'National DV Hotline' }
];

// Contact categories
const CONTACT_CATEGORIES = [
  { id: 'family', label: 'Family', icon: User, color: 'text-blue-600 bg-blue-100' },
  { id: 'medical', label: 'Medical', icon: Stethoscope, color: 'text-red-600 bg-red-100' },
  { id: 'neighbor', label: 'Neighbor', icon: Building, color: 'text-green-600 bg-green-100' },
  { id: 'work', label: 'Work', icon: Building, color: 'text-purple-600 bg-purple-100' },
  { id: 'other', label: 'Other', icon: Star, color: 'text-gray-600 bg-gray-100' }
];

// Safety checklist items
const SAFETY_CHECKLIST = [
  { id: 'smoke-detector', label: 'Smoke detectors tested', category: 'home' },
  { id: 'co-detector', label: 'CO detectors tested', category: 'home' },
  { id: 'fire-extinguisher', label: 'Fire extinguisher accessible', category: 'home' },
  { id: 'first-aid', label: 'First aid kit stocked', category: 'medical' },
  { id: 'medications', label: 'Medications up to date', category: 'medical' },
  { id: 'emergency-kit', label: 'Emergency kit prepared', category: 'preparedness' },
  { id: 'escape-plan', label: 'Family knows escape plan', category: 'preparedness' },
  { id: 'meeting-place', label: 'Emergency meeting place set', category: 'preparedness' },
  { id: 'documents', label: 'Important docs backed up', category: 'documents' },
  { id: 'contacts', label: 'Emergency contacts updated', category: 'contacts' }
];

export default function EmergencySafety() {
  const { currentUser, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(null);
  const [showSOSModal, setShowSOSModal] = useState(false);

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    relationship: '',
    category: 'family',
    isPrimary: false,
    notes: ''
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
      // Load emergency contacts
      const contactsSnap = await getDocs(
        query(collection(db, 'emergencyContacts'), where('userId', '==', currentUser.uid))
      );
      setContacts(contactsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)));

      // Load checklist
      const checklistSnap = await getDocs(
        query(collection(db, 'safetyChecklist'), where('userId', '==', currentUser.uid))
      );
      const checklistData = {};
      checklistSnap.docs.forEach(doc => {
        const data = doc.data();
        checklistData[data.itemId] = { id: doc.id, checked: data.checked, lastChecked: data.lastChecked?.toDate() };
      });
      setChecklist(checklistData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle add/edit contact
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        userId: currentUser.uid,
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim(),
        relationship: contactForm.relationship.trim(),
        category: contactForm.category,
        isPrimary: contactForm.isPrimary,
        notes: contactForm.notes,
        updatedAt: serverTimestamp()
      };

      if (editingContact) {
        await updateDoc(doc(db, 'emergencyContacts', editingContact.id), data);
        toast.success('Contact updated!');
      } else {
        await addDoc(collection(db, 'emergencyContacts'), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast.success('Contact added!');
      }

      await loadData();
      closeContactModal();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (id) => {
    if (!window.confirm('Remove this emergency contact?')) return;

    try {
      await deleteDoc(doc(db, 'emergencyContacts', id));
      await loadData();
      toast.success('Contact removed');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  // Toggle checklist item
  const toggleChecklistItem = async (itemId) => {
    try {
      const existing = checklist[itemId];
      const newChecked = !existing?.checked;

      if (existing?.id) {
        await updateDoc(doc(db, 'safetyChecklist', existing.id), {
          checked: newChecked,
          lastChecked: newChecked ? serverTimestamp() : null
        });
      } else {
        await addDoc(collection(db, 'safetyChecklist'), {
          userId: currentUser.uid,
          itemId,
          checked: newChecked,
          lastChecked: newChecked ? serverTimestamp() : null,
          createdAt: serverTimestamp()
        });
      }

      await loadData();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  // Copy phone number
  const copyNumber = (number) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    setTimeout(() => setCopiedNumber(null), 2000);
    toast.success('Number copied!');
  };

  // Call number
  const callNumber = (number) => {
    window.location.href = `tel:${number.replace(/\D/g, '')}`;
  };

  // Close modal
  const closeContactModal = () => {
    setShowAddContact(false);
    setEditingContact(null);
    setContactForm({
      name: '',
      phone: '',
      relationship: '',
      category: 'family',
      isPrimary: false,
      notes: ''
    });
  };

  // Open edit
  const openEditContact = (contact) => {
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship || '',
      category: contact.category || 'family',
      isPrimary: contact.isPrimary || false,
      notes: contact.notes || ''
    });
    setEditingContact(contact);
    setShowAddContact(true);
  };

  // Get category info
  const getCategoryInfo = (catId) => {
    return CONTACT_CATEGORIES.find(c => c.id === catId) || CONTACT_CATEGORIES[CONTACT_CATEGORIES.length - 1];
  };

  // Checklist progress
  const checklistProgress = SAFETY_CHECKLIST.filter(item => checklist[item.id]?.checked).length;
  const checklistTotal = SAFETY_CHECKLIST.length;
  const checklistPercent = Math.round((checklistProgress / checklistTotal) * 100);

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
            <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            Emergency & Safety
          </h1>
          <p className="text-gray-600 mt-1">Quick access to emergency services & family safety</p>
        </div>
        <button
          onClick={() => setShowAddContact(true)}
          className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-red-700 hover:to-orange-700 transition-all shadow-lg shadow-red-200"
        >
          <Plus className="h-5 w-5" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* SOS Banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-red-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl animate-pulse">
              <Siren className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Emergency SOS</h2>
              <p className="text-red-100">Tap to call 911 or alert emergency contacts</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => callNumber('911')}
              className="bg-white text-red-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Phone className="h-6 w-6" />
              Call 911
            </button>
            <button
              onClick={() => setShowSOSModal(true)}
              className="bg-red-800/50 text-white px-6 py-4 rounded-xl font-semibold hover:bg-red-800/70 transition-colors flex items-center gap-2"
            >
              <Bell className="h-5 w-5" />
              Alert Contacts
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Dial Services */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-5 w-5 text-red-600" />
                Emergency Services
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
              {EMERGENCY_SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <button
                    key={service.id}
                    onClick={() => callNumber(service.number)}
                    className="group relative p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 transition-all hover:shadow-lg"
                  >
                    <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{service.label}</h3>
                    <p className="text-lg font-bold text-red-600">{service.number}</p>
                    <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyNumber(service.number); }}
                      className="absolute top-3 right-3 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition-all"
                    >
                      {copiedNumber === service.number ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </button>
                );
              })}
            </div>
          </div>

          {/* My Emergency Contacts */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                My Emergency Contacts
              </h2>
            </div>
            {contacts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {contacts.map((contact) => {
                  const category = getCategoryInfo(contact.category);
                  const CategoryIcon = category.icon;
                  return (
                    <div key={contact.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                      <div className={`p-3 rounded-xl ${category.color}`}>
                        <CategoryIcon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                          {contact.isPrimary && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium flex items-center gap-1">
                              <Star className="h-3 w-3" /> Primary
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{contact.phone}</p>
                        {contact.relationship && (
                          <p className="text-sm text-gray-500">{contact.relationship}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => callNumber(contact.phone)}
                          className="p-2.5 bg-green-100 hover:bg-green-200 rounded-xl transition-colors"
                        >
                          <Phone className="h-5 w-5 text-green-600" />
                        </button>
                        <button
                          onClick={() => openEditContact(contact)}
                          className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <Edit3 className="h-5 w-5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-2.5 hover:bg-red-100 rounded-xl transition-colors"
                        >
                          <Trash2 className="h-5 w-5 text-gray-500 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No emergency contacts added yet</p>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                >
                  Add First Contact
                </button>
              </div>
            )}
          </div>

          {/* Medical Info */}
          <div className="bg-gradient-to-r from-pink-50 to-red-50 border border-pink-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                <Heart className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Medical Information</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Keep your medical info updated in case of emergency. First responders can access this.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Blood Type:</span>
                    <span className="ml-2 font-medium text-gray-900">{userProfile?.bloodType || 'Not set'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Allergies:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {userProfile?.allergies?.length > 0 ? userProfile.allergies.join(', ') : 'None listed'}
                    </span>
                  </div>
                </div>
                <button className="mt-4 text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                  <Edit3 className="h-4 w-4" />
                  Update Medical Info
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Checklist */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Safety Checklist
              </h2>
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{checklistProgress} / {checklistTotal}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      checklistPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {SAFETY_CHECKLIST.map((item) => {
                const isChecked = checklist[item.id]?.checked;
                const lastChecked = checklist[item.id]?.lastChecked;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 text-left"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isChecked
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}>
                      {isChecked && <Check className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {item.label}
                      </p>
                      {lastChecked && (
                        <p className="text-xs text-gray-400">
                          Last checked: {lastChecked.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Safety Tips</span>
            </div>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Keep emergency numbers visible at home
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Teach children how to dial 911
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Practice fire drills every 6 months
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Keep a flashlight by each bed
              </li>
            </ul>
          </div>

          {/* Address Quick Copy */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Your Address</span>
            </div>
            <p className="text-gray-600 text-sm mb-3">
              {userProfile?.address?.street || 'Address not set'}<br />
              {userProfile?.address?.city && `${userProfile.address.city}, `}
              {userProfile?.address?.state} {userProfile?.address?.zipCode}
            </p>
            <button
              onClick={() => {
                const address = `${userProfile?.address?.street || ''}, ${userProfile?.address?.city || ''}, ${userProfile?.address?.state || ''} ${userProfile?.address?.zipCode || ''}`;
                navigator.clipboard.writeText(address);
                toast.success('Address copied!');
              }}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <Copy className="h-4 w-4" />
              Copy address
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </h2>
                <button
                  onClick={closeContactModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveContact} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Contact name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={contactForm.phone}
                  onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                <input
                  type="text"
                  value={contactForm.relationship}
                  onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Spouse, Parent, Friend..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CONTACT_CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setContactForm(prev => ({ ...prev, category: cat.id }))}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          contactForm.category === cat.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${contactForm.category === cat.id ? 'text-red-600' : 'text-gray-500'}`} />
                        <span className="text-xs font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  className="w-5 h-5 rounded text-yellow-600 focus:ring-yellow-500"
                />
                <div>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Primary Contact
                  </span>
                  <p className="text-xs text-gray-500">Will be contacted first in emergencies</p>
                </div>
              </label>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeContactModal}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-3 rounded-xl font-medium hover:from-red-700 hover:to-orange-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingContact ? 'Update' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOS Alert Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <AlertTriangle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Emergency Alert?</h2>
              <p className="text-gray-600 mb-6">
                This will notify all your emergency contacts with your location and a distress message.
              </p>
              
              {contacts.length > 0 ? (
                <>
                  <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm font-medium text-gray-700 mb-2">Alert will be sent to:</p>
                    <ul className="space-y-1">
                      {contacts.slice(0, 3).map(contact => (
                        <li key={contact.id} className="text-sm text-gray-600 flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {contact.name} ({contact.phone})
                        </li>
                      ))}
                      {contacts.length > 3 && (
                        <li className="text-sm text-gray-400">+{contacts.length - 3} more</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSOSModal(false)}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        toast.success('Emergency alert sent to all contacts!');
                        setShowSOSModal(false);
                      }}
                      className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-red-700"
                    >
                      Send Alert
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <p className="text-sm text-yellow-800">
                      You haven't added any emergency contacts yet. Add contacts to enable this feature.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSOSModal(false);
                      setShowAddContact(true);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700"
                  >
                    Add Emergency Contact
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
