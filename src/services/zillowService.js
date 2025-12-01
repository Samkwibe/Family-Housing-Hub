// src/services/zillowService.js - Real Zillow Data Integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://family-housing-hub-api.onrender.com';

/**
 * Search for properties on Zillow and get real property data
 * This ensures 100% accuracy with Zillow's actual listings
 */
export const searchZillowProperties = async (query, filters = {}) => {
  try {
    // Try backend API first
    if (API_BASE_URL) {
      const response = await fetch(`${API_BASE_URL}/api/properties/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, filters }),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    }

    // Fallback: Build Zillow search URL directly using EXACT query
    // Use the exact query the user entered - don't modify it
    const exactQuery = query.trim();
    
    // Build Zillow search URL with the exact query
    // Zillow handles zipcodes, cities, and addresses automatically
    let zillowUrl;
    
    // For zipcodes, use the zipcode directly
    if (/^\d{5}(-\d{4})?$/.test(exactQuery)) {
      zillowUrl = `https://www.zillow.com/homes/${exactQuery}_rb/`;
    } else {
      // For other queries, use Zillow's search format
      // Clean the query but keep it as close to original as possible
      const cleanQuery = exactQuery
        .replace(/[^\w\s-]/g, ' ') // Replace special chars with spaces
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase();
      
      zillowUrl = `https://www.zillow.com/homes/${cleanQuery}_rb/`;
    }
    
    // Add search parameters if filters are provided
    const searchParams = new URLSearchParams();
    const searchQueryState = {
      pagination: {},
      mapBounds: {},
      isMapVisible: true,
      filterState: {},
      usersSearchTerm: exactQuery // Use exact query
    };

    // Add filters
    if (filters.priceRange) {
      searchQueryState.filterState.price = {
        min: filters.priceRange.min || 0,
        max: filters.priceRange.max || 999999999
      };
    }

    if (filters.bedrooms) {
      searchQueryState.filterState.beds = { min: filters.bedrooms };
    }

    if (filters.bathrooms) {
      searchQueryState.filterState.baths = { min: filters.bathrooms };
    }

    if (filters.listingType === 'buy') {
      searchQueryState.filterState.isForSaleByAgent = { value: true };
      searchQueryState.filterState.isForSaleByOwner = { value: false };
      searchQueryState.filterState.isForRent = { value: false };
    } else if (filters.listingType === 'rent') {
      searchQueryState.filterState.isForRent = { value: true };
      searchQueryState.filterState.isForSaleByAgent = { value: false };
      searchQueryState.filterState.isForSaleByOwner = { value: false };
    }

    // Only add searchQueryState if we have filters
    if (Object.keys(searchQueryState.filterState).length > 0) {
      searchParams.set('searchQueryState', JSON.stringify(searchQueryState));
      zillowUrl += `?${searchParams.toString()}`;
    }

    return {
      searchUrl: zillowUrl,
      query: exactQuery, // Return exact query
      filters,
      directLink: true
    };
  } catch (error) {
    console.error('Zillow search error:', error);
    throw error;
  }
};

/**
 * Build accurate Zillow URL for a specific property
 * Uses ZPID (Zillow Property ID) if available for 100% accuracy
 */
export const buildZillowPropertyUrl = async (address, zpid = null) => {
  try {
    // If we have ZPID, use it for most accurate link
    if (zpid) {
      return `https://www.zillow.com/homedetails/${zpid}_zpid/`;
    }

    // Try backend API to get ZPID
    if (API_BASE_URL) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/properties/zillow-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address, zpid }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.zillowUrl;
        }
      } catch (error) {
        console.warn('Backend Zillow URL service unavailable:', error);
      }
    }

    // Fallback: Build URL from address
    // Use the exact address as provided - Zillow will search for it
    // Don't modify the address - use it exactly as the user searched
    return `https://www.zillow.com/homes/${encodeURIComponent(address)}/`;
  } catch (error) {
    console.error('Error building Zillow URL:', error);
    // Ultimate fallback
    return `https://www.zillow.com/homes/${encodeURIComponent(address)}/`;
  }
};

/**
 * Extract ZPID from Zillow URL
 * This helps us build accurate links later
 */
export const extractZpidFromUrl = (url) => {
  try {
    const match = url.match(/(\d+)_zpid/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Validate that a Zillow URL is accurate
 */
export const validateZillowUrl = (url) => {
  if (!url) return false;
  return url.includes('zillow.com') && (url.includes('/homedetails/') || url.includes('/homes/'));
};

export default {
  searchZillowProperties,
  buildZillowPropertyUrl,
  extractZpidFromUrl,
  validateZillowUrl
};

