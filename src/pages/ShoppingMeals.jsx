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
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Info,
  Scale,
  Flame,
  Activity,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../services/api';
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

// Helper function to generate YouTube search URL
const getYouTubeSearchUrl = (query) => {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.youtube.com/results?search_query=${encodedQuery}`;
};

// Helper function to generate YouTube embed URL (for common recipes)
const getYouTubeVideoId = (recipeName) => {
  // Common recipe video IDs (can be expanded)
  const videoMap = {
    'meat lover pizza': 'dQw4w9WgXcQ', // Replace with actual video ID
    'chicken': 'jNQXAC9IVRw',
    'pasta': 'dQw4w9WgXcQ',
    'pizza': 'dQw4w9WgXcQ'
  };

  const lowerName = recipeName.toLowerCase();
  for (const [key, id] of Object.entries(videoMap)) {
    if (lowerName.includes(key)) {
      return id;
    }
  }
  return null;
};

// Free AI API Integration with Image Analysis - Google Gemini Vision (Free Tier)
const callFreeAI = async (userMessage, pantryItems = [], imageBase64 = null) => {
  const pantryContext = pantryItems.length > 0
    ? `User's pantry contains: ${pantryItems.map(item => item.name).join(', ')}. `
    : '';

  const systemPrompt = `You are a helpful AI cooking assistant. ${pantryContext}Provide detailed recipes, cooking instructions, and meal ideas. 

IMPORTANT FORMATTING RULES:
1. Always answer the user's specific question directly - do NOT give generic responses
2. For recipes, include: ingredients list, step-by-step instructions, cooking time, and serving size
3. At the end of your response, add a YouTube section like this:
   📺 **Watch Video Tutorial:**
   [Recipe Name Tutorial](https://www.youtube.com/results?search_query=RECIPE+NAME+tutorial)
   
4. For visual recipes, suggest: "Search YouTube for '[recipe name] tutorial' for step-by-step video instructions"
5. Be specific and detailed - provide actual cooking instructions, not just suggestions
6. Format with emojis and clear sections
7. If asked about a specific dish (like "meat lover pizza"), provide the complete recipe with ingredients and steps`;

  // Try Google Gemini API first (FREE - no API key needed for basic usage)
  // Note: For production, you'd want to use an API key, but this works for free tier
  try {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (geminiApiKey) {
      // Use Gemini API with Vision support if image is provided
      // Note: Gemini 1.5 uses 'gemini-1.5-flash' or 'gemini-1.5-pro' for vision
      const model = imageBase64 ? 'gemini-1.5-flash' : 'gemini-pro';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

      // Build parts array
      const parts = [];

      // Add image if provided
      if (imageBase64) {
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: imageBase64
          }
        });
      }

      // Add text prompt with advanced image analysis
      parts.push({
        text: imageBase64
          ? `You are an expert food recognition AI with advanced computer vision capabilities. Analyze this food image in detail and provide a comprehensive analysis in the following JSON format:

{
  "isFood": true/false,
  "foodName": "exact name of the dish/food item",
  "description": "detailed description of what you see, including appearance, colors, textures, and presentation",
  "ingredients": ["complete list of all visible and identifiable ingredients"],
  "nutrition": {
    "calories": estimated number based on visible portion,
    "protein": "Xg",
    "carbs": "Xg",
    "fat": "Xg",
    "fiber": "Xg"
  },
  "freshness": {
    "score": number between 0-100 based on visual quality,
    "assessment": "fresh/good/fair/poor",
    "indicators": ["specific visual quality indicators like color, texture, appearance"]
  },
  "allergens": ["list of common allergens present: nuts, dairy, gluten, shellfish, eggs, soy, etc."],
  "portionSize": "estimated serving size based on what's visible",
  "recipe": {
    "instructions": ["detailed step-by-step cooking instructions"],
    "cookTime": "estimated cooking time",
    "servings": estimated number,
    "difficulty": "easy/medium/hard"
  },
  "youtubeQuery": "search query for YouTube tutorial"
}

CRITICAL INSTRUCTIONS:
- Look carefully at the image and describe EXACTLY what you see
- If the image does NOT contain food, set "isFood": false
- Be VERY detailed in the description - describe colors, textures, presentation style, plating
- Identify EVERY ingredient you can see in the image
- Estimate nutrition based on the visible portion size
- Assess freshness by looking at color vibrancy, texture quality, and overall appearance
- Flag ALL potential allergens you can identify
- If it's a prepared dish, provide complete cooking instructions
- Make the description rich and detailed - describe what makes this food special

Analyze this image now and provide the JSON response.`
          : `${systemPrompt}\n\nUser question: ${userMessage}`
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2000,
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.candidates?.[0]?.content?.parts?.[0]?.text || null;

        if (content && imageBase64) {
          // Try to parse JSON response for structured image analysis
          try {
            // Clean the response to extract JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);
              return { type: 'imageAnalysis', data: analysis };
            }
          } catch (e) {
            console.warn('Failed to parse JSON, using text response');
          }
        }

        if (content && !imageBase64) {
          // Add YouTube link if it's a recipe question
          if (userMessage.toLowerCase().includes('how to') || userMessage.toLowerCase().includes('recipe') || userMessage.toLowerCase().includes('cook') || userMessage.toLowerCase().includes('make')) {
            const recipeName = userMessage.replace(/how to|recipe|cook|make|how can i|/gi, '').trim();
            const youtubeUrl = getYouTubeSearchUrl(`${recipeName} tutorial`);

            if (!content.includes('youtube.com') && !content.includes('Watch Video')) {
              content += `\n\n📺 **Watch Video Tutorial:**\n[${recipeName} Tutorial on YouTube](${youtubeUrl})`;
            }
          }
          return content;
        }

        return content;
      }
    }
  } catch (error) {
    console.warn('Gemini API call failed, trying alternatives:', error);
  }

  // Try OpenAI as premium option (if API key is provided)
  try {
    const openAIApiKey = import.meta.env.VITE_OPENAI_API_KEY;

    if (openAIApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        let content = data.choices[0]?.message?.content || null;

        if (content) {
          // Add YouTube link if it's a recipe question
          if (userMessage.toLowerCase().includes('how to') || userMessage.toLowerCase().includes('recipe') || userMessage.toLowerCase().includes('cook') || userMessage.toLowerCase().includes('make')) {
            const recipeName = userMessage.replace(/how to|recipe|cook|make|how can i|/gi, '').trim();
            const youtubeUrl = getYouTubeSearchUrl(`${recipeName} tutorial`);

            if (!content.includes('youtube.com') && !content.includes('Watch Video')) {
              content += `\n\n📺 **Watch Video Tutorial:**\n[${recipeName} Tutorial on YouTube](${youtubeUrl})`;
            }
          }
          return content;
        }
      }
    }
  } catch (error) {
    console.warn('OpenAI API call failed:', error);
  }

  // If all APIs fail, return null to use fallback
  return null;
};

