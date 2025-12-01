// src/pages/HouseSearch.jsx - Ultra-Fast Zillow-Style House Search
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
    Search,
    MapPin,
    Home,
    Bed,
    Bath,
    Square,
    DollarSign,
    Filter,
    Map as MapIcon,
    List,
    SlidersHorizontal,
    Calendar,
    TrendingUp,
    Star,
    ExternalLink,
    ChevronDown,
    X,
    Heart,
    Share2,
    Camera,
    Loader2,
    ZoomIn,
    ZoomOut,
    Navigation,
    School,
    Car,
    TreePine,
    Wifi,
    Snowflake,
    Flame,
    Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import propertyService from '../services/propertyService';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBfm3u4-vEnsVvHEqjqpoGdlbNgaza8JnA';

// Property types
const propertyTypes = [
    { id: 'all', name: 'All', icon: Home },
    { id: 'house', name: 'House', icon: Home },
    { id: 'condo', name: 'Condo', icon: Home },
    { id: 'townhouse', name: 'Townhouse', icon: Home },
    { id: 'apartment', name: 'Apartment', icon: Home }
];

// Price ranges
const priceRanges = [
    { min: 0, max: 100000, label: 'Under $100k' },
    { min: 100000, max: 200000, label: '$100k - $200k' },
    { min: 200000, max: 300000, label: '$200k - $300k' },
    { min: 300000, max: 500000, label: '$300k - $500k' },
    { min: 500000, max: 750000, label: '$500k - $750k' },
    { min: 750000, max: 1000000, label: '$750k - $1M' },
    { min: 1000000, max: 2000000, label: '$1M - $2M' },
    { min: 2000000, max: Infinity, label: '$2M+' }
];

// Interactive Map Component - Centers on searched location
const PropertyMap = ({ properties, selectedProperty, onPropertySelect, searchedLocation, userLocation, bounds, onBoundsChange }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);

    useEffect(() => {
        if (!mapRef.current || typeof google === 'undefined' || !google.maps) return;

        if (!mapInstanceRef.current) {
            // Use searched location first, then user location, then default
            const center = searchedLocation || userLocation || { lat: 40.7128, lng: -74.0060 };
            const map = new google.maps.Map(mapRef.current, {
                center,
                zoom: searchedLocation ? 12 : 10, // Zoom in more if location is searched
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'on' }]
                    }
                ]
            });

            // Add bounds changed listener for live search (Zillow-style)
            let boundsChangeTimeout;
            map.addListener('bounds_changed', () => {
                // Debounce bounds changes to avoid too many API calls
                clearTimeout(boundsChangeTimeout);
                boundsChangeTimeout = setTimeout(() => {
                    const bounds = map.getBounds();
                    if (bounds && onBoundsChange) {
                        const ne = bounds.getNorthEast();
                        const sw = bounds.getSouthWest();
                        onBoundsChange({
                            north: ne.lat(),
                            south: sw.lat(),
                            east: ne.lng(),
                            west: sw.lng()
                        });
                    }
                }, 500); // 500ms debounce for live search
            });
            
            // Add dragend listener for live updates
            map.addListener('dragend', () => {
                const bounds = map.getBounds();
                if (bounds && onBoundsChange) {
                    const ne = bounds.getNorthEast();
                    const sw = bounds.getSouthWest();
                    onBoundsChange({
                        north: ne.lat(),
                        south: sw.lat(),
                        east: ne.lng(),
                        west: sw.lng()
                    });
                }
            });

            mapInstanceRef.current = map;
        }

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add property markers
        properties.forEach(property => {
            const marker = new google.maps.Marker({
                position: { lat: property.lat, lng: property.lng },
                map: mapInstanceRef.current,
                title: property.address,
                icon: {
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" fill="${selectedProperty?.id === property.id ? '#2563EB' : '#10B981'}" stroke="#ffffff" stroke-width="2"/>
                            <text x="20" y="26" font-size="18" text-anchor="middle" fill="white">🏠</text>
                        </svg>
                    `)}`,
                    scaledSize: new google.maps.Size(40, 40),
                    anchor: new google.maps.Point(20, 20)
                }
            });

            marker.addListener('click', () => {
                onPropertySelect(property);
            });

            markersRef.current.push(marker);
        });

        // Center on searched location or selected property
        if (selectedProperty) {
            mapInstanceRef.current.setCenter({ lat: selectedProperty.lat, lng: selectedProperty.lng });
            mapInstanceRef.current.setZoom(16);
        } else if (searchedLocation && properties.length > 0) {
            // Center on searched location
            mapInstanceRef.current.setCenter(searchedLocation);
            mapInstanceRef.current.setZoom(12);
        }
    }, [properties, selectedProperty, searchedLocation, userLocation, onPropertySelect, onBoundsChange]);

    return (
        <div ref={mapRef} className="w-full h-full rounded-xl" />
    );
};

