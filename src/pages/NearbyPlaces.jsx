// src/pages/NearbyPlaces.jsx - Google Maps Style with Full Place Details
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
    Home,
    Heart,
    Sparkles,
    Locate,
    Map as MapIcon,
    Globe,
    Loader2,
    Target,
    RotateCw,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

// Enhanced categories
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

// Map categories to search queries for FAST text search
const categoryToSearchQuery = {
    'all': '',
    'grocery': 'grocery stores nearby',
    'gym': 'gyms nearby',
    'restaurant': 'restaurants nearby',
    'hospital': 'hospitals nearby',
    'school': 'schools nearby',
    'cafe': 'cafes nearby',
    'gas': 'gas stations nearby',
    'shopping': 'shopping malls nearby'
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBfm3u4-vEnsVvHEqjqpoGdlbNgaza8JnA';

// Enhanced cache for places with category-specific caching
const placesCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Pre-cache popular categories for faster loading
const preCacheCategories = ['restaurant', 'grocery', 'gas', 'cafe'];

// Calculate distance (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Get category emoji
const getCategoryEmoji = (category) => {
    const emojis = {
        'grocery': '🛒', 'gym': '💪', 'restaurant': '🍽️', 'hospital': '🏥',
        'school': '🎓', 'cafe': '☕', 'gas': '⛽', 'shopping': '🛍️', 'other': '📍'
    };
    return emojis[category] || '📍';
};

// ULTRA FAST: Fetch nearby places with BASIC info only (like Apple Maps)
const fetchNearbyPlaces = async (userLocation, category = 'all', searchQuery = '') => {
    if (!userLocation || !GOOGLE_MAPS_API_KEY) return [];

    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('Google Maps API not loaded');
        return [];
    }

    // Enhanced cache key for better caching
    const cacheKey = `${userLocation.lat.toFixed(4)}_${userLocation.lng.toFixed(4)}_${category}_${searchQuery}`;
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Return cached results immediately
        return cached.data;
    }

    return new Promise((resolve) => {
        try {
            const location = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            const map = new google.maps.Map(document.createElement('div'));
            const service = new google.maps.places.PlacesService(map);

            // ULTRA FAST: Always use text search when query exists (faster than nearbySearch)
            if (searchQuery.trim()) {
                const request = {
                    query: searchQuery,
                    location: location,
                    radius: 5000
                };

                service.textSearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        // ULTRA FAST: Format immediately without fetching details
                        const places = results.slice(0, 20).map((place, index) => 
                            formatPlaceBasic(place, userLocation, index)
                        );
                        // Cache results for instant future access
                        placesCache.set(cacheKey, { data: places, timestamp: Date.now() });
                        resolve(places);
                    } else {
                        resolve([]);
                    }
                });
            } else if (category !== 'all') {
                // Fallback: Use nearbySearch only if no search query and category is not 'all'
                const type = categoryToPlaceType[category];
                if (type) {
                    const request = {
                        location: location,
                        radius: 5000,
                        type: [type]
                    };

                    service.nearbySearch(request, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                            const places = results.slice(0, 20).map((place, index) => 
                                formatPlaceBasic(place, userLocation, index)
                            );
                            placesCache.set(cacheKey, { data: places, timestamp: Date.now() });
                            resolve(places);
                        } else {
                            resolve([]);
                        }
                    });
                } else {
                    resolve([]);
                }
            } else {
                // 'all' category - show all nearby places
                const request = {
                    location: location,
                    radius: 5000
                };

                service.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        const places = results.slice(0, 20).map((place, index) => 
                            formatPlaceBasic(place, userLocation, index)
                        );
                        placesCache.set(cacheKey, { data: places, timestamp: Date.now() });
                        resolve(places);
                    } else {
                        resolve([]);
                    }
                });
            }
        } catch (error) {
            console.error('Error fetching places:', error);
            resolve([]);
        }
    });
};

