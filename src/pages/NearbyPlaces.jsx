// src/pages/NearbyPlaces.jsx - EXACT Google Maps Layout & Features
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    MapPin, Search, Navigation, Store, Dumbbell, UtensilsCrossed, Activity,
    GraduationCap, ShoppingBag, Coffee, Car, X, ExternalLink, ChevronRight,
    Star, Clock, Phone, Home, Locate, Globe, Loader2, Target, RotateCw,
    Layers, Navigation2, ArrowUp, Compass, Plus, Minus, Menu, Share2,
    Bookmark, Send, Bike, Bus, PersonStanding, Volume2, VolumeX, List,
    AlertTriangle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const categories = [
    { id: 'all', name: 'All', icon: MapPin },
    { id: 'grocery', name: 'Grocery', icon: ShoppingBag },
    { id: 'restaurant', name: 'Restaurants', icon: UtensilsCrossed },
    { id: 'cafe', name: 'Cafes', icon: Coffee },
    { id: 'gas', name: 'Gas', icon: Car },
    { id: 'hospital', name: 'Medical', icon: Activity },
    { id: 'school', name: 'Schools', icon: GraduationCap },
    { id: 'gym', name: 'Gyms', icon: Dumbbell },
    { id: 'shopping', name: 'Shopping', icon: Store },
];

const categoryToPlaceType = {
    'grocery': 'supermarket', 'gym': 'gym', 'restaurant': 'restaurant',
    'hospital': 'hospital', 'school': 'school', 'cafe': 'cafe',
    'gas': 'gas_station', 'shopping': 'shopping_mall'
};

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const placesCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const getCategoryEmoji = (category) => {
    const emojis = { 'grocery': '🛒', 'gym': '💪', 'restaurant': '🍽️', 'hospital': '🏥', 'school': '🎓', 'cafe': '☕', 'gas': '⛽', 'shopping': '🛍️', 'other': '📍' };
    return emojis[category] || '📍';
};

const fetchNearbyPlaces = async (userLocation, category, searchQuery) => {
    if (!userLocation || typeof google === 'undefined' || !google.maps?.places) return [];

    const cacheKey = `${userLocation.lat.toFixed(4)}_${userLocation.lng.toFixed(4)}_${category}_${searchQuery}`;
    const cached = placesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;

    return new Promise((resolve) => {
        try {
            const location = new google.maps.LatLng(userLocation.lat, userLocation.lng);
            const map = new google.maps.Map(document.createElement('div'));
            const service = new google.maps.places.PlacesService(map);

            const processResults = (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    const places = results.slice(0, 20).map((place, index) => ({
                        id: place.place_id || `place_${index}`,
                        name: place.name,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        rating: place.rating || 0,
                        totalRatings: place.user_ratings_total || 0,
                        distance: calculateDistance(
                            userLocation.lat, userLocation.lng,
                            place.geometry.location.lat(), place.geometry.location.lng()
                        ),
                        address: place.vicinity || place.formatted_address || 'Address not available',
                        image: getCategoryEmoji(
                            place.types?.includes('supermarket') ? 'grocery' :
                            place.types?.includes('restaurant') ? 'restaurant' :
                            place.types?.includes('cafe') ? 'cafe' :
                            place.types?.includes('hospital') ? 'hospital' :
                            place.types?.includes('school') ? 'school' :
                            place.types?.includes('gym') ? 'gym' :
                            place.types?.includes('gas_station') ? 'gas' :
                            place.types?.includes('shopping_mall') ? 'shopping' : 'other'
                        ),
                        photo: place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || null,
                        isOpen: place.opening_hours?.isOpen?.() ?? null
                    }));
                        placesCache.set(cacheKey, { data: places, timestamp: Date.now() });
                        resolve(places);
                    } else {
                        resolve([]);
                    }
            };

            if (searchQuery.trim()) {
                service.textSearch({ query: searchQuery, location, radius: 5000 }, processResults);
            } else if (category !== 'all') {
                const type = categoryToPlaceType[category];
                if (type) service.nearbySearch({ location, radius: 5000, type: [type] }, processResults);
                else resolve([]);
            } else {
                service.nearbySearch({ location, radius: 5000 }, processResults);
            }
        } catch (error) {
            console.error('Error fetching places:', error);
            resolve([]);
        }
    });
};

