// src/services/propertyService.js - Ultra-Fast Property Search Service with Real Zillow Integration
import zillowService from './zillowService';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBfm3u4-vEnsVvHEqjqpoGdlbNgaza8JnA';

// Ultra-fast cache with IndexedDB for persistence
const propertyCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;

// IndexedDB for persistent caching
let db = null;
const initDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open('PropertyCacheDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('properties')) {
        database.createObjectStore('properties', { keyPath: 'cacheKey' });
      }
    };
  });
};

// Get from cache (instant)
const getCachedProperties = async (cacheKey) => {
  // Check memory cache first (fastest)
  const cached = propertyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Check IndexedDB
  try {
    const database = await initDB();
    const transaction = database.transaction(['properties'], 'readonly');
    const store = transaction.objectStore('properties');
    const request = store.get(cacheKey);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < CACHE_DURATION) {
          // Update memory cache
          propertyCache.set(cacheKey, result);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    return null;
  }
};

// Save to cache
const cacheProperties = async (cacheKey, data) => {
  const cacheEntry = {
    cacheKey,
    data,
    timestamp: Date.now()
  };

  // Memory cache
  propertyCache.set(cacheKey, cacheEntry);
  
  // Limit cache size
  if (propertyCache.size > MAX_CACHE_SIZE) {
    const firstKey = propertyCache.keys().next().value;
    propertyCache.delete(firstKey);
  }

  // IndexedDB cache
  try {
    const database = await initDB();
    const transaction = database.transaction(['properties'], 'readwrite');
    const store = transaction.objectStore('properties');
    store.put(cacheEntry);
  } catch (error) {
    console.warn('IndexedDB cache failed:', error);
  }
};

// Search Zillow via their public search (uses real Zillow service)
const searchZillowProperties = async (query, filters = {}) => {
  // Use the zillowService for accurate Zillow integration
  return await zillowService.searchZillowProperties(query, filters);
};

// Fetch properties from fast real estate APIs
const fetchProperties = async (query, filters = {}) => {
  // Normalize query - remove any extra formatting, use EXACT input
  const normalizedQuery = query ? query.trim() : '';
  
  // Don't search if query is empty
  if (!normalizedQuery) {
    return [];
  }
  
  const cacheKey = `real_${normalizedQuery}_${JSON.stringify(filters)}`;
  
  // Check cache first (instant - <10ms)
  const cached = await getCachedProperties(cacheKey);
  if (cached) {
    return cached;
  }

  // Get accurate location for coordinates
  const location = await geocodeLocation(normalizedQuery);
  
  // Call backend API to fetch real property data
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://family-housing-hub-api.onrender.com';
  
  console.log('🔍 Searching for properties:', { query: normalizedQuery, lat: location.lat, lng: location.lng });
  console.log('🌐 Backend URL:', API_BASE_URL);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/properties/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: normalizedQuery,
        lat: location.lat,
        lng: location.lng,
        filters: filters
      }),
    });

    console.log('📡 Backend response status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      let properties = data.properties || [];
      
      console.log('✅ Backend returned:', { 
        propertyCount: properties.length, 
        message: data.message,
        apiConfigured: data.apiConfigured,
        estatedConfigured: data.estatedConfigured
      });
      
      // Log helpful info if no properties found
      if (properties.length === 0) {
        console.warn('⚠️ No properties found. Details:', {
          message: data.message,
          suggestion: data.suggestion,
          isAreaSearch: data.isAreaSearch,
          query: normalizedQuery
        });
      }
      
      // Cache results for fast future access
      await cacheProperties(cacheKey, properties);
      
      return properties;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Backend API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error || errorData.message || 'Unknown error',
        data: errorData
      });
      return [];
    }
  } catch (error) {
    console.error('❌ Network error fetching properties:', error);
    // Check if backend is reachable
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.error('🚫 Backend API is unreachable!', {
        url: API_BASE_URL,
        error: error.message,
        suggestion: 'Make sure the backend is deployed and running on Render.com'
      });
    }
    return [];
  }
};