// FAST: Format place with BASIC info only (no API call)
const formatPlaceBasic = (place, userLocation, index) => {
    const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        place.geometry.location.lat(),
        place.geometry.location.lng()
    );

    // Determine category
    let placeCategory = 'other';
    const types = place.types || [];
    if (types.includes('supermarket') || types.includes('grocery_or_supermarket')) {
        placeCategory = 'grocery';
    } else if (types.includes('gym')) {
        placeCategory = 'gym';
    } else if (types.includes('restaurant') || types.includes('food')) {
        placeCategory = 'restaurant';
    } else if (types.includes('hospital')) {
        placeCategory = 'hospital';
    } else if (types.includes('school') || types.includes('university')) {
        placeCategory = 'school';
    } else if (types.includes('cafe')) {
        placeCategory = 'cafe';
    } else if (types.includes('gas_station')) {
        placeCategory = 'gas';
    } else if (types.includes('shopping_mall') || types.includes('store')) {
        placeCategory = 'shopping';
    }

    // Get photo quickly
    let photoUrl = null;
    if (place.photos && place.photos[0]) {
        photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
    }

    return {
        id: place.place_id || `place_${index}`,
        name: place.name,
        category: placeCategory,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        rating: place.rating || 0,
        totalRatings: place.user_ratings_total || 0,
        distance: distance,
        address: place.vicinity || place.formatted_address || 'Address not available',
        popular: (place.rating || 0) >= 4.5,
        image: getCategoryEmoji(placeCategory),
        placeId: place.place_id,
        photo: photoUrl,
        // Full details will be loaded on demand
        phone: null,
        website: null,
        hours: null,
        isOpen: null,
        priceLevel: place.price_level || null
    };
};

// Get full place details ON DEMAND (only when clicked)
const getPlaceDetails = (placeId, service) => {
    return new Promise((resolve) => {
        const request = {
            placeId: placeId,
            fields: [
                'name', 'formatted_address', 'formatted_phone_number', 'international_phone_number',
                'opening_hours', 'rating', 'user_ratings_total', 'website', 'photos', 'geometry',
                'types', 'price_level', 'reviews', 'vicinity'
            ]
        };

        service.getDetails(request, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                resolve(place);
            } else {
                resolve(null);
            }
        });
    });
};

// Enhance place with full details
const enhancePlaceWithDetails = async (place, userLocation) => {
    if (!place.placeId || typeof google === 'undefined' || !google.maps || !google.maps.places) {
        return place;
    }

    try {
        const map = new google.maps.Map(document.createElement('div'));
        const service = new google.maps.places.PlacesService(map);
        const details = await getPlaceDetails(place.placeId, service);

        if (details) {
            // Get opening hours
            let hours = null;
            let isOpen = null;
            if (details.opening_hours) {
                isOpen = details.opening_hours.isOpen ? details.opening_hours.isOpen() : null;
                if (details.opening_hours.weekday_text) {
                    hours = details.opening_hours.weekday_text;
                } else {
                    hours = isOpen ? 'Open Now' : 'Closed';
                }
            }

            // Get better photo
            let photoUrl = place.photo;
            if (details.photos && details.photos[0]) {
                photoUrl = details.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 });
            }

            return {
                ...place,
                phone: details.formatted_phone_number || details.international_phone_number || null,
                address: details.formatted_address || place.address,
                website: details.website || null,
                hours: hours,
                isOpen: isOpen,
                photo: photoUrl,
                reviews: details.reviews ? details.reviews.slice(0, 3) : []
            };
        }
    } catch (error) {
        console.error('Error enhancing place:', error);
    }

    return place;
};

// Google Maps Style Search Component
const GoogleMapsSearchBar = ({ value, onChange, onSearch, isLoading, userLocation }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [autocompleteService, setAutocompleteService] = useState(null);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            setAutocompleteService(new google.maps.places.AutocompleteService());
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        const query = e.target.value;
        onChange(query);

        if (query.length > 2 && autocompleteService && userLocation) {
            const request = {
                input: query,
                location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
                radius: 5000
            };

            autocompleteService.getPlacePredictions(request, (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                    setSuggestions(predictions.slice(0, 5));
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                }
            });
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        onChange(suggestion.description);
        setShowSuggestions(false);
        onSearch(suggestion.description);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            setShowSuggestions(false);
            onSearch(value);
        }
    };

    return (
        <div className="relative w-full" ref={suggestionsRef}>
            <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    onFocus={() => value.length > 2 && setShowSuggestions(true)}
                    placeholder="Search for places..."
                    className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {isLoading && (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    )}
                    {value && !isLoading && (
                        <button
                            onClick={() => {
                                onChange('');
                                setShowSuggestions(false);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="h-4 w-4 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={suggestion.place_id}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                    {suggestion.structured_formatting.main_text}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {suggestion.structured_formatting.secondary_text}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Interactive Map Component with optimized loading
const InteractiveMap = ({ userLocation, places, selectedPlace, onPlaceSelect }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        if (!userLocation || typeof google === 'undefined' || !google.maps) return;

        if (!mapInstanceRef.current) {
            const map = new google.maps.Map(mapRef.current, {
                center: { lat: userLocation.lat, lng: userLocation.lng },
                zoom: 14,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'on' }]
                    }
                ]
            });

            // Add user location marker
            new google.maps.Marker({
                position: { lat: userLocation.lat, lng: userLocation.lng },
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                },
                title: 'Your Location'
            });

            mapInstanceRef.current = map;
        }

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add place markers
        places.forEach(place => {
            const marker = new google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: mapInstanceRef.current,
                title: place.name,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="14" fill="#4285F4" stroke="#ffffff" stroke-width="2"/>
                            <text x="16" y="20" font-size="16" text-anchor="middle" fill="white">${place.image}</text>
                        </svg>
                    `)}`,
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16)
                }
            });

            marker.addListener('click', () => {
                onPlaceSelect(place);
            });

            markersRef.current.push(marker);
        });

        // Center map on selected place
        if (selectedPlace) {
            mapInstanceRef.current.setCenter({ lat: selectedPlace.lat, lng: selectedPlace.lng });
            mapInstanceRef.current.setZoom(16);
        }
    }, [userLocation, places, selectedPlace, onPlaceSelect]);

    if (!userLocation) {
        return (
            <div className="relative w-full h-full bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
                    <p className="text-gray-600 dark:text-gray-300">Loading map...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <div ref={mapRef} className="w-full h-full" />
            <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-sm">
                    <Locate className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{places.length} places</span>
                </div>
            </div>
        </div>
    );
};