// Format image analysis data into readable text
const formatImageAnalysis = (analysis) => {
  if (!analysis || !analysis.isFood) {
    return `🚫 **Not a Food Item**\n\nThis doesn't appear to be food. Please try capturing a food item or ingredient.\n\n💡 **Tips for better photos:**\n• Take photos in good lighting\n• Focus on the food item\n• Avoid blurry images\n• Capture the entire dish clearly`;
  }

  let text = `🍽️ **${analysis.foodName || 'Food Item'}**\n\n`;

  if (analysis.description) {
    text += `${analysis.description}\n\n`;
  }

  // Ingredients
  if (analysis.ingredients && analysis.ingredients.length > 0) {
    text += `📋 **Ingredients:**\n${analysis.ingredients.map(ing => `• ${ing}`).join('\n')}\n\n`;
  }

  // Nutrition
  if (analysis.nutrition) {
    text += `📊 **Nutrition (estimated):**\n`;
    if (analysis.nutrition.calories) text += `• Calories: ${analysis.nutrition.calories}\n`;
    if (analysis.nutrition.protein) text += `• Protein: ${analysis.nutrition.protein}\n`;
    if (analysis.nutrition.carbs) text += `• Carbs: ${analysis.nutrition.carbs}\n`;
    if (analysis.nutrition.fat) text += `• Fat: ${analysis.nutrition.fat}\n`;
    if (analysis.nutrition.fiber) text += `• Fiber: ${analysis.nutrition.fiber}\n`;
    text += '\n';
  }

  // Freshness
  if (analysis.freshness) {
    const score = analysis.freshness.score || 0;
    const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
    text += `${emoji} **Freshness Score:** ${score}/100 (${analysis.freshness.assessment || 'good'})\n`;
    if (analysis.freshness.indicators && analysis.freshness.indicators.length > 0) {
      text += `• ${analysis.freshness.indicators.join('\n• ')}\n`;
    }
    text += '\n';
  }

  // Allergens
  if (analysis.allergens && analysis.allergens.length > 0) {
    text += `⚠️ **Allergen Alert:**\n${analysis.allergens.map(all => `• ${all}`).join('\n')}\n\n`;
  }

  // Portion Size
  if (analysis.portionSize) {
    text += `⚖️ **Estimated Portion:** ${analysis.portionSize}\n\n`;
  }

  // Recipe
  if (analysis.recipe && analysis.recipe.instructions) {
    text += `👨‍🍳 **How to Make:**\n`;
    analysis.recipe.instructions.forEach((step, idx) => {
      text += `${idx + 1}. ${step}\n`;
    });
    if (analysis.recipe.cookTime) {
      text += `\n⏱️ Cook Time: ${analysis.recipe.cookTime}\n`;
    }
    if (analysis.recipe.servings) {
      text += `👥 Servings: ${analysis.recipe.servings}\n`;
    }
    text += '\n';
  }

  // YouTube link
  if (analysis.youtubeQuery) {
    const youtubeUrl = getYouTubeSearchUrl(analysis.youtubeQuery);
    text += `📺 **Watch Tutorial:**\n[${analysis.youtubeQuery} Tutorial](${youtubeUrl})`;
  }

  return text;
};

// Helper function to format markdown text (remove ** and format nicely)
const formatMessage = (text) => {
  if (!text) return '';

  // Split by lines and process
  const lines = text.split('\n');
  const formattedLines = lines.map(line => {
    // Remove ** markdown and make text bold with CSS
    let formatted = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    // Handle headers
    if (line.startsWith('### ')) {
      formatted = `<h3 class="text-lg font-bold mt-4 mb-2">${line.replace('### ', '')}</h3>`;
    } else if (line.startsWith('## ')) {
      formatted = `<h2 class="text-xl font-bold mt-4 mb-2">${line.replace('## ', '')}</h2>`;
    } else if (line.startsWith('# ')) {
      formatted = `<h1 class="text-2xl font-bold mt-4 mb-2">${line.replace('# ', '')}</h1>`;
    }

    return formatted;
  });

  return formattedLines.join('<br>');
};

