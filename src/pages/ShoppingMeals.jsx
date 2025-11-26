// src/pages/ShoppingMeals.jsx - Shopping Lists & Meal Planning
import React, { useState, useEffect, useMemo } from 'react';
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
  Filter
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
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Shopping categories
const SHOPPING_CATEGORIES = [
  { id: 'produce', label: 'Produce', icon: Leaf, color: 'bg-green-100 text-green-700' },
  { id: 'dairy', label: 'Dairy', icon: CircleDot, color: 'bg-blue-100 text-blue-700' },
  { id: 'meat', label: 'Meat & Fish', icon: Utensils, color: 'bg-red-100 text-red-700' },
  { id: 'bakery', label: 'Bakery', icon: UtensilsCrossed, color: 'bg-amber-100 text-amber-700' },
  { id: 'frozen', label: 'Frozen', icon: Snowflake, color: 'bg-cyan-100 text-cyan-700' },
  { id: 'pantry', label: 'Pantry', icon: Package, color: 'bg-orange-100 text-orange-700' },
  { id: 'beverages', label: 'Beverages', icon: Coffee, color: 'bg-purple-100 text-purple-700' },
  { id: 'other', label: 'Other', icon: ShoppingCart, color: 'bg-gray-100 text-gray-700' }
];

// Meal types
const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: Coffee, time: '7:00 AM' },
  { id: 'lunch', label: 'Lunch', icon: Sun, time: '12:00 PM' },
  { id: 'dinner', label: 'Dinner', icon: Moon, time: '6:00 PM' },
  { id: 'snack', label: 'Snack', icon: Leaf, time: '' }
];

