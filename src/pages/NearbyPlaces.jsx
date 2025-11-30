// src/pages/NearbyPlaces.jsx - AI-ENHANCED & LOCATION-BASED
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    MapPin,
    Search,
    Navigation,
    Store,
    Dumbbell,
    UtensilsCrossed,
    Activity,
    GraduationCap,
    ShoppingBag,
    Coffee,
    Car,
    X,
    ExternalLink,
    ChevronRight,
    Star,
    Clock,
    Phone,
    Filter,
    Navigation as NavIcon,
    Home,
    Heart,
    Sparkles,
    Locate,
    Map as MapIcon,
    Brain,
    Target,
    RotateCw,
    Compass,
    Zap,
    TrendingUp,
    Loader2,
    AlertCircle,
    CheckCircle,
    Info
} from 'lucide-react';
import toast from 'react-hot-toast';

// Enhanced categories with better colors and icons
const categories = [
    { id: 'all', name: 'All Places', icon: MapPin, color: 'from-blue-500 to-cyan-500', bgColor: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { id: 'grocery', name: 'Grocery', icon: ShoppingBag, color: 'from-green-500 to-emerald-500', bgColor: 'bg-gradient-to-br from-green-500 to-emerald-500' },
    { id: 'gym', name: 'Fitness', icon: Dumbbell, color: 'from-red-500 to-pink-500', bgColor: 'bg-gradient-to-br from-red-500 to-pink-500' },
    { id: 'restaurant', name: 'Dining', icon: UtensilsCrossed, color: 'from-orange-500 to-amber-500', bgColor: 'bg-gradient-to-br from-orange-500 to-amber-500' },
    { id: 'hospital', name: 'Medical', icon: Activity, color: 'from-pink-500 to-rose-500', bgColor: 'bg-gradient-to-br from-pink-500 to-rose-500' },
    { id: 'school', name: 'Education', icon: GraduationCap, color: 'from-purple-500 to-violet-500', bgColor: 'bg-gradient-to-br from-purple-500 to-violet-500' },
    { id: 'cafe', name: 'Cafes', icon: Coffee, color: 'from-amber-500 to-yellow-500', bgColor: 'bg-gradient-to-br from-amber-500 to-yellow-500' },
    { id: 'gas', name: 'Gas', icon: Car, color: 'from-yellow-500 to-orange-500', bgColor: 'bg-gradient-to-br from-yellow-500 to-orange-500' },
    { id: 'shopping', name: 'Shopping', icon: Store, color: 'from-indigo-500 to-blue-500', bgColor: 'bg-gradient-to-br from-indigo-500 to-blue-500' },
];

// Map category IDs to Google Places API types
const categoryToPlaceType = {
    'grocery': 'supermarket',
    'gym': 'gym',
    'restaurant': 'restaurant',
    'hospital': 'hospital',
    'school': 'school',
    'cafe': 'cafe',
    'gas': 'gas_station',
    'shopping': 'shopping_mall'
};

// Fetch real nearby places using Google Places API JavaScript Library
// Optimized for faster loading with caching
const placesCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const fetchNearbyPlaces = async (userLocation, category = 'all', apiKey) => {
    if (!userLocation || !apiKey) return [];

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('Google Maps JavaScript API not loaded - this may be due to an ad blocker');
        // Return empty array - the component will handle fallback
        return [];
    }

    // Check cache first
    const cacheKey = `${userLocation.lat.toFixed(4)}_${userLocation.lng.toFixed(4)}_${category}`;
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    return new Promise((resolve) => {
        try {
            const location = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            const map = new google.maps.Map(document.createElement('div')); // Dummy map for service
            const service = new google.maps.places.PlacesService(map);

            const type = category !== 'all' ? categoryToPlaceType[category] : null;
            const request = {
                location: location,
                radius: 5000, // 5km radius
                ...(type && { type: [type] }) // Add type filter if specified
            };

            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    const places = results.slice(0, 20).map((place, index) => { // Limit to 20 for performance
                        // Calculate distance
                        const distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            place.geometry.location.lat(),
                            place.geometry.location.lng()
                        );

                        // Map Google place type to our category
                        let placeCategory = 'other';
                        if (place.types) {
                            if (place.types.includes('supermarket') || place.types.includes('grocery_or_supermarket')) {
                                placeCategory = 'grocery';
                            } else if (place.types.includes('gym')) {
                                placeCategory = 'gym';
                            } else if (place.types.includes('restaurant') || place.types.includes('food')) {
                                placeCategory = 'restaurant';
                            } else if (place.types.includes('hospital')) {
                                placeCategory = 'hospital';
                            } else if (place.types.includes('school') || place.types.includes('university')) {
                                placeCategory = 'school';
                            } else if (place.types.includes('cafe')) {
                                placeCategory = 'cafe';
                            } else if (place.types.includes('gas_station')) {
                                placeCategory = 'gas';
                            } else if (place.types.includes('shopping_mall') || place.types.includes('store')) {
                                placeCategory = 'shopping';
                            }
                        }

                        return {
                            id: place.place_id || `place_${index}`,
                            name: place.name,
                            category: placeCategory,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                            rating: place.rating || 0,
                            distance: distance,
                            phone: place.formatted_phone_number || place.international_phone_number || null,
                            hours: place.opening_hours?.isOpen() ? 'Open Now' : place.opening_hours ? 'Check Hours' : null,
                            popular: place.rating >= 4.5,
                            image: getCategoryEmoji(placeCategory),
                            address: place.vicinity || place.formatted_address || 'Address not available',
                            placeId: place.place_id,
                            photos: place.photos?.[0]?.getUrl ? place.photos[0].getUrl({ maxWidth: 400 }) : null
                        };
                    });

                    // Cache the results
                    placesCache.set(cacheKey, { data: places, timestamp: Date.now() });
                    resolve(places);
                } else {
                    console.warn('Places API error:', status);
                    resolve([]);
                }
            });
        } catch (error) {
            console.error('Error fetching nearby places:', error);
            resolve([]);
        }
    });
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