// Convert image to base64 for Gemini Vision API
const imageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Enhanced AI Chat Component with Image Scanning and Better Design
const AIChatAssistant = ({ onClose, onAddMeal, pantryItems = [] }) => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your AI cooking assistant powered by advanced AI. I can help you with meal ideas, recipes, cooking tips, and even analyze food photos to tell you how to make them. What would you like to know?",
      isAI: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isUsingAI, setIsUsingAI] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const imageInputRef = useRef(null);

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

    // Pizza recipes (specific) - MUST come before generic "how to"
    if (input.includes('pizza')) {
      if (input.includes('meat lover') || input.includes('meatlover') || input.includes('meat lover')) {
        return `🍕 **Meat Lover's Pizza Recipe**\n\n**Ingredients:**\n- Pizza dough (store-bought or homemade)\n- 1 cup pizza sauce\n- 2 cups shredded mozzarella cheese\n- 1/2 cup cooked Italian sausage, crumbled\n- 1/2 cup cooked pepperoni slices\n- 1/2 cup cooked bacon, chopped\n- 1/2 cup cooked ham, diced\n- 1/4 cup grated parmesan cheese\n- 1 tsp dried oregano\n- 1/2 tsp garlic powder\n\n**Instructions:**\n1. Preheat oven to 475°F (245°C)\n2. Roll out pizza dough on a floured surface\n3. Transfer to a pizza pan or baking sheet\n4. Spread pizza sauce evenly over dough\n5. Sprinkle mozzarella cheese\n6. Add all meats (sausage, pepperoni, bacon, ham)\n7. Top with parmesan, oregano, and garlic powder\n8. Bake for 12-15 minutes until crust is golden\n9. Let cool 2-3 minutes before slicing\n\n**Cook Time:** 15-20 minutes\n**Serves:** 4-6 people\n\n📺 **Watch Video Tutorial:**\n[Meat Lover's Pizza Tutorial](${getYouTubeSearchUrl('meat lover pizza tutorial')})`;
      }
      return `🍕 **Classic Pizza Recipe**\n\n**Basic Ingredients:**\n- Pizza dough\n- Pizza sauce\n- Mozzarella cheese\n- Your favorite toppings\n\n**Instructions:**\n1. Preheat oven to 475°F\n2. Roll out dough\n3. Add sauce and cheese\n4. Add toppings\n5. Bake 12-15 minutes\n\n📺 **Watch Video:**\n[Pizza Making Tutorial](${getYouTubeSearchUrl('how to make pizza tutorial')})`;
    }

    // Specific recipes - "how to cook" or "how can i" questions - MUST come before generic tips
    if (input.includes('how can i') || input.includes('how to cook') || input.includes('how to make')) {
      // Extract the dish name
      let dishName = input
        .replace(/how can i|how to cook|how to make|cook|make|/gi, '')
        .trim()
        .replace(/\?/g, '')
        .trim();

      if (dishName && dishName.length > 2) {
        const capitalizedDish = dishName.split(' ').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');

        return `🍳 **How to Make ${capitalizedDish}**\n\nI'll provide you with a general recipe. For specific ingredients and detailed steps, here's a helpful guide:\n\n**Basic Steps:**\n1. Gather your ingredients\n2. Prepare your cooking equipment\n3. Follow the cooking method\n4. Season to taste\n5. Serve hot\n\n**For detailed step-by-step instructions with ingredients and measurements, I recommend:**\n\n📺 **Watch Video Tutorial:**\n[${capitalizedDish} Tutorial](${getYouTubeSearchUrl(`${dishName} tutorial`)})\n\nThis video will show you exactly how to prepare ${dishName} with visual instructions!\n\n💡 **Tip:** Search YouTube for "${dishName} recipe" to find multiple tutorial videos with different variations.`;
      }
    }

    // Cooking tips (generic)
    if (input.includes('tip') || input.includes('technique') || input.includes('advice')) {
      return "Quick cooking tips:\n\n🔪 **Knife Skills**\n- Keep knives sharp\n- Use proper cutting board\n- Master basic cuts\n\n🔥 **Heat Control**\n- Preheat pans properly\n- Don't overcrowd\n- Let meat rest\n\n🧂 **Seasoning**\n- Salt in layers\n- Taste as you cook\n- Fresh herbs at end\n\n⏰ **Time Management**\n- Prep ingredients first\n- Multi-task wisely\n- Clean as you go\n\nWhat specific technique interests you?";
    }

    // Budget meals
    if (input.includes('cheap') || input.includes('budget') || input.includes('affordable') || input.includes('save money') || input.includes('inexpensive')) {
      return "Budget-friendly meals:\n\n💰 **Rice & Beans** ($2/serving)\nRice, beans, spices, vegetables\n\n🥔 **Potato Soup** ($1.50/serving)\nPotatoes, onions, milk, seasonings\n\n🍝 **Pasta Primavera** ($2/serving)\nPasta, frozen veggies, olive oil, garlic\n\n🥚 **Egg Fried Rice** ($1.75/serving)\nRice, eggs, frozen vegetables, soy sauce\n\n🌯 **Bean Burritos** ($1.50/serving)\nTortillas, refried beans, cheese, salsa\n\nAll filling and nutritious!";
    }

    // Default response
    return "I'd be happy to help! I can assist you with:\n\n✨ **Recipe suggestions** based on ingredients, time, or dietary needs\n📋 **Meal planning** for the week\n🥘 **Cooking tips** and techniques\n🛒 **Shopping lists** from recipes\n⏱️ **Quick meals** under 30 minutes\n🌱 **Dietary options** (vegan, keto, etc.)\n\nWhat would you like to explore? Try asking:\n- \"What can I make for dinner?\"\n- \"Quick healthy breakfast ideas\"\n- \"Recipes using chicken\"\n- \"Vegetarian meal prep\"\n- \"What's in my pantry?\"";
  }, [pantryItems]);

  // Handle image upload
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
      // Auto-send after image is loaded
      setTimeout(() => {
        // Use a ref to access the latest handleSendMessage
        try {
          const sendButton = document.querySelector('[data-send-button]');
          if (sendButton && sendButton.nodeName && !sendButton.disabled) {
            sendButton.click();
          }
        } catch (error) {
          console.warn('Could not auto-send message:', error);
        }
      }, 800);
    };
    reader.readAsDataURL(file);
    toast.success('Image ready! Analyzing automatically...');
  }, []);

  // Remove uploaded image
  const removeImage = useCallback(() => {
    setUploadedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() && !uploadedImage) return;

    // Convert image to base64 if present
    let imageBase64 = null;
    if (uploadedImage) {
      try {
        imageBase64 = await imageToBase64(uploadedImage);
      } catch (error) {
        console.error('Error converting image:', error);
        toast.error('Failed to process image');
        return;
      }
    }

    const userMessage = {
      id: Date.now(),
      text: inputMessage || (uploadedImage ? 'What is this food and how do I make it?' : ''),
      isAI: false,
      timestamp: new Date(),
      image: imagePreview
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage || (uploadedImage ? 'Analyze this food image completely and describe everything you see in detail. Identify all ingredients, estimate nutrition, assess freshness, flag allergens, and provide cooking instructions if applicable.' : '');
    setInputMessage('');
    setIsTyping(true);
    setIsUsingAI(false);

    // Clear image after sending
    const imageToSend = imageBase64;
    setUploadedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }

    // Try free AI APIs first (Gemini or OpenAI), then fallback to contextual
    let aiResponse = null;
    let imageAnalysis = null;

    try {
      // Show AI indicator
      setIsUsingAI(true);
      const response = await callFreeAI(currentInput, pantryItems, imageToSend);

      // Check if response is structured image analysis
      if (response && typeof response === 'object' && response.type === 'imageAnalysis') {
        imageAnalysis = response.data;
        // Convert analysis to readable text
        aiResponse = formatImageAnalysis(response.data);
      } else {
        aiResponse = response;
      }
    } catch (error) {
      console.warn('AI API error:', error);
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
      isOpenAI: !!aiResponse && isUsingAI,
      imageAnalysis: imageAnalysis // Store structured analysis for advanced UI
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

  const hasFreeAI = !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY);

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
                  {hasFreeAI ? (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full flex items-center gap-1">
                      <Sparkle className="h-3 w-3" />
                      AI Powered
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full flex items-center gap-1">
                      <Sparkle className="h-3 w-3" />
                      Free Mode
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
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${message.isAI
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
                {message.image && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img
                      src={message.image}
                      alt="Uploaded food"
                      className="w-full max-w-sm rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                )}

                {/* Advanced Image Analysis Display */}
                {message.imageAnalysis && message.imageAnalysis.isFood && (
                  <div className="mb-4 space-y-3">
                    {/* Food Name & Description */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        {message.imageAnalysis.foodName}
                      </h3>
                      {message.imageAnalysis.description && (
                        <p className="text-gray-700 dark:text-gray-300">{message.imageAnalysis.description}</p>
                      )}
                    </div>

                    {/* Ingredients List */}
                    {message.imageAnalysis.ingredients && message.imageAnalysis.ingredients.length > 0 && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          Identified Ingredients
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {message.imageAnalysis.ingredients.map((ingredient, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm border border-blue-200 dark:border-blue-800">
                              {ingredient}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nutrition Info */}
                    {message.imageAnalysis.nutrition && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <BarChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          Nutrition (Estimated)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {message.imageAnalysis.nutrition.calories && (
                            <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{message.imageAnalysis.nutrition.calories}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Calories</div>
                            </div>
                          )}
                          {message.imageAnalysis.nutrition.protein && (
                            <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{message.imageAnalysis.nutrition.protein}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Protein</div>
                            </div>
                          )}
                          {message.imageAnalysis.nutrition.carbs && (
                            <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{message.imageAnalysis.nutrition.carbs}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Carbs</div>
                            </div>
                          )}
                          {message.imageAnalysis.nutrition.fat && (
                            <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{message.imageAnalysis.nutrition.fat}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">Fat</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Freshness Score */}
                    {message.imageAnalysis.freshness && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            Freshness Assessment
                          </h4>
                          <div className={`px-3 py-1 rounded-full font-bold ${message.imageAnalysis.freshness.score >= 80
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : message.imageAnalysis.freshness.score >= 60
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                            {message.imageAnalysis.freshness.score}/100
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-2">
                          {message.imageAnalysis.freshness.assessment}
                        </p>
                        {message.imageAnalysis.freshness.indicators && message.imageAnalysis.freshness.indicators.length > 0 && (
                          <ul className="space-y-1">
                            {message.imageAnalysis.freshness.indicators.map((indicator, idx) => (
                              <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="w-1 h-1 bg-amber-600 dark:bg-amber-400 rounded-full"></span>
                                {indicator}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Allergen Alerts */}
                    {message.imageAnalysis.allergens && message.imageAnalysis.allergens.length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-300 dark:border-red-800">
                        <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Allergen Alert
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {message.imageAnalysis.allergens.map((allergen, idx) => (
                            <span key={idx} className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm font-medium border border-red-300 dark:border-red-800">
                              ⚠️ {allergen}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portion Size */}
                    {message.imageAnalysis.portionSize && (
                      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
                        <Scale className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">Estimated Portion</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{message.imageAnalysis.portionSize}</div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {message.imageAnalysis.ingredients && message.imageAnalysis.ingredients.length > 0 && (
                        <button
                          onClick={() => {
                            const ingredients = message.imageAnalysis.ingredients.map(ing => ({
                              name: ing,
                              quantity: '1',
                              unit: '',
                              notes: 'From image scan'
                            }));
                            onAddMeal?.(ingredients);
                            toast.success(`Added ${ingredients.length} ingredients to shopping list!`);
                          }}
                          className="flex-1 min-w-[200px] px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-700 dark:hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add Ingredients to List
                        </button>
                      )}
                      {message.imageAnalysis.youtubeQuery && (
                        <button
                          onClick={() => window.open(getYouTubeSearchUrl(message.imageAnalysis.youtubeQuery), '_blank')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Watch Tutorial
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Non-Food Detection */}
                {message.imageAnalysis && !message.imageAnalysis.isFood && (
                  <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-300 dark:border-amber-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">Not a Food Item</h4>
                        <p className="text-sm text-amber-800 dark:text-amber-400 mb-3">
                          This doesn't appear to be food. Please try capturing a food item or ingredient.
                        </p>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            Tips for better photos:
                          </p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <li>• Take photos in good lighting</li>
                            <li>• Focus on the food item</li>
                            <li>• Avoid blurry images</li>
                            <li>• Capture the entire dish clearly</li>
                            <li>• Remove background clutter</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div
                  className="leading-relaxed prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                />
                {/* YouTube links */}
                {message.text.includes('youtube.com') && (
                  <div className="mt-3">
                    {message.text.split('\n').map((line, idx) => {
                      const youtubeMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
                      if (youtubeMatch) {
                        const [, linkText, url] = youtubeMatch;
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg mt-2"
                          >
                            <span>📺</span>
                            <span>{linkText}</span>
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
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
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-3 relative">
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border-2 border-purple-300 dark:border-purple-700"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Food image ready to analyze</p>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <button
              onClick={() => imageInputRef.current?.click()}
              className="p-3 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all"
              title="Scan food image"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={uploadedImage ? "Ask about this food..." : "Ask about recipes, ingredients, or cooking tips..."}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              disabled={isTyping}
            />
            <button
              data-send-button
              onClick={handleSendMessage}
              disabled={isTyping}
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
          {!hasFreeAI && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              💡 Add VITE_GEMINI_API_KEY (free) or VITE_OPENAI_API_KEY for enhanced AI responses
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in miles
};

// Convert distance to readable format
const formatDistance = (miles) => {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  if (miles < 1) return `${(miles * 10).toFixed(1)} mi`;
  return `${miles.toFixed(1)} mi`;
};

// Nearby Stores Component (Enhanced with Dark Mode and Real Location)
const NearbyStores = ({ onClose }) => {
  const { isDark } = useTheme();
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [addressSearch, setAddressSearch] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [currentLocationName, setCurrentLocationName] = useState(null);

  const mockStores = [
    {
      id: 1,
      name: "Walmart Supercenter",
      distance: "0.8 mi",
      address: "123 Main Street, Springfield, MA 01103",
      phone: "(413) 555-0123",
      hours: "6:00 AM - 11:00 PM",
      open: true,
      rating: 4.2,
      prices: {
        "Milk (1 gal)": 3.49,
        "Eggs (dozen)": 2.98,
        "Bread": 2.50,
        "Chicken Breast (lb)": 6.99,
        "Apples (lb)": 1.99,
        "Bananas (lb)": 0.58,
        "Ground Beef (lb)": 5.99,
        "Salmon (lb)": 9.99
      },
      deals: ["Rollback prices", "Everyday low prices", "Free pickup available"]
    },
    {
      id: 2,
      name: "Target",
      distance: "1.2 mi",
      address: "456 Oak Avenue, Springfield, MA 01104",
      phone: "(413) 555-0124",
      hours: "8:00 AM - 10:00 PM",
      open: true,
      rating: 4.4,
      prices: {
        "Milk (1 gal)": 3.99,
        "Eggs (dozen)": 3.49,
        "Bread": 3.29,
        "Chicken Breast (lb)": 7.99,
        "Apples (lb)": 2.49,
        "Bananas (lb)": 0.69,
        "Ground Beef (lb)": 6.49,
        "Salmon (lb)": 10.99
      },
      deals: ["RedCard 5% off", "Weekly ad specials", "Same-day delivery"]
    },
    {
      id: 3,
      name: "Kroger",
      distance: "1.5 mi",
      address: "789 Pine Road, Springfield, MA 01105",
      phone: "(413) 555-0125",
      hours: "6:00 AM - 12:00 AM",
      open: true,
      rating: 4.3,
      prices: {
        "Milk (1 gal)": 3.79,
        "Eggs (dozen)": 3.19,
        "Bread": 2.99,
        "Chicken Breast (lb)": 7.49,
        "Apples (lb)": 2.29,
        "Bananas (lb)": 0.59,
        "Ground Beef (lb)": 6.29,
        "Salmon (lb)": 10.49
      },
      deals: ["Fuel points", "Digital coupons", "ClickList pickup"]
    },
    {
      id: 4,
      name: "Whole Foods Market",
      distance: "2.1 mi",
      address: "321 Elm Boulevard, Springfield, MA 01106",
      phone: "(413) 555-0126",
      hours: "7:00 AM - 10:00 PM",
      open: true,
      rating: 4.6,
      prices: {
        "Milk (1 gal)": 4.99,
        "Eggs (dozen)": 4.49,
        "Bread": 4.99,
        "Chicken Breast (lb)": 8.99,
        "Apples (lb)": 2.99,
        "Bananas (lb)": 0.79,
        "Ground Beef (lb)": 7.99,
        "Salmon (lb)": 12.99
      },
      deals: ["Prime member 10% off", "Weekly sale items", "Organic selection"]
    },
    {
      id: 5,
      name: "Stop & Shop",
      distance: "2.3 mi",
      address: "567 Maple Drive, Springfield, MA 01107",
      phone: "(413) 555-0127",
      hours: "7:00 AM - 11:00 PM",
      open: true,
      rating: 4.1,
      prices: {
        "Milk (1 gal)": 3.69,
        "Eggs (dozen)": 3.09,
        "Bread": 2.79,
        "Chicken Breast (lb)": 7.29,
        "Apples (lb)": 2.19,
        "Bananas (lb)": 0.62,
        "Ground Beef (lb)": 6.19,
        "Salmon (lb)": 10.29
      },
      deals: ["GO Rewards program", "Weekly circular", "Pharmacy services"]
    },
    {
      id: 6,
      name: "Aldi",
      distance: "2.5 mi",
      address: "890 Cedar Lane, Springfield, MA 01108",
      phone: "(413) 555-0128",
      hours: "9:00 AM - 8:00 PM",
      open: true,
      rating: 4.5,
      prices: {
        "Milk (1 gal)": 2.99,
        "Eggs (dozen)": 2.49,
        "Bread": 1.99,
        "Chicken Breast (lb)": 5.99,
        "Apples (lb)": 1.79,
        "Bananas (lb)": 0.49,
        "Ground Beef (lb)": 5.49,
        "Salmon (lb)": 8.99
      },
      deals: ["Everyday low prices", "Weekly specials", "Quarter for cart"]
    },
    {
      id: 7,
      name: "Trader Joe's",
      distance: "2.8 mi",
      address: "234 Birch Street, Springfield, MA 01109",
      phone: "(413) 555-0129",
      hours: "8:00 AM - 9:00 PM",
      open: true,
      rating: 4.7,
      prices: {
        "Milk (1 gal)": 4.49,
        "Eggs (dozen)": 3.99,
        "Bread": 3.99,
        "Chicken Breast (lb)": 7.99,
        "Apples (lb)": 2.49,
        "Bananas (lb)": 0.59,
        "Ground Beef (lb)": 6.99,
        "Salmon (lb)": 11.99
      },
      deals: ["Unique products", "No membership fees", "Friendly staff"]
    },
    {
      id: 8,
      name: "Safeway",
      distance: "3.1 mi",
      address: "456 Willow Way, Springfield, MA 01110",
      phone: "(413) 555-0130",
      hours: "6:00 AM - 11:00 PM",
      open: true,
      rating: 4.2,
      prices: {
        "Milk (1 gal)": 3.89,
        "Eggs (dozen)": 3.29,
        "Bread": 3.09,
        "Chicken Breast (lb)": 7.69,
        "Apples (lb)": 2.39,
        "Bananas (lb)": 0.64,
        "Ground Beef (lb)": 6.49,
        "Salmon (lb)": 10.79
      },
      deals: ["Just for U savings", "Fuel rewards", "Pharmacy"]
    },
    {
      id: 9,
      name: "Publix",
      distance: "3.4 mi",
      address: "678 Spruce Avenue, Springfield, MA 01111",
      phone: "(413) 555-0131",
      hours: "7:00 AM - 10:00 PM",
      open: true,
      rating: 4.6,
      prices: {
        "Milk (1 gal)": 3.99,
        "Eggs (dozen)": 3.49,
        "Bread": 3.29,
        "Chicken Breast (lb)": 7.99,
        "Apples (lb)": 2.49,
        "Bananas (lb)": 0.69,
        "Ground Beef (lb)": 6.79,
        "Salmon (lb)": 11.49
      },
      deals: ["BOGO deals", "Pharmacy services", "Bakery specials"]
    },
    {
      id: 10,
      name: "Costco Wholesale",
      distance: "3.7 mi",
      address: "901 Ash Boulevard, Springfield, MA 01112",
      phone: "(413) 555-0132",
      hours: "10:00 AM - 8:30 PM",
      open: true,
      rating: 4.5,
      prices: {
        "Milk (1 gal)": 2.99,
        "Eggs (dozen)": 2.99,
        "Bread": 4.99,
        "Chicken Breast (lb)": 4.99,
        "Apples (lb)": 1.49,
        "Bananas (lb)": 0.39,
        "Ground Beef (lb)": 4.99,
        "Salmon (lb)": 9.99
      },
      deals: ["Bulk savings", "Member pricing", "Gas station"]
    },
    {
      id: 11,
      name: "BJ's Wholesale Club",
      distance: "4.0 mi",
      address: "123 Hickory Drive, Springfield, MA 01113",
      phone: "(413) 555-0133",
      hours: "9:00 AM - 9:00 PM",
      open: true,
      rating: 4.4,
      prices: {
        "Milk (1 gal)": 3.19,
        "Eggs (dozen)": 3.19,
        "Bread": 4.49,
        "Chicken Breast (lb)": 5.49,
        "Apples (lb)": 1.59,
        "Bananas (lb)": 0.44,
        "Ground Beef (lb)": 5.29,
        "Salmon (lb)": 9.49
      },
      deals: ["Member benefits", "Bulk purchases", "Optical center"]
    },
    {
      id: 12,
      name: "Food Lion",
      distance: "4.3 mi",
      address: "345 Poplar Street, Springfield, MA 01114",
      phone: "(413) 555-0134",
      hours: "7:00 AM - 11:00 PM",
      open: true,
      rating: 4.0,
      prices: {
        "Milk (1 gal)": 3.59,
        "Eggs (dozen)": 3.09,
        "Bread": 2.89,
        "Chicken Breast (lb)": 7.19,
        "Apples (lb)": 2.09,
        "Bananas (lb)": 0.57,
        "Ground Beef (lb)": 6.09,
        "Salmon (lb)": 10.19
      },
      deals: ["MVP savings", "Digital coupons", "Weekly specials"]
    },
    {
      id: 13,
      name: "Giant Food",
      distance: "4.6 mi",
      address: "567 Sycamore Road, Springfield, MA 01115",
      phone: "(413) 555-0135",
      hours: "6:00 AM - 12:00 AM",
      open: true,
      rating: 4.3,
      prices: {
        "Milk (1 gal)": 3.79,
        "Eggs (dozen)": 3.19,
        "Bread": 2.99,
        "Chicken Breast (lb)": 7.49,
        "Apples (lb)": 2.29,
        "Bananas (lb)": 0.59,
        "Ground Beef (lb)": 6.29,
        "Salmon (lb)": 10.49
      },
      deals: ["BonusCard savings", "Pharmacy", "Fuel rewards"]
    },
    {
      id: 14,
      name: "Wegmans",
      distance: "4.9 mi",
      address: "789 Chestnut Avenue, Springfield, MA 01116",
      phone: "(413) 555-0136",
      hours: "6:00 AM - 12:00 AM",
      open: true,
      rating: 4.8,
      prices: {
        "Milk (1 gal)": 3.99,
        "Eggs (dozen)": 3.49,
        "Bread": 3.49,
        "Chicken Breast (lb)": 7.99,
        "Apples (lb)": 2.49,
        "Bananas (lb)": 0.69,
        "Ground Beef (lb)": 6.99,
        "Salmon (lb)": 11.99
      },
      deals: ["Shoppers Club", "Prepared foods", "Pharmacy services"]
    },
    {
      id: 15,
      name: "Meijer",
      distance: "5.2 mi",
      address: "890 Walnut Boulevard, Springfield, MA 01117",
      phone: "(413) 555-0137",
      hours: "6:00 AM - 12:00 AM",
      open: true,
      rating: 4.3,
      prices: {
        "Milk (1 gal)": 3.69,
        "Eggs (dozen)": 3.09,
        "Bread": 2.79,
        "Chicken Breast (lb)": 7.29,
        "Apples (lb)": 2.19,
        "Bananas (lb)": 0.62,
        "Ground Beef (lb)": 6.19,
        "Salmon (lb)": 10.29
      },
      deals: ["mPerks rewards", "Weekly ad", "Pharmacy"]
    }
  ];

  // Geocode address to coordinates using OpenStreetMap Nominatim (free)
  const geocodeAddress = async (address) => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    setSearchingAddress(true);
    setLocationError(null);

    try {
      // Use more specific search parameters for better accuracy
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&extratags=1`,
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
        const location = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        };

        // Verify the location is valid
        if (isNaN(location.lat) || isNaN(location.lng)) {
          throw new Error('Invalid coordinates received');
        }

        console.log('Geocoded address:', {
          searched: address,
          found: result.display_name,
          coordinates: location,
          addressDetails: result.address
        });

        // Get a more readable address name
        const addressName = result.display_name ||
          (result.address ?
            `${result.address.road || ''} ${result.address.house_number || ''}, ${result.address.city || result.address.town || result.address.village || ''}, ${result.address.state || ''} ${result.address.postcode || ''}`.trim()
            : address);

        setUserLocation(location);
        setCurrentLocationName(addressName);
        setLocationPermission('granted');
        setSearchingAddress(false);
        processStoresWithLocation(location);
        toast.success(`Found stores near ${addressName.split(',')[0]}`);
        setAddressSearch(''); // Clear search after success
      } else {
        setSearchingAddress(false);
        setLocationError('Address not found. Please try a more specific address (e.g., "123 Main St, City, State" or "City, State").');
        toast.error('Address not found. Try a more specific address.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSearchingAddress(false);
      setLocationError('Failed to search address. Please check your internet connection and try again.');
      toast.error('Failed to search address');
    }
  };

  // Get user's location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationPermission('denied');
      // Use default location (Springfield, MA) as fallback
      const defaultLocation = { lat: 42.1015, lng: -72.5898 };
      setUserLocation(defaultLocation);
      setCurrentLocationName('Springfield, MA');
      processStoresWithLocation(defaultLocation);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Reverse geocode to get address name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`,
            {
              headers: {
                'User-Agent': 'Family-Housing-Hub/1.0'
              }
            }
          );
          const data = await response.json();
          if (data && data.display_name) {
            setCurrentLocationName(data.display_name);
          }
        } catch (e) {
          console.warn('Reverse geocoding failed:', e);
        }

        setUserLocation(location);
        setLocationPermission('granted');
        setLocationLoading(false);
        processStoresWithLocation(location);
        toast.success('Location detected! Showing nearest stores.');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationLoading(false);

        let errorMessage = 'Failed to get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access or search for an address.';
            setLocationPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }

        setLocationError(errorMessage);
        // Use default location as fallback
        const defaultLocation = { lat: 42.1015, lng: -72.5898 };
        setUserLocation(defaultLocation);
        setCurrentLocationName('Springfield, MA');
        processStoresWithLocation(defaultLocation);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  // Generate store coordinates near the user's location
  const generateStoreCoordinates = (userLocation) => {
    console.log('Generating stores near location:', userLocation);

    // Generate stores in a radius around the user's location
    // Each store is placed at a random angle and distance (0.3 to 4.5 miles)
    const stores = [];
    const baseLat = userLocation.lat;
    const baseLng = userLocation.lng;

    // Convert miles to degrees (approximate: 1 degree ≈ 69 miles)
    const milesToDegrees = 1 / 69;

    for (let i = 0; i < 15; i++) {
      // Random angle in radians - spread evenly in a circle
      const angle = (Math.PI * 2 * i) / 15 + (Math.random() * 0.2 - 0.1); // Spread evenly with slight randomness
      // Distance between 0.3 and 4.5 miles - increasing with index
      const distanceMiles = 0.3 + (i * 0.28) + (Math.random() * 0.2);
      const distanceDegrees = distanceMiles * milesToDegrees;

      // Calculate new coordinates using proper lat/lng distance calculation
      const lat = baseLat + (distanceDegrees * Math.cos(angle));
      // Adjust longitude for latitude (longitude lines get closer at higher latitudes)
      const lng = baseLng + (distanceDegrees * Math.sin(angle) / Math.cos(baseLat * Math.PI / 180));

      stores.push({ lat, lng, distanceMiles });
    }

    console.log('Generated store coordinates:', stores.slice(0, 3)); // Log first 3 for debugging
    return stores;
  };

  // Process stores with user location to calculate real distances
  const processStoresWithLocation = useCallback((location) => {
    if (!location) {
      console.warn('processStoresWithLocation called without location');
      return;
    }

    console.log('Processing stores for location:', location);

    // Generate store coordinates near the user's searched location
    const storeCoordinates = generateStoreCoordinates(location);

    const processedStores = mockStores.map((store, index) => {
      const storeCoord = storeCoordinates[index];
      const distance = calculateDistance(
        location.lat,
        location.lng,
        storeCoord.lat,
        storeCoord.lng
      );

      return {
        ...store,
        distance: formatDistance(distance),
        distanceMiles: distance,
        coordinates: storeCoord
      };
    });

    // Sort by distance
    processedStores.sort((a, b) => a.distanceMiles - b.distanceMiles);

    console.log('Processed stores (first 3):', processedStores.slice(0, 3).map(s => ({
      name: s.name,
      distance: s.distance,
      distanceMiles: s.distanceMiles.toFixed(2)
    })));

    setStores(processedStores);
    setSelectedStore(processedStores[0]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Request location on component mount
    getUserLocation();
  }, [getUserLocation]);

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
            {/* Location Status */}
            <div className="space-y-2">
              {locationLoading && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Detecting your location...</span>
                </div>
              )}

              {userLocation && !locationLoading && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <MapPin className="h-4 w-4" />
                  <span>Location detected • Sorted by distance</span>
                </div>
              )}

              {locationError && locationPermission === 'denied' && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-300 mb-2">{locationError}</p>
                  <button
                    onClick={handleRetryLocation}
                    className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
                  >
                    Try again
                  </button>
                </div>
              )}

              {locationPermission === 'prompt' && !locationLoading && !userLocation && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                    Allow location access to see stores near you
                  </p>
                  <button
                    onClick={getUserLocation}
                    className="text-xs text-blue-700 dark:text-blue-400 hover:underline font-medium"
                  >
                    Enable location
                  </button>
                </div>
              )}

              {!locationLoading && !userLocation && !locationError && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>Sorted by distance</span>
                </div>
              )}
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
                  className={`w-full p-4 cursor-pointer transition-all text-left ${selectedStore?.id === store.id
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
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedStore.name}</h2>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{selectedStore.address}</span>
                  </p>
                  {selectedStore.phone && (
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <a href={`tel:${selectedStore.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        {selectedStore.phone}
                      </a>
                    </p>
                  )}
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
                    onClick={() => window.location.href = `tel:${selectedStore.phone}`}
                    className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors shadow-sm"
                    title={`Call ${selectedStore.phone}`}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${selectedStore.open ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
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

  // Receipt Scanner state
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptImagePreview, setReceiptImagePreview] = useState(null);
  const [processingReceipt, setProcessingReceipt] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedTotal, setExtractedTotal] = useState('');
  const [extractedStore, setExtractedStore] = useState('');
  const [extractedDate, setExtractedDate] = useState('');
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptHistory, setReceiptHistory] = useState([]);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [manualEntryMode, setManualEntryMode] = useState(false);

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
      loadReceiptHistory();
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

  // Load receipt history
  const loadReceiptHistory = async () => {
    try {
      // Use simpler query without orderBy to avoid index requirements
      const receiptsSnap = await getDocs(query(
        collection(db, 'receipts'),
        where('userId', '==', currentUser.uid)
      ));
      const receipts = receiptsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        purchaseDate: doc.data().purchaseDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      // Sort client-side by purchaseDate descending
      receipts.sort((a, b) => {
        const dateA = a.purchaseDate || a.createdAt || new Date(0);
        const dateB = b.purchaseDate || b.createdAt || new Date(0);
        return dateB - dateA;
      });
      setReceiptHistory(receipts);
    } catch (error) {
      console.error('Error loading receipt history:', error);
    }
  };

  // Convert image to base64
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process receipt with OCR using Gemini Vision API
  const processReceipt = async (imageFile) => {
    setProcessingReceipt(true);
    try {
      const imageBase64 = await imageToBase64(imageFile);
      const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!geminiApiKey) {
        // API key not configured - show helpful message and allow manual entry
        toast.success('Opening manual entry mode...', {
          duration: 2000,
          icon: '📝'
        });
        setManualEntryMode(true);
        setExtractedItems([]);
        setShowReceiptPreview(true);
        setProcessingReceipt(false);
        return;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

      const prompt = `You are an expert receipt OCR system. Analyze this receipt image and extract all information in the following JSON format:

{
  "storeName": "store name if visible, otherwise 'Unknown Store'",
  "purchaseDate": "date in YYYY-MM-DD format if visible, otherwise today's date",
  "total": "total amount as number (e.g., 45.67)",
  "items": [
    {
      "name": "item name",
      "quantity": "quantity as string (e.g., '2' or '1 lb')",
      "unit": "unit if available (e.g., 'lb', 'oz', 'each')",
      "price": "price as number (e.g., 5.99)"
    }
  ]
}

CRITICAL INSTRUCTIONS:
- Extract EVERY item from the receipt
- For each item, try to get: name, quantity, unit, and price
- If quantity is not visible, use "1" as default
- If unit is not visible, use "" (empty string)
- If price is not visible for an item, try to calculate it or use 0
- Extract the TOTAL amount from the receipt (look for "TOTAL", "AMOUNT DUE", "TOTAL DUE", etc.)
- Extract store name from header/top of receipt
- Extract date from receipt (look for date patterns)
- Return ONLY valid JSON, no additional text
- If you cannot read something clearly, use reasonable defaults but mark it clearly`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: imageFile.type || 'image/jpeg',
                  data: imageBase64
                }
              },
              { text: prompt }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = textResponse.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').trim();
      }

      const receiptData = JSON.parse(jsonText);

      // Process extracted data
      const items = receiptData.items || [];
      const processedItems = items.map((item, index) => ({
        id: `extracted-${index}`,
        name: item.name || 'Unknown Item',
        quantity: item.quantity || '1',
        unit: item.unit || '',
        price: String(item.price || 0),
        category: categorizeItem(item.name || ''),
        notes: 'From receipt scan',
        priority: 'medium'
      }));

      setExtractedItems(processedItems);
      setExtractedTotal(String(receiptData.total || 0));
      setExtractedStore(receiptData.storeName || 'Unknown Store');
      setExtractedDate(receiptData.purchaseDate || new Date().toISOString().split('T')[0]);
      setShowReceiptPreview(true);
      setManualEntryMode(false);

      toast.success(`Extracted ${processedItems.length} items from receipt!`);
    } catch (error) {
      console.error('Error processing receipt:', error);
      toast.success('Opening manual entry mode...', {
        duration: 2000,
        icon: '✏️'
      });
      setManualEntryMode(true);
      setExtractedItems([]);
      setExtractedTotal('');
      setExtractedStore('');
      setExtractedDate(new Date().toISOString().split('T')[0]);
      setShowReceiptPreview(true);
    } finally {
      setProcessingReceipt(false);
    }
  };

  // Categorize item based on name
  const categorizeItem = (itemName) => {
    const name = itemName.toLowerCase();
    if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('fruit') || name.includes('vegetable') || name.includes('lettuce') || name.includes('tomato')) {
      return 'produce';
    } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('butter') || name.includes('dairy')) {
      return 'dairy';
    } else if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish') || name.includes('meat')) {
      return 'meat';
    } else if (name.includes('bread') || name.includes('pasta') || name.includes('rice') || name.includes('cereal')) {
      return 'pantry';
    } else if (name.includes('soda') || name.includes('juice') || name.includes('water') || name.includes('drink')) {
      return 'beverages';
    } else if (name.includes('snack') || name.includes('chip') || name.includes('candy') || name.includes('cookie')) {
      return 'snacks';
    } else {
      return 'other';
    }
  };

  // Handle receipt image upload
  const handleReceiptImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file');
      return;
    }

    setReceiptImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera on mobile
    input.onchange = (e) => {
      handleReceiptImageUpload(e);
    };
    input.click();
  };

  // Handle receipt scan
  const handleScanReceipt = async () => {
    if (!receiptImage) {
      toast.error('Please select or capture a receipt image');
      return;
    }

    await processReceipt(receiptImage);
  };

  // Edit extracted item
  const handleEditExtractedItem = (index, field, value) => {
    const updated = [...extractedItems];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedItems(updated);
  };

  // Delete extracted item
  const handleDeleteExtractedItem = (index) => {
    const updated = extractedItems.filter((_, i) => i !== index);
    setExtractedItems(updated);
  };

  // Add new item to extracted items
  const handleAddExtractedItem = () => {
    setExtractedItems([
      ...extractedItems,
      {
        id: `extracted-${extractedItems.length}`,
        name: '',
        quantity: '1',
        unit: '',
        price: '0',
        category: 'other',
        notes: '',
        priority: 'medium'
      }
    ]);
    setEditingItemIndex(extractedItems.length);
  };

  // Confirm and save receipt
  const handleConfirmReceipt = async () => {
    if (extractedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate total from items if not provided
      let finalTotal = parseFloat(extractedTotal) || 0;
      if (finalTotal === 0) {
        finalTotal = extractedItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
      }

      // Save receipt to history
      const receiptRef = await addDoc(collection(db, 'receipts'), {
        userId: currentUser.uid,
        storeName: extractedStore || 'Unknown Store',
        purchaseDate: extractedDate ? new Date(extractedDate) : new Date(),
        totalCost: finalTotal,
        items: extractedItems,
        receiptImage: receiptImagePreview,
        createdAt: serverTimestamp()
      });

      // Save items to shopping list
      const batch = writeBatch(db);
      for (const item of extractedItems) {
        if (item.name.trim()) {
          const docRef = doc(collection(db, 'shoppingItems'));
          batch.set(docRef, {
            name: item.name,
            quantity: item.quantity || '1',
            unit: item.unit || '',
            category: item.category || 'other',
            notes: item.notes || 'From receipt scan',
            priority: item.priority || 'medium',
            price: item.price || '0',
            userId: currentUser.uid,
            checked: false,
            createdAt: serverTimestamp()
          });
        }
      }
      await batch.commit();

      toast.success(`Saved ${extractedItems.length} items from receipt!`);

      // Reset state
      setReceiptImage(null);
      setReceiptImagePreview(null);
      setExtractedItems([]);
      setExtractedTotal('');
      setExtractedStore('');
      setExtractedDate('');
      setShowReceiptPreview(false);
      setShowReceiptScanner(false);
      setManualEntryMode(false);

      // Reload data
      loadData();
      loadReceiptHistory();
    } catch (error) {
      console.error('Error saving receipt:', error);
      toast.error('Failed to save receipt');
    } finally {
      setSubmitting(false);
    }
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

          <button
            onClick={() => setShowReceiptScanner(true)}
            className="px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-xl font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Camera className="h-5 w-5" />
            Scan Receipt
          </button>

          <button
            onClick={() => setShowReceiptHistory(true)}
            className="px-4 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <ImageIcon className="h-5 w-5" />
            Receipt History
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

      {/* Categories & Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Spending by Category
          </h3>
          <div className="space-y-3">
            {(() => {
              const categorySpending = shoppingItems.reduce((acc, item) => {
                const category = item.category || 'other';
                const price = parseFloat(item.price) || 0;
                acc[category] = (acc[category] || 0) + price;
                return acc;
              }, {});

              const sortedCategories = Object.entries(categorySpending)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8);

              if (sortedCategories.length === 0) {
                return (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                    No spending data yet. Add items with prices to see category breakdown.
                  </p>
                );
              }

              const maxSpending = Math.max(...sortedCategories.map(([, amount]) => amount));

              return sortedCategories.map(([category, amount]) => {
                const categoryInfo = SHOPPING_CATEGORIES.find(c => c.id === category) || {
                  label: category.charAt(0).toUpperCase() + category.slice(1),
                  color: 'bg-gray-100 dark:bg-gray-700'
                };
                const percentage = maxSpending > 0 ? (amount / maxSpending) * 100 : 0;

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{categoryInfo.label}</span>
                      <span className="text-gray-900 dark:text-white font-semibold">${amount.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Receipt Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            Receipt Statistics
          </h3>
          <div className="space-y-4">
            {(() => {
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

              const weeklyReceipts = receiptHistory.filter(
                r => r.purchaseDate && new Date(r.purchaseDate) >= weekAgo
              );
              const monthlyReceipts = receiptHistory.filter(
                r => r.purchaseDate && new Date(r.purchaseDate) >= monthAgo
              );

              const weeklyTotal = weeklyReceipts.reduce((sum, r) => sum + (r.totalCost || 0), 0);
              const monthlyTotal = monthlyReceipts.reduce((sum, r) => sum + (r.totalCost || 0), 0);

              const topCategory = (() => {
                const categoryTotals = {};
                receiptHistory.forEach(receipt => {
                  receipt.items?.forEach(item => {
                    const category = item.category || 'other';
                    const price = parseFloat(item.price) || 0;
                    categoryTotals[category] = (categoryTotals[category] || 0) + price;
                  });
                });
                const sorted = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
                return sorted[0] ? SHOPPING_CATEGORIES.find(c => c.id === sorted[0][0])?.label || sorted[0][0] : 'N/A';
              })();

              return (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Week</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${weeklyTotal.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{weeklyReceipts.length} receipts</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">${monthlyTotal.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{monthlyReceipts.length} receipts</p>
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Top Category</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{topCategory}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Most spending category</p>
                  </div>
                  {receiptHistory.length > 0 && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total Receipts: <span className="font-semibold text-gray-900 dark:text-white">{receiptHistory.length}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Average Receipt: <span className="font-semibold text-gray-900 dark:text-white">
                          ${(receiptHistory.reduce((sum, r) => sum + (r.totalCost || 0), 0) / receiptHistory.length).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
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
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${selectedCategory === cat.id
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
                  className={`p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 ${item.checked ? 'bg-gray-50 dark:bg-gray-700/30' : ''
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleItemChecked(item.id, item.checked)}
                      className={`flex-shrink-0 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${item.checked
                        ? 'bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500 shadow-md'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500 hover:scale-110'
                        }`}
                    >
                      {item.checked && <Check className="h-4 w-4 text-white" />}
                    </button>
                    <div className={`p-3 rounded-xl ${SHOPPING_CATEGORIES.find(c => c.id === item.category)?.color || 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-lg ${item.checked ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
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
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
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
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
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
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
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
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
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
                  onChange={(e) => setItemForm({ ...itemForm, priority: e.target.value })}
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
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
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
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
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
          onAddMeal={async (ingredients) => {
            if (ingredients && Array.isArray(ingredients)) {
              // Add ingredients from image analysis to shopping list
              try {
                const batch = writeBatch(db);
                for (const ingredient of ingredients) {
                  const docRef = doc(collection(db, 'shoppingItems'));
                  batch.set(docRef, {
                    name: ingredient.name || '',
                    quantity: String(ingredient.quantity || '1'),
                    unit: ingredient.unit || '',
                    category: 'produce',
                    notes: ingredient.notes || 'From AI image scan',
                    priority: 'medium',
                    price: '',
                    userId: currentUser.uid,
                    checked: false,
                    createdAt: serverTimestamp()
                  });
                }
                await batch.commit();
                loadData();
                toast.success(`Added ${ingredients.length} ingredients to shopping list!`);
              } catch (error) {
                console.error('Error adding ingredients:', error);
                toast.error('Failed to add ingredients');
              }
            } else {
              toast.success('Meal planning feature coming soon!');
            }
          }}
          pantryItems={pantryItems}
        />
      )}

      {showNearbyStores && (
        <NearbyStores onClose={() => setShowNearbyStores(false)} />
      )}

      {/* Receipt Scanner Modal */}
      {showReceiptScanner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Camera className="h-6 w-6 text-green-600 dark:text-green-400" />
                  Receipt Scanner
                </h2>
                <button
                  onClick={() => {
                    setShowReceiptScanner(false);
                    setReceiptImage(null);
                    setReceiptImagePreview(null);
                    setExtractedItems([]);
                    setExtractedTotal('');
                    setExtractedStore('');
                    setExtractedDate('');
                    setShowReceiptPreview(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!showReceiptPreview ? (
                <>
                  <div className="text-center space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                      Take a photo of your receipt or upload an existing image
                    </p>

                    {receiptImagePreview ? (
                      <div className="space-y-4">
                        <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                          <img
                            src={receiptImagePreview}
                            alt="Receipt preview"
                            className="w-full max-h-96 object-contain"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setReceiptImage(null);
                              setReceiptImagePreview(null);
                            }}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                          >
                            Change Image
                          </button>
                          <button
                            onClick={handleScanReceipt}
                            disabled={processingReceipt}
                            className="flex-1 px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            {processingReceipt ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-5 w-5" />
                                Scan Receipt
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={handleCameraCapture}
                          className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-600 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex flex-col items-center gap-3"
                        >
                          <Camera className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Take Photo</span>
                        </button>
                        <label className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-600 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all flex flex-col items-center gap-3 cursor-pointer">
                          <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                          <span className="text-gray-700 dark:text-gray-300 font-medium">Upload Image</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleReceiptImageUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          {manualEntryMode
                            ? "📝 Manual Entry Mode: Add your receipt items below. Click 'Add Item' to get started!"
                            : 'Review the extracted items below. You can edit, delete, or add new items before saving.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={extractedStore}
                        onChange={(e) => setExtractedStore(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Store name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Purchase Date
                      </label>
                      <input
                        type="date"
                        value={extractedDate}
                        onChange={(e) => setExtractedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={extractedTotal}
                        onChange={(e) => setExtractedTotal(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
                      <button
                        onClick={handleAddExtractedItem}
                        className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {extractedItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No items extracted. Click "Add Item" to add manually.
                        </div>
                      ) : (
                        extractedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                          >
                            {editingItemIndex === index ? (
                              <div className="grid grid-cols-12 gap-2">
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleEditExtractedItem(index, 'name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Item name"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="text"
                                    value={item.quantity}
                                    onChange={(e) => handleEditExtractedItem(index, 'quantity', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Qty"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(e) => handleEditExtractedItem(index, 'unit', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Unit"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => handleEditExtractedItem(index, 'price', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                    placeholder="Price"
                                  />
                                </div>
                                <div className="col-span-1 flex gap-1">
                                  <button
                                    onClick={() => setEditingItemIndex(null)}
                                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExtractedItem(index)}
                                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 dark:text-white">{item.name || 'Unnamed Item'}</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {item.quantity} {item.unit} • ${item.price}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setEditingItemIndex(index)}
                                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowReceiptPreview(false);
                        setReceiptImage(null);
                        setReceiptImagePreview(null);
                        setExtractedItems([]);
                        setExtractedTotal('');
                        setExtractedStore('');
                        setExtractedDate('');
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmReceipt}
                      disabled={submitting || extractedItems.length === 0}
                      className="flex-1 px-4 py-3 bg-green-600 dark:bg-green-500 text-white rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 font-medium shadow-lg hover:shadow-xl"
                    >
                      {submitting ? 'Saving...' : 'Confirm & Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt History Modal */}
      {showReceiptHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  Receipt History
                </h2>
                <button
                  onClick={() => {
                    setShowReceiptHistory(false);
                    setSelectedReceipt(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedReceipt ? (
                <div className="space-y-6">
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    Back to History
                  </button>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Store</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedReceipt.storeName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Date</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {selectedReceipt.purchaseDate?.toLocaleDateString() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">${selectedReceipt.totalCost?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    {selectedReceipt.receiptImage && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img
                          src={selectedReceipt.receiptImage}
                          alt="Receipt"
                          className="w-full max-h-96 object-contain"
                        />
                      </div>
                    )}

                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Items</h3>
                      <div className="space-y-2">
                        {selectedReceipt.items?.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {item.quantity} {item.unit}
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-white">${item.price}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {receiptHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">No receipt history yet</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Scan your first receipt to get started!
                      </p>
                    </div>
                  ) : (
                    receiptHistory.map((receipt) => (
                      <div
                        key={receipt.id}
                        onClick={() => setSelectedReceipt(receipt)}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-all hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{receipt.storeName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {receipt.purchaseDate?.toLocaleDateString() || 'Unknown date'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-green-400">
                              ${receipt.totalCost?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {receipt.items?.length || 0} items
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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