// Accurate geocoding - get exact location from query (zipcode, city, address)
const geocodeLocation = async (query) => {
  if (!query || !query.trim()) {
    return { lat: 40.7128, lng: -74.0060, formattedAddress: 'New York, NY', originalQuery: query };
  }

  const originalQuery = query.trim();
  
  // Check if it's a US zipcode (5 digits)
  const zipcodeMatch = originalQuery.match(/^(\d{5})(-\d{4})?$/);
  const isZipcode = zipcodeMatch !== null;

  // Check cache first
  const cacheKey = `geocode_${originalQuery}`;
  const cached = propertyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { ...cached.data, originalQuery };
  }

  try {
    let geocodeQuery = originalQuery;
    
    // For zipcodes, add "USA" to improve accuracy
    if (isZipcode) {
      geocodeQuery = `${originalQuery}, USA`;
    }

    // Use OpenStreetMap Nominatim for accurate geocoding (free, no API key needed)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geocodeQuery)}&limit=1&addressdetails=1&countrycodes=us`,
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
      
      // For zipcodes, verify it's the right zipcode
      if (isZipcode) {
        const resultZipcode = result.address?.postcode;
        if (resultZipcode && resultZipcode.replace(/-/g, '') !== zipcodeMatch[1]) {
          // Zipcode doesn't match, try again with more specific query
          const retryResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zipcodeMatch[1]}&countrycodes=us&limit=1`,
            {
              headers: {
                'User-Agent': 'Family-Housing-Hub/1.0',
                'Accept-Language': 'en'
              }
            }
          );
          const retryData = await retryResponse.json();
          if (retryData && retryData.length > 0) {
            const retryResult = retryData[0];
            const location = {
              lat: parseFloat(retryResult.lat),
              lng: parseFloat(retryResult.lon),
              formattedAddress: retryResult.display_name,
              originalQuery: originalQuery
            };
            propertyCache.set(cacheKey, { data: location, timestamp: Date.now() });
            return location;
          }
        }
      }
      
      const location = {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        formattedAddress: result.display_name,
        originalQuery: originalQuery
      };
      
      // Cache the result
      propertyCache.set(cacheKey, { data: location, timestamp: Date.now() });
      return location;
    }
  } catch (error) {
    console.warn('Geocoding error:', error);
  }

  // Fallback to default location
  return { lat: 40.7128, lng: -74.0060, formattedAddress: originalQuery || 'New York, NY', originalQuery: originalQuery };
};

// This function is no longer used - we fetch real data from APIs
// Kept for backwards compatibility
const generatePropertiesFromQuery = async (query, filters, locationData = null) => {
  // This function is deprecated - real data comes from fetchProperties()
  return [];
};

// Get property details (with full info)
const getPropertyDetails = async (propertyId, address) => {
  const cacheKey = `details_${propertyId}`;
  const cached = await getCachedProperties(cacheKey);
  if (cached) {
    return cached;
  }

  // In production, fetch from API
  const details = await generatePropertyDetails(propertyId, address);
  await cacheProperties(cacheKey, details);
  return details;
};

const generatePropertyDetails = async (propertyId, address) => {
  // CRITICAL: We do NOT generate fake property details
  // All details must come from real Zillow/real estate APIs
  // Return null to indicate no data available
  return null;
};

// Get location coordinates for a query
const getLocationForQuery = async (query) => {
  return await geocodeLocation(query);
};

export default {
  searchProperties: fetchProperties,
  getPropertyDetails,
  searchZillowProperties,
  getLocationForQuery,
  clearCache: () => {
    propertyCache.clear();
    if (db) {
      const transaction = db.transaction(['properties'], 'readwrite');
      const store = transaction.objectStore('properties');
      store.clear();
    }
  }
};