// Days of week
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ShoppingMeals() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('shopping');
  const [loading, setLoading] = useState(true);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [meals, setMeals] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [submitting, setSubmitting] = useState(false);

  // Item form
  const [itemForm, setItemForm] = useState({
    name: '',
    quantity: '1',
    unit: '',
    category: 'produce',
    notes: ''
  });

  // Meal form
  const [mealForm, setMealForm] = useState({
    name: '',
    type: 'dinner',
    date: new Date().toISOString().split('T')[0],
    servings: '4',
    ingredients: '',
    notes: ''
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

  // Shopping stats
  const shoppingStats = useMemo(() => {
    const total = shoppingItems.length;
    const checked = shoppingItems.filter(i => i.checked).length;
    const remaining = total - checked;
    return { total, checked, remaining };
  }, [shoppingItems]);

  // Handle add item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name) {
      toast.error('Please enter item name');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        userId: currentUser.uid,
        name: itemForm.name,
        quantity: itemForm.quantity,
        unit: itemForm.unit,
        category: itemForm.category,
        notes: itemForm.notes,
        checked: false,
        createdAt: serverTimestamp()
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

  // Handle add meal
  const handleAddMeal = async (e) => {
    e.preventDefault();
    if (!mealForm.name) {
      toast.error('Please enter meal name');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'meals'), {
        userId: currentUser.uid,
        name: mealForm.name,
        type: mealForm.type,
        date: Timestamp.fromDate(new Date(mealForm.date)),
        servings: parseInt(mealForm.servings) || 4,
        ingredients: mealForm.ingredients,
        notes: mealForm.notes,
        createdAt: serverTimestamp()
      });

      toast.success('Meal planned!');
      await loadData();
      setShowAddMeal(false);
      resetMealForm();
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Failed to save meal');
    } finally {
      setSubmitting(false);
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

  // Reset forms
  const resetItemForm = () => {
    setItemForm({ name: '', quantity: '1', unit: '', category: 'produce', notes: '' });
  };

  const resetMealForm = () => {
    setMealForm({ name: '', type: 'dinner', date: new Date().toISOString().split('T')[0], servings: '4', ingredients: '', notes: '' });
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
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
          <p className="text-gray-600 mt-1">
            {activeTab === 'shopping' 
              ? 'Organize your grocery shopping' 
              : 'Plan meals for the week'}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'shopping' ? 'bg-white shadow text-orange-600' : 'text-gray-600'
              }`}
            >
              <ShoppingCart className="h-4 w-4 inline mr-2" />
              Shopping
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'meals' ? 'bg-white shadow text-orange-600' : 'text-gray-600'
              }`}
            >
              <UtensilsCrossed className="h-4 w-4 inline mr-2" />
              Meals
            </button>
          </div>
          <button
            onClick={() => activeTab === 'shopping' ? setShowAddItem(true) : setShowAddMeal(true)}
            className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-200"
          >
            <Plus className="h-5 w-5" />
            <span>Add {activeTab === 'shopping' ? 'Item' : 'Meal'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'shopping' ? (
        /* Shopping List View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats */}
          <div className="lg:col-span-4 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Items</p>
                  <p className="text-3xl font-bold text-gray-900">{shoppingStats.total}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Remaining</p>
                  <p className="text-3xl font-bold text-orange-600">{shoppingStats.remaining}</p>
                </div>
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{shoppingStats.checked}</p>
                </div>
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedCategory === 'all' ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'
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
                        selectedCategory === cat.id ? 'bg-orange-100 text-orange-700' : 'hover:bg-gray-100'
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
                  className="w-full mt-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm"
                >
                  Clear Checked Items
                </button>
              )}
            </div>
          </div>

          {/* Shopping Items */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">
                  {selectedCategory === 'all' ? 'All Items' : getCategoryInfo(selectedCategory).label}
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const category = getCategoryInfo(item.category);
                    const CategoryIcon = category.icon;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 flex items-center gap-4 ${item.checked ? 'bg-gray-50' : ''}`}
                      >
                        <button
                          onClick={() => toggleItemChecked(item)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            item.checked
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {item.checked && <Check className="h-4 w-4" />}
                        </button>

                        <div className={`p-2 rounded-lg ${category.color}`}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1">
                          <p className={`font-medium ${item.checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.quantity} {item.unit} {item.notes && `• ${item.notes}`}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center">
                    <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No items in your list</p>
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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">{formatWeekRange()}</h2>
              <button
                onClick={goToNextWeek}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className={`bg-white rounded-2xl border-2 overflow-hidden ${
                    isToday ? 'border-orange-500' : 'border-gray-200'
                  }`}
                >
                  <div className={`p-3 ${isToday ? 'bg-orange-500 text-white' : 'bg-gray-50'}`}>
                    <p className="font-medium text-center">{day.slice(0, 3)}</p>
                    <p className={`text-center text-sm ${isToday ? 'text-orange-100' : 'text-gray-500'}`}>
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
                              {meal.ingredients && (
                                <button
                                  onClick={() => addIngredientsToList(meal)}
                                  className="p-1 bg-white rounded shadow hover:bg-green-100"
                                  title="Add to shopping list"
                                >
                                  <ShoppingCart className="h-3 w-3 text-green-600" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMeal(meal.id)}
                                className="p-1 bg-white rounded shadow hover:bg-red-100"
                                title="Delete"
                              >
                                <X className="h-3 w-3 text-red-600" />
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

          {/* Meal Ideas */}
          <div className="mt-8 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Quick Meal Ideas</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Grilled Chicken Salad', 'Pasta Primavera', 'Fish Tacos', 'Stir Fry Vegetables', 
                'Homemade Pizza', 'Beef Stew', 'Chicken Curry', 'Vegetable Soup'].map((meal, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMealForm(prev => ({ ...prev, name: meal }));
                    setShowAddMeal(true);
                  }}
                  className="px-4 py-2 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-orange-100 hover:text-orange-700 transition-colors"
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Item</h2>
                <button
                  onClick={() => { setShowAddItem(false); setEditingItem(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddItem} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Apples, Milk, Bread"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="text"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                    placeholder="lbs, oz, pack"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {SHOPPING_CATEGORIES.slice(0, 8).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setItemForm(prev => ({ ...prev, category: cat.id }))}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                        itemForm.category === cat.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <cat.icon className={`h-4 w-4 ${itemForm.category === cat.id ? 'text-orange-600' : 'text-gray-500'}`} />
                      <span className="text-xs mt-1">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddItem(false); setEditingItem(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddMeal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Plan Meal</h2>
                <button
                  onClick={() => setShowAddMeal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddMeal} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal Name *</label>
                <input
                  type="text"
                  required
                  value={mealForm.name}
                  onChange={(e) => setMealForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Grilled Chicken with Rice"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
                  <select
                    value={mealForm.type}
                    onChange={(e) => setMealForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    {MEAL_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={mealForm.date}
                    onChange={(e) => setMealForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servings</label>
                <input
                  type="number"
                  value={mealForm.servings}
                  onChange={(e) => setMealForm(prev => ({ ...prev, servings: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ingredients (one per line - can add to shopping list later)
                </label>
                <textarea
                  value={mealForm.ingredients}
                  onChange={(e) => setMealForm(prev => ({ ...prev, ingredients: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={4}
                  placeholder="Chicken breast&#10;Rice&#10;Olive oil&#10;Garlic"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddMeal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
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
    </div>
  );
}
