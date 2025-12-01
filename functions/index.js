/**
 * Family Housing Hub - Firebase Cloud Functions
 * Provides real, fully functional services including AI, automation, and data processing
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Express app
const app = express();

// Enable CORS
app.use(cors({ origin: true }));
app.use(express.json());

// API Keys from environment variables
const GEMINI_API_KEY = functions.config().gemini?.key || process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = functions.config().openai?.key || process.env.OPENAI_API_KEY;
const GOOGLE_MAPS_API_KEY = functions.config().googlemaps?.key || process.env.GOOGLE_MAPS_API_KEY;
const RAPIDAPI_KEY = functions.config().rapidapi?.key || process.env.RAPIDAPI_KEY || '4d9f4dec85msh34a2b4ff5648991p1dcfccjsn125f4440583c';
const ESTATED_API_KEY = functions.config().estated?.key || process.env.ESTATED_API_KEY || 'ec5c7745e9236b9519809c1d4c3f9c87';

// Initialize AI clients
let geminiClient = null;
let openaiClient = null;

if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

if (OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
}

// ==================== AI CHAT ENDPOINT ====================
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context = {}, imageBase64 = null, useGemini = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Try Gemini first (free tier)
    if (useGemini && geminiClient) {
      try {
        const model = imageBase64 ? geminiClient.getGenerativeModel({ model: 'gemini-pro-vision' }) : geminiClient.getGenerativeModel({ model: 'gemini-pro' });
        
        let prompt = message;
        if (imageBase64) {
          prompt = `Analyze this image and answer: ${message}`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return res.json({ response: text, model: 'gemini' });
      } catch (error) {
        console.warn('Gemini API error:', error.message);
        // Fall through to OpenAI or contextual response
      }
    }

    // Try OpenAI as fallback
    if (openaiClient) {
      try {
        const completion = await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant for family housing and meal planning.' },
            { role: 'user', content: message }
          ],
          max_tokens: 500
        });

        return res.json({ response: completion.choices[0].message.content, model: 'openai' });
      } catch (error) {
        console.warn('OpenAI API error:', error.message);
      }
    }

    // Fallback contextual response
    return res.json({ 
      response: 'I understand your question, but AI services are not currently configured. Please configure API keys in Firebase Functions config.',
      model: 'contextual'
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROPERTY SEARCH ENDPOINT ====================
app.post('/api/properties/search', async (req, res) => {
  try {
    const { query, lat, lng, filters = {} } = req.body;

    if (!query && !(lat && lng)) {
      return res.status(400).json({ error: 'Search query or coordinates required' });
    }

    const properties = [];

    // Determine if query is a specific address
    const isSpecificAddress = /^\d+/.test(query) && /(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard)/i.test(query);

    // Try Zillow API first for specific addresses
    if (RAPIDAPI_KEY && isSpecificAddress) {
      try {
        const zillowProps = await searchZillowAPI(query, lat, lng, filters);
        if (zillowProps.length > 0) {
          properties.push(...zillowProps);
          console.log(`✅ Zillow API: Found ${zillowProps.length} properties`);
        }
      } catch (error) {
        console.error('❌ Zillow API error:', error.message);
      }
    }

    // Try Realtor.com API for area searches
    if (RAPIDAPI_KEY && (!isSpecificAddress || properties.length === 0)) {
      try {
        const realtorProps = await searchRealtorAPI(query, lat, lng, filters);
        if (realtorProps.length > 0) {
          properties.push(...realtorProps);
          console.log(`✅ Realtor.com API: Found ${realtorProps.length} properties`);
        }
      } catch (error) {
        console.error('❌ Realtor API error:', error.message);
      }
    }

    // Try Estated API as fallback
    if (ESTATED_API_KEY && properties.length === 0) {
      try {
        const estatedProps = await searchEstatedAPI(query, lat, lng, filters);
        if (estatedProps.length > 0) {
          properties.push(...estatedProps);
          console.log(`✅ Estated API: Found ${estatedProps.length} properties`);
        }
      } catch (error) {
        console.error('❌ Estated API error:', error.message);
      }
    }

    if (properties.length === 0) {
      return res.json({
        properties: [],
        message: 'No properties found for this search. Try a different location or check API status.',
        apiConfigured: !!(RAPIDAPI_KEY || ESTATED_API_KEY)
      });
    }

    return res.json({
      properties: properties.slice(0, 20), // Limit to 20 results
      count: properties.length,
      query: query
    });

  } catch (error) {
    console.error('Property search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function searchZillowAPI(query, lat, lng, filters) {
  const properties = [];
  
  if (!RAPIDAPI_KEY) return properties;

  try {
    // Build Zillow search URL
    const zillowUrl = buildZillowSearchURL(query, filters);
    
    // Use Zillow scraper API
    const response = await axios.post(
      'https://zillow-data-scraper1.p.rapidapi.com/scrape-listing',
      { url: zillowUrl },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'zillow-data-scraper1.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY
        },
        timeout: 20000
      }
    );

    if (response.data) {
      const property = parseZillowData(response.data, zillowUrl);
      if (property) properties.push(property);
    }
  } catch (error) {
    console.error('Zillow API error:', error.message);
  }

  return properties;
}

async function searchRealtorAPI(query, lat, lng, filters) {
  const properties = [];
  
  if (!RAPIDAPI_KEY) return properties;

  try {
    const params = {
      limit: '20',
      fulfillmentId: '3155600'
    };

    if (query) {
      params.query = query;
    } else if (lat && lng) {
      params.latitude = lat;
      params.longitude = lng;
    }

    if (filters.listingType === 'rent') {
      params.listing_status = 'for_rent';
    } else if (filters.listingType === 'buy') {
      params.listing_status = 'for_sale';
    }

    if (filters.bedrooms) params.beds_min = filters.bedrooms;
    if (filters.bathrooms) params.baths_min = filters.bathrooms;
    if (filters.priceRange) {
      if (filters.priceRange.min) params.price_min = filters.priceRange.min;
      if (filters.priceRange.max) params.price_max = filters.priceRange.max;
    }

    const response = await axios.get(
      'https://realtor-search.p.rapidapi.com/agents/v2/listings',
      {
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': 'realtor-search.p.rapidapi.com'
        },
        params: params,
        timeout: 10000
      }
    );

    if (response.data && response.data.listings) {
      for (const prop of response.data.listings.slice(0, 20)) {
        const addressInfo = prop.address || {};
        const descriptionInfo = prop.description || {};
        
        properties.push({
          id: prop.property_id || `realtor_${Date.now()}_${Math.random()}`,
          address: addressInfo.line || query,
          city: addressInfo.city || '',
          state: addressInfo.state_code || '',
          zipcode: addressInfo.postal_code || '',
          price: prop.list_price,
          bedrooms: descriptionInfo.beds,
          bathrooms: descriptionInfo.baths,
          sqft: descriptionInfo.sqft,
          yearBuilt: descriptionInfo.year_built,
          lotSize: descriptionInfo.lot_sqft,
          lat: addressInfo.coordinate?.lat,
          lng: addressInfo.coordinate?.lon,
          type: descriptionInfo.type || 'house',
          images: (prop.photos || []).map(p => p.href).filter(Boolean),
          listingType: prop.listing_status === 'for_rent' ? 'rent' : 'buy',
          source: 'realtor'
        });
      }
    }
  } catch (error) {
    console.error('Realtor API error:', error.message);
  }

  return properties;
}

async function searchEstatedAPI(query, lat, lng, filters) {
  const properties = [];
  
  if (!ESTATED_API_KEY) return properties;

  try {
    let url = 'https://api.estated.com/v3/property';
    if (query) {
      url += `?combined_address=${encodeURIComponent(query)}`;
    } else if (lat && lng) {
      url += `?latitude=${lat}&longitude=${lng}`;
    } else {
      return properties;
    }

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${ESTATED_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.data) {
      const prop = response.data.data;
      const addressInfo = prop.address || {};
      const structureInfo = prop.structure || {};
      const saleInfo = prop.sale || {};
      const lotInfo = prop.lot || {};
      const locationInfo = prop.location || {};

      const street = addressInfo.line1 || addressInfo.formatted_street_address || '';
      const city = addressInfo.city || '';
      const state = addressInfo.state || '';
      const zipcode = addressInfo.postal_code || addressInfo.zip || '';
      const fullAddress = [street, city, state, zipcode].filter(Boolean).join(', ');

      properties.push({
        id: `estated_${prop.apn || prop.fips || Date.now()}`,
        address: fullAddress || query,
        city: city,
        state: state,
        zipcode: zipcode,
        price: saleInfo.price,
        bedrooms: structureInfo.beds,
        bathrooms: structureInfo.baths,
        sqft: structureInfo.sqft,
        yearBuilt: structureInfo.year_built,
        lotSize: lotInfo.sqft,
        lat: locationInfo.latitude || lat,
        lng: locationInfo.longitude || lng,
        type: structureInfo.type || 'house',
        images: [],
        listingType: 'buy',
        source: 'estated'
      });
    }
  } catch (error) {
    console.error('Estated API error:', error.message);
  }

  return properties;
}

function buildZillowSearchURL(query, filters) {
  let url = `https://www.zillow.com/homes/${encodeURIComponent(query)}/`;
  const params = [];
  
  if (filters.listingType === 'rent') {
    params.push('isForRent=1');
  } else if (filters.listingType === 'buy') {
    params.push('isForSale=1');
  }
  
  if (params.length > 0) {
    url += '?' + params.join('&');
  }
  
  return url;
}

function parseZillowData(data, originalUrl) {
  try {
    const prop = data.data || data.property || data.result || data;
    const addressInfo = prop.address || {};
    
    const street = addressInfo.street || addressInfo.line || addressInfo.streetAddress || '';
    const city = addressInfo.city || '';
    const state = addressInfo.state || addressInfo.stateCode || '';
    const zipcode = addressInfo.zipcode || addressInfo.zip || addressInfo.postalCode || '';
    const fullAddress = [street, city, state, zipcode].filter(Boolean).join(', ') || 'Address not available';

    let price = prop.price || prop.listPrice || prop.estimatedPrice || prop.zestimate;
    if (typeof price === 'string') {
      price = parseInt(price.replace(/[$,]/g, '')) || null;
    }

    const zpidMatch = originalUrl.match(/\/(\d+)_zpid\//);
    const zpid = zpidMatch ? zpidMatch[1] : (prop.zpid || prop.id);

    return {
      id: `zillow_${zpid || Date.now()}`,
      address: fullAddress,
      city: city,
      state: state,
      zipcode: zipcode,
      price: price,
      bedrooms: prop.bedrooms || prop.beds || prop.bed,
      bathrooms: prop.bathrooms || prop.baths || prop.bath,
      sqft: prop.sqft || prop.squareFeet || prop.livingArea || prop.area,
      yearBuilt: prop.yearBuilt || prop.year,
      lotSize: prop.lotSize || prop.lotSqft || prop.lotSquareFeet,
      lat: prop.location?.lat || prop.lat,
      lng: prop.location?.lng || prop.location?.longitude || prop.location?.lon || prop.lng,
      type: prop.propertyType || prop.type || 'house',
      images: Array.isArray(prop.images) ? prop.images : (prop.photo ? [prop.photo] : []),
      zpid: zpid,
      listingType: (prop.status || '').toLowerCase().includes('rent') || (prop.type || '').toLowerCase().includes('rent') ? 'rent' : 'buy',
      source: 'zillow',
      zillowUrl: originalUrl
    };
  } catch (error) {
    console.error('Error parsing Zillow data:', error);
    return null;
  }
}

// ==================== ROOT ENDPOINT ====================
app.get('/', (req, res) => {
  res.json({
    message: 'Family Housing Hub API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      'POST /api/ai/chat': 'AI chat with Gemini/OpenAI',
      'POST /api/properties/search': 'Search properties (Zillow, Realtor.com, Estated)',
      'GET /api/health': 'Health check and API key status'
    },
    documentation: 'Visit /api/health for detailed API status'
  });
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    api_keys_configured: {
      gemini: !!GEMINI_API_KEY,
      openai: !!OPENAI_API_KEY,
      google_maps: !!GOOGLE_MAPS_API_KEY,
      rapidapi_realtor: !!RAPIDAPI_KEY,
      estated: !!ESTATED_API_KEY
    }
  });
});

// Export Express app as Firebase Cloud Function
exports.api = functions.https.onRequest(app);

