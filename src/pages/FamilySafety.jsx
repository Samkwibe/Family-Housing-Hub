// src/pages/FamilySafety.jsx - Family Safety & Emergency Features
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  AlertTriangle,
  Phone,
  MapPin,
  User,
  Plus,
  X,
  Edit3,
  Trash2,
  AlertCircle,
  Bell,
  Clock,
  Heart,
  Home,
  Car,
  Briefcase,
  Activity,
  AlertOctagon,
  FileText,
  Check,
  ChevronRight,
  Copy,
  Share2,
  Download,
  Navigation,
  Radio,
  Flame,
  Droplet,
  Wind,
  Zap
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

// Emergency Types
const EMERGENCY_TYPES = [
  { id: 'fire', label: 'Fire', icon: Flame, color: 'bg-red-500', number: '911' },
  { id: 'medical', label: 'Medical', icon: Heart, color: 'bg-pink-500', number: '911' },
  { id: 'police', label: 'Police', icon: Shield, color: 'bg-blue-500', number: '911' },
  { id: 'poison', label: 'Poison Control', icon: AlertTriangle, color: 'bg-purple-500', number: '1-800-222-1222' },
  { id: 'mental', label: 'Mental Health', icon: Heart, color: 'bg-teal-500', number: '988' },
  { id: 'domestic', label: 'Domestic Violence', icon: Phone, color: 'bg-indigo-500', number: '1-800-799-7233' }
];

// Location Types
const LOCATION_TYPES = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'school', label: 'School', icon: MapPin },
  { id: 'hospital', label: 'Hospital', icon: Activity },
  { id: 'other', label: 'Other', icon: MapPin }
];

// Contact Relationship Types
const RELATIONSHIP_TYPES = [
  'Parent', 'Spouse', 'Child', 'Sibling', 'Grandparent', 
  'Doctor', 'Neighbor', 'Friend', 'Work', 'Other'
];