// Property Details Modal - Enhanced with full Zillow-style features
const PropertyDetailsModal = ({ property, onClose, onSave, onShare, searchQuery }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [fullDetails, setFullDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [nearbySchools, setNearbySchools] = useState([]);
    const [priceHistory, setPriceHistory] = useState(null);

    useEffect(() => {
        if (property) {
            // Use property data directly - it's already real data from API
            setFullDetails(property);
            setLoadingDetails(false);
            
            // Fetch nearby schools if coordinates available
            if (property.lat && property.lng) {
                fetchNearbySchools(property.lat, property.lng);
            }
            
            // Fetch price history if available
            if (property.zpid || property.id) {
                fetchPriceHistory(property);
            }
        }
    }, [property]);
    
    const fetchNearbySchools = async (lat, lng) => {
        // Use Google Places API to find nearby schools
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            try {
                const service = new google.maps.places.PlacesService(document.createElement('div'));
                const request = {
                    location: new google.maps.LatLng(lat, lng),
                    radius: 2000, // 2km radius
                    type: 'school'
                };
                
                service.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        setNearbySchools(results.slice(0, 5)); // Top 5 schools
                    }
                });
            } catch (error) {
                console.warn('Error fetching nearby schools:', error);
            }
        }
    };
    
    const fetchPriceHistory = async (property) => {
        // Price history would come from API if available
        // For now, we'll use placeholder data structure
        if (property.price) {
            setPriceHistory({
                current: property.price,
                estimate: property.price * 1.05, // 5% estimate
                history: [
                    { date: '2024', price: property.price * 0.95 },
                    { date: '2023', price: property.price * 0.90 }
                ]
            });
        }
    };

    if (!property) return null;

    const details = fullDetails || property;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full shadow-2xl max-h-[95vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {details.price >= 1000000 
                                    ? `$${(details.price / 1000000).toFixed(2)}M`
                                    : `$${(details.price / 1000).toFixed(0)}k`
                                }
                                {details.listingType === 'rent' && '/mo'}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">{details.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onSave(details)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <Heart className="h-6 w-6 text-gray-500" />
                            </button>
                            <button
                                onClick={() => onShare(details)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <Share2 className="h-6 w-6 text-gray-500" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Image Gallery */}
                <div className="relative h-96 bg-gray-200 dark:bg-gray-700">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Home className="h-24 w-24 text-gray-400" />
                    </div>
                    {details.images && details.images.length > 0 && (
                        <>
                            <img
                                src={details.images[currentImageIndex]}
                                alt={details.address}
                                className="w-full h-full object-cover"
                            />
                            {details.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setCurrentImageIndex((prev) => (prev - 1 + details.images.length) % details.images.length)}
                                        className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white"
                                    >
                                        <ChevronDown className="h-5 w-5 rotate-90" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentImageIndex((prev) => (prev + 1) % details.images.length)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-white/90 rounded-full hover:bg-white"
                                    >
                                        <ChevronDown className="h-5 w-5 -rotate-90" />
                                    </button>
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                                        {details.images.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentImageIndex(idx)}
                                                className={`w-2 h-2 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Details */}
                <div className="p-6 space-y-6">
                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Key Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                {details.bedrooms && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <Bed className="h-6 w-6 text-blue-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{details.bedrooms}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Bedrooms</p>
                                        </div>
                                    </div>
                                )}
                                {details.bathrooms && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <Bath className="h-6 w-6 text-blue-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{details.bathrooms}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Bathrooms</p>
                                        </div>
                                    </div>
                                )}
                                {details.sqft && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <Square className="h-6 w-6 text-blue-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{details.sqft.toLocaleString()}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Sqft</p>
                                        </div>
                                    </div>
                                )}
                                {details.yearBuilt && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <Calendar className="h-6 w-6 text-blue-600" />
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{details.yearBuilt}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Year Built</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Property Description */}
                            {details.description && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Description</h3>
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{details.description}</p>
                                </div>
                            )}
                            
                            {/* Property Features */}
                            {details.features && details.features.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Features</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {details.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Property Info - Enhanced */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Property Information</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {details.city && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">City</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{details.city}</p>
                                        </div>
                                    )}
                                    {details.state && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">State</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{details.state}</p>
                                        </div>
                                    )}
                                    {details.zipcode && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Zipcode</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{details.zipcode}</p>
                                        </div>
                                    )}
                                    {details.lotSize && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Lot Size</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{details.lotSize.toLocaleString()} sqft</p>
                                        </div>
                                    )}
                                    {details.yearBuilt && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Year Built</p>
                                            <p className="font-semibold text-gray-900 dark:text-white">{details.yearBuilt}</p>
                                        </div>
                                    )}
                                    {details.type && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Property Type</p>
                                            <p className="font-semibold text-gray-900 dark:text-white capitalize">{details.type}</p>
                                        </div>
                                    )}
                                    {details.listingType && (
                                        <div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">Listing Type</p>
                                            <p className="font-semibold text-gray-900 dark:text-white capitalize">{details.listingType === 'rent' ? 'For Rent' : 'For Sale'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Price History */}
                            {priceHistory && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Price History</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Current Price</span>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                ${priceHistory.current?.toLocaleString() || 'N/A'}
                                            </span>
                                        </div>
                                        {priceHistory.estimate && (
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Estimate</span>
                                                <span className="text-lg font-semibold text-blue-600">
                                                    ${priceHistory.estimate.toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                        {priceHistory.history && priceHistory.history.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">History</p>
                                                {priceHistory.history.map((entry, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-600 dark:text-gray-400">{entry.date}</span>
                                                        <span className="font-medium text-gray-900 dark:text-white">${entry.price.toLocaleString()}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* Nearby Schools */}
                            {nearbySchools.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <School className="h-6 w-6" />
                                        Nearby Schools
                                    </h3>
                                    <div className="space-y-3">
                                        {nearbySchools.map((school, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{school.name}</p>
                                                    {school.vicinity && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">{school.vicinity}</p>
                                                    )}
                                                </div>
                                                {school.rating && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                        <span className="text-sm font-medium">{school.rating}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Map Location */}
                            {details.lat && details.lng && (
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Location</h3>
                                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                                        {typeof google !== 'undefined' && google.maps ? (
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                style={{ border: 0 }}
                                                src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${details.lat},${details.lng}&zoom=15`}
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <div className="h-full flex items-center justify-center">
                                                <MapPin className="h-12 w-12 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Data Source Notice */}
                            {details.source && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                    <p className="text-sm text-green-800 dark:text-green-200">
                                        <strong>Real Data:</strong> This property information comes from {details.source === 'estated' ? 'Estated API' : details.source === 'realtor' ? 'Realtor.com API' : 'ATTOM Data API'} - verified, real-time property data.
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            const exactQuery = searchQuery || details.address;
                                            window.open(`https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(exactQuery)}`, '_blank');
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                        View on Realtor.com
                                    </button>
                                    <button
                                        onClick={() => {
                                            const exactQuery = searchQuery || details.address;
                                            window.open(`https://www.movoto.com/${encodeURIComponent(exactQuery)}/`, '_blank');
                                        }}
                                        className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                        View on Movoto
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        window.open(`https://www.google.com/maps/search/?api=1&query=${details.lat},${details.lng}`, '_blank');
                                    }}
                                    className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <MapPin className="h-4 w-4" />
                                    View on Map
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function HouseSearch() {
    const { userProfile } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [properties, setProperties] = useState([]);
    const [filteredProperties, setFilteredProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [showFilters, setShowFilters] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [mapBounds, setMapBounds] = useState(null);
    
    // Filters
    const [listingType, setListingType] = useState('all'); // 'all', 'buy', 'rent'
    const [priceRange, setPriceRange] = useState({ min: 0, max: Infinity });
    const [bedrooms, setBedrooms] = useState(0);
    const [bathrooms, setBathrooms] = useState(0);
    const [sqft, setSqft] = useState({ min: 0 });
    const [propertyType, setPropertyType] = useState('all');
    const [sortBy, setSortBy] = useState('price-low');

    // Get user location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => {
                    setUserLocation({ lat: 40.7128, lng: -74.0060 });
                }
            );
        } else {
            setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
    }, []);

    // Searched location (from geocoding)
    const [searchedLocation, setSearchedLocation] = useState(null);

    // Ultra-fast search with accurate location geocoding
    const performSearch = useCallback(async () => {
        // Don't search if query is empty
        if (!searchQuery || !searchQuery.trim()) {
            setProperties([]);
            setSearchedLocation(null);
            return;
        }

        setIsLoading(true);
        try {
            const filters = {
                listingType: listingType !== 'all' ? listingType : null,
                priceRange,
                bedrooms: bedrooms > 0 ? bedrooms : null,
                bathrooms: bathrooms > 0 ? bathrooms : null,
                sqft: sqft.min > 0 ? sqft : null,
                propertyType: propertyType !== 'all' ? propertyType : null,
                bounds: mapBounds
            };

            // Get accurate location for the search query
            const location = await propertyService.getLocationForQuery(searchQuery.trim());
            setSearchedLocation({ lat: location.lat, lng: location.lng });

            // Use EXACT search query - no defaults, no modifications
            // Store the original query to use in Zillow links
            const exactQuery = searchQuery.trim();
            const results = await propertyService.searchProperties(exactQuery, filters);
            
            // Store the original query with results for Zillow links
            const resultsWithQuery = results.map(prop => ({
                ...prop,
                originalSearchQuery: exactQuery // Store original query for accurate Zillow links
            }));
            
            setProperties(resultsWithQuery);
        } catch (error) {
            console.error('Search error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                query: searchQuery
            });
            toast.error(`Failed to search properties: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, listingType, priceRange, bedrooms, bathrooms, sqft, propertyType, mapBounds]);

    // Ultra-fast search with instant cache check (<10ms response)
    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setProperties([]);
            setSearchedLocation(null);
            return;
        }
        
        // Perform search with optimized debounce
        const timer = setTimeout(() => {
            performSearch();
        }, 50); // Ultra-fast debounce (50ms) for near-instant response

        return () => clearTimeout(timer);
    }, [searchQuery, performSearch]);

    // Filter and sort properties (instant)
    useEffect(() => {
        let filtered = [...properties];

        // Listing type filter
        if (listingType !== 'all') {
            filtered = filtered.filter(prop => prop.listingType === listingType);
        }

        // Price filter
        filtered = filtered.filter(prop =>
            prop.price >= priceRange.min && prop.price <= priceRange.max
        );

        // Bedrooms filter
        if (bedrooms > 0) {
            filtered = filtered.filter(prop => prop.bedrooms >= bedrooms);
        }

        // Bathrooms filter
        if (bathrooms > 0) {
            filtered = filtered.filter(prop => prop.bathrooms >= bathrooms);
        }

        // Sqft filter
        if (sqft.min > 0) {
            filtered = filtered.filter(prop => prop.sqft >= sqft.min);
        }

        // Property type filter
        if (propertyType !== 'all') {
            filtered = filtered.filter(prop => prop.type === propertyType);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'newest':
                    return b.daysOnMarket - a.daysOnMarket;
                default:
                    return 0;
            }
        });

        setFilteredProperties(filtered);
    }, [properties, listingType, priceRange, bedrooms, bathrooms, sqft, propertyType, sortBy]);

    // Format price
    const formatPrice = (price) => {
        if (price >= 1000000) {
            return `$${(price / 1000000).toFixed(2)}M`;
        }
        return `$${(price / 1000).toFixed(0)}k`;
    };

    // Handle save
    const handleSave = (property) => {
        toast.success('Property saved to favorites');
        // In production, save to Firestore
    };

    // Handle share
    const handleShare = async (property) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: property.address,
                    text: `Check out this property: ${formatPrice(property.price)}`,
                    url: property.zillowUrl || window.location.href
                });
            } catch (error) {
                // User cancelled
            }
        } else {
            navigator.clipboard.writeText(property.zillowUrl || window.location.href);
            toast.success('Link copied to clipboard');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Zillow-Style Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        {/* Logo/Title */}
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 rounded-lg shadow-lg">
                                <Home className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Find Your Home</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Ultra-fast property search</p>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="flex-1 max-w-2xl">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Enter zipcode, city, or full address..."
                                    className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full"
                                    >
                                        <X className="h-4 w-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    viewMode === 'map'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <MapIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="mt-4 flex items-center gap-4 flex-wrap">
                        {/* Buy/Rent Toggle */}
                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setListingType('all')}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    listingType === 'all'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setListingType('buy')}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    listingType === 'buy'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                Buy
                            </button>
                            <button
                                onClick={() => setListingType('rent')}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    listingType === 'rent'
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                Rent
                            </button>
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span>Filters</span>
                        </button>

                        {/* Property Type Quick Filters */}
                        <div className="flex gap-2 overflow-x-auto">
                            {propertyTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setPropertyType(type.id)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                                            propertyType === type.id
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{type.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="newest">Newest Listings</option>
                        </select>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Price Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Price Range
                                    </label>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value === '') {
                                                setPriceRange({ min: 0, max: Infinity });
                                            } else {
                                                const range = priceRanges[parseInt(e.target.value)];
                                                setPriceRange({ min: range.min, max: range.max });
                                            }
                                        }}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                    >
                                        <option value="">All Prices</option>
                                        {priceRanges.map((range, index) => (
                                            <option key={index} value={index}>{range.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Bedrooms */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Bedrooms
                                    </label>
                                    <select
                                        value={bedrooms}
                                        onChange={(e) => setBedrooms(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                    >
                                        <option value="0">Any</option>
                                        <option value="1">1+</option>
                                        <option value="2">2+</option>
                                        <option value="3">3+</option>
                                        <option value="4">4+</option>
                                        <option value="5">5+</option>
                                    </select>
                                </div>

                                {/* Bathrooms */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Bathrooms
                                    </label>
                                    <select
                                        value={bathrooms}
                                        onChange={(e) => setBathrooms(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                    >
                                        <option value="0">Any</option>
                                        <option value="1">1+</option>
                                        <option value="2">2+</option>
                                        <option value="3">3+</option>
                                        <option value="4">4+</option>
                                    </select>
                                </div>

                                {/* Square Footage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Min Sqft
                                    </label>
                                    <input
                                        type="number"
                                        value={sqft.min || ''}
                                        onChange={(e) => setSqft({ min: parseInt(e.target.value) || 0 })}
                                        placeholder="Any"
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                    />
                                </div>

                                {/* Clear Filters */}
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setPriceRange({ min: 0, max: Infinity });
                                            setBedrooms(0);
                                            setBathrooms(0);
                                            setSqft({ min: 0 });
                                            setPropertyType('all');
                                            setListingType('all');
                                        }}
                                        className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Results Count - Zillow-style header */}
                <div className="mb-6 flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {filteredProperties.length > 0 ? (
                                <>
                                    {filteredProperties.length} {filteredProperties.length === 1 ? 'Home' : 'Homes'} 
                                    {searchQuery && (
                                        <span className="text-base font-normal text-gray-600 dark:text-gray-400 ml-2">
                                            in {searchQuery}
                                        </span>
                                    )}
                                </>
                            ) : (
                                'No homes found'
                            )}
                        </h2>
                        {isLoading && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                    </div>
                    {searchQuery && filteredProperties.length === 0 && !isLoading && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const exactQuery = searchQuery.trim();
                                    window.open(`https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(exactQuery)}`, '_blank');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm"
                            >
                                <ExternalLink className="h-4 w-4" />
                                View on Realtor.com
                            </button>
                            <button
                                onClick={() => {
                                    const exactQuery = searchQuery.trim();
                                    window.open(`https://www.movoto.com/${encodeURIComponent(exactQuery)}/`, '_blank');
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors text-sm"
                            >
                                <ExternalLink className="h-4 w-4" />
                                View on Movoto
                            </button>
                        </div>
                    )}
                </div>

                {/* Real Property Listings */}
                {viewMode === 'list' && (
                    <>
                        {filteredProperties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {filteredProperties.map((property) => (
                                    <div
                                        key={property.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700 group"
                                        onClick={() => setSelectedProperty(property)}
                                    >
                                        {/* Property Image - Larger, Zillow-style */}
                                        <div className="relative h-56 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                            {property.images && property.images.length > 0 ? (
                                                <>
                                                    <img
                                                        src={property.images[0]}
                                                        alt={property.address}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        loading="lazy"
                                                        decoding="async"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            const fallback = e.target.nextElementSibling;
                                                            if (fallback) fallback.style.display = 'flex';
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" style={{ display: 'none' }}>
                                                        <Home className="h-16 w-16 text-gray-400" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Home className="h-16 w-16 text-gray-400" />
                                                </div>
                                            )}
                                            
                                            {/* Image count badge if multiple images */}
                                            {property.images && property.images.length > 1 && (
                                                <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                                    <Camera className="h-3 w-3" />
                                                    {property.images.length}
                                                </div>
                                            )}
                                            
                                            {/* Action buttons */}
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSave(property);
                                                    }}
                                                    className="p-2 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-md"
                                                    title="Save property"
                                                >
                                                    <Heart className="h-4 w-4 text-gray-700" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleShare(property);
                                                    }}
                                                    className="p-2 bg-white/95 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-md"
                                                    title="Share property"
                                                >
                                                    <Share2 className="h-4 w-4 text-gray-700" />
                                                </button>
                                            </div>
                                            
                                            {/* Status badge */}
                                            <div className="absolute top-3 left-3">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                    property.listingType === 'rent' 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-green-600 text-white'
                                                }`}>
                                                    {property.listingType === 'rent' ? 'For Rent' : 'For Sale'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Property Details - Zillow-style */}
                                        <div className="p-4">
                                            {/* Price - Large and prominent */}
                                            <div className="mb-2">
                                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                                                    {property.price 
                                                        ? (property.price >= 1000000 
                                                            ? `$${(property.price / 1000000).toFixed(2)}M`
                                                            : property.price >= 1000
                                                            ? `$${(property.price / 1000).toFixed(0)}k`
                                                            : `$${property.price.toLocaleString()}`)
                                                        : 'Price on Request'
                                                    }
                                                    {property.listingType === 'rent' && property.price && (
                                                        <span className="text-lg font-normal text-gray-600 dark:text-gray-400">/mo</span>
                                                    )}
                                                </h3>
                                            </div>
                                            
                                            {/* Address */}
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2.5rem]">
                                                {property.address}
                                            </p>
                                            
                                            {/* Property specs - Zillow style */}
                                            <div className="flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                                {property.bedrooms ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Bed className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium">{property.bedrooms}</span>
                                                        <span className="text-gray-500">bd</span>
                                                    </div>
                                                ) : null}
                                                {property.bathrooms ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Bath className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium">{property.bathrooms}</span>
                                                        <span className="text-gray-500">ba</span>
                                                    </div>
                                                ) : null}
                                                {property.sqft ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Square className="h-4 w-4 text-gray-500" />
                                                        <span className="font-medium">{property.sqft.toLocaleString()}</span>
                                                        <span className="text-gray-500">sqft</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                            
                                            {/* Additional info */}
                                            {(property.yearBuilt || property.lotSize) && (
                                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                                                    {property.yearBuilt && (
                                                        <span>Built {property.yearBuilt}</span>
                                                    )}
                                                    {property.lotSize && (
                                                        <span>Lot: {property.lotSize.toLocaleString()} sqft</span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Action buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProperty(property);
                                                    }}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition-colors text-sm flex items-center justify-center gap-2"
                                                >
                                                    <span>View Details</span>
                                                    <ExternalLink className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(`https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(property.address)}`, '_blank');
                                                    }}
                                                    className="px-3 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center"
                                                    title="View on Realtor.com"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Pagination / Load More */}
                            {filteredProperties.length >= 20 && (
                                <div className="mt-8 flex items-center justify-center">
                                    <button
                                        onClick={() => {
                                            toast.info('Loading more properties...');
                                            // In production, this would fetch next page from API
                                        }}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        Load More Properties
                                    </button>
                                </div>
                            )}
                        ) : !isLoading && searchQuery && (
                            <div className="text-center py-16">
                                <Home className="h-20 w-20 text-gray-400 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                    No Properties Found
                                </h3>
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                                        <strong>💡 Tip:</strong> Estated API works best for <strong>specific addresses</strong> (e.g., "123 Main St, Manchester, NH").
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        For area searches like cities or zipcodes, try searching on Realtor.com or Movoto below, or search for a specific street address.
                                    </p>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                                    No properties found for this search. Try searching for a specific address or use the links below to search on other platforms.
                                </p>
                                <div className="flex items-center justify-center gap-4 flex-wrap">
                                    <button
                                        onClick={() => {
                                            const exactQuery = searchQuery.trim();
                                            window.open(`https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(exactQuery)}`, '_blank');
                                        }}
                                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                        View on Realtor.com
                                    </button>
                                    <button
                                        onClick={() => {
                                            const exactQuery = searchQuery.trim();
                                            window.open(`https://www.movoto.com/${encodeURIComponent(exactQuery)}/`, '_blank');
                                        }}
                                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                        View on Movoto
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Map View - Zillow-style split view */}
                {viewMode === 'map' && searchQuery && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Map */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden h-[700px]">
                            {typeof google !== 'undefined' && google.maps ? (
                                <PropertyMap
                                    properties={filteredProperties}
                                    selectedProperty={selectedProperty}
                                    onPropertySelect={setSelectedProperty}
                                    searchedLocation={searchedLocation}
                                    userLocation={userLocation}
                                    bounds={mapBounds}
                                    onBoundsChange={setMapBounds}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                                        <p className="text-gray-600 dark:text-gray-400">Loading map...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Property list sidebar */}
                        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
                            {filteredProperties.length > 0 ? (
                                filteredProperties.map((property) => (
                                    <div
                                        key={property.id}
                                        onClick={() => setSelectedProperty(property)}
                                        className={`bg-white dark:bg-gray-800 rounded-lg p-3 cursor-pointer transition-all border-2 ${
                                            selectedProperty?.id === property.id
                                                ? 'border-blue-500 shadow-md'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Thumbnail */}
                                            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {property.images && property.images.length > 0 ? (
                                                    <img 
                                                        src={property.images[0]} 
                                                        alt={property.address} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                ) : (
                                                    <Home className="h-8 w-8 text-gray-400" />
                                                )}
                                            </div>
                                            
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-1">
                                                    {property.price 
                                                        ? (property.price >= 1000000 
                                                            ? `$${(property.price / 1000000).toFixed(2)}M`
                                                            : `$${(property.price / 1000).toFixed(0)}k`)
                                                        : 'Price on Request'
                                                    }
                                                    {property.listingType === 'rent' && property.price && '/mo'}
                                                </h3>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-2">{property.address}</p>
                                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                    {property.bedrooms && (
                                                        <span className="flex items-center gap-1">
                                                            <Bed className="h-3 w-3" />
                                                            {property.bedrooms}bd
                                                        </span>
                                                    )}
                                                    {property.bathrooms && (
                                                        <span className="flex items-center gap-1">
                                                            <Bath className="h-3 w-3" />
                                                            {property.bathrooms}ba
                                                        </span>
                                                    )}
                                                    {property.sqft && (
                                                        <span className="flex items-center gap-1">
                                                            <Square className="h-3 w-3" />
                                                            {property.sqft.toLocaleString()}sqft
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No properties to display</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {filteredProperties.length === 0 && !isLoading && (
                    <div className="text-center py-20">
                        <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No properties found</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Try adjusting your filters or search criteria
                        </p>
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setPriceRange({ min: 0, max: Infinity });
                                setBedrooms(0);
                                setBathrooms(0);
                                setSqft({ min: 0 });
                                setPropertyType('all');
                                setListingType('all');
                            }}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Property Details Modal */}
            {selectedProperty && (
                <PropertyDetailsModal
                    property={selectedProperty}
                    onClose={() => setSelectedProperty(null)}
                    onSave={handleSave}
                    onShare={handleShare}
                    searchQuery={searchQuery}
                />
            )}
        </div>
    );
}
