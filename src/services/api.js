// API service for Python backend
// Try to use Python backend, fallback to direct API calls if not available
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://family-housing-hub-api.onrender.com';

// Check if backend is available
let backendAvailable = false;
const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    if (response.ok) {
      backendAvailable = true;
      return true;
    }
  } catch (error) {
    backendAvailable = false;
  }
  return false;
};

// Check backend on load
checkBackendHealth();

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // AI Services
  async aiChat(message, context = {}) {
    try {
      return await this.request('/api/ai/chat', {
        method: 'POST',
        body: { message, context, use_gemini: true },
      });
    } catch (error) {
      // Fallback to direct Gemini API if backend unavailable
      if (!backendAvailable) {
        return this.fallbackAIChat(message, context);
      }
      throw error;
    }
  }

  // Fallback AI chat (direct API call)
  async fallbackAIChat(message, context = {}) {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('No AI service available');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: message }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
        timestamp: new Date().toISOString()
      };
    }
    throw new Error('AI service unavailable');
  }

  async analyzeImage(imageBase64) {
    return this.request('/api/ai/analyze-image', {
      method: 'POST',
      body: { image: imageBase64 },
    });
  }

  // Meal Planning
  async generateMealPlan(preferences, pantry, days = 7, budget = null) {
    return this.request('/api/meals/generate-plan', {
      method: 'POST',
      body: { preferences, pantry, days, budget },
    });
  }

  async getRecipeSuggestions(ingredients, cuisine = 'any', dietaryRestrictions = []) {
    return this.request('/api/meals/recipe-suggestions', {
      method: 'POST',
      body: { ingredients, cuisine, dietary_restrictions: dietaryRestrictions },
    });
  }

  // Budget Analysis
  async analyzeBudget(transactions, income, expenses) {
    return this.request('/api/budget/analyze', {
      method: 'POST',
      body: { transactions, income, expenses },
    });
  }

  // Location Services
  async getNearbyPlaces(lat, lng, category = 'all', radius = 2000) {
    return this.request('/api/location/nearby-places', {
      method: 'POST',
      body: { lat, lng, category, radius },
    });
  }

  async geocodeAddress(address) {
    return this.request('/api/location/geocode', {
      method: 'POST',
      body: { address },
    });
  }

  // Automation
  async createReminder(title, description, dueDate, userId) {
    return this.request('/api/automation/reminders', {
      method: 'POST',
      body: { title, description, due_date: dueDate, user_id: userId },
    });
  }

  async getNotifications(userId) {
    return this.request(`/api/automation/notifications?user_id=${userId}`, {
      method: 'GET',
    });
  }

  // Data Processing
  async processExpenses(expenses) {
    return this.request('/api/data/process-expenses', {
      method: 'POST',
      body: { expenses },
    });
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health', {
      method: 'GET',
    });
  }
}

export default new ApiService();