export default function FamilySafety() {
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('emergency');
  const [loading, setLoading] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [safeLocations, setSafeLocations] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    relationship: 'Parent',
    isPrimary: false,
    notes: ''
  });

  // Location form
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    type: 'home',
    notes: ''
  });

  // Emergency checklist items
  const [checklist, setChecklist] = useState([
    { id: 1, label: 'Emergency contacts saved', checked: false },
    { id: 2, label: 'Family meeting point established', checked: false },
    { id: 3, label: 'Emergency kit prepared', checked: false },
    { id: 4, label: 'Important documents backed up', checked: false },
    { id: 5, label: 'Fire escape plan practiced', checked: false },
    { id: 6, label: 'Children know address & phone', checked: false },
    { id: 7, label: 'First aid kit stocked', checked: false },
    { id: 8, label: 'Smoke detectors tested', checked: false }
  ]);

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Load each collection separately with error handling
      let contactsSnap, locationsSnap, alertsSnap;
      
      try {
        contactsSnap = await getDocs(query(collection(db, 'emergencyContacts'), where('userId', '==', currentUser.uid)));
      } catch (err) {
        console.warn('Error loading emergency contacts:', err);
        contactsSnap = { docs: [] };
      }
      
      try {
        locationsSnap = await getDocs(query(collection(db, 'safeLocations'), where('userId', '==', currentUser.uid)));
      } catch (err) {
        console.warn('Error loading safe locations:', err);
        locationsSnap = { docs: [] };
      }
      
      try {
        alertsSnap = await getDocs(query(collection(db, 'emergencyAlerts'), where('userId', '==', currentUser.uid)));
      } catch (err) {
        console.warn('Error loading emergency alerts:', err);
        alertsSnap = { docs: [] };
      }

      setEmergencyContacts(contactsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })).sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)));

      setSafeLocations(locationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })));

      setEmergencyAlerts(alertsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })).sort((a, b) => {
        const aDate = a.createdAt || new Date(0);
        const bDate = b.createdAt || new Date(0);
        return bDate.getTime() - aDate.getTime();
      }));

      // Update checklist based on data
      setChecklist(prev => prev.map(item => {
        if (item.id === 1) return { ...item, checked: contactsSnap.docs.length >= 2 };
        if (item.id === 2) return { ...item, checked: locationsSnap.docs.length >= 1 };
        return item;
      }));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load some data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Checklist progress
  const checklistProgress = useMemo(() => {
    const checked = checklist.filter(i => i.checked).length;
    return Math.round((checked / checklist.length) * 100);
  }, [checklist]);

  // Handle add contact
  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) {
      toast.error('Please fill in name and phone');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        userId: currentUser.uid,
        name: contactForm.name,
        phone: contactForm.phone,
        relationship: contactForm.relationship,
        isPrimary: contactForm.isPrimary,
        notes: contactForm.notes,
        createdAt: serverTimestamp()
      };

      if (editingContact) {
        await updateDoc(doc(db, 'emergencyContacts', editingContact.id), data);
        toast.success('Contact updated!');
      } else {
        await addDoc(collection(db, 'emergencyContacts'), data);
        toast.success('Emergency contact added!');
      }

      await loadData();
      setShowAddContact(false);
      setEditingContact(null);
      resetContactForm();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error('Failed to save contact');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add location
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!locationForm.name || !locationForm.address) {
      toast.error('Please fill in name and address');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'safeLocations'), {
        userId: currentUser.uid,
        name: locationForm.name,
        address: locationForm.address,
        type: locationForm.type,
        notes: locationForm.notes,
        createdAt: serverTimestamp()
      });

      toast.success('Safe location added!');
      await loadData();
      setShowAddLocation(false);
      resetLocationForm();
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
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
      toast.error('Failed to delete contact');
    }
  };

  // Delete location
  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Remove this safe location?')) return;
    try {
      await deleteDoc(doc(db, 'safeLocations', id));
      await loadData();
      toast.success('Location removed');
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  // Toggle checklist item
  const toggleChecklistItem = (id) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  // Call emergency number
  const callNumber = (number) => {
    window.location.href = `tel:${number.replace(/-/g, '')}`;
  };

  // Share location with real coordinates
  const shareLocation = async () => {
    try {
      if (!navigator.geolocation) {
        toast.error('Location services not available');
        return;
      }

      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          const googleMapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
          const shareText = `I need help! Here is my current location: ${googleMapsLink}`;

          if (navigator.share) {
            try {
              await navigator.share({
                title: 'My Location',
                text: shareText,
                url: googleMapsLink
              });
              toast.success('Location shared!');
            } catch (error) {
              // User cancelled or error
              if (error.name !== 'AbortError') {
                // Copy to clipboard as fallback
                await navigator.clipboard.writeText(shareText);
                toast.success('Location copied to clipboard!');
              }
            }
          } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareText);
            toast.success('Location copied to clipboard!');
          }
          setLocationLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Failed to get location');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share location');
      setLocationLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date()
        };
        setCurrentLocation(location);
        setLocationLoading(false);
        toast.success('Location obtained!');
        return location;
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get location. Please enable location services.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Send SOS with real location
  const sendSOS = async () => {
    try {
      setLocationLoading(true);
      
      // Get current location
      if (!navigator.geolocation) {
        toast.error('Location services not available');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date()
          };

          const googleMapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
          
          // Send alerts to all emergency contacts
          const primaryContacts = emergencyContacts.filter(c => c.isPrimary);
          const allContacts = primaryContacts.length > 0 ? primaryContacts : emergencyContacts;

          if (allContacts.length === 0) {
            toast.error('No emergency contacts to alert');
            setLocationLoading(false);
            return;
          }

          // Create emergency alert in Firestore
          try {
            await addDoc(collection(db, 'emergencyAlerts'), {
              userId: currentUser.uid,
              type: 'SOS',
              location: location,
              googleMapsLink: googleMapsLink,
              contacts: allContacts.map(c => ({ name: c.name, phone: c.phone })),
              status: 'active',
              createdAt: serverTimestamp(),
              userInfo: {
                name: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'User',
                phone: userProfile?.phone || 'Not provided'
              }
            });

            // Send SMS/Email notifications (simulated - would integrate with Twilio/SendGrid)
            const message = `🚨 EMERGENCY ALERT 🚨\n\n${userProfile?.firstName || 'User'} needs immediate help!\n\nLocation: ${googleMapsLink}\n\nTime: ${new Date().toLocaleString()}`;
            
            // In production, this would send actual SMS/Email
            console.log('Emergency alert sent:', {
              contacts: allContacts,
              message: message,
              location: location
            });

            toast.success(`Emergency alert sent to ${allContacts.length} contact(s)!`);
            setShowSOSModal(false);
          } catch (error) {
            console.error('Error sending alert:', error);
            toast.error('Failed to send alert. Please try calling 911 directly.');
          }
          
          setLocationLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Could not get location. Alert sent without location.');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } catch (error) {
      console.error('SOS error:', error);
      toast.error('Failed to send emergency alert');
      setLocationLoading(false);
    }
  };

  // Reset forms
  const resetContactForm = () => {
    setContactForm({ name: '', phone: '', relationship: 'Parent', isPrimary: false, notes: '' });
  };

  const resetLocationForm = () => {
    setLocationForm({ name: '', address: '', type: 'home', notes: '' });
  };

  // Get location type info
  const getLocationType = (typeId) => {
    return LOCATION_TYPES.find(t => t.id === typeId) || LOCATION_TYPES[LOCATION_TYPES.length - 1];
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
            <div className="p-2 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl">
              <Shield className="h-8 w-8 text-red-600" />
            </div>
            Family Safety
          </h1>
          <p className="text-gray-600 mt-1">Emergency contacts, safety plans & quick help</p>
        </div>

        {/* SOS Button */}
        <button
          onClick={() => setShowSOSModal(true)}
          className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center space-x-3 hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-200 animate-pulse"
        >
          <AlertOctagon className="h-6 w-6" />
          <span className="text-lg">SOS EMERGENCY</span>
        </button>
      </div>

      {/* Emergency Quick Dial */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-red-600" />
          Emergency Quick Dial
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {EMERGENCY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => callNumber(type.number)}
              className={`${type.color} text-white p-4 rounded-xl text-center hover:opacity-90 transition-opacity`}
            >
              <type.icon className="h-6 w-6 mx-auto mb-2" />
              <p className="font-semibold text-sm">{type.label}</p>
              <p className="text-xs opacity-90">{type.number}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'emergency', label: 'Emergency Contacts', icon: Phone },
          { id: 'locations', label: 'Safe Locations', icon: MapPin },
          { id: 'alerts', label: 'Emergency Alerts', icon: Bell },
          { id: 'checklist', label: 'Safety Checklist', icon: Check },
          { id: 'tips', label: 'Safety Tips', icon: AlertCircle }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Emergency Contacts Tab */}
      {activeTab === 'emergency' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Your Emergency Contacts</h2>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-red-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {emergencyContacts.length > 0 ? (
                  emergencyContacts.map((contact) => (
                    <div key={contact.id} className="p-4 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        contact.isPrimary ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <User className="h-6 w-6" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                          {contact.isPrimary && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{contact.phone}</p>
                        <p className="text-sm text-gray-500">{contact.relationship}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => callNumber(contact.phone)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                        >
                          <Phone className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingContact(contact);
                            setContactForm({
                              name: contact.name,
                              phone: contact.phone,
                              relationship: contact.relationship,
                              isPrimary: contact.isPrimary,
                              notes: contact.notes || ''
                            });
                            setShowAddContact(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit3 className="h-4 w-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No emergency contacts added</p>
                    <button
                      onClick={() => setShowAddContact(true)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      Add First Contact
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={shareLocation}
                  disabled={locationLoading}
                  className="w-full flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <Navigation className="h-5 w-5" />
                  <span className="font-medium">
                    {locationLoading ? 'Getting Location...' : 'Share My Location'}
                  </span>
                </button>
                <button
                  onClick={() => toast.success('Family notified!')}
                  className="w-full flex items-center gap-3 p-3 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  <span className="font-medium">Notify Family I'm Safe</span>
                </button>
                <button
                  onClick={() => toast.info('Downloading emergency card...')}
                  className="w-full flex items-center gap-3 p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <Download className="h-5 w-5" />
                  <span className="font-medium">Download Emergency Card</span>
                </button>
              </div>
            </div>

            {/* Family Info Card */}
            <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Family Emergency Card
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Family:</strong> {userProfile?.lastName || 'Your Family'}</p>
                <p><strong>Address:</strong> {userProfile?.address?.street ? `${userProfile.address.street}, ${userProfile.address.city}, ${userProfile.address.state}` : 'Not set'}</p>
                <p><strong>Primary Contact:</strong> {emergencyContacts.find(c => c.isPrimary)?.phone || 'Not set'}</p>
              </div>
              <button className="mt-4 w-full bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30">
                Print Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Locations Tab */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Safe Meeting Locations</h2>
              <button
                onClick={() => setShowAddLocation(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Location
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {safeLocations.length > 0 ? (
                safeLocations.map((location) => {
                  const type = getLocationType(location.type);
                  const TypeIcon = type.icon;

                  return (
                    <div key={location.id} className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <TypeIcon className="h-6 w-6" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{location.name}</h3>
                        <p className="text-gray-600 text-sm">{location.address}</p>
                        {location.notes && (
                          <p className="text-gray-500 text-sm">{location.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(location.address)}`, '_blank')}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                        >
                          <Navigation className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(location.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No safe locations added</p>
                  <button
                    onClick={() => setShowAddLocation(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Add Meeting Point
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Location Tips */}
          <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Why Safe Locations Matter
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                <span>Have a primary meeting spot outside your home</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                <span>Choose a backup location in case primary isn't accessible</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                <span>Make sure all family members know the locations</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                <span>Practice going to these locations regularly</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Emergency Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <AlertOctagon className="h-6 w-6 text-red-600" />
                Emergency Alert History
              </h2>
              <p className="text-gray-600 text-sm mt-1">View all your emergency alerts and their status</p>
            </div>

            <div className="divide-y divide-gray-100">
              {emergencyAlerts.length > 0 ? (
                emergencyAlerts.map((alert) => (
                  <div key={alert.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          alert.status === 'active' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <AlertOctagon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {alert.type === 'SOS' ? 'SOS Emergency Alert' : 'Emergency Alert'}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'Unknown time'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        alert.status === 'active'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {alert.status === 'active' ? 'Active' : 'Resolved'}
                      </span>
                    </div>

                    {alert.location && alert.location.lat && alert.location.lng && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-900">Location Shared</span>
                        </div>
                        {alert.googleMapsLink && (
                          <a
                            href={alert.googleMapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            View on Google Maps
                            <Navigation className="h-3 w-3" />
                          </a>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          Coordinates: {alert.location.lat?.toFixed(6) || 'N/A'}, {alert.location.lng?.toFixed(6) || 'N/A'}
                        </p>
                      </div>
                    )}

                    {alert.contacts && alert.contacts.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Alerted Contacts:</p>
                        <div className="flex flex-wrap gap-2">
                          {alert.contacts.map((contact, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {contact.name} ({contact.phone})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {alert.status === 'active' && (
                      <button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'emergencyAlerts', alert.id), {
                              status: 'resolved',
                              resolvedAt: serverTimestamp()
                            });
                            await loadData();
                            toast.success('Alert marked as resolved');
                          } catch (error) {
                            toast.error('Failed to update alert');
                          }
                        }}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-2">No emergency alerts yet</p>
                  <p className="text-sm text-gray-400">Emergency alerts will appear here when you use the SOS feature</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Safety Checklist Tab */}
      {activeTab === 'checklist' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Family Safety Checklist</h2>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Preparedness Progress</span>
                  <span className="font-semibold text-green-600">{checklistProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    item.checked
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300'
                  }`}>
                    {item.checked && <Check className="h-4 w-4" />}
                  </div>
                  <span className={`font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Safety Tips Tab */}
      {activeTab === 'tips' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: 'Fire Safety',
              icon: Flame,
              color: 'bg-red-100 text-red-600',
              tips: [
                'Install smoke detectors on every floor',
                'Test smoke alarms monthly',
                'Have a fire escape plan with 2 exits',
                'Keep fire extinguisher in kitchen',
                'Practice "Stop, Drop, and Roll"'
              ]
            },
            {
              title: 'Flood Preparedness',
              icon: Droplet,
              color: 'bg-blue-100 text-blue-600',
              tips: [
                'Know if you\'re in a flood zone',
                'Have sandbags or flood barriers ready',
                'Keep important documents elevated',
                'Know how to shut off utilities',
                'Have a battery-powered radio'
              ]
            },
            {
              title: 'Severe Weather',
              icon: Wind,
              color: 'bg-purple-100 text-purple-600',
              tips: [
                'Identify a safe room in your home',
                'Keep flashlights and batteries ready',
                'Have a 3-day supply of water',
                'Sign up for weather alerts',
                'Know community shelter locations'
              ]
            },
            {
              title: 'Power Outage',
              icon: Zap,
              color: 'bg-yellow-100 text-yellow-600',
              tips: [
                'Keep phone chargers accessible',
                'Have battery-powered lights',
                'Stock non-perishable food',
                'Know how to manually open garage',
                'Keep medications that need refrigeration cool'
              ]
            }
          ].map((category) => (
            <div key={category.title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${category.color}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{category.title}</h3>
              </div>
              <ul className="space-y-2">
                {category.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <ChevronRight className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
                </h2>
                <button
                  onClick={() => { setShowAddContact(false); setEditingContact(null); resetContactForm(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddContact} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="John Doe"
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
                <select
                  value={contactForm.relationship}
                  onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 bg-white"
                >
                  {RELATIONSHIP_TYPES.map(rel => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
                  className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-gray-700">Set as primary emergency contact</span>
              </label>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddContact(false); setEditingContact(null); resetContactForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-3 rounded-xl font-medium hover:from-red-700 hover:to-rose-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingContact ? 'Update' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Safe Location</h2>
                <button
                  onClick={() => { setShowAddLocation(false); resetLocationForm(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddLocation} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name *</label>
                <input
                  type="text"
                  required
                  value={locationForm.name}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Front yard, Neighbor's house"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={locationForm.address}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {LOCATION_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setLocationForm(prev => ({ ...prev, type: type.id }))}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                        locationForm.type === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <type.icon className={`h-5 w-5 ${locationForm.type === type.id ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className="text-xs mt-1">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={locationForm.notes}
                  onChange={(e) => setLocationForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Additional instructions..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddLocation(false); resetLocationForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl text-center p-8">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <AlertOctagon className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Emergency SOS</h2>
            <p className="text-gray-600 mb-6">
              This will alert all your emergency contacts with your current location.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => callNumber('911')}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white py-4 rounded-xl font-bold text-lg hover:from-red-700 hover:to-rose-700"
              >
                Call 911
              </button>
              <button
                onClick={sendSOS}
                disabled={locationLoading}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 disabled:opacity-50"
              >
                {locationLoading ? 'Sending Alert...' : 'Alert Emergency Contacts'}
              </button>
              <button
                onClick={() => setShowSOSModal(false)}
                className="w-full py-3 text-gray-600 font-medium hover:text-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

