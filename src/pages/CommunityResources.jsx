// src/pages/CommunityResources.jsx - Location-Based Community Resources
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Heart,
    MapPin,
    Phone,
    Globe,
    Clock,
    Search,
    Filter,
    ExternalLink,
    ChevronRight,
    Home,
    Utensils,
    Activity,
    BookOpen,
    Users,
    DollarSign,
    User,
    Scale,
    AlertTriangle,
    Shield,
    Briefcase,
    Building,
    Lightbulb,
    Star,
    CheckCircle,
    X,
    Navigation,
    Loader
} from 'lucide-react';

// Resource categories
const CATEGORIES = [
    { id: 'all', label: 'All Resources', icon: Star },
    { id: 'food', label: 'Food Assistance', icon: Utensils },
    { id: 'health', label: 'Healthcare', icon: Activity },
    { id: 'housing', label: 'Housing Help', icon: Home },
    { id: 'financial', label: 'Financial Aid', icon: DollarSign },
    { id: 'childcare', label: 'Childcare', icon: User },
    { id: 'legal', label: 'Legal Aid', icon: Scale },
    { id: 'education', label: 'Education', icon: BookOpen },
    { id: 'mental', label: 'Mental Health', icon: Heart },
    { id: 'employment', label: 'Employment', icon: Briefcase }
];

// State-specific resources database
const STATE_RESOURCES = {
    // Default national resources (shown when no state detected)
    national: [
        {
            id: 'n1',
            name: 'SNAP Benefits (Food Stamps)',
            category: 'food',
            description: 'Government program providing monthly food assistance to eligible families.',
            phone: '1-800-221-5689',
            website: 'https://www.fns.usda.gov/snap',
            eligibility: 'Based on income and household size',
            featured: true,
            national: true
        },
        {
            id: 'n2',
            name: 'Medicaid / CHIP',
            category: 'health',
            description: 'Free or low-cost health coverage for eligible families and children.',
            phone: '1-800-318-2596',
            website: 'https://www.healthcare.gov/medicaid-chip/',
            eligibility: 'Based on income and family size',
            featured: true,
            national: true
        },
        {
            id: 'n3',
            name: 'HUD Housing Assistance',
            category: 'housing',
            description: 'Section 8 vouchers, public housing, and rental assistance programs.',
            phone: '1-800-955-2232',
            website: 'https://www.hud.gov/topics/rental_assistance',
            eligibility: 'Low-income families, seniors, disabled',
            featured: true,
            national: true
        },
        {
            id: 'n4',
            name: 'LIHEAP (Utility Assistance)',
            category: 'financial',
            description: 'Help paying heating and cooling bills for low-income households.',
            phone: '1-866-674-6327',
            website: 'https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap',
            eligibility: 'Low-income households',
            featured: true,
            national: true
        },
        {
            id: 'n5',
            name: '211 Helpline',
            category: 'all',
            description: 'Connect to local services for food, housing, jobs, health care and more.',
            phone: '211',
            website: 'https://www.211.org',
            eligibility: 'Everyone',
            featured: true,
            national: true
        }
    ],

    // California
    CA: [
        {
            id: 'ca1',
            name: 'CalFresh (California SNAP)',
            category: 'food',
            description: 'California\'s food assistance program providing monthly benefits.',
            phone: '1-877-847-3663',
            website: 'https://www.getcalfresh.org',
            eligibility: 'California residents meeting income requirements',
            featured: true,
            state: 'CA'
        },
        {
            id: 'ca2',
            name: 'Medi-Cal',
            category: 'health',
            description: 'California\'s Medicaid program offering free or low-cost healthcare.',
            phone: '1-800-541-5555',
            website: 'https://www.medi-cal.ca.gov',
            eligibility: 'California residents meeting income requirements',
            featured: true,
            state: 'CA'
        },
        {
            id: 'ca3',
            name: 'California Housing Finance Agency',
            category: 'housing',
            description: 'Down payment assistance and affordable housing programs.',
            phone: '1-916-326-8800',
            website: 'https://www.calhfa.ca.gov',
            eligibility: 'First-time homebuyers, low-income families',
            state: 'CA'
        },
        {
            id: 'ca4',
            name: 'California Food Banks',
            category: 'food',
            description: 'Network of food banks across California providing free food.',
            website: 'https://www.cafoodbanks.org/find-food',
            eligibility: 'All California residents in need',
            state: 'CA'
        }
    ],

    // Texas
    TX: [
        {
            id: 'tx1',
            name: 'Texas SNAP Benefits',
            category: 'food',
            description: 'Texas food assistance program for eligible families.',
            phone: '1-877-541-7905',
            website: 'https://www.yourtexasbenefits.com',
            eligibility: 'Texas residents meeting income requirements',
            featured: true,
            state: 'TX'
        },
        {
            id: 'tx2',
            name: 'Texas Medicaid & CHIP',
            category: 'health',
            description: 'Healthcare coverage for eligible Texas families and children.',
            phone: '1-800-252-8263',
            website: 'https://www.hhs.texas.gov/services/health/medicaid-chip',
            eligibility: 'Texas residents meeting requirements',
            featured: true,
            state: 'TX'
        },
        {
            id: 'tx3',
            name: 'Texas Rent Relief',
            category: 'housing',
            description: 'Emergency rental assistance for Texas tenants.',
            website: 'https://texasrentrelief.com',
            eligibility: 'Texas tenants affected by financial hardship',
            state: 'TX'
        }
    ],

    // New York
    NY: [
        {
            id: 'ny1',
            name: 'NY SNAP Benefits',
            category: 'food',
            description: 'New York food assistance program.',
            phone: '1-800-342-3009',
            website: 'https://otda.ny.gov/programs/snap/',
            eligibility: 'New York residents meeting income requirements',
            featured: true,
            state: 'NY'
        },
        {
            id: 'ny2',
            name: 'NY State of Health',
            category: 'health',
            description: 'New York\'s official health plan marketplace.',
            phone: '1-855-355-5777',
            website: 'https://nystateofhealth.ny.gov',
            eligibility: 'New York residents',
            featured: true,
            state: 'NY'
        },
        {
            id: 'ny3',
            name: 'NYC Housing Connect',
            category: 'housing',
            description: 'Affordable housing opportunities in New York City.',
            website: 'https://housingconnect.nyc.gov',
            eligibility: 'NYC residents meeting income requirements',
            state: 'NY'
        }
    ],

    // Florida
    FL: [
        {
            id: 'fl1',
            name: 'Florida SNAP (Food Assistance)',
            category: 'food',
            description: 'Florida\'s food assistance program.',
            phone: '1-866-762-2237',
            website: 'https://www.myflfamilies.com/services/public-assistance/food-assistance',
            eligibility: 'Florida residents meeting income requirements',
            featured: true,
            state: 'FL'
        },
        {
            id: 'fl2',
            name: 'Florida Medicaid',
            category: 'health',
            description: 'Healthcare coverage for eligible Florida residents.',
            phone: '1-877-711-3662',
            website: 'https://www.flmedicaidtplrecovery.com',
            eligibility: 'Florida residents meeting requirements',
            featured: true,
            state: 'FL'
        }
    ]
};

