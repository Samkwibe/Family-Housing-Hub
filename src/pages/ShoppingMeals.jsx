// src/pages/ShoppingMeals.jsx - Enhanced AI-Powered Shopping & Meal Planning with OpenAI Integration
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  ShoppingCart,
  Plus,
  Check,
  X,
  Edit3,
  Trash2,
  UtensilsCrossed,
  Calendar,
  Clock,
  Users,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Leaf,
  Snowflake,
  CircleDot,
  Package,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Star,
  Download,
  Upload,
  ChefHat,
  Brain,
  Heart,
  BookOpen,
  Clock4,
  Target,
  Camera,
  Image as ImageIcon,
  Zap,
  MessageCircle,
  MapPin,
  Navigation,
  Phone,
  Store,
  BarChart,
  Globe,
  Shield,
  Tag,
  DollarSign,
  ArrowRight,
  Mic,
  Volume2,
  VolumeX,
  Send,
  Sparkle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Sprout icon component
const Sprout = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 20h10" />
    <path d="M10 20c5.5-2.5.8-6.4 3-10" />
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
    <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
  </svg>
);

// OpenAI API Integration with Fallback
const callOpenAI = async (userMessage, pantryItems = []) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    // Fallback to contextual responses if no API key
    return null;
  }

  try {
    const pantryContext = pantryItems.length > 0 
      ? `User's pantry contains: ${pantryItems.map(item => item.name).join(', ')}. `
      : '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI cooking assistant. ${pantryContext}Provide meal ideas, recipes, cooking tips, and help with meal planning. Be concise, friendly, and practical. Format responses with emojis and clear sections.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error('OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (error) {
    console.warn('OpenAI API call failed, using fallback:', error);
    return null;
  }
};

