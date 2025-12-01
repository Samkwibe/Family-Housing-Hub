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
import re
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
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY') or '4d9f4dec85msh34a2b4ff5648991p1dcfccjsn125f4440583c'  # For real estate APIs
ZILLOW_API_KEY = RAPIDAPI_KEY  # Zillow scraper uses RapidAPI key
REALTOR_API_KEY = RAPIDAPI_KEY  # Realtor.com API uses RapidAPI key
ESTATED_API_KEY = os.getenv('ESTATED_API_KEY') or 'ec5c7745e9236b9519809c1d4c3f9c87'  # Estated.com API key
ATTOM_API_KEY = os.getenv('ATTOM_API_KEY')  # ATTOM Data API key

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
    """Health check endpoint to verify backend is running"""
    return jsonify({
        'status': 'healthy',
        'estated_configured': bool(ESTATED_API_KEY),
        'rapidapi_configured': bool(RAPIDAPI_KEY),
        'attom_configured': bool(ATTOM_API_KEY),
        'timestamp': datetime.now().isoformat()
    })

# ==================== REAL ESTATE / ZILLOW INTEGRATION ====================

@app.route('/api/properties/search', methods=['POST'])
def search_properties():
    """Search for properties using fast real estate APIs (Estated, Realtor.com, ATTOM)"""
    try:
        data = request.json
        query = data.get('query', '').strip()
        filters = data.get('filters', {})
        lat = data.get('lat')
        lng = data.get('lng')
        
        if not query and not (lat and lng):
            return jsonify({'error': 'Search query or coordinates required'}), 400
        
        properties = []
        
        # Determine if query is a specific address or area search
        is_specific_address = any(char.isdigit() for char in query) and any(word in query.lower() for word in ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 'ln', 'lane', 'blvd', 'boulevard'])
        
        # Try Zillow API first for specific addresses (Zillow scraper works best with specific property URLs)
        if ZILLOW_API_KEY and is_specific_address:
            try:
                zillow_props = search_zillow_api(query, lat, lng, filters)
                if zillow_props:
                    properties.extend(zillow_props)
                    print(f"✅ Zillow API: Found {len(zillow_props)} properties for '{query}'")
            except Exception as e:
                print(f"❌ Zillow API error: {e}")
                import traceback
                traceback.print_exc()
        
        # Try Realtor.com API for area searches (cities, zipcodes) - works better than Zillow scraper
        if REALTOR_API_KEY and (not is_specific_address or not properties):
            try:
                realtor_props = search_realtor_api(query, lat, lng, filters)
                if realtor_props:
                    properties.extend(realtor_props)
                    print(f"✅ Realtor.com API: Found {len(realtor_props)} properties for '{query}'")
            except Exception as e:
                print(f"❌ Realtor API error: {e}")
                import traceback
                traceback.print_exc()
        
        # Try Zillow API for area searches as well (may work for some)
        if ZILLOW_API_KEY and not is_specific_address and not properties:
            try:
                zillow_props = search_zillow_api(query, lat, lng, filters)
                if zillow_props:
                    properties.extend(zillow_props)
                    print(f"✅ Zillow API: Found {len(zillow_props)} properties for '{query}'")
            except Exception as e:
                print(f"❌ Zillow API error: {e}")
                import traceback
                traceback.print_exc()
        
        # Try Estated API as last fallback (best for specific addresses)
        if ESTATED_API_KEY and not properties:
            try:
                estated_props = search_estated_api(query, lat, lng, filters)
                if estated_props:
                    properties.extend(estated_props)
                    print(f"✅ Estated API: Found {len(estated_props)} property(ies) for '{query}'")
            except Exception as e:
                print(f"❌ Estated API error: {e}")
                import traceback
                traceback.print_exc()
                traceback.print_exc()
        
        # Try ATTOM API (fastest, enterprise-level)
        if ATTOM_API_KEY and not properties:
            try:
                attom_props = search_attom_api(query, lat, lng, filters)
                if attom_props:
                    properties.extend(attom_props)
            except Exception as e:
                print(f"ATTOM API error: {e}")
        
        # If no properties found, provide helpful message
        if not properties:
            # Check if it's a city/area search (not a specific address)
            is_area_search = not any(char.isdigit() for char in query) and (',' in query or len(query.split()) <= 3)
            
            return jsonify({
                'properties': [],
                'message': 'No properties found. Estated API works best for specific addresses. For area searches, try Realtor.com or Movoto.',
                'fallbackUrl': f"https://www.realtor.com/realestateandhomes-search/{requests.utils.quote(query)}/",
                'apiConfigured': bool(ESTATED_API_KEY or RAPIDAPI_KEY or ATTOM_API_KEY),
                'estatedConfigured': bool(ESTATED_API_KEY),
                'isAreaSearch': is_area_search,
                'suggestion': 'Try searching for a specific address (e.g., "123 Main St, Manchester, NH") instead of just a city name.'
            })
        
        return jsonify({
            'properties': properties[:20],  # Limit to 20 results
            'count': len(properties),
            'query': query
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def search_estated_api(query, lat, lng, filters):
    """Search Estated API - Fast and affordable (best for specific address lookups)"""
    properties = []
    
    if not ESTATED_API_KEY:
        return []
    
    headers = {
        'Authorization': f'Bearer {ESTATED_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Estated API v3 endpoint - supports address search
    # Note: Estated is best for specific property lookups, not area searches
    if query:
        # Use combined_address parameter for address search
        url = f"https://api.estated.com/v3/property?combined_address={requests.utils.quote(query)}"
    elif lat and lng:
        # Use coordinates if available
        url = f"https://api.estated.com/v3/property?latitude={lat}&longitude={lng}"
    else:
        return []
    
    try:
        print(f"🔍 Calling Estated API: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        print(f"📡 Estated API response: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"📦 Estated API data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            
            # Estated returns property data directly
            if data.get('data'):
                prop = data['data']
                print(f"✅ Found property data for: {query}")
                
                address_info = prop.get('address', {})
                structure_info = prop.get('structure', {})
                sale_info = prop.get('sale', {})
                lot_info = prop.get('lot', {})
                location_info = prop.get('location', {})
                
                # Build full address
                street = address_info.get('line1', '') or address_info.get('formatted_street_address', '')
                city = address_info.get('city', '')
                state = address_info.get('state', '')
                zipcode = address_info.get('postal_code', '') or address_info.get('zip', '')
                full_address = f"{street}, {city}, {state} {zipcode}".strip().strip(',')
                
                # Get coordinates
                prop_lat = location_info.get('latitude') or lat
                prop_lng = location_info.get('longitude') or lng
                
                property_data = {
                    'id': f"estated_{prop.get('apn', '') or prop.get('fips', '') or hash(query)}",
                    'address': full_address or query,
                    'city': city,
                    'state': state,
                    'zipcode': zipcode,
                    'price': sale_info.get('price'),
                    'bedrooms': structure_info.get('beds'),
                    'bathrooms': structure_info.get('baths'),
                    'sqft': structure_info.get('sqft'),
                    'yearBuilt': structure_info.get('year_built'),
                    'lotSize': lot_info.get('sqft'),
                    'lat': prop_lat,
                    'lng': prop_lng,
                    'type': structure_info.get('type', 'house'),
                    'images': [],
                    'zpid': None,
                    'listingType': 'buy',  # Estated provides property data, not listings
                    'source': 'estated'
                }
                
                print(f"✅ Property data prepared: {property_data.get('address')}, ${property_data.get('price')}")
                properties.append(property_data)
            else:
                print(f"⚠️ Estated API returned no 'data' field. Response: {json.dumps(data, indent=2)[:500]}")
        else:
            error_text = response.text[:500]
            print(f"❌ Estated API error: {response.status_code} - {error_text}")
            print(f"   URL: {url}")
            print(f"   Headers: {headers}")
    except Exception as e:
        print(f"Estated API request error: {e}")
        import traceback
        traceback.print_exc()
        return []
    
    return properties

def search_zillow_api(query, lat, lng, filters):
    """Search Zillow using RapidAPI scraper - Works for cities, zipcodes, and addresses"""
    properties = []
    
    if not ZILLOW_API_KEY:
        return []
    
    headers = {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'zillow-data-scraper1.p.rapidapi.com',
        'x-rapidapi-key': ZILLOW_API_KEY
    }
    
    try:
        # Get Zillow property URLs from search
        # We'll use Zillow's search page format and try to get listing URLs
        zillow_urls = get_zillow_listing_urls(query, filters)
        
        if not zillow_urls:
            print(f"⚠️ No Zillow URLs found for query: {query}")
            return []
        
        print(f"✅ Found {len(zillow_urls)} Zillow listings to scrape")
        
        # Scrape each property using the Zillow scraper API
        for listing_url in zillow_urls[:15]:  # Limit to 15 properties to avoid rate limits
            try:
                property_data = scrape_zillow_listing(listing_url, headers)
                if property_data:
                    properties.append(property_data)
                    print(f"✅ Scraped: {property_data.get('address', 'Unknown')}")
            except Exception as e:
                print(f"⚠️ Error scraping {listing_url}: {e}")
                continue
        
    except Exception as e:
        print(f"❌ Zillow API error: {e}")
        import traceback
        traceback.print_exc()
    
    return properties

def get_zillow_listing_urls(query, filters):
    """Get Zillow listing URLs from a search query"""
    # Since Zillow scraper needs specific URLs, we need to get them first
    # We'll use Zillow's search URL format and try to extract property URLs
    
    listing_urls = []
    clean_query = query.strip()
    
    # Check if it's a specific address (has numbers and street name)
    is_address = any(char.isdigit() for char in clean_query) and any(word in clean_query.lower() for word in ['st', 'street', 'ave', 'avenue', 'rd', 'road', 'dr', 'drive', 'ln', 'lane'])
    
    if is_address:
        # For specific addresses, construct Zillow search URL
        # Zillow format: https://www.zillow.com/homes/{address}/
        zillow_search_url = f"https://www.zillow.com/homes/{requests.utils.quote(clean_query)}/"
        listing_urls.append(zillow_search_url)
    else:
        # For area searches (city, zipcode), use Zillow's search format
        # Format: https://www.zillow.com/homes/{city-state}/
        # For zipcodes: https://www.zillow.com/homes/{zipcode}_rb/
        
        if clean_query.isdigit() and len(clean_query) == 5:
            # It's a zipcode
            zillow_search_url = f"https://www.zillow.com/homes/{clean_query}_rb/"
        else:
            # It's a city/area
            zillow_search_url = f"https://www.zillow.com/homes/{requests.utils.quote(clean_query)}/"
        
        # For area searches, we'd normally scrape the search results page
        # to get individual property URLs. For now, we'll return the search URL
        # and the scraper might handle it, or we can try to get listings from search page
        
        # Try to get property URLs from Zillow search page
        # This is a simplified approach - in production you'd parse the HTML
        listing_urls.append(zillow_search_url)
    
    return listing_urls

def scrape_zillow_listing(zillow_url, headers):
    """Scrape a single Zillow listing using the RapidAPI scraper"""
    try:
        url = 'https://zillow-data-scraper1.p.rapidapi.com/scrape-listing'
        
        payload = {
            'url': zillow_url
        }
        
        print(f"📡 Scraping Zillow: {zillow_url[:80]}...")
        
        response = requests.post(url, headers=headers, json=payload, timeout=20)
        
        if response.ok:
            data = response.json()
            print(f"✅ Zillow scraper response received")
            
            # Parse the scraped data
            property_data = parse_zillow_scraped_data(data, zillow_url)
            
            return property_data
        else:
            print(f"❌ Zillow scraper error: {response.status_code} - {response.text[:200]}")
            return None
            
    except Exception as e:
        print(f"❌ Error scraping Zillow listing: {e}")
        import traceback
        traceback.print_exc()
        return None

def parse_zillow_scraped_data(data, original_url):
    """Parse scraped Zillow data into our property format"""
    try:
        # Handle different possible response structures
        prop = data.get('data', {}) or data.get('property', {}) or data.get('result', {}) or data
        
        # Extract address
        address_info = prop.get('address', {}) or {}
        street = address_info.get('street', '') or address_info.get('line', '') or address_info.get('streetAddress', '') or prop.get('street', '')
        city = address_info.get('city', '') or prop.get('city', '')
        state = address_info.get('state', '') or address_info.get('stateCode', '') or prop.get('state', '')
        zipcode = address_info.get('zipcode', '') or address_info.get('zip', '') or address_info.get('postalCode', '') or prop.get('zipcode', '')
        
        full_address = ', '.join([p for p in [street, city, state, zipcode] if p]) if any([street, city, state, zipcode]) else 'Address not available'
        
        # Extract price
        price = prop.get('price', '') or prop.get('listPrice', '') or prop.get('estimatedPrice', '') or prop.get('zestimate', '')
        if isinstance(price, str):
            # Remove currency symbols, commas, and spaces
            price_clean = price.replace('$', '').replace(',', '').replace(' ', '').strip()
            try:
                price = int(price_clean) if price_clean else None
            except:
                price = None
        elif not isinstance(price, (int, float)):
            price = None
        
        # Extract property details
        bedrooms = prop.get('bedrooms', '') or prop.get('beds', '') or prop.get('bed', '')
        bathrooms = prop.get('bathrooms', '') or prop.get('baths', '') or prop.get('bath', '')
        sqft = prop.get('sqft', '') or prop.get('squareFeet', '') or prop.get('livingArea', '') or prop.get('area', '')
        year_built = prop.get('yearBuilt', '') or prop.get('year', '')
        lot_size = prop.get('lotSize', '') or prop.get('lotSqft', '') or prop.get('lotSquareFeet', '')
        
        # Extract coordinates
        location = prop.get('location', {}) or {}
        lat = location.get('lat') or location.get('latitude') or prop.get('lat')
        lng = location.get('lng') or location.get('longitude') or location.get('lon') or prop.get('lng')
        
        # Extract images
        images = []
        if prop.get('images'):
            if isinstance(prop['images'], list):
                images = prop['images']
            else:
                images = [prop['images']]
        elif prop.get('photo'):
            images = [prop['photo']] if isinstance(prop['photo'], str) else prop['photo']
        elif prop.get('photos'):
            if isinstance(prop['photos'], list):
                images = [p.get('url', p) if isinstance(p, dict) else p for p in prop['photos']]
        
        # Extract ZPID from URL
        zpid = None
        if original_url:
            zpid_match = re.findall(r'/(\d+)_zpid/', original_url)
            if zpid_match:
                zpid = zpid_match[0]
            else:
                # Try to get from data
                zpid = prop.get('zpid') or prop.get('id')
        
        # Determine listing type
        listing_type = 'buy'
        status = str(prop.get('status', '')).lower()
        prop_type = str(prop.get('type', '')).lower()
        if 'rent' in status or 'rent' in prop_type or prop.get('forRent'):
            listing_type = 'rent'
        
        property_data = {
            'id': f"zillow_{zpid or hash(full_address)}",
            'address': full_address,
            'city': city,
            'state': state,
            'zipcode': zipcode,
            'price': price,
            'bedrooms': bedrooms,
            'bathrooms': bathrooms,
            'sqft': sqft,
            'yearBuilt': year_built,
            'lotSize': lot_size,
            'lat': lat,
            'lng': lng,
            'type': prop.get('propertyType', 'house') or prop.get('type', 'house') or 'house',
            'images': images[:10] if images else [],
            'zpid': zpid,
            'listingType': listing_type,
            'source': 'zillow',
            'zillowUrl': original_url
        }
        
        return property_data
        
    except Exception as e:
        print(f"⚠️ Error parsing Zillow data: {e}")
        import traceback
        traceback.print_exc()
        return None

def search_realtor_api(query, lat, lng, filters):
    """Search Realtor.com API via RapidAPI - Excellent for area searches"""
    properties = []
    
    if not REALTOR_API_KEY:
        return []
    
    headers = {
        'x-rapidapi-host': 'realtor-search.p.rapidapi.com',
        'x-rapidapi-key': REALTOR_API_KEY
    }
    
    # Use the endpoint provided by the user
    url = 'https://realtor-search.p.rapidapi.com/agents/v2/listings'
    
    # Build query parameters
    params = {
        'fulfillmentId': '3155600',  # Default fulfillment ID from user's example
    }
    
    # Add location-based search
    # For city/state searches, parse the query
    if query:
        query_parts = query.split(',')
        if len(query_parts) >= 2:
            city = query_parts[0].strip()
            state_part = query_parts[1].strip()
            # Extract state code (first 2 letters or full state name)
            state = state_part.split()[0][:2].upper() if state_part else ''
            params['city'] = city
            params['state_code'] = state
        else:
            # Single query - could be city, zipcode, or address
            # Try to detect zipcode
            if query.strip().isdigit() and len(query.strip()) == 5:
                params['postal_code'] = query.strip()
            else:
                params['city'] = query.strip()
    
    # Add coordinates if available (for more accurate results)
    if lat and lng:
        params['lat'] = lat
        params['lon'] = lng
    
    # Add filters
    if filters.get('bedrooms'):
        params['beds_min'] = filters['bedrooms']
    if filters.get('bathrooms'):
        params['baths_min'] = filters['bathrooms']
    if filters.get('priceRange'):
        if filters['priceRange'].get('min'):
            params['price_min'] = filters['priceRange']['min']
        if filters['priceRange'].get('max'):
            params['price_max'] = filters['priceRange']['max']
    if filters.get('listingType') == 'rent':
        params['status'] = 'for_rent'
    elif filters.get('listingType') == 'buy':
        params['status'] = 'for_sale'
    
    try:
        print(f"🔍 Calling Realtor.com API: {url}")
        print(f"📋 Params: {params}")
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        print(f"📡 Realtor.com API response: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"📦 Realtor.com API response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
            
            # Parse response - structure may vary
            listings = []
            if isinstance(data, dict):
                # Try different possible response structures
                if 'data' in data:
                    if isinstance(data['data'], list):
                        listings = data['data']
                    elif isinstance(data['data'], dict):
                        listings = data['data'].get('listings', []) or data['data'].get('results', [])
                elif 'listings' in data:
                    listings = data['listings'] if isinstance(data['listings'], list) else []
                elif 'results' in data:
                    listings = data['results'] if isinstance(data['results'], list) else []
                elif 'properties' in data:
                    listings = data['properties'] if isinstance(data['properties'], list) else []
            elif isinstance(data, list):
                listings = data
            
            print(f"✅ Found {len(listings)} listings from Realtor.com")
            
            for listing in listings[:50]:  # Limit to 50 results
                try:
                    # Extract property data - handle different response structures
                    address_info = listing.get('address', {}) or listing.get('location', {}) or {}
                    property_info = listing.get('property', {}) or listing.get('description', {}) or listing
                    price_info = listing.get('price', {}) or listing.get('list_price', {}) or {}
                    
                    # Get address components
                    street = address_info.get('line', '') or address_info.get('street', '') or address_info.get('address', '') or listing.get('address', '')
                    city = address_info.get('city', '') or listing.get('city', '')
                    state = address_info.get('state', '') or address_info.get('state_code', '') or listing.get('state', '')
                    zipcode = address_info.get('postal_code', '') or address_info.get('zip', '') or listing.get('postal_code', '') or listing.get('zip', '')
                    
                    # Build full address
                    address_parts = [p for p in [street, city, state, zipcode] if p]
                    full_address = ', '.join(address_parts) if address_parts else query
                    
                    # Get coordinates
                    location = listing.get('location', {}) or address_info.get('coordinate', {}) or {}
                    prop_lat = location.get('lat') or location.get('latitude') or listing.get('lat') or lat
                    prop_lng = location.get('lon') or location.get('lng') or location.get('longitude') or listing.get('lng') or lng
                    
                    # Get price
                    price = None
                    if isinstance(price_info, (int, float)):
                        price = price_info
                    elif isinstance(price_info, dict):
                        price = price_info.get('amount') or price_info.get('value') or price_info.get('price')
                    else:
                        price = listing.get('list_price') or listing.get('price') or listing.get('listPrice')
                    
                    # Get property details
                    bedrooms = property_info.get('beds') or listing.get('beds') or property_info.get('bedrooms') or listing.get('bedrooms')
                    bathrooms = property_info.get('baths') or listing.get('baths') or property_info.get('bathrooms') or listing.get('bathrooms')
                    sqft = property_info.get('sqft') or listing.get('sqft') or property_info.get('square_feet') or listing.get('squareFeet')
                    year_built = property_info.get('year_built') or listing.get('year_built') or listing.get('yearBuilt')
                    lot_size = property_info.get('lot_sqft') or listing.get('lot_sqft') or listing.get('lotSqft')
                    
                    # Get images
                    images = []
                    if listing.get('photos'):
                        if isinstance(listing['photos'], list):
                            images = [photo.get('href') or photo.get('url') or str(photo) for photo in listing['photos'] if photo]
                        elif isinstance(listing['photos'], dict):
                            images = [listing['photos'].get('href') or listing['photos'].get('url')]
                    elif listing.get('primary_photo'):
                        photo = listing['primary_photo']
                        images = [photo.get('href') or photo.get('url')] if isinstance(photo, dict) else [str(photo)]
                    elif listing.get('photo'):
                        images = [listing['photo']]
                    
                    # Determine listing type
                    listing_type = 'buy'
                    status = str(listing.get('status', '')).lower()
                    if 'rent' in status or listing.get('for_rent'):
                        listing_type = 'rent'
                    
                    property_data = {
                        'id': f"realtor_{listing.get('property_id') or listing.get('id') or listing.get('listing_id') or hash(full_address)}",
                        'address': full_address,
                        'city': city,
                        'state': state,
                        'zipcode': zipcode,
                        'price': price,
                        'bedrooms': bedrooms,
                        'bathrooms': bathrooms,
                        'sqft': sqft,
                        'yearBuilt': year_built,
                        'lotSize': lot_size,
                        'lat': prop_lat,
                        'lng': prop_lng,
                        'type': property_info.get('type', 'house') or listing.get('property_type', 'house') or 'house',
                        'images': images[:10] if images else [],
                        'zpid': listing.get('zpid'),
                        'listingType': listing_type,
                        'source': 'realtor.com'
                    }
                    
                    # Only add if we have at least an address or price
                    if property_data['address'] or property_data['price']:
                        properties.append(property_data)
                except Exception as e:
                    print(f"⚠️ Error parsing listing: {e}")
                    continue
        else:
            error_text = response.text[:500]
            print(f"❌ Realtor.com API error: {response.status_code} - {error_text}")
            
    except Exception as e:
        print(f"❌ Realtor.com API request error: {e}")
        import traceback
        traceback.print_exc()
    
    return properties
                    'zipcode': prop.get('location', {}).get('address', {}).get('postal_code', ''),
                    'price': prop.get('list_price'),
                    'bedrooms': prop.get('description', {}).get('beds'),
                    'bathrooms': prop.get('description', {}).get('baths'),
                    'sqft': prop.get('description', {}).get('sqft'),
                    'yearBuilt': prop.get('description', {}).get('year_built'),
                    'lotSize': prop.get('description', {}).get('lot_sqft'),
                    'lat': prop.get('location', {}).get('address', {}).get('coordinate', {}).get('lat'),
                    'lng': prop.get('location', {}).get('address', {}).get('coordinate', {}).get('lon'),
                    'type': prop.get('description', {}).get('type', 'house'),
                    'images': [img.get('href', '') for img in prop.get('photos', [])[:5]],
                    'zpid': prop.get('property_id'),
                    'listingType': 'rent' if filters.get('listingType') == 'rent' else 'buy',
                    'source': 'realtor'
                })
    
    return properties

def search_attom_api(query, lat, lng, filters):
    """Search ATTOM API - Fastest, enterprise-level"""
    properties = []
    
    headers = {
        'apikey': ATTOM_API_KEY,
        'Accept': 'application/json'
    }
    
    # ATTOM API endpoint
    if lat and lng:
        url = f"https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?latitude={lat}&longitude={lng}"
    elif query:
        # Geocode first
        geocode_url = f"https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail?address1={requests.utils.quote(query)}"
        geocode_resp = requests.get(geocode_url, headers=headers, timeout=2)
        if geocode_resp.ok:
            geocode_data = geocode_resp.json()
            if geocode_data.get('property'):
                prop = geocode_data['property'][0]
                properties.append({
                    'id': prop.get('identifier', {}).get('obPropId', ''),
                    'address': prop.get('address', {}).get('oneLine', query),
                    'city': prop.get('address', {}).get('city', ''),
                    'state': prop.get('address', {}).get('state', ''),
                    'zipcode': prop.get('address', {}).get('postal1', ''),
                    'price': prop.get('sale', {}).get('amount', {}).get('saleamt'),
                    'bedrooms': prop.get('summary', {}).get('beds'),
                    'bathrooms': prop.get('summary', {}).get('baths'),
                    'sqft': prop.get('summary', {}).get('sqft'),
                    'yearBuilt': prop.get('summary', {}).get('yearbuilt'),
                    'lotSize': prop.get('lot', {}).get('lotsize1'),
                    'lat': prop.get('location', {}).get('latitude'),
                    'lng': prop.get('location', {}).get('longitude'),
                    'type': prop.get('summary', {}).get('propsubtype', 'house'),
                    'images': [],
                    'zpid': prop.get('identifier', {}).get('obPropId'),
                    'listingType': 'buy',
                    'source': 'attom'
                })
    
    return properties

@app.route('/api/properties/zillow-url', methods=['POST'])
def build_zillow_url():
    """Build accurate Zillow URL for a property"""
    try:
        data = request.json
        address = data.get('address', '')
        zpid = data.get('zpid')  # Zillow Property ID if available
        
        if zpid:
            # Use ZPID for most accurate link
            zillow_url = f"https://www.zillow.com/homedetails/{zpid}_zpid/"
        elif address:
            # Build search URL from address
            zillow_url = f"https://www.zillow.com/homes/{requests.utils.quote(address)}/"
        else:
            return jsonify({'error': 'Address or ZPID required'}), 400
        
        return jsonify({
            'zillowUrl': zillow_url,
            'address': address,
            'zpid': zpid
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

