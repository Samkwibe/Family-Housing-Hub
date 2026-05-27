"""
Family Housing Hub - Python Backend API
Provides real, fully functional services including AI, automation, and data processing
"""
from flask import Flask, request, jsonify, Response
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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import defaultdict, deque

load_dotenv()

from encryption_service import require_encryption_key

require_encryption_key()

from auth_routes import auth_bp, get_current_user_doc
from verification_store import verification_bp
from message_routes import messages_bp
from household_routes import household_bp
from storage_routes import storage_bp
from financial_routes import financial_bp
from automation_routes import automation_bp
from safety_routes import safety_bp
from health_routes import health_bp, build_health_dashboard_summary
from predictive_routes import predictive_bp, build_purchase_readiness_summary
from dashboard_routes import dashboard_bp
from owner_routes import owner_bp
from child_routes import child_bp
from observability_routes import observability_bp
from household_context_builder import build_rag_household_context
from realtime_service import socketio
from request_logging_middleware import register_request_logging
from portal_middleware import register_portal_middleware
from rate_limit_service import (
    AUTH_LIMITS,
    check_auth_rate_limit,
    check_global_rate_limit,
    rate_limit_response,
)
from conversational_memory_service import (
    format_memory_for_prompt,
    retrieve_relevant_sessions,
    store_session,
)
from household_service import ensure_user_household
from database import get_db

app = Flask(__name__)

_cors_origins = os.getenv(
    'CORS_ORIGINS',
    'https://family-housing-hub.web.app,http://localhost:3001,http://localhost:5173,'
    'http://localhost:8081,exp://localhost:8081,http://127.0.0.1:8081,exp://127.0.0.1:8081',
)
CORS(app, origins=[o.strip() for o in _cors_origins.split(',') if o.strip()])

app.register_blueprint(auth_bp)
app.register_blueprint(verification_bp)
app.register_blueprint(messages_bp)
app.register_blueprint(household_bp)
app.register_blueprint(storage_bp)
app.register_blueprint(financial_bp)
app.register_blueprint(automation_bp)
app.register_blueprint(safety_bp)
app.register_blueprint(health_bp)
app.register_blueprint(predictive_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(owner_bp)
app.register_blueprint(child_bp)
app.register_blueprint(observability_bp)

_cors_origin_list = [o.strip() for o in _cors_origins.split(',') if o.strip()]
socketio.init_app(app, cors_allowed_origins=_cors_origin_list or '*')
register_request_logging(app)
register_portal_middleware(app)


@app.before_request
def _enforce_rate_limits():
    if request.path.startswith('/socket.io'):
        return None
    ok, info = check_global_rate_limit(request)
    if not ok:
        return rate_limit_response(info)
    return None

# API Keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('VITE_GEMINI_API_KEY')
NVIDIA_API_KEY = os.getenv('NVIDIA_API_KEY') or os.getenv('INVidia_API_KEY')
NVIDIA_API_MODEL = os.getenv('NVIDIA_API_MODEL', 'meta/llama-3.1-70b-instruct')
NVIDIA_API_BASE = (os.getenv('NVIDIA_API_BASE') or 'https://integrate.api.nvidia.com/v1').rstrip('/')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY') or os.getenv('VITE_GOOGLE_MAPS_API_KEY')
MAPBOX_ACCESS_TOKEN = os.getenv('MAPBOX_ACCESS_TOKEN') or os.getenv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN')
LOCATION_COUNTRY_CODE = (os.getenv('LOCATION_COUNTRY_CODE') or 'us').lower()
RAPIDAPI_KEY = os.getenv('RAPIDAPI_KEY') or '4d9f4dec85msh34a2b4ff5648991p1dcfccjsn125f4440583c'  # For real estate APIs
ZILLOW_API_KEY = RAPIDAPI_KEY  # Zillow scraper uses RapidAPI key
REALTOR_API_KEY = RAPIDAPI_KEY  # Realtor.com API uses RapidAPI key
ESTATED_API_KEY = os.getenv('ESTATED_API_KEY') or 'ec5c7745e9236b9519809c1d4c3f9c87'  # Estated.com API key
ATTOM_API_KEY = os.getenv('ATTOM_API_KEY')  # ATTOM Data API key

# Email configuration
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM', SMTP_USER or 'noreply@family-housing-hub.com')

# SMS configuration (using Twilio or similar)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
TWILIO_WHATSAPP_FROM = os.getenv('TWILIO_WHATSAPP_FROM')  # e.g. whatsapp:+14155238886

# Verification abuse protection
VERIFICATION_WINDOW_SECONDS = int(os.getenv('VERIFICATION_WINDOW_SECONDS', 600))  # 10 min
VERIFICATION_MAX_PER_IP = int(os.getenv('VERIFICATION_MAX_PER_IP', 20))
VERIFICATION_MAX_PER_TARGET = int(os.getenv('VERIFICATION_MAX_PER_TARGET', 5))
VERIFICATION_COOLDOWN_SECONDS = int(os.getenv('VERIFICATION_COOLDOWN_SECONDS', 45))
VERIFICATION_ADMIN_TOKEN = os.getenv('VERIFICATION_ADMIN_TOKEN')
_verification_rate_lock = threading.Lock()
_verification_attempts = defaultdict(deque)  # key -> deque[timestamps]
_verification_last_sent = {}  # key -> last timestamp
_verification_events = deque(maxlen=300)  # recent verification ops/blocks for diagnostics


def _get_client_ip():
    """Resolve client IP behind proxies/load balancers."""
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _normalize_email(email):
    return (email or '').strip().lower()


def _normalize_phone(phone):
    digits = re.sub(r'\D', '', phone or '')
    if len(digits) == 11 and digits.startswith('1'):
        digits = digits[1:]
    return digits


def _mask_email(email):
    email = _normalize_email(email)
    if '@' not in email:
        return email
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked_local = local[0] + '*'
    else:
        masked_local = local[:2] + ('*' * max(1, len(local) - 2))
    return f'{masked_local}@{domain}'


def _mask_phone(phone_digits):
    d = _normalize_phone(phone_digits)
    if len(d) != 10:
        return phone_digits
    return f'***-***-{d[-4:]}'


def _record_verification_event(channel, status, target=None, ip=None, reason=None):
    evt = {
        'ts': datetime.now().isoformat(),
        'channel': channel,
        'status': status,  # sent | blocked | failed | test
        'target': target,
        'ip': ip,
        'reason': reason
    }
    with _verification_rate_lock:
        _verification_events.appendleft(evt)


def _check_and_track_rate_limit(rate_key, max_attempts, window_seconds):
    """
    Sliding-window rate limit.
    Returns (allowed: bool, retry_after_seconds: int).
    """
    now = time.time()
    with _verification_rate_lock:
        bucket = _verification_attempts[rate_key]
        while bucket and (now - bucket[0]) > window_seconds:
            bucket.popleft()
        if len(bucket) >= max_attempts:
            retry_after = max(1, int(window_seconds - (now - bucket[0])))
            return False, retry_after
        bucket.append(now)
    return True, 0


def _check_and_track_cooldown(cooldown_key, cooldown_seconds):
    """
    Enforce minimum interval between sends to same destination.
    Returns (allowed: bool, retry_after_seconds: int).
    """
    now = time.time()
    with _verification_rate_lock:
        last = _verification_last_sent.get(cooldown_key, 0)
        elapsed = now - last
        if elapsed < cooldown_seconds:
            return False, max(1, int(cooldown_seconds - elapsed))
        _verification_last_sent[cooldown_key] = now
    return True, 0


def _send_whatsapp_code(formatted_phone, code):
    """Optional WhatsApp fallback using Twilio WhatsApp sender."""
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM):
        return None
    try:
        from twilio.rest import Client
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=f'Your Family Housing Hub verification code is: {code}. This code expires in 10 minutes.',
            from_=TWILIO_WHATSAPP_FROM,
            to=f'whatsapp:{formatted_phone}'
        )
        return message.sid
    except Exception as err:
        print(f'WhatsApp fallback failed: {err}')
        return None

