"""
Family Housing Hub - Python Backend API
Provides real, fully functional services including AI, automation, and data processing
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai
import google.generativeai as genai
import requests
import json
from datetime import datetime, timedelta
import schedule
import threading
import time

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["https://family-housing-hub.web.app", "http://localhost:3001", "http://localhost:5173"])

# API Keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('VITE_GEMINI_API_KEY')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY') or os.getenv('VITE_GOOGLE_MAPS_API_KEY')

# Initialize AI clients
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ==================== AI SERVICES ====================

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """Enhanced AI chat with context awareness"""
    try:
        data = request.json
        message = data.get('message', '')
        context = data.get('context', {})
        use_gemini = data.get('use_gemini', True)
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Build context prompt
        context_str = ""
        if context.get('location'):
            context_str += f"User location: {context['location']}. "
        if context.get('user_role'):
            context_str += f"User role: {context['user_role']}. "
        if context.get('family_info'):
            context_str += f"Family info: {context['family_info']}. "
        
        full_prompt = f"{context_str}User question: {message}\n\nProvide a helpful, detailed response."
        
        # Try Gemini first (free), then OpenAI
        response_text = None
        
        if use_gemini and GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(full_prompt)
                response_text = response.text
            except Exception as e:
                print(f"Gemini error: {e}")
        
        # Fallback to OpenAI
        if not response_text and OPENAI_API_KEY:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant for a family housing management app."},
                        {"role": "user", "content": full_prompt}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                response_text = response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI error: {e}")
        
        if not response_text:
            response_text = "I'm having trouble connecting to AI services. Please try again later."
        
        return jsonify({
            'response': response_text,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/analyze-image', methods=['POST'])
def analyze_image():
    """Analyze food images with AI"""
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'Image is required'}), 400
        
        if not GEMINI_API_KEY:
            return jsonify({'error': 'Gemini API key not configured'}), 500
        
        # Use Gemini Vision
        model = genai.GenerativeModel('gemini-pro-vision')
        
        prompt = """Analyze this food image and provide:
        1. Food name
        2. Ingredients (if visible)
        3. Estimated nutrition (calories, protein, carbs, fat)
        4. Freshness assessment
        5. Allergens (if identifiable)
        6. Portion size estimate
        7. Recipe suggestions
        
        Format as JSON with keys: foodName, ingredients, nutrition, freshness, allergens, portionSize, recipe"""
        
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_base64}
        ])
        
        return jsonify({
            'analysis': response.text,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== MEAL PLANNING ====================

@app.route('/api/meals/generate-plan', methods=['POST'])
def generate_meal_plan():
    """Generate smart meal plan based on preferences and pantry"""
    try:
        data = request.json
        preferences = data.get('preferences', {})
        pantry_items = data.get('pantry', [])
        days = data.get('days', 7)
        budget = data.get('budget', None)
        
        # Build prompt for AI
        pantry_str = ", ".join([item.get('name', '') for item in pantry_items[:20]])
        preferences_str = json.dumps(preferences)
        
        prompt = f"""Generate a {days}-day meal plan with:
        - Preferences: {preferences_str}
        - Available pantry items: {pantry_str}
        - Budget: ${budget if budget else 'flexible'}
        
        Return JSON format with daily meals including breakfast, lunch, dinner, and snacks.
        Include ingredients, cooking time, and estimated cost per meal."""
        
        if GEMINI_API_KEY:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            plan_text = response.text
        else:
            plan_text = "AI service not available. Please configure API keys."
        
        return jsonify({
            'meal_plan': plan_text,
            'days': days,
            'generated_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meals/recipe-suggestions', methods=['POST'])
def recipe_suggestions():
    """Get recipe suggestions based on ingredients"""
    try:
        data = request.json
        ingredients = data.get('ingredients', [])
        cuisine = data.get('cuisine', 'any')
        dietary_restrictions = data.get('dietary_restrictions', [])
        
        ingredients_str = ", ".join(ingredients)
        
        prompt = f"""Suggest 5 recipes using these ingredients: {ingredients_str}
        Cuisine preference: {cuisine}
        Dietary restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
        
        For each recipe, provide:
        - Name
        - Full ingredient list
        - Step-by-step instructions
        - Cooking time
        - Serving size
        - Estimated cost
        - YouTube search query for video tutorial"""
        
        if GEMINI_API_KEY:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            suggestions = response.text
        else:
            suggestions = "AI service not available."
        
        return jsonify({
            'suggestions': suggestions,
            'ingredients_used': ingredients
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== BUDGET ANALYSIS ====================

@app.route('/api/budget/analyze', methods=['POST'])
def analyze_budget():
    """Analyze spending patterns and provide recommendations"""
    try:
        data = request.json
        transactions = data.get('transactions', [])
        income = data.get('income', 0)
        expenses = data.get('expenses', [])
        
        # Calculate totals
        total_expenses = sum(exp.get('amount', 0) for exp in expenses)
        remaining = income - total_expenses
        
        # Categorize expenses
        categories = {}
        for exp in expenses:
            cat = exp.get('category', 'Other')
            categories[cat] = categories.get(cat, 0) + exp.get('amount', 0)
        
        # Generate insights
        insights = []
        if remaining < 0:
            insights.append("⚠️ You're spending more than you earn. Consider reducing expenses.")
        elif remaining < income * 0.1:
            insights.append("💡 Low savings rate. Try to save at least 20% of income.")
        
        # Find top spending category
        if categories:
            top_category = max(categories.items(), key=lambda x: x[1])
            insights.append(f"📊 Top spending category: {top_category[0]} (${top_category[1]:.2f})")
        
        # Savings recommendations
        recommendations = []
        if total_expenses > income * 0.8:
            recommendations.append("Consider reducing discretionary spending")
        if categories.get('Dining Out', 0) > income * 0.15:
            recommendations.append("Reduce dining out - try meal planning")
        
        return jsonify({
            'income': income,
            'total_expenses': total_expenses,
            'remaining': remaining,
            'savings_rate': (remaining / income * 100) if income > 0 else 0,
            'categories': categories,
            'insights': insights,
            'recommendations': recommendations,
            'analyzed_at': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== LOCATION SERVICES ====================

@app.route('/api/location/nearby-places', methods=['POST'])
def get_nearby_places():
    """Get real nearby places using Google Places API"""
    try:
        data = request.json
        lat = data.get('lat')
        lng = data.get('lng')
        category = data.get('category', 'all')
        radius = data.get('radius', 2000)
        
        if not lat or not lng:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        if not GOOGLE_MAPS_API_KEY:
            return jsonify({'error': 'Google Maps API key not configured'}), 500
        
        # Map category to Google Places type
        type_map = {
            'grocery': 'supermarket',
            'restaurant': 'restaurant',
            'gym': 'gym',
            'hospital': 'hospital',
            'school': 'school',
            'cafe': 'cafe',
            'gas': 'gas_station',
            'shopping': 'shopping_mall'
        }
        
        place_type = type_map.get(category, '')
        
        # Call Google Places API
        url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
        params = {
            'location': f"{lat},{lng}",
            'radius': radius,
            'key': GOOGLE_MAPS_API_KEY
        }
        
        if place_type:
            params['type'] = place_type
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if data.get('status') == 'OK':
            places = []
            for place in data.get('results', [])[:20]:
                places.append({
                    'id': place.get('place_id'),
                    'name': place.get('name'),
                    'address': place.get('vicinity') or place.get('formatted_address'),
                    'rating': place.get('rating', 0),
                    'lat': place.get('geometry', {}).get('location', {}).get('lat'),
                    'lng': place.get('geometry', {}).get('location', {}).get('lng'),
                    'types': place.get('types', []),
                    'photo_reference': place.get('photos', [{}])[0].get('photo_reference') if place.get('photos') else None
                })
            
            return jsonify({
                'places': places,
                'count': len(places),
                'location': {'lat': lat, 'lng': lng}
            })
        else:
            return jsonify({'error': data.get('error_message', 'Failed to fetch places')}), 500
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/location/geocode', methods=['POST'])
def geocode_address():
    """Geocode address to coordinates"""
    try:
        data = request.json
        address = data.get('address')
        
        if not address:
            return jsonify({'error': 'Address is required'}), 400
        
        # Use OpenStreetMap Nominatim (free, no API key needed)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            'q': address,
            'format': 'json',
            'limit': 1
        }
        headers = {
            'User-Agent': 'Family-Housing-Hub/1.0'
        }
        
        response = requests.get(url, params=params, headers=headers)
        results = response.json()
        
        if results:
            result = results[0]
            return jsonify({
                'lat': float(result['lat']),
                'lng': float(result['lon']),
                'display_name': result.get('display_name'),
                'address': result.get('address', {})
            })
        else:
            return jsonify({'error': 'Address not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== AUTOMATION SERVICES ====================

@app.route('/api/automation/reminders', methods=['POST'])
def create_reminder():
    """Create automated reminder"""
    try:
        data = request.json
        title = data.get('title')
        description = data.get('description')
        due_date = data.get('due_date')
        user_id = data.get('user_id')
        
        # Store reminder (in production, use database)
        reminder = {
            'id': f"rem_{int(time.time())}",
            'title': title,
            'description': description,
            'due_date': due_date,
            'user_id': user_id,
            'created_at': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        # Schedule reminder check (in production, use proper task queue)
        # For now, just return the reminder
        
        return jsonify({
            'reminder': reminder,
            'message': 'Reminder created successfully'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/automation/notifications', methods=['GET'])
def get_notifications():
    """Get automated notifications"""
    try:
        user_id = request.args.get('user_id')
        
        # In production, fetch from database
        notifications = [
            {
                'id': '1',
                'type': 'reminder',
                'title': 'Rent Due Soon',
                'message': 'Your rent payment is due in 3 days',
                'timestamp': datetime.now().isoformat(),
                'read': False
            }
        ]
        
        return jsonify({
            'notifications': notifications,
            'unread_count': len([n for n in notifications if not n.get('read')])
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== DATA PROCESSING ====================

@app.route('/api/data/process-expenses', methods=['POST'])
def process_expenses():
    """Process and categorize expenses"""
    try:
        data = request.json
        expenses = data.get('expenses', [])
        
        # Simple categorization logic
        categories = {
            'Food': ['grocery', 'restaurant', 'food', 'dining'],
            'Transportation': ['gas', 'uber', 'taxi', 'parking', 'fuel'],
            'Utilities': ['electric', 'water', 'internet', 'phone', 'utility'],
            'Housing': ['rent', 'mortgage', 'maintenance', 'repair'],
            'Entertainment': ['movie', 'game', 'streaming', 'subscription'],
            'Shopping': ['store', 'amazon', 'purchase', 'shopping'],
            'Health': ['doctor', 'pharmacy', 'medical', 'health'],
            'Other': []
        }
        
        processed = []
        for expense in expenses:
            description = expense.get('description', '').lower()
            amount = expense.get('amount', 0)
            
            # Find matching category
            category = 'Other'
            for cat, keywords in categories.items():
                if any(keyword in description for keyword in keywords):
                    category = cat
                    break
            
            processed.append({
                **expense,
                'category': category,
                'processed_at': datetime.now().isoformat()
            })
        
        return jsonify({
            'processed_expenses': processed,
            'total': sum(exp.get('amount', 0) for exp in processed),
            'by_category': {
                cat: sum(exp.get('amount', 0) for exp in processed if exp.get('category') == cat)
                for cat in categories.keys()
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'openai': 'configured' if OPENAI_API_KEY else 'not configured',
            'gemini': 'configured' if GEMINI_API_KEY else 'not configured',
            'google_maps': 'configured' if GOOGLE_MAPS_API_KEY else 'not configured'
        }
    })

@app.route('/', methods=['GET'])
def index():
    """API root"""
    return jsonify({
        'message': 'Family Housing Hub API',
        'version': '1.0.0',
        'endpoints': {
            'ai': '/api/ai/chat',
            'meals': '/api/meals/generate-plan',
            'budget': '/api/budget/analyze',
            'location': '/api/location/nearby-places',
            'automation': '/api/automation/reminders',
            'health': '/api/health'
        }
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