// Emergency contacts - same everywhere
const EMERGENCY_CONTACTS = [
    { name: 'Emergency Services', number: '911', description: 'Police, Fire, Ambulance' },
    { name: 'Poison Control', number: '1-800-222-1222', description: '24/7 Poison Help' },
    { name: 'Domestic Violence Hotline', number: '1-800-799-7233', description: '24/7 Support' },
    { name: 'Child Abuse Hotline', number: '1-800-422-4453', description: 'Report Concerns' },
    { name: 'Suicide & Crisis Lifeline', number: '988', description: '24/7 Mental Health Support' },
    { name: 'Crisis Text Line', number: 'Text HOME to 741741', description: 'Text Support 24/7' }
];

export default function CommunityResources() {
    const { userProfile } = useAuth();
    const { t } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showEmergency, setShowEmergency] = useState(false);
    const [userState, setUserState] = useState(null);
    const [userCity, setUserCity] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(true);

    // Get user location from profile or browser
    useEffect(() => {
        const getUserLocation = async () => {
            setLoadingLocation(true);

            // First try user profile address
            if (userProfile?.address?.state) {
                setUserState(userProfile.address.state);
                setUserCity(userProfile.address.city);
                setLoadingLocation(false);
                return;
            }

            // Fall back to browser geolocation
            if (navigator.geolocation) {
                try {
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            try {
                                // Use reverse geocoding to get state
                                const response = await fetch(
                                    `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
                                );
                                const data = await response.json();

                                if (data.address) {
                                    // Get state code (e.g., "CA" from "California")
                                    const state = data.address.state;
                                    const stateCode = getStateCode(state);
                                    setUserState(stateCode);
                                    setUserCity(data.address.city || data.address.town || data.address.village);
                                }
                            } catch (error) {
                                console.error('Error getting location details:', error);
                            }
                            setLoadingLocation(false);
                        },
                        (error) => {
                            console.error('Geolocation error:', error);
                            setLoadingLocation(false);
                        },
                        { timeout: 10000 }
                    );
                } catch (error) {
                    setLoadingLocation(false);
                }
            } else {
                setLoadingLocation(false);
            }
        };

        getUserLocation();
    }, [userProfile]);

    // Convert state name to code
    const getStateCode = (stateName) => {
        const states = {
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
            'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
            'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
            'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
            'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
            'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
            'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
            'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
        };
        return states[stateName] || stateName;
    };

    // Get resources for user's location
    const locationResources = useMemo(() => {
        const stateResources = userState && STATE_RESOURCES[userState] ? STATE_RESOURCES[userState] : [];
        const nationalResources = STATE_RESOURCES.national;
        return [...stateResources, ...nationalResources];
    }, [userState]);

    // Filter resources
    const filteredResources = useMemo(() => {
        let resources = locationResources;

        if (selectedCategory !== 'all') {
            resources = resources.filter(r => r.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            resources = resources.filter(r =>
                r.name.toLowerCase().includes(query) ||
                r.description.toLowerCase().includes(query) ||
                r.category.toLowerCase().includes(query)
            );
        }

        return resources;
    }, [locationResources, selectedCategory, searchQuery]);

    // Featured resources
    const featuredResources = locationResources.filter(r => r.featured);

    // Get category info
    const getCategoryInfo = (categoryId) => {
        return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                            <Users className="h-8 w-8 text-purple-600" />
                        </div>
                        {t('communityResources')}
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <MapPin className="h-4 w-4 text-purple-600" />
                        {loadingLocation ? (
                            <span className="text-gray-500 flex items-center gap-2">
                                <Loader className="h-4 w-4 animate-spin" />
                                Detecting your location...
                            </span>
                        ) : userCity && userState ? (
                            <span className="text-purple-600 font-medium">
                                Resources near {userCity}, {userState}
                            </span>
                        ) : userState ? (
                            <span className="text-purple-600 font-medium">
                                Resources in {userState}
                            </span>
                        ) : (
                            <span className="text-gray-500">
                                Showing national resources (add your address in Profile for local results)
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setShowEmergency(true)}
                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-red-700 hover:to-rose-700 transition-all shadow-lg shadow-red-200"
                >
                    <AlertTriangle className="h-5 w-5" />
                    <span>{t('emergencyContacts')}</span>
                </button>
            </div>

            {/* Location Banner */}
            {!userState && !loadingLocation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Navigation className="h-5 w-5 text-blue-600" />
                        <div>
                            <p className="font-medium text-blue-900">Get local resources</p>
                            <p className="text-sm text-blue-700">Update your address in Profile to see resources specific to your area.</p>
                        </div>
                    </div>
                    <a href="/profile" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                        Update Address
                    </a>
                </div>
            )}

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={`${t('search')} resources...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 mb-8">
                {CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    return (
                        <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center space-x-2 ${selectedCategory === category.id
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{category.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Featured Resources */}
            {selectedCategory === 'all' && !searchQuery && featuredResources.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Star className="h-5 w-5 text-yellow-500 mr-2" />
                        {userState ? `Top Resources in ${userState}` : 'Featured Resources'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredResources.slice(0, 6).map((resource) => {
                            const category = getCategoryInfo(resource.category);
                            const CategoryIcon = category.icon;

                            return (
                                <div
                                    key={resource.id}
                                    className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-start space-x-3 mb-3">
                                        <div className="p-2 bg-purple-100 rounded-xl">
                                            <CategoryIcon className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{resource.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm text-purple-600 capitalize">{resource.category}</span>
                                                {resource.state && (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                        {resource.state}
                                                    </span>
                                                )}
                                                {resource.national && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                        National
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">{resource.description}</p>
                                    <div className="flex items-center justify-between">
                                        {resource.phone && (
                                            <a
                                                href={`tel:${resource.phone}`}
                                                className="text-purple-600 font-medium text-sm flex items-center hover:text-purple-700"
                                            >
                                                <Phone className="h-4 w-4 mr-1" />
                                                {resource.phone}
                                            </a>
                                        )}
                                        {resource.website && (
                                            <a
                                                href={resource.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-600 hover:text-purple-700"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* All Resources */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {selectedCategory === 'all' ? 'All Resources' : getCategoryInfo(selectedCategory).label}
                    <span className="text-gray-400 font-normal ml-2">({filteredResources.length})</span>
                </h2>

                {filteredResources.length > 0 ? (
                    <div className="space-y-4">
                        {filteredResources.map((resource) => {
                            const category = getCategoryInfo(resource.category);
                            const CategoryIcon = category.icon;

                            return (
                                <div
                                    key={resource.id}
                                    className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-4">
                                            <div className="p-3 bg-gray-100 rounded-xl">
                                                <CategoryIcon className="h-6 w-6 text-gray-700" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-semibold text-gray-900 text-lg">{resource.name}</h3>
                                                    {resource.featured && (
                                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center">
                                                            <Star className="h-3 w-3 mr-1" /> Featured
                                                        </span>
                                                    )}
                                                    {resource.state && (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                                            {resource.state}
                                                        </span>
                                                    )}
                                                    {resource.national && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                            National
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-600 mb-3">{resource.description}</p>

                                                <div className="flex flex-wrap gap-4 text-sm">
                                                    {resource.phone && (
                                                        <a
                                                            href={`tel:${resource.phone}`}
                                                            className="flex items-center text-gray-600 hover:text-purple-600"
                                                        >
                                                            <Phone className="h-4 w-4 mr-1" />
                                                            {resource.phone}
                                                        </a>
                                                    )}
                                                    {resource.hours && (
                                                        <span className="flex items-center text-gray-600">
                                                            <Clock className="h-4 w-4 mr-1" />
                                                            {resource.hours}
                                                        </span>
                                                    )}
                                                </div>

                                                {resource.eligibility && (
                                                    <div className="mt-3 flex items-start">
                                                        <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-600">
                                                            <strong className="text-gray-700">Eligibility:</strong> {resource.eligibility}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {resource.website && (
                                            <a
                                                href={resource.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-shrink-0 bg-purple-100 text-purple-700 px-4 py-2 rounded-xl font-medium hover:bg-purple-200 transition-colors flex items-center"
                                            >
                                                <Globe className="h-4 w-4 mr-2" />
                                                Visit Website
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-2xl p-12 text-center">
                        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2">No resources found</p>
                        <p className="text-sm text-gray-400">Try adjusting your search or category filter</p>
                    </div>
                )}
            </div>

            {/* Quick Help Section */}
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Need Immediate Help?</h2>
                <p className="text-blue-100 mb-6">
                    If you're facing an emergency or urgent situation, these resources can provide immediate assistance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <Phone className="h-5 w-5" />
                            <span className="font-semibold">911</span>
                        </div>
                        <p className="text-sm text-blue-100">Emergency Services</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <Heart className="h-5 w-5" />
                            <span className="font-semibold">988</span>
                        </div>
                        <p className="text-sm text-blue-100">Suicide & Crisis Lifeline</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <div className="flex items-center space-x-3 mb-2">
                            <Shield className="h-5 w-5" />
                            <span className="font-semibold">211</span>
                        </div>
                        <p className="text-sm text-blue-100">Local Help & Services</p>
                    </div>
                </div>
            </div>

            {/* Emergency Contacts Modal */}
            {showEmergency && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200 bg-red-50 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-red-100 rounded-xl">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <h2 className="text-xl font-bold text-red-900">{t('emergencyContacts')}</h2>
                                </div>
                                <button
                                    onClick={() => setShowEmergency(false)}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-red-600" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {EMERGENCY_CONTACTS.map((contact, index) => (
                                <a
                                    key={index}
                                    href={contact.number.startsWith('Text') ? '#' : `tel:${contact.number}`}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <p className="font-semibold text-gray-900">{contact.name}</p>
                                        <p className="text-sm text-gray-500">{contact.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600">{contact.number}</p>
                                    </div>
                                </a>
                            ))}

                            <div className="pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-500 text-center">
                                    Save these numbers in your phone for quick access
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