# Initialize AI clients
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ==================== AI SERVICES ====================

def _housing_tips_fallback(message: str, user_role: str = 'renter') -> str:
    """Offline-friendly housing tips when AI API keys are not configured."""
    q = (message or '').lower()
    tips = {
        'rent': (
            'Track rent due dates in your calendar and set a reminder 3 days before. '
            'Keep payment confirmations in Documents. If you are a renter, know your '
            'lease end date and notice period for renewals.'
        ),
        'maintenance': (
            'For maintenance: document the issue with photos, note when it started, '
            'and contact your landlord in writing. Urgent issues (no heat, water leaks, '
            'electrical hazards) should be reported immediately.'
        ),
        'budget': (
            'A simple housing budget: 30% for rent, 10% utilities, 5% maintenance fund. '
            'Review subscriptions and groceries monthly. Build a small emergency fund '
            'for unexpected repairs.'
        ),
        'search': (
            'When house hunting: list must-haves vs nice-to-haves, check commute times '
            'on Maps, research schools and safety, and compare total monthly cost '
            '(rent + utilities + parking).'
        ),
    }
    for keyword, tip in tips.items():
        if keyword in q:
            return tip
    role_note = 'property owner' if user_role == 'owner' else 'renter or family member'
    return (
        f'I am running in tips mode (no AI API key configured). As a {role_note}, '
        'you can ask about rent, maintenance, budgeting, house search, or family planning. '
        'Try: "How do I track rent payments?" or "Maintenance request tips."'
    )