// Google Maps Component
const GoogleMap = ({ userLocation, places, selectedPlace, onPlaceSelect }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        if (!userLocation || typeof google === 'undefined' || !google.maps) return;

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                center: { lat: userLocation.lat, lng: userLocation.lng },
                zoom: 14
            });

            new google.maps.Marker({
                position: { lat: userLocation.lat, lng: userLocation.lng },
                map: mapInstanceRef.current,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                },
                title: 'You are here'
            });
        }

        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        places.forEach(place => {
            const marker = new google.maps.Marker({
                position: { lat: place.lat, lng: place.lng },
                map: mapInstanceRef.current,
                title: place.name,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="14" fill="#EA4335" stroke="#fff" stroke-width="2"/>
                            <text x="16" y="21" font-size="16" text-anchor="middle" fill="white">${place.image}</text>
                        </svg>
                    `)}`,
                    scaledSize: new google.maps.Size(32, 32)
                }
            });
            marker.addListener('click', () => onPlaceSelect(place));
            markersRef.current.push(marker);
        });

        if (selectedPlace) {
            mapInstanceRef.current.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
            mapInstanceRef.current.setZoom(16);
        }
    }, [userLocation, places, selectedPlace, onPlaceSelect]);

    return <div ref={mapRef} className="w-full h-full" />;
};