export default function NearbyPlaces() {
    const { userProfile } = useAuth();
    const { theme } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [currentLocationName, setCurrentLocationName] = useState(null);
    const [places, setPlaces] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [locationError, setLocationError] = useState(null);

    // Get user's current location with high accuracy
    const getUserLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLocationError(null);
        toast.loading('Getting your location...', { id: 'location' });

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };

                // Reverse geocode to get address
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
                toast.success('Location found!', { id: 'location' });
            },
            (error) => {
                console.warn('Geolocation error:', error);
                let errorMessage = 'Location access denied. ';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage += 'Please enable location permissions.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage += 'Location unavailable.';
                } else if (error.code === error.TIMEOUT) {
                    errorMessage += 'Location request timed out.';
                }
                setLocationError(errorMessage);
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

    // Get location on mount
    useEffect(() => {
        getUserLocation();
    }, [getUserLocation]);

    // INSTANT: Show results immediately - optimized for speed
    useEffect(() => {
        const loadPlaces = async () => {
            if (!userLocation || !GOOGLE_MAPS_API_KEY) return;

            // Check cache first and show immediately
            const cacheKey = `${userLocation.lat.toFixed(4)}_${userLocation.lng.toFixed(4)}_${selectedCategory}_${searchQuery}`;
            const cached = placesCache.get(cacheKey);
            
            // INSTANT: Show cached results immediately (no loading state)
            if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
                setPlaces(cached.data);
                setIsLoading(false);
                setIsSearching(false);
                return; // Exit early - we have cached data
            }

            // For new searches, show loading only briefly
            setIsLoading(true);
            setIsSearching(true);

            // Wait for Google Maps API (minimal wait)
            let attempts = 0;
            while (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                if (attempts >= 3) {
                    toast.error('Google Maps API failed to load');
                    setIsLoading(false);
                    setIsSearching(false);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 30));
                attempts++;
            }

            // Fetch new results
            try {
                const startTime = Date.now();
                // ULTRA FAST: Use text search for categories (faster than nearbySearch with type)
                const results = await fetchNearbyPlaces(userLocation, selectedCategory, searchQuery);
                const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
                
                // Show results immediately
                setPlaces(results);
                
                if (results.length > 0) {
                    // Only show toast for searches with results
                    if (searchQuery && results.length > 0) {
                        toast.success(`${results.length} places found`, { duration: 600 });
                    }
                } else {
                    toast('No places found. Try a different search.', { icon: 'ℹ️', duration: 1200 });
                }
            } catch (error) {
                console.error('Error loading places:', error);
                toast.error('Failed to load places');
            } finally {
                setIsLoading(false);
                setIsSearching(false);
            }
        };

        // INSTANT: No delay - execute immediately
        loadPlaces();
    }, [userLocation, selectedCategory, searchQuery]);

    // Filter places
    const filteredPlaces = useMemo(() => {
        return places.sort((a, b) => a.distance - b.distance);
    }, [places]);

    // Get directions URL
    const getDirectionsUrl = (place) => {
        if (!userLocation) return '#';
        return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${place.lat},${place.lng}`;
    };

    // Handle search
    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    // Load full details when place is selected (on demand)
    const [enhancedPlace, setEnhancedPlace] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        const loadFullDetails = async () => {
            if (!selectedPlace || !selectedPlace.placeId) {
                setEnhancedPlace(selectedPlace);
                return;
            }

            // Check if we already have full details
            if (selectedPlace.phone && selectedPlace.website !== undefined) {
                setEnhancedPlace(selectedPlace);
                return;
            }

            setLoadingDetails(true);
            try {
                const enhanced = await enhancePlaceWithDetails(selectedPlace, userLocation);
                setEnhancedPlace(enhanced);
            } catch (error) {
                console.error('Error loading details:', error);
                setEnhancedPlace(selectedPlace);
            } finally {
                setLoadingDetails(false);
            }
        };

        loadFullDetails();
    }, [selectedPlace, userLocation]);

    if (isLoading && !userLocation) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Finding Your Location</h2>
                    <p className="text-gray-600 dark:text-gray-300">Please allow location access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Google Maps Style Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        {/* Logo/Title */}
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
                                <MapPin className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Nearby Places</h1>
                                {currentLocationName && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                        {currentLocationName.split(',')[0]}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Google Maps Style Search Bar */}
                        <div className="flex-1 max-w-2xl">
                            <GoogleMapsSearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                onSearch={handleSearch}
                                isLoading={isSearching}
                                userLocation={userLocation}
                            />
                        </div>

                        {/* Location Button */}
                        <button
                            onClick={getUserLocation}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center gap-2 shadow-lg"
                            title="Use current location"
                        >
                            <Target className="h-4 w-4" />
                            <span className="hidden sm:inline">My Location</span>
                        </button>
                    </div>

                    {/* Category Filters - Instant Text Search */}
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map((category) => {
                            const Icon = category.icon;
                            const isSelected = selectedCategory === category.id;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => {
                                        // FAST: Immediately search using text query (faster than type filter)
                                        const searchQuery = categoryToSearchQuery[category.id] || '';
                                        setSearchQuery(searchQuery);
                                        setSelectedCategory(category.id);
                                        // Trigger immediate search - no delay
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                                        isSelected
                                            ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{category.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto p-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredPlaces.length}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Places</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {filteredPlaces.length > 0 ? (filteredPlaces.reduce((sum, p) => sum + p.rating, 0) / filteredPlaces.length).toFixed(1) : '0.0'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {filteredPlaces.length > 0 ? filteredPlaces[0].distance.toFixed(1) : '0.0'} km
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Nearest</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {filteredPlaces.filter(p => p.isOpen).length}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Open Now</p>
                    </div>
                </div>

                {/* Map and Places Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Map */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Map View</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Locate className="h-4 w-4" />
                                    <span>{filteredPlaces.length} places shown</span>
                                </div>
                            </div>
                            <div className="h-[600px] rounded-xl overflow-hidden relative">
                                <InteractiveMap
                                    userLocation={userLocation}
                                    places={filteredPlaces}
                                    selectedPlace={selectedPlace}
                                    onPlaceSelect={setSelectedPlace}
                                />
                                
                                {/* Useful Features at Bottom of Map - Smaller & Transparent */}
                                <div className="absolute bottom-3 left-3 right-3 z-10">
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-2">
                                        <div className="grid grid-cols-4 gap-2">
                                            {/* Quick Actions - Smaller */}
                                            <button
                                                onClick={() => {
                                                    if (userLocation) {
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${userLocation.lat},${userLocation.lng}`, '_blank');
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-1 p-1.5 bg-blue-500/20 dark:bg-blue-500/10 rounded-md hover:bg-blue-500/30 dark:hover:bg-blue-500/20 transition-colors group"
                                                title="Open Maps"
                                            >
                                                <div className="w-6 h-6 bg-blue-600/80 dark:bg-blue-500/80 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <MapPin className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Maps</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    if (selectedPlace) {
                                                        window.open(getDirectionsUrl(selectedPlace), '_blank');
                                                    } else {
                                                        toast('Select a place first', { icon: '📍', duration: 1000 });
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-1 p-1.5 bg-green-500/20 dark:bg-green-500/10 rounded-md hover:bg-green-500/30 dark:hover:bg-green-500/20 transition-colors group"
                                                title="Get Directions"
                                            >
                                                <div className="w-6 h-6 bg-green-600/80 dark:bg-green-500/80 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Navigation className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Route</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const openPlaces = filteredPlaces.filter(p => p.isOpen !== false);
                                                    if (openPlaces.length > 0) {
                                                        setPlaces(openPlaces);
                                                        toast.success(`${openPlaces.length} open places`, { duration: 1000 });
                                                    } else {
                                                        toast('No open places', { icon: 'ℹ️', duration: 1000 });
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-1 p-1.5 bg-orange-500/20 dark:bg-orange-500/10 rounded-md hover:bg-orange-500/30 dark:hover:bg-orange-500/20 transition-colors group"
                                                title="Show Open Places"
                                            >
                                                <div className="w-6 h-6 bg-orange-600/80 dark:bg-orange-500/80 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Clock className="h-3.5 w-3.5 text-white" />
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Open</span>
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const sortedByRating = [...filteredPlaces].sort((a, b) => b.rating - a.rating);
                                                    setPlaces(sortedByRating);
                                                    toast.success('Sorted by rating', { duration: 1000 });
                                                }}
                                                className="flex flex-col items-center gap-1 p-1.5 bg-yellow-500/20 dark:bg-yellow-500/10 rounded-md hover:bg-yellow-500/30 dark:hover:bg-yellow-500/20 transition-colors group"
                                                title="Top Rated"
                                            >
                                                <div className="w-6 h-6 bg-yellow-600/80 dark:bg-yellow-500/80 rounded flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Star className="h-3.5 w-3.5 text-white fill-white" />
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">Top</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Places List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {filteredPlaces.length} {selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory)?.name : 'Results'}
                            </h2>
                            {isLoading && (
                                <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
                            )}
                        </div>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {filteredPlaces.map((place) => {
                                const category = categories.find(cat => cat.id === place.category);
                                const isSelected = selectedPlace?.id === place.id;

                                return (
                                    <div
                                        key={place.id}
                                        onClick={() => setSelectedPlace(place)}
                                        className={`bg-white dark:bg-gray-800 rounded-xl p-4 cursor-pointer transition-all border-2 ${
                                            isSelected
                                                ? 'border-blue-500 shadow-lg'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {place.photo ? (
                                                <img
                                                    src={place.photo}
                                                    alt={place.name}
                                                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className={`w-20 h-20 ${category?.bgColor || 'bg-gradient-to-br from-blue-500 to-cyan-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                                    <span className="text-2xl">{place.image}</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white truncate">{place.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{place.rating}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">({place.totalRatings})</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">{place.address}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1">
                                                        <Navigation className="h-3 w-3" />
                                                        {place.distance.toFixed(1)} km
                                                    </span>
                                                    {place.isOpen !== null && (
                                                        <span className={place.isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                            {place.isOpen ? 'Open' : 'Closed'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Place Details Modal - FAST with on-demand loading */}
            {selectedPlace && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => {
                    setSelectedPlace(null);
                    setEnhancedPlace(null);
                }}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 flex-1">
                                    {(enhancedPlace?.photo || selectedPlace.photo) && (
                                        <img
                                            src={enhancedPlace?.photo || selectedPlace.photo}
                                            alt={selectedPlace.name}
                                            className="w-20 h-20 rounded-xl object-cover"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPlace.name}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Star className="h-5 w-5 text-yellow-500 fill-current" />
                                            <span className="font-semibold text-gray-900 dark:text-white">{selectedPlace.rating}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">({selectedPlace.totalRatings} reviews)</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedPlace(null);
                                        setEnhancedPlace(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {loadingDetails && (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Loading details...</span>
                                </div>
                            )}

                            {/* Address - Always show immediately */}
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                                    <p className="font-medium text-gray-900 dark:text-white">{enhancedPlace?.address || selectedPlace.address}</p>
                                </div>
                            </div>

                            {/* Phone - Load on demand */}
                            {(enhancedPlace?.phone || (!loadingDetails && selectedPlace.phone)) && (
                                <div className="flex items-start gap-3">
                                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                                        <a href={`tel:${enhancedPlace?.phone || selectedPlace.phone}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                            {enhancedPlace?.phone || selectedPlace.phone}
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Hours - Load on demand */}
                            {(enhancedPlace?.hours || (!loadingDetails && selectedPlace.hours)) && (
                                <div className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hours</p>
                                        {Array.isArray(enhancedPlace?.hours || selectedPlace.hours) ? (
                                            <div className="space-y-1">
                                                {(enhancedPlace?.hours || selectedPlace.hours).map((day, i) => (
                                                    <p key={i} className="text-sm font-medium text-gray-900 dark:text-white">{day}</p>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="font-medium text-gray-900 dark:text-white">{enhancedPlace?.hours || selectedPlace.hours}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Website - Load on demand */}
                            {enhancedPlace?.website && (
                                <div className="flex items-start gap-3">
                                    <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Website</p>
                                        <a
                                            href={enhancedPlace.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Visit Website
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <a
                                    href={getDirectionsUrl(selectedPlace)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Navigation className="h-5 w-5" />
                                    Directions
                                </a>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                    View on Maps
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
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