def _call_nvidia_chat(messages, max_tokens=500):
    """NVIDIA NIM — OpenAI-compatible chat completions (multiple models via NVIDIA_API_MODEL)."""
    if not NVIDIA_API_KEY:
        return None
    timeout = 180 if max_tokens > 600 else 90
    try:
        resp = requests.post(
            f'{NVIDIA_API_BASE}/chat/completions',
            headers={
                'Authorization': f'Bearer {NVIDIA_API_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': NVIDIA_API_MODEL,
                'messages': messages,
                'max_tokens': max_tokens,
                'temperature': 0.7,
            },
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message']['content']
    except Exception as e:
        print(f'NVIDIA error: {e}')
        return None


def _generate_ai_text(prompt, system_hint='You are FamilyHub AI. Be helpful and concise.', max_tokens=800):
    """NVIDIA first, then Gemini, then OpenAI — same order as /api/ai/chat."""
    messages = [
        {'role': 'system', 'content': system_hint},
        {'role': 'user', 'content': prompt},
    ]
    text = _call_nvidia_chat(messages, max_tokens=max_tokens)
    if text:
        return text

    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(f"{system_hint}\n\n{prompt}")
            return response.text
        except Exception as e:
            print(f'Gemini error: {e}')

    if OPENAI_API_KEY:
        try:
            response = openai.ChatCompletion.create(
                model='gpt-3.5-turbo',
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f'OpenAI error: {e}')

    return None


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """Enhanced AI chat with household context and persona awareness"""
    try:
        data = request.json
        message = data.get('message', '')
        context = data.get('context', {})
        use_gemini = data.get('use_gemini', True)
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        user_role = context.get('user_role') or context.get('userType') or 'renter'
        ai_persona = context.get('aiPersona') or context.get('ai_persona') or 'general'
        household_context = context.get('householdContext') or context.get('household_context') or ''

        # Server-side RAG: pull live MongoDB household data for authenticated users
        user_doc = get_current_user_doc()
        memory_block = ''
        if user_doc:
            try:
                rag = build_rag_household_context(user_doc)
                server_rag = rag.get('formatted', '')
                if server_rag:
                    if household_context:
                        if isinstance(household_context, dict):
                            household_context = json.dumps(household_context, indent=2)
                        household_context = f"{server_rag}\n\n{household_context}"
                    else:
                        household_context = server_rag
            except Exception as exc:
                print(f'RAG context build failed: {exc}')
            try:
                household_id = ensure_user_household(user_doc)
                past = retrieve_relevant_sessions(get_db(), household_id, message)
                memory_block = format_memory_for_prompt(past)
            except Exception as exc:
                print(f'Conversational memory failed: {exc}')

        persona_prompts = {
            'general': (
                'You are FamilyHub AI — the central brain for an entire household. '
                'You understand groceries, food inventory, leases, bills, roommates, '
                'maintenance, shopping, energy, routines, finances, packages, chores, '
                'and calendar events. Be proactive, practical, and concise.'
            ),
            'chef': (
                'You are Chef AI for FamilyHub. Focus on meals, recipes, ingredients, '
                'expiration dates, waste reduction, and grocery planning. Suggest '
                'actionable recipes using what the household already has.'
            ),
            'budget': (
                'You are Budget AI for FamilyHub. Focus on rent splits, savings goals, '
                'subscriptions, bill forecasting, and cost optimization. Give specific '
                'numbers and savings opportunities when possible.'
            ),
            'maintenance': (
                'You are Fix AI for FamilyHub. Focus on maintenance issues, landlord '
                'communication, move-in/move-out checklists, and home repairs. Assess '
                'urgency and suggest clear next steps.'
            ),
            'wellness': (
                'You are Wellness AI for FamilyHub. Focus on nutrition, hydration, '
                'medication reminders, and household wellness habits. Be supportive '
                'and health-conscious without giving medical diagnoses.'
            ),
        }
        system_hint = persona_prompts.get(ai_persona, persona_prompts['general'])
        system_hint += (
            '\n\nYou receive LIVE HOUSEHOLD DATA with each message. When that data exists, '
            'your answer MUST reference specific items (food expiring, bills due, open maintenance, '
            'health score, documents expiring). Items with days remaining > 0 are NOT expired — '
            'say "expiring in N days" or "use soon", never "expired". Never respond with only generic '
            'housing tips when specific data is available. Be concise and actionable.'
        )

        context_parts = []
        if context.get('location'):
            context_parts.append(f"User location: {context['location']}.")
        context_parts.append(f"User role: {user_role}.")
        if context.get('firstName'):
            context_parts.append(f"User name: {context['firstName']}.")
        if context.get('family_info'):
            context_parts.append(f"Family info: {context['family_info']}.")
        if household_context:
            if isinstance(household_context, dict):
                household_context = json.dumps(household_context, indent=2)
            context_parts.append(f"Live household data:\n{household_context}")
        if memory_block:
            context_parts.append(memory_block)

        context_str = ' '.join(context_parts)
        full_prompt = (
            f"{context_str}\n\nUser question: {message}\n\n"
            'Use the household data when relevant. Give a helpful, actionable response.'
        )
        
        # Try NVIDIA NIM first, then Gemini, then OpenAI
        response_text = None
        chat_messages = [
            {'role': 'system', 'content': system_hint},
            {'role': 'user', 'content': full_prompt},
        ]

        if NVIDIA_API_KEY:
            response_text = _call_nvidia_chat(chat_messages)

        if use_gemini and GEMINI_API_KEY and not response_text:
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(f"{system_hint}\n\n{full_prompt}")
                response_text = response.text
            except Exception as e:
                print(f"Gemini error: {e}")
        
        # Fallback to OpenAI
        if not response_text and OPENAI_API_KEY:
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_hint},
                        {"role": "user", "content": full_prompt}
                    ],
                    max_tokens=500,
                    temperature=0.7
                )
                response_text = response.choices[0].message.content
            except Exception as e:
                print(f"OpenAI error: {e}")
        
        if not response_text:
            response_text = _housing_tips_fallback(message, user_role)

        if user_doc and response_text:
            try:
                store_session(get_db(), ensure_user_household(user_doc), message, response_text)
            except Exception as exc:
                print(f'Session store failed: {exc}')
        
        return jsonify({
            'response': response_text,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _extract_food_name(analysis_text: str) -> str:
    """Best-effort parse of food name from Gemini vision output."""
    if not analysis_text:
        return ''
    try:
        cleaned = analysis_text.replace('```json', '').replace('```', '').strip()
        data = json.loads(cleaned)
        return str(data.get('foodName') or data.get('name') or '').strip()
    except Exception:
        pass
    import re
    match = re.search(r'foodName["\s:]+([^"\n,}]+)', analysis_text, re.I)
    return match.group(1).strip() if match else ''


@app.route('/api/ai/analyze-image', methods=['POST'])
def analyze_image():
    """Analyze food images with AI"""
    try:
        data = request.json
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({'error': 'Image is required'}), 400
        
        if not GEMINI_API_KEY and not NVIDIA_API_KEY:
            return jsonify({'error': 'AI vision service not configured'}), 503

        prompt = """Analyze this food image and provide:
        1. Food name
        2. Ingredients (if visible)
        3. Estimated nutrition (calories, protein, carbs, fat)
        4. Freshness assessment
        5. Allergens (if identifiable)
        6. Portion size estimate
        7. Recipe suggestions
        
        Format as JSON with keys: foodName, ingredients, nutrition, freshness, allergens, portionSize, recipe"""

        # Use Gemini Vision when available; NVIDIA text models cannot analyze images yet.
        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-pro-vision')
                response = model.generate_content([
                    prompt,
                    {"mime_type": "image/jpeg", "data": image_base64}
                ])
                return jsonify({
                    'analysis': response.text,
                    'foodName': _extract_food_name(response.text),
                    'timestamp': datetime.now().isoformat()
                })
            except Exception as e:
                print(f'Gemini vision error: {e}')

        return jsonify({'error': 'Food image analysis requires a working Gemini API key'}), 503
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== MEAL PLANNING ====================

@app.route('/api/meals/generate-plan', methods=['POST'])
def generate_meal_plan():
    """Generate smart meal plan — expiry-first fridge inventory + AI."""
    try:
        from auth_routes import get_current_user_doc
        from household_service import ensure_user_household
        from database import get_db
        from meal_plan_service import (
            build_meal_plan_prompt,
            fallback_meal_plan,
            format_meal_plan_display,
            parse_meal_plan_response,
            sort_inventory_by_expiry,
        )

        data = request.json or {}
        days = int(data.get('days', 7))
        user = get_current_user_doc()
        inventory = data.get('pantry', [])

        if user:
            db = get_db()
            hid = ensure_user_household(user)
            inventory = list(db.inventory.find({'householdId': hid}).sort('expiresAt', 1))

        sorted_pantry = sort_inventory_by_expiry(inventory)
        system_hint, prompt = build_meal_plan_prompt(inventory, days=days)
        plan_text = _generate_ai_text(prompt, system_hint=system_hint, max_tokens=2000)
        if not plan_text:
            parsed = fallback_meal_plan(inventory, days=days)
        else:
            parsed = parse_meal_plan_response(plan_text)
            if not parsed.get('days'):
                parsed = fallback_meal_plan(inventory, days=days)
        display = format_meal_plan_display(parsed)

        return jsonify({
            'meal_plan': display,
            'plan': parsed,
            'pantryPriority': sorted_pantry[:10],
            'days': days,
            'generated_at': datetime.now().isoformat(),
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

        system_hint = (
            'You are Chef AI for FamilyHub. Suggest creative, practical recipes '
            'using the ingredients provided.'
        )
        suggestions = _generate_ai_text(prompt, system_hint=system_hint, max_tokens=1200)
        if not suggestions:
            return jsonify({'error': 'AI service unavailable. Configure NVIDIA or Gemini API keys.'}), 503
        
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
    """Nearby POIs — Google Places primary (photos/ratings), Mapbox/OSM fallbacks."""
    try:
        from location_services import get_nearby_places as fetch_nearby

        data = request.json or {}
        lat = data.get('lat')
        lng = data.get('lng')
        category = data.get('category', 'all')
        categories = data.get('categories')
        radius = int(data.get('radius', 2000))
        country_code = (data.get('country_code') or LOCATION_COUNTRY_CODE).lower()

        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400

        if categories is not None and not isinstance(categories, list):
            return jsonify({'error': 'categories must be an array of category ids'}), 400

        places, provider = fetch_nearby(
            float(lat),
            float(lng),
            category=category,
            categories=categories,
            radius=radius,
            mapbox_access_token=MAPBOX_ACCESS_TOKEN,
            google_api_key=GOOGLE_MAPS_API_KEY,
            country_code=country_code,
        )
        return jsonify({
            'places': places,
            'count': len(places),
            'location': {'lat': float(lat), 'lng': float(lng)},
            'provider': provider,
            'categories': categories if categories else [category],
        })
    except requests.RequestException as e:
        return jsonify({'error': f'Location service unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/location/search', methods=['GET', 'POST'])
def search_locations():
    """Place/address search — Mapbox Geocoding primary, Nominatim backup."""
    try:
        from location_services import autocomplete_suggestions, search_places

        if request.method == 'GET':
            query = request.args.get('q', '')
            lat = request.args.get('lat')
            lng = request.args.get('lng')
            limit = int(request.args.get('limit', 10))
            suggest_only = request.args.get('suggest', '').lower() in ('1', 'true', 'yes')
            country_code = (request.args.get('country_code') or LOCATION_COUNTRY_CODE).lower()
        else:
            body = request.json or {}
            query = body.get('q') or body.get('query', '')
            lat = body.get('lat')
            lng = body.get('lng')
            limit = int(body.get('limit', 10))
            suggest_only = bool(body.get('suggest'))
            country_code = (body.get('country_code') or LOCATION_COUNTRY_CODE).lower()

        if not (query or '').strip():
            return jsonify({'error': 'Search query is required'}), 400

        origin_lat = float(lat) if lat is not None else None
        origin_lng = float(lng) if lng is not None else None

        if suggest_only:
            suggestions = autocomplete_suggestions(
                query,
                limit=min(limit, 8),
                mapbox_access_token=MAPBOX_ACCESS_TOKEN,
                lat=origin_lat,
                lng=origin_lng,
                country_code=country_code,
            )
            return jsonify({
                'suggestions': suggestions,
                'count': len(suggestions),
                'query': query.strip(),
            })

        results, provider = search_places(
            query,
            mapbox_access_token=MAPBOX_ACCESS_TOKEN,
            google_api_key=GOOGLE_MAPS_API_KEY,
            lat=origin_lat,
            lng=origin_lng,
            limit=min(limit, 20),
            country_code=country_code,
        )
        return jsonify({
            'results': results,
            'count': len(results),
            'provider': provider,
            'query': query.strip(),
        })
    except requests.RequestException as e:
        return jsonify({'error': f'Search service unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/location/place-photo', methods=['GET'])
def place_photo():
    """Proxy Google Place Photos so mobile clients load images without exposing API keys."""
    try:
        from location_services import build_google_photo_url

        photo_ref = (request.args.get('ref') or request.args.get('photoreference') or '').strip()
        if not photo_ref:
            return jsonify({'error': 'Photo reference is required'}), 400
        if not GOOGLE_MAPS_API_KEY:
            return jsonify({'error': 'Google Maps API key not configured'}), 503

        maxwidth = min(max(int(request.args.get('maxwidth', 600)), 100), 1200)
        google_url = build_google_photo_url(photo_ref, GOOGLE_MAPS_API_KEY, maxwidth)
        upstream = requests.get(google_url, timeout=12, allow_redirects=True)
        if upstream.status_code != 200:
            return jsonify({'error': 'Photo unavailable'}), upstream.status_code

        content_type = upstream.headers.get('Content-Type', 'image/jpeg')
        return Response(upstream.content, mimetype=content_type)
    except requests.RequestException as e:
        return jsonify({'error': f'Photo service unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/weather', methods=['GET', 'POST'])
def weather_summary():
    """Current conditions, daily/hourly forecast, and alerts via Google Weather API."""
    try:
        from weather_service import get_weather_summary

        if request.method == 'GET':
            lat = request.args.get('lat')
            lng = request.args.get('lng')
            units = (request.args.get('units') or request.args.get('unitsSystem') or 'IMPERIAL').upper()
            days = int(request.args.get('days', 5))
            hours = int(request.args.get('hours', 12))
            include_alerts = request.args.get('alerts', 'true').lower() not in ('0', 'false', 'no')
        else:
            body = request.json or {}
            lat = body.get('lat')
            lng = body.get('lng')
            units = (body.get('units') or body.get('unitsSystem') or 'IMPERIAL').upper()
            days = int(body.get('days', 5))
            hours = int(body.get('hours', 12))
            include_alerts = body.get('alerts', True) is not False

        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        if not GOOGLE_MAPS_API_KEY:
            return jsonify({'error': 'Google Maps API key not configured (enable Weather API in Cloud Console)'}), 503

        summary = get_weather_summary(
            float(lat),
            float(lng),
            api_key=GOOGLE_MAPS_API_KEY,
            units_system='IMPERIAL' if units.startswith('IMP') else 'METRIC',
            days=days,
            hours=hours,
            include_alerts=include_alerts,
        )
        return jsonify(summary)
    except requests.RequestException as e:
        return jsonify({'error': f'Weather service unreachable: {e}'}), 502
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/location/geocode', methods=['POST'])
def geocode_address():
    """Geocode address — Google Geocoding primary, Nominatim fallback."""
    try:
        from google_platform_service import geocode_google
        from location_services import geocode_nominatim

        data = request.json or {}
        address = data.get('address')

        if not address:
            return jsonify({'error': 'Address is required'}), 400

        if GOOGLE_MAPS_API_KEY:
            try:
                result = geocode_google(address, GOOGLE_MAPS_API_KEY)
                if result:
                    return jsonify(result)
            except Exception:
                pass

        result = geocode_nominatim(address)
        if result:
            return jsonify(result)
        return jsonify({'error': 'Address not found'}), 404
    except requests.RequestException as e:
        return jsonify({'error': f'Geocoding service unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/location/place-insights', methods=['GET', 'POST'])
def place_insights_route():
    """Travel times (Routes API), Street View availability, timezone, optional solar."""
    try:
        from google_platform_service import place_insights

        if request.method == 'GET':
            dest_lat = request.args.get('lat')
            dest_lng = request.args.get('lng')
            origin_lat = request.args.get('origin_lat')
            origin_lng = request.args.get('origin_lng')
            include_solar = request.args.get('solar', '').lower() in ('1', 'true', 'yes')
        else:
            body = request.json or {}
            dest_lat = body.get('lat')
            dest_lng = body.get('lng')
            origin_lat = body.get('origin_lat')
            origin_lng = body.get('origin_lng')
            include_solar = bool(body.get('solar'))

        if dest_lat is None or dest_lng is None:
            return jsonify({'error': 'Destination lat and lng are required'}), 400
        if not GOOGLE_MAPS_API_KEY:
            return jsonify({'error': 'Google Maps API key not configured'}), 503

        insights = place_insights(
            float(dest_lat),
            float(dest_lng),
            GOOGLE_MAPS_API_KEY,
            origin_lat=float(origin_lat) if origin_lat is not None else None,
            origin_lng=float(origin_lng) if origin_lng is not None else None,
            include_solar=include_solar,
        )
        return jsonify(insights)
    except requests.RequestException as e:
        return jsonify({'error': f'Insights service unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/location/street-view', methods=['GET'])
def street_view_image():
    """Proxy Street View Static images for a location."""
    try:
        from google_platform_service import fetch_street_view_image

        lat = request.args.get('lat')
        lng = request.args.get('lng')
        width = min(max(int(request.args.get('width', 640)), 200), 1200)
        height = min(max(int(request.args.get('height', 400)), 150), 800)

        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        if not GOOGLE_MAPS_API_KEY:
            return jsonify({'error': 'Google Maps API key not configured'}), 503

        result = fetch_street_view_image(float(lat), float(lng), GOOGLE_MAPS_API_KEY, width, height)
        if not result:
            return jsonify({'error': 'Street View not available for this location'}), 404

        content, content_type = result
        return Response(content, mimetype=content_type)
    except requests.RequestException as e:
        return jsonify({'error': f'Street View unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/location/solar', methods=['GET', 'POST'])
def solar_insights_route():
    """Solar API — roof sunshine and panel potential (great for property owners)."""
    try:
        from google_platform_service import solar_insights

        if request.method == 'GET':
            lat = request.args.get('lat')
            lng = request.args.get('lng')
        else:
            body = request.json or {}
            lat = body.get('lat')
            lng = body.get('lng')

        if lat is None or lng is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        if not GOOGLE_MAPS_API_KEY:
            return jsonify({'error': 'Google Maps API key not configured'}), 503

        data = solar_insights(float(lat), float(lng), GOOGLE_MAPS_API_KEY)
        if not data:
            return jsonify({'error': 'Solar data not available for this location'}), 404
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': f'Solar service unreachable: {e}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== AUTOMATION SERVICES (legacy — use /api/household/automation/*) ====================

@app.route('/api/automation/reminders', methods=['POST'])
def create_reminder():
    """Deprecated — use POST /api/household/health-reminders or household chores."""
    return jsonify({
        'deprecated': True,
        'error': 'This endpoint is deprecated.',
        'useInstead': '/api/household/health-reminders',
        'message': 'Create reminders via household health reminders or chores APIs.',
    }), 410

@app.route('/api/automation/notifications', methods=['GET'])
def get_notifications():
    """Deprecated — household alerts live on the dashboard bundle."""
    return jsonify({
        'deprecated': True,
        'message': 'Use GET /api/household/dashboard or GET /api/dashboard/renter for real household alerts.',
        'useInstead': '/api/dashboard/renter',
        'notifications': [],
        'unread_count': 0,
    })

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
        
        max_rent = filters.get('maxRent')
        if max_rent is not None:
            try:
                from rent_affordability_service import filter_properties_by_affordability
                before = len(properties)
                properties = filter_properties_by_affordability(properties, float(max_rent))
                if before and not properties:
                    return jsonify({
                        'properties': [],
                        'count': 0,
                        'query': query,
                        'message': f'No listings at or below your affordable max of ${float(max_rent):,.0f}/mo. Try adjusting the filter.',
                        'affordabilityFiltered': True,
                        'maxRent': float(max_rent),
                    })
            except (TypeError, ValueError):
                pass
        
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
            'query': query,
            'affordabilityFiltered': bool(filters.get('maxRent')),
            'maxRent': filters.get('maxRent'),
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
    if MAPBOX_ACCESS_TOKEN:
        nearby_provider = 'mapbox'
        search_provider = 'mapbox'
    elif GOOGLE_MAPS_API_KEY:
        nearby_provider = 'google'
        search_provider = 'google'
    else:
        nearby_provider = 'openstreetmap'
        search_provider = 'nominatim'

    try:
        from env_check import build_services_config_report
        from observability_service import get_snapshot, observability_enabled
        config_report = build_services_config_report()
        obs = get_snapshot() if observability_enabled() else {}
    except Exception:
        config_report = {}
        obs = {}

    mongo_cfg = config_report.get('mongodb', {}) if config_report else {}
    mongodb_status = 'connected' if mongo_cfg.get('connected') else (
        'uri_encoding_error' if mongo_cfg.get('issue') else 'not connected'
    )

    return jsonify({
        'status': 'healthy' if mongo_cfg.get('connected') else 'degraded',
        'timestamp': datetime.now().isoformat(),
        'config': config_report,
        'observability': {
            'enabled': bool(obs),
            'socketActive': obs.get('socket', {}).get('active_connections', 0),
            'timelineSize': obs.get('timelineSize', 0),
            'budgetViolations': obs.get('counters', {}).get('budget_exceeded', 0),
        },
        'services': {
            'mongodb': mongodb_status,
            'mongodbIssue': mongo_cfg.get('issue'),
            'redis': 'connected' if config_report.get('redis', {}).get('connected') else 'not connected',
            'openai': 'configured' if OPENAI_API_KEY else 'not configured',
            'gemini': 'configured' if GEMINI_API_KEY else 'not configured',
            'nvidia': 'configured' if NVIDIA_API_KEY else 'not configured',
            'nvidia_model': NVIDIA_API_MODEL if NVIDIA_API_KEY else None,
            'mapbox': 'configured' if MAPBOX_ACCESS_TOKEN else 'not configured',
            'google_maps': 'configured' if GOOGLE_MAPS_API_KEY else 'not configured',
            'google_weather': 'configured' if GOOGLE_MAPS_API_KEY else 'not configured',
            'nearby_places': nearby_provider,
            'place_search': search_provider,
            'email': 'configured' if (SMTP_USER and SMTP_PASSWORD) else 'not configured',
            'sms': 'configured' if (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER) else 'not configured',
            'storage': 'configured' if config_report.get('storage', {}).get('configured') else 'not configured',
            'push': 'configured' if config_report.get('push', {}).get('configured') else 'not configured',
            'celery': 'redis_required' if config_report.get('redis', {}).get('configured') else 'redis_missing',
        }
    })

# ==================== VERIFICATION SERVICES ====================

@app.route('/api/verification/send-email', methods=['POST'])
def send_verification_email():
    """Send email verification code"""
    try:
        data = request.json
        email = _normalize_email(data.get('email'))
        code = data.get('code')
        verification_type = data.get('type', 'email_verification')
        honeypot = data.get('website')  # hidden field trap for bots

        if not email or not code:
            return jsonify({'error': 'Email and code are required'}), 400
        if honeypot:
            return jsonify({'error': 'Invalid request'}), 400

        client_ip = _get_client_ip()
        ip_key = f"email:ip:{client_ip}"
        target_key = f"email:target:{email}"
        cooldown_key = f"email:cooldown:{email}"

        allowed, retry_after = _check_and_track_rate_limit(
            ip_key, VERIFICATION_MAX_PER_IP, VERIFICATION_WINDOW_SECONDS
        )
        if not allowed:
            _record_verification_event('email', 'blocked', _mask_email(email), client_ip, 'ip_rate_limit')
            return jsonify({
                'error': 'Too many verification attempts from this IP. Please try again later.',
                'retry_after_seconds': retry_after
            }), 429

        allowed, retry_after = _check_and_track_rate_limit(
            target_key, VERIFICATION_MAX_PER_TARGET, VERIFICATION_WINDOW_SECONDS
        )
        if not allowed:
            _record_verification_event('email', 'blocked', _mask_email(email), client_ip, 'target_rate_limit')
            return jsonify({
                'error': 'Too many verification attempts for this email. Please try again later.',
                'retry_after_seconds': retry_after
            }), 429

        allowed, retry_after = _check_and_track_cooldown(
            cooldown_key, VERIFICATION_COOLDOWN_SECONDS
        )
        if not allowed:
            _record_verification_event('email', 'blocked', _mask_email(email), client_ip, 'cooldown')
            return jsonify({
                'error': 'Please wait before requesting another code.',
                'retry_after_seconds': retry_after
            }), 429

        # Email template
        subject = 'Family Housing Hub - Email Verification Code'
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">Email Verification</h2>
                <p>Thank you for signing up for Family Housing Hub!</p>
                <p>Your verification code is:</p>
                <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px; margin: 0;">{code}</h1>
                </div>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
                <p style="color: #6B7280; font-size: 12px;">Family Housing Hub - Secure Family Management</p>
            </div>
        </body>
        </html>
        """

        # Send email
        if SMTP_USER and SMTP_PASSWORD:
            try:
                # Ensure sender matches SMTP account when using Gmail
                sender_from = EMAIL_FROM
                if (not sender_from or sender_from == 'noreply@family-housing-hub.com') and SMTP_USER != 'apikey':
                    sender_from = SMTP_USER
                if not sender_from:
                    sender_from = SMTP_USER if SMTP_USER != 'apikey' else 'noreply@family-housing-hub.com'
                
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = sender_from
                msg['To'] = email

                msg.attach(MIMEText(body, 'html'))

                print(f'Attempting to send email via {SMTP_HOST}:{SMTP_PORT} from {sender_from} to {email}')
                
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.send_message(msg)
                server.quit()

                print(f'Email sent successfully to {email}')
                _record_verification_event('email', 'sent', _mask_email(email), client_ip)
                return jsonify({
                    'success': True,
                    'message': 'Verification email sent successfully'
                })
            except smtplib.SMTPAuthenticationError as e:
                error_msg = f'SMTP Authentication failed: {str(e)}. Check your SMTP_USER and SMTP_PASSWORD (use App Password, not regular password).'
                print(error_msg)
                _record_verification_event('email', 'failed', _mask_email(email), client_ip, 'smtp_auth')
                return jsonify({'error': error_msg}), 500
            except smtplib.SMTPException as e:
                error_msg = f'SMTP error: {str(e)}'
                print(error_msg)
                _record_verification_event('email', 'failed', _mask_email(email), client_ip, 'smtp_exception')
                return jsonify({'error': error_msg}), 500
            except Exception as e:
                error_msg = f'Error sending email via SMTP: {str(e)}'
                print(error_msg)
                import traceback
                traceback.print_exc()
                # Fallback: log for development
                if os.getenv('FLASK_ENV') == 'development':
                    print(f'[DEV] Email verification code for {email}: {code}')
                    _record_verification_event('email', 'sent', _mask_email(email), client_ip, 'dev_mode')
                    return jsonify({
                        'success': True,
                        'message': 'Email sent (dev mode - check console)'
                    })
                _record_verification_event('email', 'failed', _mask_email(email), client_ip, 'smtp_unknown')
                return jsonify({'error': error_msg}), 500
        else:
            # Development mode - just log
            print(f'[DEV] Email verification code for {email}: {code}')
            _record_verification_event('email', 'sent', _mask_email(email), client_ip, 'dev_mode_no_smtp')
            return jsonify({
                'success': True,
                'message': 'Email sent (dev mode - check console)'
            })

    except Exception as e:
        print(f'Error in send_verification_email: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/verification/send-sms', methods=['POST'])
def send_verification_sms():
    """Send SMS verification code"""
    try:
        data = request.json
        raw_phone = data.get('phone')
        phone = _normalize_phone(raw_phone)
        code = data.get('code')
        verification_type = data.get('type', 'phone_verification')
        honeypot = data.get('website')  # hidden field trap for bots

        if not phone or not code:
            return jsonify({'error': 'Phone and code are required'}), 400
        if honeypot:
            return jsonify({'error': 'Invalid request'}), 400
        if len(phone) != 10:
            return jsonify({'error': 'Phone must be a valid 10-digit US number'}), 400

        client_ip = _get_client_ip()
        ip_key = f"sms:ip:{client_ip}"
        target_key = f"sms:target:{phone}"
        cooldown_key = f"sms:cooldown:{phone}"

        allowed, retry_after = _check_and_track_rate_limit(
            ip_key, VERIFICATION_MAX_PER_IP, VERIFICATION_WINDOW_SECONDS
        )
        if not allowed:
            _record_verification_event('sms', 'blocked', _mask_phone(phone), client_ip, 'ip_rate_limit')
            return jsonify({
                'error': 'Too many verification attempts from this IP. Please try again later.',
                'retry_after_seconds': retry_after
            }), 429

        allowed, retry_after = _check_and_track_rate_limit(
            target_key, VERIFICATION_MAX_PER_TARGET, VERIFICATION_WINDOW_SECONDS
        )
        if not allowed:
            _record_verification_event('sms', 'blocked', _mask_phone(phone), client_ip, 'target_rate_limit')
            return jsonify({
                'error': 'Too many verification attempts for this phone. Please try again later.',
                'retry_after_seconds': retry_after
            }), 429

        allowed, retry_after = _check_and_track_cooldown(
            cooldown_key, VERIFICATION_COOLDOWN_SECONDS
        )
        if not allowed:
            _record_verification_event('sms', 'blocked', _mask_phone(phone), client_ip, 'cooldown')
            return jsonify({
                'error': 'Please wait before requesting another code.',
                'retry_after_seconds': retry_after
            }), 429

        # Format phone number
        formatted_phone = f'+1{phone}'

        # Send SMS via Twilio
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER:
            try:
                from twilio.rest import Client
                client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
                
                message = client.messages.create(
                    body=f'Your Family Housing Hub verification code is: {code}. This code expires in 10 minutes.',
                    from_=TWILIO_PHONE_NUMBER,
                    to=formatted_phone
                )

                _record_verification_event('sms', 'sent', _mask_phone(phone), client_ip)
                return jsonify({
                    'success': True,
                    'message': 'Verification SMS sent successfully',
                    'message_id': message.sid
                })
            except ImportError:
                print('Twilio not installed. Install with: pip install twilio')
            except Exception as e:
                print(f'Error sending SMS via Twilio: {e}')
                # Optional WhatsApp fallback
                whatsapp_sid = _send_whatsapp_code(formatted_phone, code)
                if whatsapp_sid:
                    _record_verification_event('whatsapp', 'sent', _mask_phone(phone), client_ip, 'sms_fallback')
                    return jsonify({
                        'success': True,
                        'message': 'Verification sent via WhatsApp fallback',
                        'channel': 'whatsapp',
                        'message_id': whatsapp_sid
                    })
                # Fallback for development
                if os.getenv('FLASK_ENV') == 'development':
                    print(f'[DEV] SMS verification code for {phone}: {code}')
                    _record_verification_event('sms', 'sent', _mask_phone(phone), client_ip, 'dev_mode')
                    return jsonify({
                        'success': True,
                        'message': 'SMS sent (dev mode - check console)'
                    })
                _record_verification_event('sms', 'failed', _mask_phone(phone), client_ip, 'twilio_send_failed')
                return jsonify({'error': 'Failed to send SMS'}), 500
        else:
            # Development mode - just log
            print(f'[DEV] SMS verification code for {phone}: {code}')
            _record_verification_event('sms', 'sent', _mask_phone(phone), client_ip, 'dev_mode_no_twilio')
            return jsonify({
                'success': True,
                'message': 'SMS sent (dev mode - check console)'
            })

    except Exception as e:
        print(f'Error in send_verification_sms: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """API root"""
    return jsonify({
        'message': 'Family Housing Hub API',
        'version': '1.0.0',
        'endpoints': {
            'auth': '/api/auth/register, /api/auth/login, /api/auth/me, /api/auth/logout',
            'ai': '/api/ai/chat',
            'meals': '/api/meals/generate-plan',
            'budget': '/api/budget/analyze',
            'location': '/api/location/nearby-places',
            'automation': '/api/automation/reminders',
            'verification': '/api/verification/send-email, /api/verification/send-sms, /api/verification/confirm',
            'verification_status': '/api/verification/status',
            'verification_metrics': '/api/verification/metrics',
            'verification_test_send': '/api/verification/test-send',
            'health': '/api/health'
        }
    })


@app.route('/api/verification/status', methods=['GET'])
def verification_status():
    """Verification diagnostics endpoint for frontend/admin checks."""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'channels': {
            'email': bool(SMTP_USER and SMTP_PASSWORD),
            'sms': bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER),
            'whatsapp_fallback': bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM)
        },
        'rate_limits': {
            'window_seconds': VERIFICATION_WINDOW_SECONDS,
            'max_per_ip': VERIFICATION_MAX_PER_IP,
            'max_per_target': VERIFICATION_MAX_PER_TARGET,
            'cooldown_seconds': VERIFICATION_COOLDOWN_SECONDS
        }
    })


@app.route('/api/verification/metrics', methods=['GET'])
def verification_metrics():
    """Recent verification events and block diagnostics."""
    try:
        with _verification_rate_lock:
            recent = list(_verification_events)[:100]
        blocked = [e for e in recent if e.get('status') == 'blocked']
        by_reason = {}
        for item in blocked:
            reason = item.get('reason') or 'unknown'
            by_reason[reason] = by_reason.get(reason, 0) + 1

        return jsonify({
            'status': 'ok',
            'timestamp': datetime.now().isoformat(),
            'recent_events': recent,
            'summary': {
                'total_events': len(recent),
                'blocked_events': len(blocked),
                'blocked_by_reason': by_reason
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/verification/test-send', methods=['POST'])
def verification_test_send():
    """
    Admin diagnostics endpoint to test delivery channels.
    Requires header x-admin-token when VERIFICATION_ADMIN_TOKEN is set.
    Body: { channel: email|sms|whatsapp, destination: "...", code?: "123456" }
    """
    try:
        if VERIFICATION_ADMIN_TOKEN:
            header_token = request.headers.get('x-admin-token')
            if header_token != VERIFICATION_ADMIN_TOKEN:
                return jsonify({'error': 'Unauthorized'}), 401

        data = request.json or {}
        channel = str(data.get('channel', '')).strip().lower()
        destination = str(data.get('destination', '')).strip()
        code = str(data.get('code', '')).strip() or str(int(time.time()))[-6:]
        client_ip = _get_client_ip()

        if channel not in ['email', 'sms', 'whatsapp']:
            return jsonify({'error': 'channel must be one of: email, sms, whatsapp'}), 400
        if not destination:
            return jsonify({'error': 'destination is required'}), 400
        if not re.match(r'^\d{6}$', code):
            return jsonify({'error': 'code must be 6 digits'}), 400

        if channel == 'email':
            email = _normalize_email(destination)
            if not SMTP_USER or not SMTP_PASSWORD:
                return jsonify({'error': 'SMTP not configured'}), 400

            sender_from = EMAIL_FROM if EMAIL_FROM else SMTP_USER
            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Family Housing Hub - TEST verification email'
            msg['From'] = sender_from
            msg['To'] = email
            msg.attach(MIMEText(
                f'<p>Test verification code:</p><h1 style="letter-spacing:4px">{code}</h1>',
                'html'
            ))

            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            _record_verification_event('email', 'test', _mask_email(email), client_ip)
            return jsonify({'success': True, 'channel': 'email'})

        phone = _normalize_phone(destination)
        if len(phone) != 10:
            return jsonify({'error': 'destination phone must be valid US 10-digit'}), 400
        formatted_phone = f'+1{phone}'

        if channel == 'sms':
            if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER):
                return jsonify({'error': 'Twilio SMS not configured'}), 400
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            msg = client.messages.create(
                body=f'[TEST] Family Housing Hub verification code: {code}',
                from_=TWILIO_PHONE_NUMBER,
                to=formatted_phone
            )
            _record_verification_event('sms', 'test', _mask_phone(phone), client_ip)
            return jsonify({'success': True, 'channel': 'sms', 'message_id': msg.sid})

        # whatsapp
        sid = _send_whatsapp_code(formatted_phone, code)
        if not sid:
            return jsonify({'error': 'WhatsApp fallback not configured or failed'}), 400
        _record_verification_event('whatsapp', 'test', _mask_phone(phone), client_ip)
        return jsonify({'success': True, 'channel': 'whatsapp', 'message_id': sid})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    def _hourly_automation_loop():
        from job_queue import enqueue
        from tasks import run_hourly_automation_task
        while True:
            time.sleep(3600)
            try:
                enqueue(run_hourly_automation_task)
            except Exception as exc:
                print(f'Automation scheduler error: {exc}')

    threading.Thread(target=_hourly_automation_loop, daemon=True).start()
    port = int(os.getenv('PORT', 8000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)