// Get emoji for category
const getCategoryEmoji = (category) => {
    const emojis = {
        'grocery': '🛒',
        'gym': '💪',
        'restaurant': '🍽️',
        'hospital': '🏥',
        'school': '🎓',
        'cafe': '☕',
        'gas': '⛽',
        'shopping': '🛍️',
        'other': '📍'
    };
    return emojis[category] || '📍';
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBfm3u4-vEnsVvHEqjqpoGdlbNgaza8JnA';

// AI Assistant for place recommendations
const callAIForPlaces = async (userQuery, userLocation, nearbyPlaces = []) => {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!geminiApiKey) {
        return null; // No AI available
    }

    try {
        const systemPrompt = `You are a helpful location assistant. The user is at coordinates ${userLocation.lat}, ${userLocation.lng} and has ${nearbyPlaces.length} places nearby. 

Help them find places by:
1. Understanding their search query: "${userQuery}"
2. Suggesting relevant places from nearby options
3. Providing helpful recommendations based on their needs
4. If they ask about a specific type of place, suggest the best options nearby

Available nearby places: ${nearbyPlaces.slice(0, 10).map(p => `${p.name} (${p.category}, ${p.distance.toFixed(1)}km away, rating: ${p.rating})`).join(', ')}

Respond in a friendly, helpful way. If the query is about finding a place, suggest specific places from the list.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (error) {
        console.warn('AI API error:', error);
    }

    return null;
};

// Geocode address to coordinates
const geocodeAddress = async (address) => {
    if (!address.trim()) {
        toast.error('Please enter an address');
        return null;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Family-Housing-Hub/1.0',
                    'Accept-Language': 'en'
                }
            }
        );

        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                name: result.display_name
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        toast.error('Failed to search address');
        return null;
    }
};

// Interactive Map Component with Google Maps API Key
const SimpleMap = ({ userLocation, places, selectedPlace, onPlaceSelect }) => {
    if (!userLocation) {
        return (
            <div className="relative w-full h-full bg-white dark:bg-gradient-to-br dark:from-blue-100 dark:to-cyan-100 rounded-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center">
                    <MapIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">Loading map...</p>
                </div>
            </div>
        );
    }

    const centerLat = userLocation.lat;
    const centerLng = userLocation.lng;

    // Google Maps Embed URL with API key
    // Note: Embed API doesn't support custom markers in the URL
    // We'll show the map centered on user location
    // For markers, we'd need to use Maps JavaScript API (more advanced)
    const mapUrl = `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${centerLat},${centerLng}&zoom=13`;

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-100">
            <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={mapUrl}
                title="Nearby Places Map"
                className="rounded-2xl"
            />
            {/* Map Overlay Info */}
            <div className="absolute top-4 left-4 bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="flex items-center space-x-2">
                    <Locate className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {places.length} places nearby
                    </span>
                </div>
            </div>
            {/* Click to view places button */}
            <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Your Location</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800 shadow"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">{places.length} Places</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open in Maps</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function NearbyPlaces() {
    const { userProfile } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [addressSearch, setAddressSearch] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [currentLocationName, setCurrentLocationName] = useState(null);
    const [locationAccuracy, setLocationAccuracy] = useState(null);
    const [places, setPlaces] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchingAddress, setIsSearchingAddress] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [showAIAssistant, setShowAIAssistant] = useState(false);

    // Get user location with permission request and address search
    const getUserLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setIsLoading(false);
            return;
        }

        setLocationLoading(true);
        setLocationError(null);
        setIsLoading(true);
        toast.loading('Requesting location permission...', { id: 'location' });

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };

                // Reverse geocode to get address name
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&addressdetails=1`,
                        {
                            headers: {
                                'User-Agent': 'Family-Housing-Hub/1.0',
                                'Accept-Language': 'en'
                            }
                        }
                    );
                    const data = await response.json();
                    if (data && data.display_name) {
                        setCurrentLocationName(data.display_name);
                    }
                } catch (e) {
                    console.warn('Reverse geocoding failed:', e);
                }

                setUserLocation(location);
                setLocationAccuracy(location.accuracy);
                setLocationLoading(false);
                toast.success('Location found! Loading nearby places...', { id: 'location' });
            },
            (error) => {
                console.warn('Geolocation failed:', error);
                setLocationLoading(false);
                let errorMessage = 'Location access denied. ';

                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage += 'Please enable location permissions or search for an address.';
                    setLocationError(errorMessage);
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage += 'Location information unavailable.';
                    setLocationError(errorMessage);
                } else if (error.code === error.TIMEOUT) {
                    errorMessage += 'Location request timed out.';
                    setLocationError(errorMessage);
                } else {
                    setLocationError(errorMessage);
                }

                toast.error(errorMessage, { id: 'location', duration: 5000 });
                setIsLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    }, []);

    // Search for address
    const handleAddressSearch = useCallback(async () => {
        if (!addressSearch.trim()) {
            toast.error('Please enter an address');
            return;
        }

        setIsSearchingAddress(true);
        setLocationError(null);
        setIsLoading(true);

        try {
            const result = await geocodeAddress(addressSearch);

            if (result) {
                setUserLocation({ lat: result.lat, lng: result.lng, accuracy: null });
                setCurrentLocationName(result.name);
                setLocationLoading(false);
                toast.success(`Found location: ${result.name.split(',')[0]}`);
                setAddressSearch('');
            } else {
                setLocationError('Address not found. Please try a more specific address.');
                toast.error('Address not found');
            }
        } catch (error) {
            console.error('Address search error:', error);
            setLocationError('Failed to search address');
            toast.error('Failed to search address');
        } finally {
            setIsSearchingAddress(false);
            setIsLoading(false);
        }
    }, [addressSearch]);

    // Get user location on mount
    useEffect(() => {
        getUserLocation();
    }, [getUserLocation]);

    // Wait for Google Maps API to load, then fetch nearby places
    useEffect(() => {
        const waitForGoogleMaps = () => {
            // Check if Google Maps was blocked or failed to load
            if (window.googleMapsError) {
                return 'error';
            }
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                return true;
            }
            return false;
        };

        const loadPlaces = async () => {
            if (!userLocation || !GOOGLE_MAPS_API_KEY) return;

            // Listen for Google Maps load events
            const handleMapsLoaded = () => {
                loadPlacesData();
            };

            const handleMapsError = () => {
                console.warn('Google Maps API blocked or failed to load. Using fallback.');
                showAdBlockerWarning();
                loadPlacesData(); // Still try to load with fallback
            };

            window.addEventListener('googlemapsloaded', handleMapsLoaded);
            window.addEventListener('googlemapserror', handleMapsError);

            const loadPlacesData = async () => {
                // Wait for Google Maps API to load (max 10 seconds)
                let attempts = 0;
                let status = waitForGoogleMaps();
                while (status === false && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    attempts++;
                    status = waitForGoogleMaps();
                }

                if (status === 'error' || status === false) {
                    console.warn('Google Maps API not available. Using fallback data.');
                    showAdBlockerWarning();
                    setIsLoading(false);
                    // Continue with mock data instead of returning
                    return;
                }

                setIsLoading(true);
                const startTime = Date.now();
                try {
                    const realPlaces = await fetchNearbyPlaces(userLocation, selectedCategory, GOOGLE_MAPS_API_KEY);
                    const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
                    setPlaces(realPlaces);
                    if (realPlaces.length > 0) {
                        toast.success(`Found ${realPlaces.length} nearby places in ${loadTime}s!`, { duration: 2000 });
                    } else {
                        toast('No places found nearby. Try a different category.', { icon: 'ℹ️', duration: 3000 });
                    }
                } catch (error) {
                    console.error('Error loading places:', error);
                    toast.error('Failed to load nearby places. Please try again.', { duration: 4000 });
                } finally {
                    setIsLoading(false);
                }
            };

            const showAdBlockerWarning = () => {
                toast.error(
                    'Google Maps API is blocked. Please disable your ad blocker for this site to see real places, or use the address search feature.',
                    {
                        duration: 8000,
                        icon: '⚠️'
                    }
                );
            };

            // If already loaded, proceed immediately
            if (waitForGoogleMaps() === true) {
                loadPlacesData();
            } else if (waitForGoogleMaps() === 'error') {
                handleMapsError();
            } else {
                // Wait a bit for the script to load
                setTimeout(() => {
                    if (waitForGoogleMaps() === true) {
                        loadPlacesData();
                    } else {
                        handleMapsError();
                    }
                }, 2000);
            }

            return () => {
                window.removeEventListener('googlemapsloaded', handleMapsLoaded);
                window.removeEventListener('googlemapserror', handleMapsError);
            };
        };

        loadPlaces();
    }, [userLocation, selectedCategory]);

    // Debounced search function with AI assistance
    useEffect(() => {
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }

        if (searchQuery.trim()) {
            setIsSearching(true);

            // Get AI suggestion if query is complex
            if (searchQuery.length > 10 && userLocation && places.length > 0) {
                callAIForPlaces(searchQuery, userLocation, places).then(suggestion => {
                    if (suggestion) {
                        setAiSuggestion(suggestion);
                    }
                }).catch(() => {
                    // Ignore AI errors
                });
            }

            const timer = setTimeout(() => {
                setIsSearching(false);
            }, 300);
            setSearchDebounceTimer(timer);
        } else {
            setIsSearching(false);
            setAiSuggestion(null);
        }

        return () => {
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
        };
    }, [searchQuery, userLocation, places]);

    // Filter places by search query with better matching
    const filteredPlaces = useMemo(() => {
        if (!searchQuery.trim()) {
            return places;
        }

        const query = searchQuery.toLowerCase().trim();
        return places.filter(place => {
            const nameMatch = place.name.toLowerCase().includes(query);
            const categoryMatch = place.category.toLowerCase().includes(query);
            const addressMatch = place.address?.toLowerCase().includes(query);
            return nameMatch || categoryMatch || addressMatch;
        });
    }, [places, searchQuery]);

    // Get directions URL
    const getDirectionsUrl = (place) => {
        if (!userLocation) return '#';
        return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${place.lat},${place.lng}`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-50 dark:via-blue-50 dark:to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Finding Nearby Places</h2>
                    <p className="text-gray-600 dark:text-gray-300">Loading your location and local amenities...</p>
                    <div className="mt-6 flex justify-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-slate-50 dark:via-blue-50 dark:to-indigo-100">
            {/* Enhanced Header */}
            <div className="bg-white dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50 p-6 shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex items-center space-x-4">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                                <MapPin className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                                    Nearby Places
                                </h1>
                                <div className="mt-1 space-y-1">
                                    <p className="text-gray-600 dark:text-gray-400 flex items-center">
                                        <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
                                        Discover amazing places around you
                                    </p>
                                    {currentLocationName && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {currentLocationName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Address Search Bar */}
                        <div className="flex-1 max-w-md">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                                    <input
                                        type="text"
                                        value={addressSearch}
                                        onChange={(e) => setAddressSearch(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddressSearch();
                                            }
                                        }}
                                        placeholder="Search for an address..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                        disabled={isSearchingAddress}
                                    />
                                </div>
                                <button
                                    onClick={handleAddressSearch}
                                    disabled={!addressSearch.trim() || isSearchingAddress}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                >
                                    {isSearchingAddress ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </button>
                                <button
                                    onClick={getUserLocation}
                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                    title="Use current location"
                                >
                                    <Target className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Enhanced Search Bar with AI Assistant */}
                        <div className="flex-1 max-w-2xl">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search for restaurants, gyms, stores... (AI-powered)"
                                    className={`w-full pl-12 pr-24 py-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-3 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500`}
                                />
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                                    {isSearching && (
                                        <Loader2 className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    )}
                                    {searchQuery && !isSearching && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery('');
                                                setAiSuggestion(null);
                                            }}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition-colors"
                                        >
                                            <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                        </button>
                                    )}
                                    {!searchQuery && !isSearching && (
                                        <>
                                            <button
                                                onClick={() => setShowAIAssistant(true)}
                                                className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                title="AI Assistant"
                                            >
                                                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            </button>
                                            <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                        </>
                                    )}
                                </div>
                            </div>
                            {searchQuery && (
                                <div className="mt-2 ml-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Found {filteredPlaces.length} {filteredPlaces.length === 1 ? 'place' : 'places'}
                                    </p>
                                    {aiSuggestion && (
                                        <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                                            <div className="flex items-start gap-2">
                                                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                                                <p className="text-xs text-purple-800 dark:text-purple-300">{aiSuggestion}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-2xl p-2 border border-gray-200/50">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${viewMode === 'grid'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${viewMode === 'list'
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                List
                            </button>
                        </div>
                    </div>

                    {/* Enhanced Category Filters */}
                    <div className="mt-6 flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
                        {categories.map((category) => {
                            const Icon = category.icon;
                            const isSelected = selectedCategory === category.id;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`flex items-center space-x-3 px-5 py-3 rounded-2xl font-semibold transition-all duration-300 whitespace-nowrap transform hover:scale-105 active:scale-95 ${isSelected
                                        ? `bg-gradient-to-r ${category.color} text-white shadow-lg shadow-blue-500/25`
                                        : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:shadow-md border border-gray-200/50'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{category.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-6">
                {/* Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                                <MapPin className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{filteredPlaces.length}</p>
                                <p className="text-sm text-gray-600">Places Found</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                                <Star className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">4.5</p>
                                <p className="text-sm text-gray-600">Avg Rating</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
                                <Navigation className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">1.2km</p>
                                <p className="text-sm text-gray-600">Avg Distance</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                                <Heart className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{filteredPlaces.filter(p => p.popular).length}</p>
                                <p className="text-sm text-gray-600">Popular Spots</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Section */}
                <div className="mb-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-gray-200/50 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Area Map</h2>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Locate className="h-4 w-4" />
                                <span>Showing places within 3km radius</span>
                            </div>
                        </div>
                        <div className="h-96 rounded-2xl overflow-hidden">
                            <SimpleMap
                                userLocation={userLocation}
                                places={filteredPlaces}
                                selectedPlace={selectedPlace}
                                onPlaceSelect={setSelectedPlace}
                            />
                        </div>
                    </div>
                </div>

                {/* Places Grid/List */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {selectedCategory === 'all' ? 'All Nearby Places' : categories.find(c => c.id === selectedCategory)?.name}
                        </h2>
                        <p className="text-gray-600">
                            Showing <span className="font-semibold text-blue-600">{filteredPlaces.length}</span> results
                        </p>
                    </div>

                    {filteredPlaces.length === 0 ? (
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 text-center border border-gray-200/50 shadow-sm">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <Search className="h-12 w-12 text-gray-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">No places found</h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                We couldn't find any places matching your search. Try a different category or search term.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => {
                                        setSelectedCategory('all');
                                        setSearchQuery('');
                                    }}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                                >
                                    Show All Places
                                </button>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="bg-white text-gray-700 px-8 py-3 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                                >
                                    Clear Search
                                </button>
                            </div>
                        </div>
                    ) : viewMode === 'grid' ? (
                        // Grid View
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPlaces.map((place) => {
                                const category = categories.find(cat => cat.id === place.category);
                                const isSelected = selectedPlace?.id === place.id;

                                return (
                                    <div
                                        key={place.id}
                                        onClick={() => setSelectedPlace(place)}
                                        className={`bg-white/80 backdrop-blur-sm rounded-3xl p-6 border-2 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl ${isSelected
                                            ? 'border-blue-500 shadow-lg'
                                            : 'border-gray-200/50 hover:border-blue-300 shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`w-14 h-14 ${category?.bgColor || 'bg-gradient-to-br from-blue-500 to-cyan-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
                                                <span className="text-white text-xl font-bold">{place.image}</span>
                                            </div>
                                            {place.popular && (
                                                <span className="flex items-center space-x-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                    <Heart className="h-3 w-3 fill-current" />
                                                    <span>Popular</span>
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{place.name}</h3>
                                        <p className="text-gray-600 mb-4 capitalize">{place.category}</p>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                                                    <span className="font-semibold text-gray-900">{place.rating}</span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-gray-600">
                                                    <Navigation className="h-4 w-4" />
                                                    <span className="font-medium">{place.distance.toFixed(1)} km</span>
                                                </div>
                                            </div>

                                            {place.hours && (
                                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                    <Clock className="h-4 w-4" />
                                                    <span>{place.hours}</span>
                                                </div>
                                            )}

                                            <div className="pt-3 border-t border-gray-200/50">
                                                <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        // List View
                        <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200/50 shadow-sm overflow-hidden">
                            {filteredPlaces.map((place, index) => {
                                const category = categories.find(cat => cat.id === place.category);
                                const isSelected = selectedPlace?.id === place.id;

                                return (
                                    <div
                                        key={place.id}
                                        onClick={() => setSelectedPlace(place)}
                                        className={`p-6 cursor-pointer transition-all duration-300 hover:bg-blue-50/50 ${isSelected ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                            } ${index < filteredPlaces.length - 1 ? 'border-b border-gray-200/50' : ''}`}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-12 h-12 ${category?.bgColor || 'bg-gradient-to-br from-blue-500 to-cyan-500'} rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                                                <span className="text-white text-lg font-bold">{place.image}</span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900">{place.name}</h3>
                                                        <p className="text-gray-600 capitalize">{place.category}</p>
                                                    </div>
                                                    {place.popular && (
                                                        <span className="flex items-center space-x-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0">
                                                            <Heart className="h-3 w-3 fill-current" />
                                                            <span>Popular</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-6 text-sm text-gray-600">
                                                    <div className="flex items-center space-x-1">
                                                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                        <span className="font-semibold">{place.rating}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Navigation className="h-4 w-4 text-blue-500" />
                                                        <span>{place.distance.toFixed(1)} km</span>
                                                    </div>
                                                    {place.hours && (
                                                        <div className="flex items-center space-x-1">
                                                            <Clock className="h-4 w-4" />
                                                            <span>{place.hours}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <ChevronRight className={`h-6 w-6 text-gray-400 flex-shrink-0 ${isSelected ? 'text-blue-600' : ''
                                                }`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Place Details Modal */}
            {selectedPlace && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-white/20 transform animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200/50 sticky top-0 bg-white rounded-t-3xl">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    {(() => {
                                        const category = categories.find(cat => cat.id === selectedPlace.category);
                                        return (
                                            <div className={`w-16 h-16 ${category?.bgColor || 'bg-gradient-to-br from-blue-500 to-cyan-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
                                                <span className="text-white text-2xl font-bold">{selectedPlace.image}</span>
                                            </div>
                                        );
                                    })()}
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{selectedPlace.name}</h2>
                                        <p className="text-gray-600 capitalize">{selectedPlace.category}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPlace(null)}
                                    className="p-3 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                                >
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Rating and Distance */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2 bg-white px-4 py-3 rounded-xl shadow-sm">
                                        <Star className="h-6 w-6 text-yellow-500 fill-current" />
                                        <span className="font-bold text-gray-900 text-lg">{selectedPlace.rating}</span>
                                        <span className="text-gray-600">Rating</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <Navigation className="h-6 w-6 text-blue-500" />
                                    <span className="font-semibold text-lg">{selectedPlace.distance.toFixed(1)} km away</span>
                                </div>
                            </div>

                            {/* Address */}
                            {selectedPlace.address && (
                                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <MapPin className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600">Address</p>
                                        <p className="text-lg font-semibold text-gray-900">{selectedPlace.address}</p>
                                    </div>
                                </div>
                            )}

                            {/* Contact Information */}
                            {selectedPlace.phone && (
                                <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors cursor-pointer">
                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                        <Phone className="h-6 w-6 text-green-600" />
                                    </div>
                                    <a href={`tel:${selectedPlace.phone}`} className="flex-1">
                                        <p className="text-sm text-gray-600">Phone Number</p>
                                        <p className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                                            {selectedPlace.phone}
                                        </p>
                                    </a>
                                </div>
                            )}

                            {/* Hours */}
                            {selectedPlace.hours && (
                                <div className="flex items-center space-x-4 p-4 bg-amber-50 rounded-2xl">
                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                        <Clock className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-600">Opening Hours</p>
                                        <p className="text-lg font-semibold text-gray-900">{selectedPlace.hours}</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex space-x-4 pt-4">
                                <a
                                    href={getDirectionsUrl(selectedPlace)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3"
                                >
                                    <Navigation className="h-5 w-5" />
                                    <span>Get Directions</span>
                                </a>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-3"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                    <span>View on Maps</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Assistant Modal */}
            {showAIAssistant && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col`}>
                        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-2xl`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl">
                                        <Brain className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Location Assistant</h2>
                                        <p className="text-purple-700 dark:text-purple-300 text-sm">Ask me to find places near you</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAIAssistant(false)}
                                    className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                    💡 <strong>Try asking:</strong>
                                </p>
                                <ul className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-400">
                                    <li>• "Find the best restaurants near me"</li>
                                    <li>• "Where's the nearest gym?"</li>
                                    <li>• "Show me coffee shops within 1km"</li>
                                    <li>• "What grocery stores are open now?"</li>
                                </ul>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Type your question in the search bar above, and I'll help you find the perfect places!
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setShowAIAssistant(false);
                                    setSearchQuery('best restaurants near me');
                                }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Try Example Search
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Styles */}
            <style>{`
                @keyframes scale-in {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-scale-in {
                    animation: scale-in 0.3s ease-out;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}