/**
 * Owner Dashboard - Complete Property & Family Management
 * Full-featured dashboard for property owners with real Firebase integration
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { userDataService } from '../services/userDataService';
import {
    Home, Users, DollarSign, Wrench, FileText, TrendingUp, AlertCircle, CheckCircle,
    Clock, Building, Key, Receipt, Calendar, MessageSquare, Bell, Settings, BarChart3,
    Eye, Plus, ArrowUpRight, ArrowDownRight, Minus, Edit, Trash2, MapPin, Phone,
    Mail, PiggyBank, Heart, ShoppingCart, Shield, Zap, Activity, TrendingDown, Sun, Moon, Monitor, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

export default function OwnerDashboard({ dashboardData }) {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [properties, setProperties] = useState(dashboardData?.properties || []);
    const [tenants, setTenants] = useState([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState([]);
    const [rentPayments, setRentPayments] = useState([]);
    const [messages, setMessages] = useState([]);
    const [children, setChildren] = useState([]);
    const [showAddProperty, setShowAddProperty] = useState(false);
    const [error, setError] = useState(null);

    // Determine property usage from dashboard data or first property
    const propertyUsage = dashboardData?.propertyUsage || properties[0]?.usage || 'business';
    const isBusinessProperty = propertyUsage === 'business' || propertyUsage === 'both';
    const isResidenceProperty = propertyUsage === 'residence' || propertyUsage === 'both';

    // Load all owner data
    useEffect(() => {
        if (currentUser) {
            // If we have onboarding data, use it immediately
            if (dashboardData?.properties && dashboardData.properties.length > 0) {
                setProperties(dashboardData.properties);
                setLoading(false);
            }
            loadDashboardData();
            setupRealtimeListeners();
        }
    }, [currentUser, dashboardData]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Load data with individual error handling - don't fail all if one fails
            await Promise.allSettled([
                loadProperties(),
                loadTenants(),
                loadMaintenanceRequests(),
                loadRentPayments(),
                loadMessages(),
                loadChildren()
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            setError('Some data failed to load, but you can still use the dashboard');
            toast.error('Some data failed to load');
        } finally {
            setLoading(false);
        }
    };

    const loadProperties = async () => {
        try {
            // First, try to get from userDataService (onboarding data)
            const ownerData = await userDataService.getOwnerData(currentUser.uid);
            if (ownerData?.properties && ownerData.properties.length > 0) {
                setProperties(ownerData.properties);
                return;
            }

            // Fallback: Try Firestore collection (if it exists)
            try {
                const q = query(
                    collection(db, 'ownerProperties'),
                    where('ownerId', '==', currentUser.uid),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                const props = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (props.length > 0) {
                    setProperties(props);
                }
            } catch (firestoreError) {
                // Collection might not exist or have index - that's okay
                console.log('Firestore properties collection not available, using onboarding data');
            }
        } catch (error) {
            console.error('Error loading properties:', error);
            // Keep existing properties or empty array
            if (properties.length === 0 && dashboardData?.properties) {
                setProperties(dashboardData.properties);
            }
        }
    };

    const loadTenants = async () => {
        try {
            const q = query(
                collection(db, 'tenants'),
                where('ownerId', '==', currentUser.uid)
            );
            const snapshot = await getDocs(q);
            const tenantList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTenants(tenantList);
        } catch (error) {
            // Collection might not exist - that's okay for new users
            console.log('Tenants collection not available yet');
            setTenants([]);
        }
    };

    const loadMaintenanceRequests = async () => {
        try {
            const q = query(
                collection(db, 'maintenance'),
                where('ownerId', '==', currentUser.uid),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMaintenanceRequests(requests);
        } catch (error) {
            // Collection might not exist or have index - that's okay
            console.log('Maintenance collection not available yet');
            setMaintenanceRequests([]);
        }
    };

    const loadRentPayments = async () => {
        try {
            const q = query(
                collection(db, 'rentPayments'),
                where('ownerId', '==', currentUser.uid),
                orderBy('dueDate', 'desc'),
                limit(20)
            );
            const snapshot = await getDocs(q);
            const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRentPayments(payments);
        } catch (error) {
            // Collection might not exist or have index - that's okay
            console.log('Rent payments collection not available yet');
            setRentPayments([]);
        }
    };

    const loadMessages = async () => {
        try {
            const q = query(
                collection(db, 'messages'),
                where('receiverId', '==', currentUser.uid),
                orderBy('createdAt', 'desc'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        } catch (error) {
            // Collection might not exist or have index - that's okay
            console.log('Messages collection not available yet');
            setMessages([]);
        }
    };

    const loadChildren = async () => {
        try {
            const q = query(
                collection(db, 'children'),
                where('parentId', '==', currentUser.uid)
            );
            const snapshot = await getDocs(q);
            const childList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChildren(childList);
        } catch (error) {
            // Collection might not exist - that's okay
            console.log('Children collection not available yet');
            setChildren([]);
        }
    };

    const setupRealtimeListeners = () => {
        // Listen for new maintenance requests
        const maintenanceQuery = query(
            collection(db, 'maintenance'),
            where('ownerId', '==', currentUser.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(maintenanceQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    toast('New maintenance request received!', { icon: '🔧' });
                }
            });
        });

        return unsubscribe;
    };

    // Calculate smart statistics
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        // Total rent collected this month
        const monthlyRentCollected = rentPayments
            .filter(p => {
                const date = p.paidDate?.toDate() || new Date(p.paidDate);
                return p.status === 'paid' &&
                    date.getMonth() === thisMonth &&
                    date.getFullYear() === thisYear;
            })
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // Expected rent this month
        const expectedRent = properties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0);

        // Pending maintenance
        const pendingMaintenance = maintenanceRequests.filter(r =>
            r.status === 'pending' || r.status === 'submitted'
        ).length;

        // Urgent maintenance
        const urgentMaintenance = maintenanceRequests.filter(r =>
            r.priority === 'urgent' && (r.status === 'pending' || r.status === 'submitted')
        ).length;

        // Occupancy rate
        const occupiedUnits = properties.filter(p => p.status === 'occupied').length;
        const occupancyRate = properties.length > 0
            ? ((occupiedUnits / properties.length) * 100).toFixed(0)
            : 0;

        // Unread messages
        const unreadMessages = messages.filter(m => !m.read).length;

        // Family stats
        const totalChildren = children.length;
        const childrenTasks = 0; // Can be loaded from child tasks if needed

        return {
            totalProperties: properties.length,
            activeTenants: tenants.length,
            monthlyRentCollected,
            expectedRent,
            collectionRate: expectedRent > 0 ? ((monthlyRentCollected / expectedRent) * 100).toFixed(0) : 0,
            pendingMaintenance,
            urgentMaintenance,
            occupancyRate,
            unreadMessages,
            totalChildren,
            childrenTasks
        };
    }, [properties, tenants, maintenanceRequests, rentPayments, messages, children]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    // Show error message if there's an error but still render dashboard
    if (error) {
        toast.error(error);
    }

    return (
        <div className={`p-6 max-w-7xl mx-auto space-y-6 min-h-screen transition-colors duration-200 ${!isDark
                ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50'
                : 'bg-gray-900'
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {propertyUsage === 'business' 
                            ? 'Property Business Dashboard'
                            : propertyUsage === 'residence'
                            ? 'Home Owner Dashboard'
                            : 'Property Management Dashboard'}
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Welcome back, {userProfile?.firstName || 'Owner'}! 
                        {propertyUsage === 'business' 
                            ? ' Here\'s your rental business overview.'
                            : propertyUsage === 'residence'
                            ? ' Here\'s your home management center.'
                            : ' Here\'s your property management overview.'}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddProperty(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
                >
                    <Plus className="h-5 w-5" />
                    Add Property
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        <p className="text-yellow-800 dark:text-yellow-200 text-sm">{error}</p>
                    </div>
                    <button
                        onClick={() => setError(null)}
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Welcome Message for New Users */}
            {properties.length === 0 && !loading && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start space-x-4">
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-xl">
                            <Home className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                Welcome to your {propertyUsage === 'business' ? 'Property Business' : propertyUsage === 'residence' ? 'Home Owner' : 'Property Management'} Dashboard!
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {propertyUsage === 'business' 
                                    ? 'Start by adding your first rental property to track tenants, rent payments, and maintenance requests.'
                                    : propertyUsage === 'residence'
                                    ? 'Manage your home with tools for maintenance tracking, family management, and home expenses.'
                                    : 'Manage both your home and rental properties with comprehensive property management tools.'}
                            </p>
                            <button
                                onClick={() => setShowAddProperty(true)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                            >
                                <Plus className="w-5 h-5 inline mr-2" />
                                Add Your First Property
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={propertyUsage === 'residence' ? 'Home' : 'Properties'}
                    value={stats.totalProperties || (properties.length > 0 ? properties.length : 0)}
                    subtitle={isBusinessProperty ? `${stats.occupancyRate}% occupied` : 'Your property'}
                    icon={Building}
                    gradient="from-purple-500 to-purple-600"
                    trend={stats.totalProperties > 0 ? 'up' : 'neutral'}
                />
                {isBusinessProperty && (
                    <>
                        <StatCard
                            title="Rent Collected"
                            value={`$${stats.monthlyRentCollected.toLocaleString()}`}
                            subtitle={`${stats.collectionRate}% of expected`}
                            icon={DollarSign}
                            gradient="from-green-500 to-green-600"
                            trend={stats.collectionRate >= 80 ? 'up' : stats.collectionRate >= 50 ? 'neutral' : 'down'}
                        />
                        <StatCard
                            title="Active Tenants"
                            value={stats.activeTenants}
                            subtitle={`in ${stats.totalProperties} properties`}
                            icon={Users}
                            gradient="from-blue-500 to-blue-600"
                            trend="neutral"
                        />
                    </>
                )}
                {isResidenceProperty && !isBusinessProperty && (
                    <StatCard
                        title="Family Members"
                        value={children.length || 0}
                        subtitle="Living at home"
                        icon={Users}
                        gradient="from-blue-500 to-blue-600"
                        trend="neutral"
                    />
                )}
                <StatCard
                    title="Maintenance"
                    value={stats.pendingMaintenance}
                    subtitle={stats.urgentMaintenance > 0 ? `${stats.urgentMaintenance} urgent` : 'All handled'}
                    icon={Wrench}
                    gradient={stats.urgentMaintenance > 0 ? 'from-red-500 to-red-600' : 'from-orange-500 to-orange-600'}
                    trend={stats.urgentMaintenance > 0 ? 'down' : 'neutral'}
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction
                    icon={Building}
                    label="Properties"
                    onClick={() => navigate('/owner-dashboard')}
                    color="purple"
                />
                <QuickAction
                    icon={Users}
                    label="Tenants"
                    onClick={() => navigate('/owner-dashboard')}
                    color="blue"
                />
                <QuickAction
                    icon={Wrench}
                    label="Maintenance"
                    onClick={() => navigate('/maintenance')}
                    color="orange"
                    badge={stats.pendingMaintenance}
                />
                <QuickAction
                    icon={PiggyBank}
                    label="Family & Children"
                    onClick={() => navigate('/children')}
                    color="pink"
                    badge={stats.totalChildren}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Properties List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Building className="h-6 w-6 text-purple-600" />
                            My Properties
                        </h2>
                        <button
                            onClick={() => setShowAddProperty(true)}
                            className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                        >
                            + Add New
                        </button>
                    </div>

                    {properties.length === 0 ? (
                        <EmptyState
                            icon={Building}
                            title="No Properties Yet"
                            description="Add your first property to start managing tenants and collecting rent"
                            actionLabel="Add Property"
                            onAction={() => setShowAddProperty(true)}
                        />
                    ) : (
                        <div className="space-y-4">
                            {properties.slice(0, 5).map((property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Activity & Alerts */}
                <div className="space-y-6">
                    {/* Urgent Alerts */}
                    {stats.urgentMaintenance > 0 && (
                        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-red-900 mb-1">Urgent Maintenance!</h3>
                                    <p className="text-sm text-red-700">
                                        {stats.urgentMaintenance} urgent request{stats.urgentMaintenance > 1 ? 's' : ''} need{stats.urgentMaintenance === 1 ? 's' : ''} immediate attention
                                    </p>
                                    <button
                                        onClick={() => navigate('/maintenance')}
                                        className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                                    >
                                        View Now <ArrowUpRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Messages */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            Messages
                            {stats.unreadMessages > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                    {stats.unreadMessages}
                                </span>
                            )}
                        </h2>
                        <div className="space-y-3">
                            {messages.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">No messages</p>
                            ) : (
                                messages.slice(0, 3).map((msg) => (
                                    <div key={msg.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm text-gray-900">{msg.subject || 'Message'}</p>
                                                <p className="text-xs text-gray-600 mt-1 line-clamp-1">{msg.message}</p>
                                            </div>
                                            {!msg.read && (
                                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <button
                                onClick={() => navigate('/messages')}
                                className="w-full text-sm text-blue-600 hover:text-blue-700 font-semibold py-2"
                            >
                                View All Messages
                            </button>
                        </div>
                    </div>

                    {/* Family Quick Stats */}
                    {stats.totalChildren > 0 && (
                        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl border border-pink-200 p-6">
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Heart className="h-5 w-5 text-pink-600" />
                                Family
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Children:</span>
                                    <span className="font-semibold text-gray-900">{stats.totalChildren}</span>
                                </div>
                                <button
                                    onClick={() => navigate('/children')}
                                    className="w-full mt-3 bg-white border border-pink-200 text-pink-600 py-2 rounded-lg font-medium hover:bg-pink-50 transition-colors"
                                >
                                    Manage Children
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Maintenance Requests */}
            {maintenanceRequests.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Wrench className="h-6 w-6 text-orange-600" />
                            Maintenance Requests
                        </h2>
                        <button
                            onClick={() => navigate('/maintenance')}
                            className="text-sm text-orange-600 hover:text-orange-700 font-semibold"
                        >
                            View All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {maintenanceRequests.slice(0, 6).map((request) => (
                            <MaintenanceCard key={request.id} request={request} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, gradient, trend }) {
    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">{value}</h3>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center gap-1">
                    {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                    {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                    {trend === 'neutral' && <Minus className="h-4 w-4 text-gray-400" />}
                    <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' :
                        trend === 'down' ? 'text-red-600' :
                            'text-gray-500'
                        }`}>
                        {trend === 'up' ? 'Good' : trend === 'down' ? 'Needs Attention' : 'Stable'}
                    </span>
                </div>
            )}
        </div>
    );
}

// Quick Action Component
function QuickAction({ icon: Icon, label, onClick, color, badge }) {
    const colorClasses = {
        purple: 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200',
        blue: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200',
        orange: 'bg-orange-50 text-orange-600 hover:bg-orange-100 border-orange-200',
        pink: 'bg-pink-50 text-pink-600 hover:bg-pink-100 border-pink-200'
    };

    return (
        <button
            onClick={onClick}
            className={`relative p-4 rounded-xl border-2 ${colorClasses[color]} transition-all hover:scale-105`}
        >
            <Icon className="h-6 w-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">{label}</p>
            {badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                    {badge}
                </span>
            )}
        </button>
    );
}

// Property Card Component
function PropertyCard({ property }) {
    return (
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{property.address || property.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{property.city}, {property.state}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            {property.bedrooms || 0} bed
                        </span>
                        <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${property.monthlyRent || 0}/mo
                        </span>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${property.status === 'occupied' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {property.status || 'Available'}
                </div>
            </div>
        </div>
    );
}

// Maintenance Card Component
function MaintenanceCard({ request }) {
    return (
        <div className={`p-4 rounded-xl border-2 ${request.priority === 'urgent' ? 'bg-red-50 border-red-200' :
            request.priority === 'high' ? 'bg-orange-50 border-orange-200' :
                'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900 text-sm">{request.title}</h4>
                <Wrench className={`h-4 w-4 ${request.priority === 'urgent' ? 'text-red-600' :
                    request.priority === 'high' ? 'text-orange-600' :
                        'text-gray-600'
                    }`} />
            </div>
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{request.description}</p>
            <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-1 rounded-full font-medium ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                    {request.status}
                </span>
                <span className="text-gray-500">
                    {request.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                </span>
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
    return (
        <div className="text-center py-12">
            <Icon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
            <button
                onClick={onAction}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all inline-flex items-center gap-2"
            >
                <Plus className="h-4 w-4" />
                {actionLabel}
            </button>
        </div>
    );
}
