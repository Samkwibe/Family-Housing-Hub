// API service for Python backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://family-housing-hub-api.onrender.com';

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
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: { message, context, use_gemini: true },
    });
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

