// src/pages/ChildrenSavings.jsx - Children & Savings Management
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { childrenService, savingsService } from '../services/firebaseService';
import {
  Users,
  Plus,
  PiggyBank,
  Target,
  Calendar,
  Edit3,
  Trash2,
  X,
  Check,
  TrendingUp,
  DollarSign,
  GraduationCap,
  Heart,
  Shirt,
  Gift,
  Laptop,
  Car,
  Home,
  Plane,
  Star,
  ChevronRight,
  User,
  Baby,
  Cake,
  Award,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChildrenSavings() {
  const { currentUser, userProfile } = useAuth();
  const [children, setChildren] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(null);
  const [editingChild, setEditingChild] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Child form
  const [childForm, setChildForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    notes: ''
  });

  // Goal form
  const [goalForm, setGoalForm] = useState({
    goalName: '',
    targetAmount: '',
    currentAmount: '0',
    dueDate: '',
    category: 'education',
    notes: ''
  });

  // Add money form
  const [addMoneyAmount, setAddMoneyAmount] = useState('');

  // Categories with icons
  const categories = [
    { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-blue-600 bg-blue-100' },
    { id: 'health', label: 'Health', icon: Heart, color: 'text-red-600 bg-red-100' },
    { id: 'clothes', label: 'Clothes', icon: Shirt, color: 'text-purple-600 bg-purple-100' },
    { id: 'technology', label: 'Technology', icon: Laptop, color: 'text-gray-600 bg-gray-100' },
    { id: 'gifts', label: 'Gifts', icon: Gift, color: 'text-pink-600 bg-pink-100' },
    { id: 'activities', label: 'Activities', icon: Star, color: 'text-yellow-600 bg-yellow-100' },
    { id: 'travel', label: 'Travel', icon: Plane, color: 'text-cyan-600 bg-cyan-100' },
    { id: 'future', label: 'Future', icon: Target, color: 'text-green-600 bg-green-100' }
  ];

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [childrenData, goalsData] = await Promise.all([
        childrenService.getChildren(currentUser.uid),
        savingsService.getUserSavings(currentUser.uid)
      ]);
      setChildren(childrenData);
      setSavingsGoals(goalsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalSaved = savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const totalTarget = savingsGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const activeGoals = savingsGoals.filter(g => g.status === 'active').length;
    const completedGoals = savingsGoals.filter(g => g.status === 'completed').length;
    
    return { totalSaved, totalTarget, activeGoals, completedGoals };
  }, [savingsGoals]);

  // Get goals for a child
  const getChildGoals = (childId) => {
    return savingsGoals.filter(g => g.childId === childId);
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle add child
  const handleAddChild = async (e) => {
    e.preventDefault();
    if (!childForm.name) {
      toast.error('Please enter child name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingChild) {
        await childrenService.updateChild(editingChild.id, currentUser.uid, childForm);
        toast.success('Child updated!');
      } else {
        await childrenService.addChild(currentUser.uid, childForm);
        toast.success('Child added!');
      }
      await loadData();
      setShowAddChild(false);
      setEditingChild(null);
      setChildForm({ name: '', dateOfBirth: '', gender: '', notes: '' });
    } catch (error) {
      toast.error('Failed to save child');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete child
  const handleDeleteChild = async (childId) => {
    if (!window.confirm('Are you sure? This will also delete all savings goals for this child.')) return;

    try {
      await childrenService.deleteChild(childId, currentUser.uid);
      await loadData();
      if (selectedChild?.id === childId) {
        setSelectedChild(null);
      }
      toast.success('Child removed');
    } catch (error) {
      toast.error('Failed to remove child');
    }
  };

  // Handle add goal
  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.goalName || !goalForm.targetAmount) {
      toast.error('Please fill in goal name and target amount');
      return;
    }

    setSubmitting(true);
    try {
      if (editingGoal) {
        await savingsService.updateSavingsGoal(editingGoal.id, currentUser.uid, selectedChild.id, goalForm);
        toast.success('Goal updated!');
      } else {
        await savingsService.createSavingsGoal(currentUser.uid, selectedChild.id, goalForm);
        toast.success('Savings goal created!');
      }
      await loadData();
      setShowAddGoal(false);
      setEditingGoal(null);
      setGoalForm({ goalName: '', targetAmount: '', currentAmount: '0', dueDate: '', category: 'education', notes: '' });
    } catch (error) {
      toast.error('Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add money
  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addMoneyAmount || parseFloat(addMoneyAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await savingsService.addToSavings(showAddMoney.id, currentUser.uid, showAddMoney.childId, addMoneyAmount);
      await loadData();
      setShowAddMoney(null);
      setAddMoneyAmount('');
      toast.success('Money added to savings!');
    } catch (error) {
      toast.error('Failed to add money');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete goal
  const handleDeleteGoal = async (goal) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;

    try {
      await savingsService.deleteSavingsGoal(goal.id, currentUser.uid, goal.childId);
      await loadData();
      toast.success('Goal deleted');
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  // Edit child
  const openEditChild = (child) => {
    setChildForm({
      name: child.name || '',
      dateOfBirth: child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split('T')[0] : '',
      gender: child.gender || '',
      notes: child.notes || ''
    });
    setEditingChild(child);
    setShowAddChild(true);
  };

  // Edit goal
  const openEditGoal = (goal) => {
    setGoalForm({
      goalName: goal.goalName || '',
      targetAmount: goal.targetAmount?.toString() || '',
      currentAmount: goal.currentAmount?.toString() || '0',
      dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString().split('T')[0] : '',
      category: goal.category || 'education',
      notes: goal.notes || ''
    });
    setEditingGoal(goal);
    setShowAddGoal(true);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
              <PiggyBank className="h-8 w-8 text-purple-600" />
            </div>
            Children & Savings
          </h1>
          <p className="text-gray-600 mt-1">Track your children's savings goals and plan for their future</p>
        </div>
        <button
          onClick={() => {
            setChildForm({ name: '', dateOfBirth: '', gender: '', notes: '' });
            setEditingChild(null);
            setShowAddChild(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-200"
        >
          <Plus className="h-5 w-5" />
          <span>Add Child</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Children</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{children.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Saved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalSaved)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Goals</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.activeGoals}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Completed</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.completedGoals}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Award className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Children List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Your Children</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {children.length > 0 ? (
                children.map((child) => {
                  const age = calculateAge(child.dateOfBirth);
                  const childGoals = getChildGoals(child.id);
                  const totalSaved = childGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

                  return (
                    <div
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedChild?.id === child.id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                            {child.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{child.name}</h3>
                            <p className="text-sm text-gray-500">
                              {age !== null ? `${age} years old` : 'Age not set'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(totalSaved)}</p>
                          <p className="text-xs text-gray-500">{childGoals.length} goals</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Baby className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No children added yet</p>
                  <button
                    onClick={() => setShowAddChild(true)}
                    className="mt-3 text-purple-600 font-medium hover:text-purple-700"
                  >
                    Add your first child
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Savings Goals */}
        <div className="lg:col-span-2">
          {selectedChild ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Child Header */}
              <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                      {selectedChild.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedChild.name}</h2>
                      <p className="text-purple-100">
                        {selectedChild.dateOfBirth && (
                          <span className="flex items-center gap-1">
                            <Cake className="h-4 w-4" />
                            {formatDate(selectedChild.dateOfBirth)} • {calculateAge(selectedChild.dateOfBirth)} years old
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditChild(selectedChild)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                      <Edit3 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteChild(selectedChild.id)}
                      className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Goals Section */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-gray-900">Savings Goals</h3>
                  <button
                    onClick={() => {
                      setGoalForm({ goalName: '', targetAmount: '', currentAmount: '0', dueDate: '', category: 'education', notes: '' });
                      setEditingGoal(null);
                      setShowAddGoal(true);
                    }}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Goal</span>
                  </button>
                </div>

                {getChildGoals(selectedChild.id).length > 0 ? (
                  <div className="space-y-4">
                    {getChildGoals(selectedChild.id).map((goal) => {
                      const category = categories.find(c => c.id === goal.category) || categories[0];
                      const CategoryIcon = category.icon;
                      const progress = goal.targetAmount > 0 
                        ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) 
                        : 0;
                      const isCompleted = goal.status === 'completed';

                      return (
                        <div
                          key={goal.id}
                          className={`border-2 rounded-xl p-5 ${
                            isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg ${category.color}`}>
                                <CategoryIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                  {goal.goalName}
                                  {isCompleted && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" /> Completed
                                    </span>
                                  )}
                                </h4>
                                <p className="text-sm text-gray-500 capitalize">{category.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setShowAddMoney(goal)}
                                className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition-colors"
                                title="Add money"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditGoal(goal)}
                                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGoal(goal)}
                                className="p-2 bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-gray-900">
                                {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                              </span>
                              <span className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-purple-600'}`}>
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCompleted 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          {/* Goal Details */}
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                              {goal.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Due: {formatDate(goal.dueDate)}
                                </span>
                              )}
                            </div>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(goal.targetAmount - goal.currentAmount)} to go
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No savings goals yet</p>
                    <button
                      onClick={() => setShowAddGoal(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700"
                    >
                      Create First Goal
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-10 w-10 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a child</h3>
              <p className="text-gray-500 mb-6">Choose a child from the list to view and manage their savings goals</p>
              {children.length === 0 && (
                <button
                  onClick={() => setShowAddChild(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700"
                >
                  Add Your First Child
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Child Modal */}
      {showAddChild && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingChild ? 'Edit Child' : 'Add Child'}
                </h2>
                <button
                  onClick={() => { setShowAddChild(false); setEditingChild(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAddChild} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={childForm.name}
                  onChange={(e) => setChildForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Child's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                <input
                  type="date"
                  value={childForm.dateOfBirth}
                  onChange={(e) => setChildForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={childForm.gender}
                  onChange={(e) => setChildForm(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={childForm.notes}
                  onChange={(e) => setChildForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddChild(false); setEditingChild(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingChild ? 'Update' : 'Add Child'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && selectedChild && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingGoal ? 'Edit Savings Goal' : 'Add Savings Goal'}
                </h2>
                <button
                  onClick={() => { setShowAddGoal(false); setEditingGoal(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">For {selectedChild.name}</p>
            </div>

            <form onSubmit={handleAddGoal} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Name *</label>
                <input
                  type="text"
                  required
                  value={goalForm.goalName}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, goalName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., School Fees 2028"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {categories.slice(0, 8).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setGoalForm(prev => ({ ...prev, category: cat.id }))}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${
                        goalForm.category === cat.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <cat.icon className={`h-5 w-5 ${goalForm.category === cat.id ? 'text-purple-600' : 'text-gray-500'}`} />
                      <span className="text-xs mt-1">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={goalForm.targetAmount}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={goalForm.currentAmount}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, currentAmount: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                <input
                  type="date"
                  value={goalForm.dueDate}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={goalForm.notes}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Any notes about this goal..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddGoal(false); setEditingGoal(null); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Money Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Money</h2>
                <button
                  onClick={() => { setShowAddMoney(null); setAddMoneyAmount(''); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">To: {showAddMoney.goalName}</p>
            </div>

            <form onSubmit={handleAddMoney} className="p-6 space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-sm text-green-700 mb-1">Current Balance</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(showAddMoney.currentAmount)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Add *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-4 text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowAddMoney(null); setAddMoneyAmount(''); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <span>Adding...</span>
                  ) : (
                    <>
                      <DollarSign className="h-4 w-4" />
                      <span>Add Money</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