export default function NearbyPlaces() {
    const { userProfile } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [currentLocationName, setCurrentLocationName] = useState(null);
    const [places, setPlaces] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const getUserLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation not supported');
            setIsLoading(false);
            return;
        }

        toast.loading('Getting your location...', { id: 'location' });
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`,
                        { headers: { 'User-Agent': 'Family-Housing-Hub/1.0' } }
                    );
                    const data = await response.json();
                    if (data?.display_name) setCurrentLocationName(data.display_name);
                } catch (e) {}

                setUserLocation(location);
                toast.success('Location found!', { id: 'location' });
            },
            (error) => {
                toast.error('Please enable location access', { id: 'location', duration: 5000 });
                setIsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    }, []);

    useEffect(() => { getUserLocation(); }, [getUserLocation]);

    useEffect(() => {
        const loadPlaces = async () => {
            if (!userLocation) return;
            setIsLoading(true);

            let attempts = 0;
            while (typeof google === 'undefined' || !google.maps?.places) {
                if (attempts >= 5) {
                    toast.error('Google Maps blocked. Disable Brave Shields and reload.', { duration: 8000 });
                    setIsLoading(false);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            try {
                const results = await fetchNearbyPlaces(userLocation, selectedCategory, searchQuery);
                setPlaces(results);
                    if (searchQuery && results.length > 0) {
                    toast.success(`${results.length} places found`, { duration: 1000 });
                }
            } catch (error) {
                console.error('Error loading places:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlaces();
    }, [userLocation, selectedCategory, searchQuery]);

    const filteredPlaces = useMemo(() => places.sort((a, b) => a.distance - b.distance), [places]);
    const getDirectionsUrl = (place) => userLocation ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${place.lat},${place.lng}` : '#';

    if (isLoading && !userLocation) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding Your Location</h2>
                    <p className="text-gray-600">Please allow location access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            {/* EXACT Google Maps Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm z-50">
                <div className="px-4 py-3">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-2 hover:bg-gray-100 rounded-full">
                            <Menu className="h-6 w-6 text-gray-700" />
                        </button>

                        <div className="flex-1 max-w-3xl relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search Google Maps"
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md focus:shadow-md focus:outline-none text-gray-900"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full">
                                    <X className="h-4 w-4 text-gray-500" />
                                </button>
                            )}
                        </div>

                        <button onClick={getUserLocation} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            <span>Your location</span>
                        </button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-hide">
                        {categories.map((category) => {
                            const Icon = category.icon;
                            const isSelected = selectedCategory === category.id;
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => {
                                        setSelectedCategory(category.id);
                                        setSearchQuery(category.id === 'all' ? '' : `${category.name.toLowerCase()} near me`);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                                        isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="text-sm">{category.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content - Sidebar LEFT + Map RIGHT (EXACT Google Maps) */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR - Like Google Maps */}
                {!sidebarCollapsed && (
                    <div className="w-96 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h2 className="text-base font-medium text-gray-900">
                                {selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory)?.name : 'Places'}
                            </h2>
                            <p className="text-sm text-gray-600 mt-0.5">{filteredPlaces.length} results</p>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {filteredPlaces.map((place) => {
                                const isSelected = selectedPlace?.id === place.id;
                                return (
                                    <div
                                        key={place.id}
                                        onClick={() => setSelectedPlace(place)}
                                        className={`px-4 py-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            {place.photo ? (
                                                <img src={place.photo} alt={place.name} className="w-20 h-20 rounded object-cover" />
                                            ) : (
                                                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                                                    <span className="text-3xl">{place.image}</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 truncate">{place.name}</h3>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} className={`h-3 w-3 ${i < Math.floor(place.rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                                                    ))}
                                                    <span className="text-xs text-gray-700 ml-1">{place.rating}</span>
                                                    <span className="text-xs text-gray-500">({place.totalRatings})</span>
                                                </div>
                                                <p className="text-xs text-gray-600 truncate mt-1">{place.address}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-600 flex items-center gap-1">
                                                        <Navigation className="h-3 w-3" />
                                                        {place.distance.toFixed(1)} km
                                                    </span>
                                                    {place.isOpen !== null && (
                                                        <span className={`text-xs font-medium ${place.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                                                            {place.isOpen ? '● Open' : '● Closed'}
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
                )}

                {/* RIGHT SIDE - BIG MAP (EXACT Google Maps) */}
                <div className="flex-1 relative">
                    <GoogleMap
                        userLocation={userLocation}
                        places={filteredPlaces}
                        selectedPlace={selectedPlace}
                        onPlaceSelect={setSelectedPlace}
                    />
                </div>
            </div>

            {/* Bottom Sheet - Place Details (EXACT Google Maps) */}
            {selectedPlace && (
                <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-[200] max-h-[70vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200">
                        {selectedPlace.photo && (
                            <img src={selectedPlace.photo} alt={selectedPlace.name} className="w-full h-48 object-cover" />
                        )}
                        <div className="px-6 py-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-semibold text-gray-900">{selectedPlace.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-base font-semibold">{selectedPlace.rating}</span>
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`h-4 w-4 ${i < Math.floor(selectedPlace.rating) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                                        ))}
                                        <span className="text-sm text-gray-600">({selectedPlace.totalRatings})</span>
                                        {selectedPlace.isOpen !== null && (
                                            <span className={`text-sm font-semibold ml-2 ${selectedPlace.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                                                {selectedPlace.isOpen ? '● Open' : '● Closed'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedPlace(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="h-6 w-6 text-gray-500" />
                                </button>
                            </div>
                            </div>
                        </div>

                    <div className="px-6 py-4 space-y-4">
                        {/* Action Buttons */}
                        <div className="grid grid-cols-5 gap-2">
                            <button
                                onClick={() => window.open(getDirectionsUrl(selectedPlace), '_blank')}
                                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg"
                            >
                                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                                    <Navigation className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-medium text-gray-700">Directions</span>
                            </button>

                            <button className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Bookmark className="h-6 w-6 text-gray-700" />
                                </div>
                                <span className="text-xs font-medium text-gray-700">Save</span>
                            </button>

                            <button className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <MapPin className="h-6 w-6 text-gray-700" />
                            </div>
                                <span className="text-xs font-medium text-gray-700">Nearby</span>
                            </button>

                            <button className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Send className="h-6 w-6 text-gray-700" />
                                </div>
                                <span className="text-xs font-medium text-gray-700">Send</span>
                            </button>

                            <button className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Share2 className="h-6 w-6 text-gray-700" />
                                </div>
                                <span className="text-xs font-medium text-gray-700">Share</span>
                            </button>
                        </div>

                        <div className="flex items-start gap-3 py-2">
                            <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                                    <div>
                                <p className="text-sm text-gray-600">Address</p>
                                <p className="text-base text-gray-900 font-medium">{selectedPlace.address}</p>
                                    </div>
                                </div>

                        <div className="flex items-start gap-3 py-2">
                            <Navigation className="h-5 w-5 text-gray-600 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-600">Distance</p>
                                <p className="text-base text-gray-900 font-medium">{selectedPlace.distance.toFixed(2)} km from your location</p>
                            </div>
                        </div>

                        <button
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`, '_blank')}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-blue-600 rounded-lg font-medium hover:bg-gray-50"
                        >
                            <ExternalLink className="h-5 w-5" />
                            View in Google Maps
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
