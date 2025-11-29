// src/pages/ShoppingMeals.jsx - Enhanced Shopping Lists & Meal Planning
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  Copy,
  Share2,
  Printer,
  Filter,
  Search,
  Star,
  Download,
  Upload,
  ChefHat,
  TrendingUp,
  BarChart3,
  Heart,
  BookOpen,
  Clock4,
  Target,
  Camera,
  Image as ImageIcon,
  Zap,
  Brain,
  Calculator,
  Scale,
  Thermometer,
  Bookmark,
  Eye,
  ShoppingBag,
  Truck,
  Wallet,
  PieChart,
  Crown,
  Award,
  MessageCircle,
  Mic,
  Volume2,
  VolumeX,
  Send
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
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useTheme } from '../contexts/ThemeContext';

// Enhanced shopping categories
const SHOPPING_CATEGORIES = [
  { id: 'produce', label: 'Produce', icon: Leaf, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
  { id: 'dairy', label: 'Dairy', icon: CircleDot, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { id: 'meat', label: 'Meat & Fish', icon: Utensils, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
  { id: 'bakery', label: 'Bakery', icon: UtensilsCrossed, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { id: 'frozen', label: 'Frozen', icon: Snowflake, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
  { id: 'pantry', label: 'Pantry', icon: Package, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
  { id: 'beverages', label: 'Beverages', icon: Coffee, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
  { id: 'other', label: 'Other', icon: ShoppingCart, color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600' }
];

// Enhanced meal types
const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, time: '7:00 AM', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
  { id: 'lunch', label: 'Lunch', icon: Sun, time: '12:00 PM', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' },
  { id: 'dinner', label: 'Dinner', icon: Moon, time: '6:00 PM', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300' },
  { id: 'snack', label: 'Snack', icon: Leaf, time: '', color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' }
];

// AI Suggested Meals with Images
const AI_SUGGESTED_MEALS = [
  {
    id: 1,
    name: "Mediterranean Bowl",
    type: "lunch",
    prepTime: "15 min",
    difficulty: "easy",
    calories: 420,
    ingredients: ["Quinoa", "Chickpeas", "Cucumber", "Tomatoes", "Feta Cheese", "Olive Oil"],
    aiScore: 95,
    tags: ["Healthy", "Vegetarian", "Quick"],
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    description: "A vibrant and nutritious bowl packed with Mediterranean flavors. Perfect for a healthy lunch that's both satisfying and quick to prepare."
  },
  {
    id: 2,
    name: "Teriyaki Salmon",
    type: "dinner",
    prepTime: "25 min",
    difficulty: "medium",
    calories: 380,
    ingredients: ["Salmon", "Soy Sauce", "Ginger", "Garlic", "Brown Sugar", "Green Onions"],
    aiScore: 92,
    tags: ["High Protein", "Omega-3", "Asian"],
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    description: "Tender salmon glazed with a sweet and savory teriyaki sauce. Rich in omega-3 fatty acids and protein, perfect for a nutritious dinner."
  },
  {
    id: 3,
    name: "Avocado Toast",
    type: "breakfast",
    prepTime: "10 min",
    difficulty: "easy",
    calories: 280,
    ingredients: ["Whole Grain Bread", "Avocado", "Eggs", "Chili Flakes", "Lemon Juice"],
    aiScore: 88,
    tags: ["Quick", "Vegetarian", "Healthy Fats"],
    image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop",
    description: "A modern breakfast classic featuring creamy avocado on whole grain toast. Quick, healthy, and delicious - perfect for busy mornings."
  },
  {
    id: 4,
    name: "Vegetable Stir Fry",
    type: "dinner",
    prepTime: "20 min",
    difficulty: "easy",
    calories: 320,
    ingredients: ["Broccoli", "Bell Peppers", "Carrots", "Tofu", "Soy Sauce", "Sesame Oil"],
    aiScore: 90,
    tags: ["Vegan", "Quick", "Low Calorie"],
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
    description: "A colorful mix of fresh vegetables stir-fried to perfection. Light, healthy, and packed with nutrients - ideal for a quick weeknight dinner."
  },
  {
    id: 5,
    name: "Grilled Chicken Salad",
    type: "lunch",
    prepTime: "20 min",
    difficulty: "easy",
    calories: 350,
    ingredients: ["Chicken Breast", "Mixed Greens", "Cherry Tomatoes", "Cucumber", "Olive Oil", "Lemon"],
    aiScore: 93,
    tags: ["High Protein", "Low Carb", "Fresh"],
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    description: "Fresh mixed greens topped with perfectly grilled chicken. A protein-packed lunch that keeps you energized throughout the day."
  },
  {
    id: 6,
    name: "Pasta Primavera",
    type: "dinner",
    prepTime: "30 min",
    difficulty: "medium",
    calories: 450,
    ingredients: ["Pasta", "Zucchini", "Bell Peppers", "Cherry Tomatoes", "Parmesan", "Basil"],
    aiScore: 89,
    tags: ["Vegetarian", "Comfort Food", "Italian"],
    image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
    description: "Fresh spring vegetables tossed with pasta in a light sauce. A comforting and colorful dish that celebrates seasonal produce."
  }
];

// Days of week
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ShoppingMeals() {
  const { currentUser } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('shopping');
  const [loading, setLoading] = useState(true);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [meals, setMeals] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showImportExport, setShowImportExport] = useState(false);
  const [bulkItems, setBulkItems] = useState('');
  const [budget, setBudget] = useState(200);
  const [currentSpending, setCurrentSpending] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Enhanced item form
  const [itemForm, setItemForm] = useState({
    name: '',
    quantity: '1',
    unit: '',
    category: 'produce',
    notes: '',
    priority: 'medium',
    price: '',
    image: null
  });

  // Enhanced meal form
  const [mealForm, setMealForm] = useState({
    name: '',
    type: 'dinner',
    date: new Date().toISOString().split('T')[0],
    servings: '4',
    ingredients: '',
    notes: '',
    prepTime: '',
    difficulty: 'medium',
    favorite: false,
    image: null,
    nutrition: {
      calories: '',
      protein: '',
      carbs: '',
      fats: ''
    }
  });

  // Get week start (Sunday)
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      let items = [];
      let mealsList = [];

      // Load shopping items
      try {
        const itemsSnap = await getDocs(query(
          collection(db, 'shoppingItems'), 
          where('userId', '==', currentUser.uid)
        ));
        items = itemsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
      } catch (err) {
        console.log('No shopping items yet:', err.code);
      }

      // Load meals
      try {
        const mealsSnap = await getDocs(query(
          collection(db, 'meals'), 
          where('userId', '==', currentUser.uid)
        ));
        mealsList = mealsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        }));
      } catch (err) {
        console.log('No meals yet:', err.code);
      }

      setShoppingItems(items);
      setMeals(mealsList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter shopping items
  const filteredItems = useMemo(() => {
    let items = shoppingItems;
    if (selectedCategory !== 'all') {
      items = items.filter(i => i.category === selectedCategory);
    }
    // Sort: unchecked first, then by category
    return items.sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.category.localeCompare(b.category);
    });
  }, [shoppingItems, selectedCategory]);

  // Get meals for current week
  const weekMeals = useMemo(() => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return meals.filter(m => {
      if (!m.date) return false;
      const mealDate = new Date(m.date);
      return mealDate >= currentWeekStart && mealDate < weekEnd;
    });
  }, [meals, currentWeekStart]);

  // Get meals for a specific day
  const getMealsForDay = (dayIndex) => {
    const targetDate = new Date(currentWeekStart);
    targetDate.setDate(targetDate.getDate() + dayIndex);
    
    return weekMeals.filter(m => {
      const mealDate = new Date(m.date);
      return mealDate.toDateString() === targetDate.toDateString();
    });
  };

  // Enhanced shopping stats
  const shoppingStats = useMemo(() => {
    const total = shoppingItems.length;
    const checked = shoppingItems.filter(i => i.checked).length;
    const remaining = total - checked;
    const highPriority = shoppingItems.filter(i => i.priority === 'high' && !i.checked).length;
    const totalCost = shoppingItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    
    return { total, checked, remaining, highPriority, totalCost };
  }, [shoppingItems]);

  // Meal planning stats
  const mealStats = useMemo(() => {
    const total = meals.length;
    const thisWeek = weekMeals.length;
    const favorites = meals.filter(m => m.favorite).length;
    const breakfasts = meals.filter(m => m.type === 'breakfast').length;
    
    return { total, thisWeek, favorites, breakfasts };
  }, [meals, weekMeals]);

  // Handle add item with image upload
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name) {
      toast.error('Please enter item name');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = itemForm.image;
      if (itemForm.image instanceof File) {
        imageUrl = await uploadImage(itemForm.image);
      }

      const data = {
        userId: currentUser.uid,
        name: itemForm.name.trim(),
        quantity: itemForm.quantity,
        unit: itemForm.unit,
        category: itemForm.category,
        notes: itemForm.notes,
        priority: itemForm.priority || 'medium',
        price: itemForm.price || '',
        image: imageUrl,
        checked: editingItem ? editingItem.checked : false,
        createdAt: editingItem ? editingItem.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingItem) {
        await updateDoc(doc(db, 'shoppingItems', editingItem.id), data);
        toast.success('Item updated!');
      } else {
        await addDoc(collection(db, 'shoppingItems'), data);
        toast.success('Item added!');
      }

      await loadData();
      setShowAddItem(false);
      setEditingItem(null);
      resetItemForm();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add meal with image upload
  const handleAddMeal = async (e) => {
    e.preventDefault();
    if (!mealForm.name) {
      toast.error('Please enter meal name');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = mealForm.image;
      if (mealForm.image instanceof File) {
        imageUrl = await uploadImage(mealForm.image);
      }

      const data = {
        userId: currentUser.uid,
        name: mealForm.name.trim(),
        type: mealForm.type,
        date: Timestamp.fromDate(new Date(mealForm.date)),
        servings: parseInt(mealForm.servings) || 4,
        ingredients: mealForm.ingredients,
        notes: mealForm.notes,
        prepTime: mealForm.prepTime,
        difficulty: mealForm.difficulty,
        favorite: mealForm.favorite,
        image: imageUrl,
        nutrition: mealForm.nutrition,
        createdAt: editingMeal ? editingMeal.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingMeal) {
        await updateDoc(doc(db, 'meals', editingMeal.id), data);
        toast.success('Meal updated!');
      } else {
        await addDoc(collection(db, 'meals'), data);
        toast.success('Meal planned!');
      }

      await loadData();
      setShowAddMeal(false);
      setEditingMeal(null);
      resetMealForm();
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Failed to save meal');
    } finally {
      setSubmitting(false);
    }
  };

  // Add AI suggested meal (with calendar integration)
  const addAISuggestedMeal = async (meal, selectedDate = null) => {
    setSubmitting(true);
    try {
      const mealDate = selectedDate || new Date(mealForm.date);
      const mealTime = MEAL_TYPES.find(m => m.id === meal.type)?.time || '12:00 PM';
      
      // Add meal to meals collection
      await addDoc(collection(db, 'meals'), {
        userId: currentUser.uid,
        name: meal.name,
        type: meal.type,
        date: Timestamp.fromDate(mealDate),
        servings: 4,
        ingredients: meal.ingredients.join('\n'),
        prepTime: meal.prepTime,
        difficulty: meal.difficulty,
        favorite: false,
        image: meal.image || null,
        description: meal.description || '',
        nutrition: {
          calories: meal.calories.toString(),
          protein: '',
          carbs: '',
          fats: ''
        },
        createdAt: serverTimestamp()
      });

      // Also add to calendar as an event
      const eventDate = new Date(mealDate);
      const [time, period] = mealTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      eventDate.setHours(hour, parseInt(minutes) || 0, 0, 0);

      await addDoc(collection(db, 'events'), {
        userId: currentUser.uid,
        title: `${meal.name} - ${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}`,
        type: 'family',
        date: Timestamp.fromDate(eventDate),
        startTime: mealTime,
        endTime: '',
        location: 'Home',
        description: meal.description || `Meal: ${meal.name}\nPrep Time: ${meal.prepTime}\nDifficulty: ${meal.difficulty}\nCalories: ${meal.calories}`,
        assignedTo: '',
        reminder: true,
        allDay: false,
        createdAt: serverTimestamp()
      });

      toast.success('AI meal added to plan and calendar! 🚀');
      await loadData();
    } catch (error) {
      console.error('Error saving AI meal:', error);
      toast.error('Failed to save meal');
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize chat with welcome message
  useEffect(() => {
    if (showAIChat && chatMessages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'assistant',
        content: `👋 Hi! I'm your AI Meal Assistant. I can help you with:

🍽️ **Meal Ideas** - Get personalized meal suggestions
📝 **Recipes** - Detailed cooking instructions
🥗 **Nutrition** - Nutritional information and health tips
📅 **Meal Planning** - Weekly meal planning strategies
💰 **Budget-Friendly** - Affordable meal options

**Try asking:**
• "Quick healthy meals for dinner"
• "Vegetarian meal ideas"
• "Low calorie breakfast options"
• "Meal prep tips for the week"

You can also upload images of food or ingredients, and I'll help you create meals from them!`,
        timestamp: new Date()
      };
      setChatMessages([welcomeMessage]);
    }
  }, [showAIChat]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // AI Meal Response Generator
  const generateMealResponse = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    
    // Check if query matches any AI suggested meals
    const matchingMeal = AI_SUGGESTED_MEALS.find(meal => 
      meal.name.toLowerCase().includes(lowerQuery) ||
      meal.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      meal.type.toLowerCase().includes(lowerQuery)
    );

    if (matchingMeal) {
      return {
        content: `Here's a great meal suggestion for you:\n\n**${matchingMeal.name}**\n\n${matchingMeal.description}\n\n**Prep Time:** ${matchingMeal.prepTime}\n**Difficulty:** ${matchingMeal.difficulty}\n**Calories:** ${matchingMeal.calories}\n\n**Ingredients:**\n${matchingMeal.ingredients.map(ing => `• ${ing}`).join('\n')}\n\n**Tags:** ${matchingMeal.tags.join(', ')}\n\nWould you like me to add this to your meal plan?`,
        mealSuggestion: matchingMeal,
        image: matchingMeal.image
      };
    }

    // Generate meal suggestions based on query
    if (lowerQuery.includes('quick') || lowerQuery.includes('fast') || lowerQuery.includes('easy')) {
      const quickMeals = AI_SUGGESTED_MEALS.filter(m => m.difficulty === 'easy' && parseInt(m.prepTime) <= 20);
      const selected = quickMeals[Math.floor(Math.random() * quickMeals.length)] || AI_SUGGESTED_MEALS[0];
      return {
        content: `Here's a quick and easy meal idea:\n\n**${selected.name}**\n\n${selected.description}\n\n**Prep Time:** ${selected.prepTime}\n**Difficulty:** ${selected.difficulty}\n**Calories:** ${selected.calories}\n\n**Ingredients:**\n${selected.ingredients.map(ing => `• ${ing}`).join('\n')}\n\nWould you like to add this to your meal plan?`,
        mealSuggestion: selected,
        image: selected.image
      };
    }

    if (lowerQuery.includes('vegetarian') || lowerQuery.includes('vegan')) {
      const vegMeals = AI_SUGGESTED_MEALS.filter(m => m.tags.some(t => t.toLowerCase().includes('vegetarian') || t.toLowerCase().includes('vegan')));
      const selected = vegMeals[Math.floor(Math.random() * vegMeals.length)] || AI_SUGGESTED_MEALS[2];
      return {
        content: `Here's a great vegetarian option:\n\n**${selected.name}**\n\n${selected.description}\n\n**Prep Time:** ${selected.prepTime}\n**Difficulty:** ${selected.difficulty}\n**Calories:** ${selected.calories}\n\n**Ingredients:**\n${selected.ingredients.map(ing => `• ${ing}`).join('\n')}\n\nWould you like to add this to your meal plan?`,
        mealSuggestion: selected,
        image: selected.image
      };
    }

    if (lowerQuery.includes('healthy') || lowerQuery.includes('nutritious')) {
      const healthyMeals = AI_SUGGESTED_MEALS.filter(m => m.tags.some(t => t.toLowerCase().includes('healthy')));
      const selected = healthyMeals[Math.floor(Math.random() * healthyMeals.length)] || AI_SUGGESTED_MEALS[0];
      return {
        content: `Here's a nutritious meal suggestion:\n\n**${selected.name}**\n\n${selected.description}\n\n**Prep Time:** ${selected.prepTime}\n**Difficulty:** ${selected.difficulty}\n**Calories:** ${selected.calories}\n\n**Ingredients:**\n${selected.ingredients.map(ing => `• ${ing}`).join('\n')}\n\nWould you like to add this to your meal plan?`,
        mealSuggestion: selected,
        image: selected.image
      };
    }

    // Default response
    const randomMeal = AI_SUGGESTED_MEALS[Math.floor(Math.random() * AI_SUGGESTED_MEALS.length)];
    return {
      content: `Here's a meal suggestion for you:\n\n**${randomMeal.name}**\n\n${randomMeal.description}\n\n**Prep Time:** ${randomMeal.prepTime}\n**Difficulty:** ${randomMeal.difficulty}\n**Calories:** ${randomMeal.calories}\n\n**Ingredients:**\n${randomMeal.ingredients.map(ing => `• ${ing}`).join('\n')}\n\n**Tags:** ${randomMeal.tags.join(', ')}\n\nWould you like to add this to your meal plan?`,
      mealSuggestion: randomMeal,
      image: randomMeal.image
    };
  }, []);

  // Handle chat send
  const handleChatSend = useCallback(async (text = null) => {
    const query = (text || chatInput).trim();
    const hasImages = uploadedImages.length > 0;
    
    if (!query && !hasImages) return;

    setIsTyping(true);

    // Add user message
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: query || 'Sent an image',
      timestamp: new Date(),
      images: uploadedImages.map(img => img.url)
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setUploadedImages([]);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Analyze image if provided
    let imageAnalysis = '';
    if (hasImages) {
      imageAnalysis = 'I can see the image you shared. Based on the ingredients/food shown, ';
    }

    // Generate AI response
    const aiResponse = generateMealResponse(query || 'meal suggestion');
    
    const assistantMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: imageAnalysis + aiResponse.content,
      timestamp: new Date(),
      mealSuggestion: aiResponse.mealSuggestion,
      image: aiResponse.image
    };

    setChatMessages(prev => [...prev, assistantMessage]);

    // Text-to-speech
    if (!isMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(aiResponse.content.replace(/\*\*/g, '').replace(/\n/g, ' '));
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }

    setIsTyping(false);
  }, [chatInput, uploadedImages, generateMealResponse, isMuted]);

  // Speech-to-text
  const handleStartRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in your browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    recognition.onstart = () => {
      setIsRecording(true);
      toast.success('Listening...');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(transcript);
      recognition.stop();
      setIsRecording(false);
      handleChatSend(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Speech recognition error');
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isRecording, handleChatSend]);

  // Image upload handler
  const handleImageUpload = (e, setForm) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setForm(prev => ({ ...prev, image: file }));
    }
  };

  // Toggle item checked
  const toggleItemChecked = async (item) => {
    try {
      await updateDoc(doc(db, 'shoppingItems', item.id), {
        checked: !item.checked
      });
      await loadData();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  // Delete item
  const handleDeleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'shoppingItems', id));
      await loadData();
      toast.success('Item removed');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  // Delete meal
  const handleDeleteMeal = async (id) => {
    try {
      await deleteDoc(doc(db, 'meals', id));
      await loadData();
      toast.success('Meal removed');
    } catch (error) {
      toast.error('Failed to delete meal');
    }
  };

  // Clear checked items
  const clearCheckedItems = async () => {
    if (!window.confirm('Remove all checked items?')) return;
    
    try {
      const checkedItems = shoppingItems.filter(i => i.checked);
      await Promise.all(
        checkedItems.map(item => deleteDoc(doc(db, 'shoppingItems', item.id)))
      );
      await loadData();
      toast.success('Checked items cleared');
    } catch (error) {
      toast.error('Failed to clear items');
    }
  };

  // Add ingredients to shopping list
  const addIngredientsToList = async (meal) => {
    if (!meal.ingredients) {
      toast.error('No ingredients to add');
      return;
    }

    const ingredients = meal.ingredients.split('\n').filter(i => i.trim());
    
    try {
      await Promise.all(
        ingredients.map(ingredient =>
          addDoc(collection(db, 'shoppingItems'), {
            userId: currentUser.uid,
            name: ingredient.trim(),
            quantity: '1',
            unit: '',
            category: 'produce',
            notes: `For: ${meal.name}`,
            checked: false,
            createdAt: serverTimestamp()
          })
        )
      );
      await loadData();
      toast.success(`${ingredients.length} items added to shopping list`);
    } catch (error) {
      toast.error('Failed to add ingredients');
    }
  };

  // Navigate weeks
  const goToPrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!bulkItems.trim()) {
      toast.error('Please enter items to import');
      return;
    }

    const items = bulkItems.split('\n').filter(item => item.trim());
    
    try {
      const batch = writeBatch(db);
      items.forEach(item => {
        const docRef = doc(collection(db, 'shoppingItems'));
        batch.set(docRef, {
          userId: currentUser.uid,
          name: item.trim(),
          quantity: '1',
          unit: '',
          category: 'other',
          checked: false,
          priority: 'medium',
          createdAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      await loadData();
      setShowImportExport(false);
      setBulkItems('');
      toast.success(`${items.length} items imported!`);
    } catch (error) {
      toast.error('Failed to import items');
    }
  };

  const exportShoppingList = () => {
    const data = shoppingItems.map(item => 
      `${item.checked ? '[✓]' : '[ ]'} ${item.quantity} ${item.unit} ${item.name}${item.notes ? ` (${item.notes})` : ''}`
    ).join('\n');
    
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Shopping list exported!');
  };

  // Reset forms
  const resetItemForm = () => {
    setItemForm({ name: '', quantity: '1', unit: '', category: 'produce', notes: '', priority: 'medium', price: '', image: null });
  };

  const resetMealForm = () => {
    setMealForm({ 
      name: '', 
      type: 'dinner', 
      date: new Date().toISOString().split('T')[0], 
      servings: '4', 
      ingredients: '', 
      notes: '',
      prepTime: '',
      difficulty: 'medium',
      favorite: false,
      image: null,
      nutrition: {
        calories: '',
        protein: '',
        carbs: '',
        fats: ''
      }
    });
  };

  // Start editing item
  const startEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      notes: item.notes || '',
      priority: item.priority || 'medium',
      price: item.price || '',
      image: item.image || null
    });
    setShowAddItem(true);
  };

  // Start editing meal
  const startEditMeal = (meal) => {
    setEditingMeal(meal);
    const mealDate = meal.date instanceof Date ? meal.date : meal.date?.toDate ? meal.date.toDate() : new Date(meal.date);
    setMealForm({
      name: meal.name,
      type: meal.type,
      date: mealDate.toISOString().split('T')[0],
      servings: meal.servings?.toString() || '4',
      ingredients: meal.ingredients || '',
      notes: meal.notes || '',
      prepTime: meal.prepTime || '',
      difficulty: meal.difficulty || 'medium',
      favorite: meal.favorite || false,
      image: meal.image || null,
      nutrition: meal.nutrition || {
        calories: '',
        protein: '',
        carbs: '',
        fats: ''
      }
    });
    setShowAddMeal(true);
  };

  // Get category info
  const getCategoryInfo = (categoryId) => {
    return SHOPPING_CATEGORIES.find(c => c.id === categoryId) || SHOPPING_CATEGORIES[SHOPPING_CATEGORIES.length - 1];
  };

  // Get meal type info
  const getMealType = (typeId) => {
    return MEAL_TYPES.find(t => t.id === typeId) || MEAL_TYPES[2];
  };

  // Format week range
  const formatWeekRange = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
              {activeTab === 'shopping' ? (
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              ) : (
                <UtensilsCrossed className="h-8 w-8 text-orange-600" />
              )}
            </div>
            {activeTab === 'shopping' ? 'Shopping List' : 'Meal Planner'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {activeTab === 'shopping' 
              ? 'Organize your grocery shopping' 
              : 'Plan meals for the week'}
          </p>
        </div>
        {/* Budget Tracker */}
        {activeTab === 'shopping' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Budget</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">${currentSpending.toFixed(2)}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">${budget}</span>
                </div>
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className={`h-2 rounded-full ${
                      (currentSpending / budget) > 0.8 ? 'bg-red-500' : 
                      (currentSpending / budget) > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((currentSpending / budget) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'shopping' ? 'bg-white dark:bg-gray-800 shadow text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <ShoppingCart className="h-4 w-4 inline mr-2" />
              Shopping
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'meals' ? 'bg-white dark:bg-gray-800 shadow text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4 inline mr-2" />
              Meals
            </button>
          </div>
          
          <div className="flex gap-3">
            {activeTab === 'shopping' && (
              <button
                onClick={() => setShowImportExport(true)}
                className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Import/Export
              </button>
            )}
            <button
              onClick={() => activeTab === 'shopping' ? setShowAddItem(true) : setShowAddMeal(true)}
              className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-200"
            >
              <Plus className="h-5 w-5" />
              <span>Add {activeTab === 'shopping' ? 'Item' : 'Meal'}</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'shopping' ? (
        /* Shopping List View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats */}
          <div className="lg:col-span-4 grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{shoppingStats.total}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
                  <p className="text-3xl font-bold text-orange-600">{shoppingStats.remaining}</p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{shoppingStats.checked}</p>
                </div>
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Enhanced Category Filter with Search */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Categories</h3>
                <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === 'all' 
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  All Items
                </button>
                {SHOPPING_CATEGORIES.map((cat) => {
                  const count = shoppingItems.filter(i => i.category === cat.id && !i.checked).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedCategory === cat.id ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <cat.icon className="h-4 w-4" />
                        {cat.label}
                      </span>
                      {count > 0 && (
                        <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {shoppingStats.checked > 0 && (
                <button
                  onClick={clearCheckedItems}
                  className="w-full mt-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Checked Items
                </button>
              )}
              
              <button
                onClick={exportShoppingList}
                className="w-full mt-3 py-2 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  Clear Checked Items
                </button>
              )}
            </div>
          </div>

          {/* Shopping Items */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {selectedCategory === 'all' ? 'All Items' : getCategoryInfo(selectedCategory).label}
                </h2>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const category = getCategoryInfo(item.category);
                    const CategoryIcon = category.icon;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 flex items-center gap-4 border-l-4 group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          item.checked ? 'opacity-60' : ''
                        } ${
                          item.priority === 'high' ? 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10' :
                          item.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10' :
                          'border-l-green-500 bg-green-50/50 dark:bg-green-900/10'
                        }`}
                      >
                        <button
                          onClick={() => toggleItemChecked(item)}
                          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                            item.checked
                              ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600 text-white shadow-sm'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 bg-white dark:bg-gray-700'
                          }`}
                        >
                          {item.checked && <Check className="h-4 w-4" />}
                        </button>

                        {/* Item Image */}
                        {item.image && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className={`p-2 rounded-xl ${category.color} border flex-shrink-0`}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${
                            item.checked ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.quantity} {item.unit} {item.notes && `• ${item.notes}`}
                          </p>
                          {item.price && (
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                              ${parseFloat(item.price).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditItem(item)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Edit item"
                          >
                            <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No items in your list</p>
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700"
                    >
                      Add First Item
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Meal Planner View */
        <div>
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={goToPrevWeek}
                className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{formatWeekRange()}</h2>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition-colors"
            >
              This Week
            </button>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-4">
            {DAYS.map((day, index) => {
              const dayDate = new Date(currentWeekStart);
              dayDate.setDate(dayDate.getDate() + index);
              const dayMeals = getMealsForDay(index);
              const isToday = dayDate.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border-2 overflow-hidden transition-all hover:shadow-md ${
                    isToday ? 'border-orange-500 dark:border-orange-400 shadow-lg' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className={`p-3 text-center ${
                    isToday ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <p className="font-medium text-sm uppercase tracking-wide">{day.slice(0, 3)}</p>
                    <p className={`text-lg font-bold ${isToday ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {dayDate.getDate()}
                    </p>
                  </div>

                  <div className="p-2 space-y-2 min-h-[200px]">
                    {dayMeals.length > 0 ? (
                      dayMeals.map((meal) => {
                        const mealType = getMealType(meal.type);
                        const MealIcon = mealType.icon;

                        return (
                          <div
                            key={meal.id}
                            className="p-2 bg-orange-50 rounded-lg group relative"
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <MealIcon className="h-3 w-3 text-orange-600" />
                              <span className="text-xs text-orange-600 capitalize">{meal.type}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">{meal.name}</p>
                            
                            <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                              <button
                                onClick={() => startEditMeal(meal)}
                                className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                title="Edit meal"
                              >
                                <Edit3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </button>
                              {meal.ingredients && (
                                <button
                                  onClick={() => addIngredientsToList(meal)}
                                  className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                  title="Add to shopping list"
                                >
                                  <ShoppingCart className="h-3 w-3 text-green-600 dark:text-green-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMeal(meal.id)}
                                className="p-1 bg-white dark:bg-gray-800 rounded shadow hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                title="Delete"
                              >
                                <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <button
                        onClick={() => {
                          setMealForm(prev => ({
                            ...prev,
                            date: dayDate.toISOString().split('T')[0]
                          }));
                          setShowAddMeal(true);
                        }}
                        className="w-full h-full min-h-[50px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Meal Suggestions */}
          <div className="mt-8 bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-pink-50 dark:to-pink-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">AI Meal Suggestions</h3>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">Personalized recommendations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAIChat(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600 transition-all shadow-lg"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat with AI
                </button>
                <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full border border-purple-200 dark:border-purple-800">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Powered</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {AI_SUGGESTED_MEALS.map((meal) => (
                <div key={meal.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all group">
                  {/* Meal Image */}
                  {meal.image && (
                    <div className="relative h-40 overflow-hidden">
                      <img 
                        src={meal.image} 
                        alt={meal.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 dark:bg-gray-700 text-white px-2 py-1 rounded-full text-xs">
                        <Crown className="h-3 w-3 text-yellow-400" />
                        {meal.aiScore}%
                      </div>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{meal.name}</h4>
                      {!meal.image && (
                        <div className="flex items-center gap-1 bg-black/70 dark:bg-gray-700 text-white px-2 py-1 rounded-full text-xs">
                          <Crown className="h-3 w-3 text-yellow-400" />
                          {meal.aiScore}%
                        </div>
                      )}
                    </div>
                    
                    {meal.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{meal.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock4 className="h-3 w-3" />
                        {meal.prepTime}
                      </span>
                      <span className={`px-2 py-1 rounded-full ${
                        meal.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        meal.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {meal.difficulty}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {meal.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => addAISuggestedMeal(meal)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-700 dark:to-pink-700 text-white py-2 rounded-lg text-sm font-medium hover:from-purple-700 hover:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add to Plan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Meal Ideas */}
          <div className="mt-6 bg-gradient-to-r from-orange-50 dark:from-orange-900/20 to-amber-50 dark:to-amber-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Quick Meal Ideas</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Grilled Chicken Salad', 'Pasta Primavera', 'Fish Tacos', 'Stir Fry Vegetables', 
                'Homemade Pizza', 'Beef Stew', 'Chicken Curry', 'Vegetable Soup'].map((meal, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMealForm(prev => ({ ...prev, name: meal }));
                    setEditingMeal(null);
                    setShowAddMeal(true);
                  }}
                  className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-700 dark:hover:text-orange-300 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Add Item Modal with Image Upload */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingItem ? 'Edit Item' : 'Add New Item'}
                </h2>
                <button
                  onClick={() => { setShowAddItem(false); setEditingItem(null); resetItemForm(); }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Image</label>
                <div className="flex items-center gap-4">
                  {itemForm.image ? (
                    <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img 
                        src={itemForm.image instanceof File ? URL.createObjectURL(itemForm.image) : itemForm.image} 
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      id="item-image"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, setItemForm)}
                      className="hidden"
                    />
                    <label
                      htmlFor="item-image"
                      className="cursor-pointer bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      {itemForm.image ? 'Change Image' : 'Upload Image'}
                    </label>
                    {itemForm.image && (
                      <button
                        type="button"
                        onClick={() => setItemForm(prev => ({ ...prev, image: null }))}
                        className="ml-2 text-red-600 dark:text-red-400 text-sm hover:text-red-700 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                  placeholder="e.g., Organic Apples, 2% Milk, Whole Wheat Bread"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
                  <input
                    type="text"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                    placeholder="lbs, oz, pack"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={itemForm.priority}
                    onChange={(e) => setItemForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {SHOPPING_CATEGORIES.slice(0, 8).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setItemForm(prev => ({ ...prev, category: cat.id }))}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                        itemForm.category === cat.id
                          ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <cat.icon className={`h-4 w-4 ${itemForm.category === cat.id ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      <span className="text-xs mt-1 dark:text-gray-300">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
                <input
                  type="text"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                  placeholder="e.g., Organic, Ripe bananas, etc."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddItem(false); setEditingItem(null); resetItemForm(); }}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
                >
                  {uploadingImage ? 'Uploading...' : submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 dark:bg-gray-900 min-h-screen transition-colors duration-200 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan Meal</h2>
                <button
                  onClick={() => setShowAddMeal(false)}
                  className="p-2 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddMeal} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meal Name *</label>
                <input
                  type="text"
                  required
                  value={mealForm.name}
                  onChange={(e) => setMealForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Grilled Chicken with Rice"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meal Type</label>
                  <select
                    value={mealForm.type}
                    onChange={(e) => setMealForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                  >
                    {MEAL_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={mealForm.date}
                    onChange={(e) => setMealForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Servings</label>
                  <input
                    type="number"
                    value={mealForm.servings}
                    onChange={(e) => setMealForm(prev => ({ ...prev, servings: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prep Time</label>
                  <input
                    type="text"
                    value={mealForm.prepTime}
                    onChange={(e) => setMealForm(prev => ({ ...prev, prepTime: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                    placeholder="e.g., 30 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                  <select
                    value={mealForm.difficulty}
                    onChange={(e) => setMealForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Nutrition Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Nutrition Information (Optional)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Calories</label>
                    <input
                      type="number"
                      value={mealForm.nutrition.calories}
                      onChange={(e) => setMealForm(prev => ({
                        ...prev,
                        nutrition: { ...prev.nutrition, calories: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="Cal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={mealForm.nutrition.protein}
                      onChange={(e) => setMealForm(prev => ({
                        ...prev,
                        nutrition: { ...prev.nutrition, protein: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={mealForm.nutrition.carbs}
                      onChange={(e) => setMealForm(prev => ({
                        ...prev,
                        nutrition: { ...prev.nutrition, carbs: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="g"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Fats (g)</label>
                    <input
                      type="number"
                      value={mealForm.nutrition.fats}
                      onChange={(e) => setMealForm(prev => ({
                        ...prev,
                        nutrition: { ...prev.nutrition, fats: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                      placeholder="g"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ingredients (one per line - can add to shopping list later)
                </label>
                <textarea
                  value={mealForm.ingredients}
                  onChange={(e) => setMealForm(prev => ({ ...prev, ingredients: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-orange-500 resize-none placeholder-gray-400 dark:placeholder-gray-500"
                  rows={4}
                  placeholder="Chicken breast&#10;Rice&#10;Olive oil&#10;Garlic"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMeal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 disabled:opacity-50"
                >
                  {submitting ? 'Planning...' : 'Plan Meal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import/Export Shopping List</h2>
                <button
                  onClick={() => setShowImportExport(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Export Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Export Shopping List</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Download your shopping list as a JSON file to backup or share.
                </p>
                <button
                  onClick={exportShoppingList}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Export to JSON
                </button>
              </div>

              {/* Import Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Import Shopping List</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload a JSON file to restore your shopping list.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const data = JSON.parse(event.target.result);
                          if (Array.isArray(data)) {
                            handleBulkImport(data);
                          } else {
                            toast.error('Invalid file format');
                          }
                        } catch (error) {
                          toast.error('Failed to parse JSON file');
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="block w-full text-sm text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowImportExport(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Interface */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col shadow-2xl transition-colors duration-200">
            {/* Chat Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                  <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Meal Assistant</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get personalized meal ideas and recipes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={isMuted ? "Enable audio" : "Disable audio"}
                >
                  {isMuted ? <VolumeX className="h-5 w-5 text-gray-500 dark:text-gray-400" /> : <Volume2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />}
                </button>
                <button
                  onClick={() => {
                    setShowAIChat(false);
                    setChatMessages([]);
                    setChatInput('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-12">
                  <Brain className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Start a conversation!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Ask me about meal ideas, recipes, nutrition, or meal planning tips.</p>
                  <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                    {['Quick healthy meals', 'Vegetarian dinner ideas', 'Low calorie recipes', 'Meal prep tips'].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleChatSend(suggestion)}
                        className="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    {msg.type === 'assistant' && msg.image && (
                      <img src={msg.image} alt="Meal suggestion" className="w-full h-48 object-cover rounded-lg mb-3" />
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.type === 'assistant' && msg.mealSuggestion && (
                      <button
                        onClick={() => {
                          addAISuggestedMeal(msg.mealSuggestion);
                          toast.success('Meal added to plan and calendar!');
                        }}
                        className="mt-3 w-full bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="h-4 w-4 inline mr-2" />
                        Add to Plan
                      </button>
                    )}
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {uploadedImages.map((img) => (
                    <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <img src={img.url} alt="Upload" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  accept="image/*"
                  id="chat-image-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setUploadedImages(prev => [...prev, {
                          id: Date.now(),
                          url: event.target.result,
                          file: file
                        }]);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="chat-image-upload"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                  title="Upload image"
                >
                  <ImageIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </label>
                <button
                  onClick={handleStartRecording}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                  title="Voice input"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                  placeholder="Ask about meal ideas, recipes, or nutrition..."
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  onClick={() => handleChatSend()}
                  disabled={!chatInput.trim() && uploadedImages.length === 0}
                  className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