// Enhanced AI Chat Component with OpenAI Integration and Fast Responses
const AIChatAssistant = ({ onClose, onAddMeal, pantryItems = [] }) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI cooking assistant powered by advanced AI. I can help you with meal ideas, recipes, cooking tips, and even suggest meals based on what's in your pantry. What would you like to know?",
      isAI: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isUsingAI, setIsUsingAI] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quickQuestions = [
    "Quick healthy dinner?",
    "Use my pantry items",
    "30-minute meals",
    "Vegetarian recipes",
    "Meal prep ideas"
  ];

  // Enhanced contextual response system (fallback when OpenAI is not available)
  const generateContextualResponse = useCallback((userInput) => {
    const input = userInput.toLowerCase().trim();
    
    // Pantry-based suggestions
    if (input.includes('pantry') || input.includes('what i have') || input.includes('ingredients i have') || input.includes('use my')) {
      if (pantryItems.length === 0) {
        return "I don't see any items in your pantry yet. Would you like to add some items first, or should I suggest some versatile recipes that work with common ingredients?";
      }
      const pantryList = pantryItems.map(item => item.name).join(', ');
      return `Based on your pantry (${pantryList}), here are some great meal ideas:\n\n🍝 **Pantry Pasta**\nUse your pasta, olive oil, and any vegetables. Add garlic and herbs for flavor.\n\n🍚 **Rice Bowl**\nCombine rice with canned tomatoes and beans for a hearty meal.\n\n🥫 **Quick Soup**\nUse canned tomatoes as a base, add pasta or rice, season well.\n\nWould you like detailed recipes for any of these?`;
    }

    // Quick meals
    if (input.includes('quick') || input.includes('fast') || input.includes('30 min') || input.includes('easy') || input.includes('simple')) {
      return "Here are quick meals under 30 minutes:\n\n⚡ **Stir-Fry Noodles** (15 min)\nNoodles, vegetables, soy sauce, sesame oil\n\n🥗 **Greek Salad Bowl** (10 min)\nGreens, cucumber, tomatoes, feta, olives, dressing\n\n🌮 **Quick Tacos** (20 min)\nProtein of choice, tortillas, toppings, salsa\n\n🍳 **Shakshuka** (25 min)\nEggs, tomatoes, peppers, onions, spices\n\nWhich one sounds good?";
    }

    // Healthy options
    if (input.includes('healthy') || input.includes('nutritious') || input.includes('diet') || input.includes('low calorie')) {
      return "Healthy meal ideas:\n\n🥑 **Buddha Bowl** (20 min, 380 cal)\nQuinoa, roasted vegetables, chickpeas, tahini\n\n🐟 **Baked Salmon** (25 min, 350 cal)\nSalmon, lemon, herbs, steamed broccoli\n\n🥗 **Power Salad** (15 min, 320 cal)\nSpinach, grilled chicken, nuts, berries, vinaigrette\n\n🍲 **Lentil Soup** (30 min, 280 cal)\nLentils, vegetables, spices, vegetable broth\n\nAll high in protein and nutrients!";
    }

    // Dinner ideas
    if (input.includes('dinner') || input.includes('tonight') || input.includes('evening') || input.includes('supper')) {
      return "Perfect dinner ideas:\n\n🍗 **Honey Garlic Chicken** (35 min)\nChicken thighs, honey, garlic, soy sauce, rice\n\n🍝 **Creamy Tuscan Pasta** (30 min)\nPasta, cream, sun-dried tomatoes, spinach, parmesan\n\n🥘 **One-Pan Fajitas** (25 min)\nProtein, peppers, onions, spices, tortillas\n\n🍛 **Thai Green Curry** (40 min)\nCoconut milk, curry paste, vegetables, protein, rice\n\nNeed the full recipe for any?";
    }

    // Breakfast
    if (input.includes('breakfast') || input.includes('morning') || input.includes('brunch')) {
      return "Breakfast options:\n\n🥞 **Protein Pancakes** (15 min)\nOats, eggs, banana, protein powder\n\n🍳 **Veggie Scramble** (10 min)\nEggs, peppers, onions, spinach, cheese\n\n🥣 **Overnight Oats** (5 min + overnight)\nOats, milk, chia seeds, berries, honey\n\n🥑 **Avocado Toast Deluxe** (10 min)\nWhole grain bread, avocado, eggs, seasonings\n\nAll filling and nutritious!";
    }

    // Lunch
    if (input.includes('lunch') || input.includes('midday')) {
      return "Lunch ideas:\n\n🥙 **Mediterranean Wrap** (10 min)\nWhole wheat wrap, hummus, veggies, feta\n\n🍜 **Asian Noodle Bowl** (20 min)\nNoodles, vegetables, protein, soy-ginger dressing\n\n🥗 **Cobb Salad** (15 min)\nGreens, chicken, eggs, bacon, avocado, cheese\n\n🌯 **Burrito Bowl** (15 min)\nRice, beans, protein, salsa, guacamole\n\nPerfect for meal prep too!";
    }

    // Vegetarian/Vegan
    if (input.includes('vegetarian') || input.includes('veggie') || input.includes('vegan') || input.includes('plant-based') || input.includes('meatless')) {
      return "Plant-based recipes:\n\n🌱 **Vegan Buddha Bowl** (25 min)\nQuinoa, roasted chickpeas, tahini, veggies\n\n🍆 **Eggplant Parmesan** (45 min)\nEggplant, marinara, mozzarella (vegan option)\n\n🥦 **Broccoli Alfredo** (20 min)\nPasta, cashew cream sauce, broccoli\n\n🌮 **Black Bean Tacos** (15 min)\nBlack beans, avocado, salsa, corn tortillas\n\nAll delicious and satisfying!";
    }

    // Meal prep
    if (input.includes('meal prep') || input.includes('batch') || input.includes('week') || input.includes('prep')) {
      return "Weekly meal prep plan:\n\n📦 **Prep Day Sunday**\n\n**Breakfast:** Egg muffins (12 count)\n**Lunch:** Chicken quinoa bowls (5 servings)\n**Dinner:** Turkey chili (6 servings)\n**Snacks:** Cut veggies & hummus\n\n**Shopping List:**\n- 2 dozen eggs\n- 2 lbs chicken\n- 1 lb ground turkey\n- Quinoa, rice\n- Mixed vegetables\n- Beans, tomatoes\n\n**Prep time:** 3-4 hours\n**Saves:** 10+ hours during week\n\nWant detailed instructions?";
    }

    // Chicken recipes
    if (input.includes('chicken')) {
      return "Chicken recipe ideas:\n\n🍗 **Lemon Herb Chicken** (30 min)\nChicken breast, lemon, rosemary, garlic\n\n🌮 **Chicken Fajitas** (25 min)\nChicken strips, peppers, onions, spices\n\n🍛 **Butter Chicken** (40 min)\nChicken, tomato cream sauce, spices, rice\n\n🥗 **Greek Chicken** (35 min)\nChicken, olives, tomatoes, feta, oregano\n\nAll easy and family-friendly!";
    }

    // Pasta
    if (input.includes('pasta') || input.includes('noodle') || input.includes('spaghetti')) {
      return "Pasta dishes:\n\n🍝 **Aglio e Olio** (15 min)\nSpaghetti, garlic, olive oil, chili flakes\n\n🍅 **Marinara Pasta** (20 min)\nPasta, tomatoes, basil, garlic, parmesan\n\n🧀 **Mac and Cheese** (25 min)\nPasta, cheese sauce, breadcrumb topping\n\n🥓 **Carbonara** (20 min)\nPasta, eggs, bacon, parmesan, black pepper\n\nClassic and delicious!";
    }

    // Cooking tips
    if (input.includes('tip') || input.includes('how to') || input.includes('technique') || input.includes('advice')) {
      return "Quick cooking tips:\n\n🔪 **Knife Skills**\n- Keep knives sharp\n- Use proper cutting board\n- Master basic cuts\n\n🔥 **Heat Control**\n- Preheat pans properly\n- Don't overcrowd\n- Let meat rest\n\n🧂 **Seasoning**\n- Salt in layers\n- Taste as you cook\n- Fresh herbs at end\n\n⏰ **Time Management**\n- Prep ingredients first\n- Multi-task wisely\n- Clean as you go\n\nWhat specific technique interests you?";
    }

    // Budget meals
    if (input.includes('cheap') || input.includes('budget') || input.includes('affordable') || input.includes('save money') || input.includes('inexpensive')) {
      return "Budget-friendly meals:\n\n💰 **Rice & Beans** ($2/serving)\nRice, beans, spices, vegetables\n\n🥔 **Potato Soup** ($1.50/serving)\nPotatoes, onions, milk, seasonings\n\n🍝 **Pasta Primavera** ($2/serving)\nPasta, frozen veggies, olive oil, garlic\n\n🥚 **Egg Fried Rice** ($1.75/serving)\nRice, eggs, frozen vegetables, soy sauce\n\n🌯 **Bean Burritos** ($1.50/serving)\nTortillas, refried beans, cheese, salsa\n\nAll filling and nutritious!";
    }

    // Default response
    return "I'd be happy to help! I can assist you with:\n\n✨ **Recipe suggestions** based on ingredients, time, or dietary needs\n📋 **Meal planning** for the week\n🥘 **Cooking tips** and techniques\n🛒 **Shopping lists** from recipes\n⏱️ **Quick meals** under 30 minutes\n🌱 **Dietary options** (vegan, keto, etc.)\n\nWhat would you like to explore? Try asking:\n- \"What can I make for dinner?\"\n- \"Quick healthy breakfast ideas\"\n- \"Recipes using chicken\"\n- \"Vegetarian meal prep\"\n- \"What's in my pantry?\"";
  }, [pantryItems]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isAI: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);
    setIsUsingAI(false);

    // Try OpenAI first (if available), then fallback to contextual
    let aiResponse = null;
    
    try {
      // Show AI indicator
      setIsUsingAI(true);
      aiResponse = await callOpenAI(currentInput, pantryItems);
    } catch (error) {
      console.warn('OpenAI error:', error);
    }

    // Use fallback if OpenAI not available or failed
    if (!aiResponse) {
      setIsUsingAI(false);
      // Simulate faster typing for fallback (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      aiResponse = generateContextualResponse(currentInput);
    } else {
      // OpenAI responses are already fast, just a small delay for UX
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const aiMessage = {
      id: Date.now() + 1,
      text: aiResponse,
      isAI: true,
      timestamp: new Date(),
      hasActions: aiResponse.includes('Would you like') || aiResponse.includes('Need the full recipe') || aiResponse.includes('Want detailed'),
      isOpenAI: !!aiResponse && isUsingAI
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
    setIsUsingAI(false);

    // Text-to-speech (optional, user-controlled)
    if (!isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(aiResponse.replace(/\*\*/g, '').replace(/\n/g, ' '));
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }, [inputMessage, generateContextualResponse, pantryItems, isMuted]);

  const handleQuickQuestion = useCallback((question) => {
    setInputMessage(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  }, [handleSendMessage]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const hasOpenAI = !!import.meta.env.VITE_OPENAI_API_KEY;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl h-[600px] shadow-2xl flex flex-col animate-slideUp transition-colors duration-200`}>
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Cooking Assistant</h2>
                <div className="flex items-center gap-2">
                  <p className="text-purple-700 dark:text-purple-300 text-sm">Instant meal ideas and cooking help</p>
                  {hasOpenAI && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                      <Sparkle className="h-3 w-3" />
                      AI Powered
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors`}
                title={isMuted ? "Enable audio" : "Disable audio"}
              >
                {isMuted ? <VolumeX className="h-5 w-5 text-gray-500 dark:text-gray-400" /> : <Volume2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isAI ? 'justify-start' : 'justify-end'} animate-messageSlide`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  message.isAI
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-200 dark:border-gray-700'
                    : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-tr-none'
                }`}
              >
                {message.isAI && message.isOpenAI && (
                  <div className="flex items-center gap-1 mb-2 text-xs text-purple-600 dark:text-purple-400">
                    <Sparkle className="h-3 w-3" />
                    <span>AI Enhanced</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                {message.hasActions && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        toast.success('Recipe details coming soon!');
                        onAddMeal?.();
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium hover:bg-orange-50 dark:hover:bg-gray-600 transition-colors shadow-sm border border-orange-200 dark:border-orange-800"
                    >
                      Get Full Recipe
                    </button>
                    <button
                      onClick={() => onAddMeal?.()}
                      className="px-3 py-1.5 bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 rounded-full text-sm font-medium hover:bg-orange-50 dark:hover:bg-gray-600 transition-colors shadow-sm border border-orange-200 dark:border-orange-800"
                    >
                      Add to Meal Plan
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start animate-messageSlide">
              <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  {isUsingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-spin" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
                    </>
                  ) : (
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        <div className={`p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800`}>
          <div className="flex flex-wrap gap-2 mb-4">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-200 dark:hover:border-purple-800 transition-all border border-gray-200 dark:border-gray-600 shadow-sm"
              >
                {question}
              </button>
            ))}
          </div>
          {/* Input */}
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about recipes, ingredients, or cooking tips..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          {!hasOpenAI && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              💡 Add VITE_OPENAI_API_KEY to enable advanced AI responses
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Nearby Stores Component (Enhanced with Dark Mode)
const NearbyStores = ({ onClose }) => {
  const { isDark } = useTheme();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);

  const mockStores = [
    {
      id: 1,
      name: "Walmart Supercenter",
      distance: "0.8 mi",
      address: "123 Main St",
      hours: "6:00 AM - 11:00 PM",
      open: true,
      rating: 4.2,
      prices: {
        "Milk (1 gal)": 3.29,
        "Eggs (dozen)": 2.49,
        "Bread": 2.99,
        "Chicken Breast (lb)": 5.99,
        "Apples (lb)": 1.99
      },
      deals: ["5% off produce today", "BOGO on select cereals"]
    },
    {
      id: 2,
      name: "Target",
      distance: "1.2 mi",
      address: "456 Oak Ave",
      hours: "8:00 AM - 10:00 PM",
      open: true,
      rating: 4.4,
      prices: {
        "Milk (1 gal)": 3.49,
        "Eggs (dozen)": 2.99,
        "Bread": 3.29,
        "Chicken Breast (lb)": 6.49,
        "Apples (lb)": 2.29
      },
      deals: ["Red Card 5% discount", "Weekly circular specials"]
    },
    {
      id: 3,
      name: "Kroger",
      distance: "0.5 mi",
      address: "789 Pine St",
      hours: "6:00 AM - 12:00 AM",
      open: true,
      rating: 4.1,
      prices: {
        "Milk (1 gal)": 3.19,
        "Eggs (dozen)": 2.39,
        "Bread": 2.79,
        "Chicken Breast (lb)": 5.79,
        "Apples (lb)": 1.89
      },
      deals: ["Fuel points on every purchase", "Digital coupons available"]
    },
    {
      id: 4,
      name: "Whole Foods Market",
      distance: "2.1 mi",
      address: "321 Elm Blvd",
      hours: "7:00 AM - 10:00 PM",
      open: true,
      rating: 4.6,
      prices: {
        "Milk (1 gal)": 4.99,
        "Eggs (dozen)": 4.49,
        "Bread": 4.99,
        "Chicken Breast (lb)": 8.99,
        "Apples (lb)": 2.99
      },
      deals: ["Prime member 10% off", "Weekly sale items"]
    }
  ];

  useEffect(() => {
    setTimeout(() => {
      setStores(mockStores);
      setSelectedStore(mockStores[0]);
      setLoading(false);
    }, 1000);
  }, []);

  const getPriceColor = (price, item) => {
    const prices = stores.map(store => store.prices[item]).filter(p => p);
    const minPrice = Math.min(...prices);
    return price === minPrice ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-600 dark:text-gray-400';
  };

  const handleGetDirections = () => {
    if (selectedStore) {
      const address = encodeURIComponent(selectedStore.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl h-[600px] shadow-2xl flex overflow-hidden animate-slideUp transition-colors duration-200`}>
        {/* Store List */}
        <div className={`w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900`}>
          <div className={`p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 sticky top-0 z-10`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nearby Stores</h2>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <MapPin className="h-4 w-4" />
              <span>Sorted by distance</span>
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`animate-pulse bg-white dark:bg-gray-800 p-4 rounded-xl`}>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className={`w-full p-4 cursor-pointer transition-all text-left ${
                    selectedStore?.id === store.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-600 dark:border-blue-400 shadow-sm' 
                      : 'hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white pr-2">{store.name}</h3>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">{store.distance}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{store.address}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${store.open ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{store.open ? 'Open' : 'Closed'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{store.rating}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Store Details */}
        <div className={`flex-1 overflow-y-auto bg-white dark:bg-gray-800`}>
          {selectedStore ? (
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedStore.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedStore.address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleGetDirections}
                    className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors shadow-sm"
                    title="Get directions"
                  >
                    <Navigation className="h-5 w-5" />
                  </button>
                  <button 
                    className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                    title="Call store"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Store Info Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600`}>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span>Hours</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedStore.hours}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${
                    selectedStore.open ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {selectedStore.open ? 'Open Now' : 'Closed'}
                  </span>
                </div>
                <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600`}>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Star className="h-4 w-4" />
                    <span>Rating</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-2xl">{selectedStore.rating}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">out of 5.0</p>
                </div>
                <div className={`bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-600`}>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Navigation className="h-4 w-4" />
                    <span>Distance</span>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-2xl">{selectedStore.distance}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">from you</p>
                </div>
              </div>

              {/* Price Comparison */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Price Comparison</h3>
                </div>
                <div className="space-y-2">
                  {Object.entries(selectedStore.prices).map(([item, price]) => (
                    <div key={item} className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{item}</span>
                      <div className="flex items-center gap-2">
                        <span className={`${getPriceColor(price, item)} text-lg`}>
                          ${price.toFixed(2)}
                        </span>
                        {getPriceColor(price, item).includes('green') && (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full font-medium">
                            Best Price
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Deals */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Current Deals</h3>
                </div>
                <div className="space-y-2">
                  {selectedStore.deals.map((deal, index) => (
                    <div key={index} className={`flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg`}>
                      <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="text-green-800 dark:text-green-300 font-medium">{deal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleGetDirections}
                className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Navigation className="h-5 w-5" />
                Get Directions to {selectedStore.name}
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <Store className="h-16 w-16 mb-4" />
              <p className="text-lg">Select a store to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced shopping categories with dark mode
const SHOPPING_CATEGORIES = [
  { 
    id: 'all',
    label: 'All Items',
    icon: ShoppingCart,
    color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
  },
  { 
    id: 'produce', 
    label: 'Produce', 
    icon: Leaf, 
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
  },
  { 
    id: 'dairy', 
    label: 'Dairy', 
    icon: CircleDot, 
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  },
  { 
    id: 'meat', 
    label: 'Meat & Fish', 
    icon: Utensils, 
    color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
  },
  { 
    id: 'bakery', 
    label: 'Bakery', 
    icon: UtensilsCrossed, 
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
  },
  { 
    id: 'frozen', 
    label: 'Frozen', 
    icon: Snowflake, 
    color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
  },
  { 
    id: 'pantry', 
    label: 'Pantry', 
    icon: Package, 
    color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
  },
  { 
    id: 'beverages', 
    label: 'Beverages', 
    icon: Coffee, 
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800'
  }
];

// Main Component
export default function ShoppingMeals() {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('shopping');
  const [loading, setLoading] = useState(true);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [meals, setMeals] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // New state
  const [showAIChat, setShowAIChat] = useState(false);
  const [showNearbyStores, setShowNearbyStores] = useState(false);
  const [pantryItems, setPantryItems] = useState([]);

  // Item form
  const [itemForm, setItemForm] = useState({
    name: '',
    quantity: '1',
    unit: '',
    category: 'produce',
    notes: '',
    priority: 'medium',
    price: ''
  });

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadData();
      loadPantryItems();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const itemsSnap = await getDocs(query(
        collection(db, 'shoppingItems'), 
        where('userId', '==', currentUser.uid)
      ));
      const items = itemsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      const mealsSnap = await getDocs(query(
        collection(db, 'meals'), 
        where('userId', '==', currentUser.uid)
      ));
      const mealsList = mealsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setShoppingItems(items);
      setMeals(mealsList);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPantryItems = () => {
    const mockPantry = [
      { id: 1, name: 'Rice', quantity: '2 cups', category: 'pantry' },
      { id: 2, name: 'Pasta', quantity: '1 lb', category: 'pantry' },
      { id: 3, name: 'Olive Oil', quantity: '500 ml', category: 'pantry' },
      { id: 4, name: 'Canned Tomatoes', quantity: '3 cans', category: 'pantry' }
    ];
    setPantryItems(mockPantry);
  };

  // Add item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      toast.error('Please enter an item name');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'shoppingItems'), {
        ...itemForm,
        userId: currentUser.uid,
        checked: false,
        createdAt: serverTimestamp()
      });
      toast.success('Item added!');
      setShowAddItem(false);
      setItemForm({
        name: '',
        quantity: '1',
        unit: '',
        category: 'produce',
        notes: '',
        priority: 'medium',
        price: ''
      });
      loadData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle item checked
  const toggleItemChecked = async (itemId, currentChecked) => {
    try {
      await updateDoc(doc(db, 'shoppingItems', itemId), {
        checked: !currentChecked
      });
      loadData();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    
    try {
      await deleteDoc(doc(db, 'shoppingItems', itemId));
      toast.success('Item deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  // Clear checked items
  const handleClearChecked = async () => {
    const checkedItems = shoppingItems.filter(item => item.checked);
    if (checkedItems.length === 0) {
      toast.error('No checked items to clear');
      return;
    }
    if (!window.confirm(`Clear ${checkedItems.length} checked items?`)) return;
    try {
      const batch = writeBatch(db);
      checkedItems.forEach(item => {
        batch.delete(doc(db, 'shoppingItems', item.id));
      });
      await batch.commit();
      
      toast.success(`Cleared ${checkedItems.length} items`);
      loadData();
    } catch (error) {
      console.error('Error clearing items:', error);
      toast.error('Failed to clear items');
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    let items = shoppingItems;
    
    if (selectedCategory !== 'all') {
      items = items.filter(i => i.category === selectedCategory);
    }
    
    if (searchTerm) {
      items = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return items.sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      return a.category.localeCompare(b.category);
    });
  }, [shoppingItems, selectedCategory, searchTerm]);

  // Shopping stats
  const shoppingStats = useMemo(() => {
    const total = shoppingItems.length;
    const checked = shoppingItems.filter(i => i.checked).length;
    const remaining = total - checked;
    const totalCost = shoppingItems.reduce((sum, item) => 
      sum + (parseFloat(item.price) || 0), 0
    );
    
    return { total, checked, remaining, totalCost };
  }, [shoppingItems]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-200 dark:border-orange-800 border-t-orange-600 dark:border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200`}>
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl shadow-lg">
            <ShoppingCart className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Shopping List</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">AI-powered grocery management</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAIChat(true)}
            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 text-white rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Brain className="h-5 w-5" />
            AI Assistant
          </button>
          
          <button
            onClick={() => setShowNearbyStores(true)}
            className="px-4 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Store className="h-5 w-5" />
            Nearby Stores
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all duration-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{shoppingStats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all duration-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Checked</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{shoppingStats.checked}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all duration-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Remaining</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{shoppingStats.remaining}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all duration-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Cost</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">${shoppingStats.totalCost.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm transition-colors duration-200`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowAddItem(true)}
            className="px-6 py-3 bg-orange-600 dark:bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-700 dark:hover:bg-orange-600 transition-all flex items-center gap-2 justify-center shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            Add Item
          </button>
          
          {shoppingStats.checked > 0 && (
            <button
              onClick={handleClearChecked}
              className="px-6 py-3 bg-red-600 dark:bg-red-500 text-white rounded-xl font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Trash2 className="h-5 w-5" />
              Clear Checked
            </button>
          )}
        </div>
        {/* Enhanced Categories */}
        <div className="flex flex-wrap gap-2 mt-4">
          {SHOPPING_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                selectedCategory === cat.id
                  ? cat.color + ' shadow-md scale-105'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-105'
              }`}
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Items List */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm transition-colors duration-200`}>
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No items found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Add items to your shopping list to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredItems.map(item => {
              const CategoryIcon = SHOPPING_CATEGORIES.find(c => c.id === item.category)?.icon || ShoppingCart;
              
              return (
                <div
                  key={item.id}
                  className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${
                    item.checked ? 'bg-gray-50 dark:bg-gray-700/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleItemChecked(item.id, item.checked)}
                      className={`flex-shrink-0 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                        item.checked
                          ? 'bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500 hover:scale-110'
                      }`}
                    >
                      {item.checked && <Check className="h-4 w-4 text-white" />}
                    </button>
                    <div className={`p-3 rounded-xl ${
                      SHOPPING_CATEGORIES.find(c => c.id === item.category)?.color || 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg ${
                        item.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        <span>{item.quantity} {item.unit}</span>
                        {item.price && (
                          <span className="flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                            <DollarSign className="h-3 w-3" />
                            {item.price}
                          </span>
                        )}
                        {item.notes && (
                          <span className="text-gray-400 dark:text-gray-500">• {item.notes}</span>
                        )}
                      </div>
                    </div>
                    {item.priority === 'high' && !item.checked && (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium rounded-full border border-red-200 dark:border-red-800">
                        High Priority
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all hover:scale-110"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl transition-colors duration-200`}>
            <div className={`p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Item</h2>
                <button
                  onClick={() => setShowAddItem(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({...itemForm, unit: e.target.value})}
                    placeholder="lbs, oz, etc."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={itemForm.category}
                  onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                >
                  {SHOPPING_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={itemForm.priority}
                  onChange={(e) => setItemForm({...itemForm, priority: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({...itemForm, notes: e.target.value})}
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddItem(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-orange-600 dark:bg-orange-500 text-white rounded-xl hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors disabled:opacity-50 font-medium shadow-lg hover:shadow-xl"
                >
                  {submitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAIChat && (
        <AIChatAssistant 
          onClose={() => setShowAIChat(false)}
          onAddMeal={() => {
            setShowAIChat(false);
            toast.success('Meal planning feature coming soon!');
          }}
          pantryItems={pantryItems}
        />
      )}

      {showNearbyStores && (
        <NearbyStores onClose={() => setShowNearbyStores(false)} />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes messageSlide {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-messageSlide {
          animation: messageSlide 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
