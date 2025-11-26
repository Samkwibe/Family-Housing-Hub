// src/pages/Budget.jsx - Complete Budget & Expense Management
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    DollarSign,
    Plus,
    TrendingUp,
    TrendingDown,
    PieChart,
    Calendar,
    Edit3,
    Trash2,
    X,
    Check,
    Home,
    ShoppingCart,
    Car,
    Utensils,
    Heart,
    GraduationCap,
    Zap,
    Wifi,
    Phone,
    Gift,
    Plane,
    Film,
    MoreHorizontal,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    Wallet,
    CreditCard,
    PiggyBank,
    AlertTriangle,
    CheckCircle,
    ChevronRight,
    Filter,
    Download
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

// Expense categories with icons and colors
const CATEGORIES = [
    { id: 'housing', label: 'Housing/Rent', icon: Home, color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' },
    { id: 'groceries', label: 'Groceries', icon: ShoppingCart, color: 'bg-green-500', lightColor: 'bg-green-100 text-green-700' },
    { id: 'transport', label: 'Transport', icon: Car, color: 'bg-yellow-500', lightColor: 'bg-yellow-100 text-yellow-700' },
    { id: 'food', label: 'Dining Out', icon: Utensils, color: 'bg-orange-500', lightColor: 'bg-orange-100 text-orange-700' },
    { id: 'health', label: 'Health', icon: Heart, color: 'bg-red-500', lightColor: 'bg-red-100 text-red-700' },
    { id: 'education', label: 'Education', icon: GraduationCap, color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700' },
    { id: 'utilities', label: 'Utilities', icon: Zap, color: 'bg-amber-500', lightColor: 'bg-amber-100 text-amber-700' },
    { id: 'internet', label: 'Internet/Phone', icon: Wifi, color: 'bg-cyan-500', lightColor: 'bg-cyan-100 text-cyan-700' },
    { id: 'entertainment', label: 'Entertainment', icon: Film, color: 'bg-pink-500', lightColor: 'bg-pink-100 text-pink-700' },
    { id: 'gifts', label: 'Gifts', icon: Gift, color: 'bg-rose-500', lightColor: 'bg-rose-100 text-rose-700' },
    { id: 'travel', label: 'Travel', icon: Plane, color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700' },
    { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'bg-gray-500', lightColor: 'bg-gray-100 text-gray-700' }
];

export default function Budget() {
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showAddBudget, setShowAddBudget] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [submitting, setSubmitting] = useState(false);

    // Transaction form
    const [transactionForm, setTransactionForm] = useState({
        type: 'expense',
        amount: '',
        category: 'other',
        description: '',
        date: new Date().toISOString().split('T')[0],
        isRecurring: false,
        recurringType: 'monthly'
    });

    // Budget form
    const [budgetForm, setBudgetForm] = useState({
        category: 'groceries',
        amount: '',
        period: 'monthly'
    });

    // Load data
    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [currentUser, selectedMonth]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load transactions for selected month
            const startDate = new Date(selectedMonth + '-01');
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

            let allTransactions = [];
            let allBudgets = [];

            // Load transactions
            try {
                const transactionsQuery = query(
                    collection(db, 'transactions'),
                    where('userId', '==', currentUser.uid)
                );
                const transactionsSnap = await getDocs(transactionsQuery);
                allTransactions = transactionsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    date: doc.data().date?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                }));
            } catch (err) {
                console.log('No transactions yet or permission issue:', err.code);
            }

            // Load budgets
            try {
                const budgetsQuery = query(
                    collection(db, 'budgets'),
                    where('userId', '==', currentUser.uid)
                );
                const budgetsSnap = await getDocs(budgetsQuery);
                allBudgets = budgetsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (err) {
                console.log('No budgets yet or permission issue:', err.code);
            }

            // Filter by selected month
            const monthTransactions = allTransactions.filter(t => {
                if (!t.date) return false;
                const tDate = new Date(t.date);
                return tDate >= startDate && tDate <= endDate;
            });

            setTransactions(monthTransactions.sort((a, b) => b.date - a.date));
            setBudgets(allBudgets);
        } catch (error) {
            console.error('Error loading budget data:', error);
            // Only show error for non-permission issues
            if (error.code !== 'permission-denied') {
                toast.error('Failed to load budget data');
            }
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics
    const stats = useMemo(() => {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const balance = income - expenses;
        const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;

        // Spending by category
        const byCategory = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
        });

        return { income, expenses, balance, savingsRate, byCategory };
    }, [transactions]);

    // Budget vs Actual
    const budgetProgress = useMemo(() => {
        return budgets.map(budget => {
            const spent = stats.byCategory[budget.category] || 0;
            const percentage = budget.amount > 0 ? (spent / budget.amount * 100) : 0;
            return {
                ...budget,
                spent,
                percentage: Math.min(percentage, 100),
                remaining: budget.amount - spent,
                isOver: spent > budget.amount
            };
        });
    }, [budgets, stats.byCategory]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    // Handle add transaction
    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!transactionForm.amount) {
            toast.error('Please enter an amount');
            return;
        }

        setSubmitting(true);
        try {
            const data = {
                userId: currentUser.uid,
                type: transactionForm.type,
                amount: parseFloat(transactionForm.amount),
                category: transactionForm.category,
                description: transactionForm.description,
                date: Timestamp.fromDate(new Date(transactionForm.date)),
                isRecurring: transactionForm.isRecurring,
                recurringType: transactionForm.recurringType,
                createdAt: serverTimestamp()
            };

            if (editingTransaction) {
                await updateDoc(doc(db, 'transactions', editingTransaction.id), data);
                toast.success('Transaction updated!');
            } else {
                await addDoc(collection(db, 'transactions'), data);
                toast.success('Transaction added!');
            }

            await loadData();
            setShowAddTransaction(false);
            setEditingTransaction(null);
            resetTransactionForm();
        } catch (error) {
            console.error('Error saving transaction:', error);
            toast.error('Failed to save transaction');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle add budget
    const handleAddBudget = async (e) => {
        e.preventDefault();
        if (!budgetForm.amount) {
            toast.error('Please enter a budget amount');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'budgets'), {
                userId: currentUser.uid,
                category: budgetForm.category,
                amount: parseFloat(budgetForm.amount),
                period: budgetForm.period,
                createdAt: serverTimestamp()
            });

            toast.success('Budget created!');
            await loadData();
            setShowAddBudget(false);
            setBudgetForm({ category: 'groceries', amount: '', period: 'monthly' });
        } catch (error) {
            console.error('Error saving budget:', error);
            toast.error('Failed to save budget');
        } finally {
            setSubmitting(false);
        }
    };

    // Delete transaction
    const handleDeleteTransaction = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await deleteDoc(doc(db, 'transactions', id));
            await loadData();
            toast.success('Transaction deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    // Delete budget
    const handleDeleteBudget = async (id) => {
        if (!window.confirm('Delete this budget?')) return;
        try {
            await deleteDoc(doc(db, 'budgets', id));
            await loadData();
            toast.success('Budget deleted');
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    // Reset form
    const resetTransactionForm = () => {
        setTransactionForm({
            type: 'expense',
            amount: '',
            category: 'other',
            description: '',
            date: new Date().toISOString().split('T')[0],
            isRecurring: false,
            recurringType: 'monthly'
        });
    };

    // Edit transaction
    const openEditTransaction = (t) => {
        setTransactionForm({
            type: t.type,
            amount: t.amount?.toString() || '',
            category: t.category,
            description: t.description || '',
            date: t.date ? new Date(t.date).toISOString().split('T')[0] : '',
            isRecurring: t.isRecurring || false,
            recurringType: t.recurringType || 'monthly'
        });
        setEditingTransaction(t);
        setShowAddTransaction(true);
    };

    // Filter transactions
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            return true;
        });
    }, [transactions, filterCategory, filterType]);

    // Get category info
    const getCategoryInfo = (categoryId) => {
        return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1];
    };

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                            <Wallet className="h-8 w-8 text-green-600" />
                        </div>
                        Budget & Expenses
                    </h1>
                    <p className="text-gray-600 mt-1">Track your income, expenses, and stay on budget</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                    />
                    <button
                        onClick={() => {
                            resetTransactionForm();
                            setEditingTransaction(null);
                            setShowAddTransaction(true);
                        }}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Income</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.income)}</p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm font-medium">Expenses</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.expenses)}</p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <ArrowDownRight className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className={`rounded-2xl p-5 text-white ${stats.balance >= 0
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        : 'bg-gradient-to-br from-orange-500 to-amber-600'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/80 text-sm font-medium">Balance</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.balance)}</p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <DollarSign className="h-6 w-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Savings Rate</p>
                            <p className="text-3xl font-bold mt-1">{stats.savingsRate.toFixed(0)}%</p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <PiggyBank className="h-6 w-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transactions List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <h2 className="font-semibold text-gray-900">Transactions</h2>
                                <div className="flex gap-2">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="income">Income</option>
                                        <option value="expense">Expenses</option>
                                    </select>
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
                                    >
                                        <option value="all">All Categories</option>
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((t) => {
                                    const category = getCategoryInfo(t.category);
                                    const CategoryIcon = category.icon;

                                    return (
                                        <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`p-2 rounded-xl ${category.lightColor}`}>
                                                        <CategoryIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">
                                                            {t.description || category.label}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {formatDate(t.date)} • {category.label}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                    </span>
                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            onClick={() => openEditTransaction(t)}
                                                            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                                                        >
                                                            <Edit3 className="h-4 w-4 text-gray-500" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTransaction(t.id)}
                                                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-12 text-center">
                                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 mb-4">No transactions this month</p>
                                    <button
                                        onClick={() => setShowAddTransaction(true)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                                    >
                                        Add Transaction
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Budgets & Spending */}
                <div className="space-y-6">
                    {/* Budget Progress */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Budget Progress</h2>
                            <button
                                onClick={() => setShowAddBudget(true)}
                                className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center"
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add Budget
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            {budgetProgress.length > 0 ? (
                                budgetProgress.map((budget) => {
                                    const category = getCategoryInfo(budget.category);
                                    const CategoryIcon = category.icon;

                                    return (
                                        <div key={budget.id} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className={`p-1.5 rounded-lg ${category.lightColor}`}>
                                                        <CategoryIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium text-gray-900 text-sm">{category.label}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-sm font-medium ${budget.isOver ? 'text-red-600' : 'text-gray-600'}`}>
                                                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteBudget(budget.id)}
                                                        className="p-1 hover:bg-red-100 rounded transition-colors"
                                                    >
                                                        <X className="h-3 w-3 text-gray-400 hover:text-red-600" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${budget.isOver ? 'bg-red-500' : budget.percentage > 80 ? 'bg-orange-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                                />
                                            </div>
                                            {budget.isOver && (
                                                <p className="text-xs text-red-600 flex items-center">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Over budget by {formatCurrency(Math.abs(budget.remaining))}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6">
                                    <Target className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No budgets set</p>
                                    <button
                                        onClick={() => setShowAddBudget(true)}
                                        className="mt-2 text-green-600 font-medium text-sm hover:text-green-700"
                                    >
                                        Create your first budget
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Spending by Category */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Spending by Category</h2>
                        </div>

                        <div className="p-4 space-y-3">
                            {Object.entries(stats.byCategory)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 6)
                                .map(([categoryId, amount]) => {
                                    const category = getCategoryInfo(categoryId);
                                    const CategoryIcon = category.icon;
                                    const percentage = stats.expenses > 0 ? (amount / stats.expenses * 100) : 0;

                                    return (
                                        <div key={categoryId} className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${category.lightColor}`}>
                                                <CategoryIcon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-gray-700">{category.label}</span>
                                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount)}</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${category.color}`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                            {Object.keys(stats.byCategory).length === 0 && (
                                <p className="text-center text-gray-500 py-4 text-sm">No expenses recorded</p>
                            )}
                        </div>
                    </div>

                    {/* Smart Tips */}
                    {stats.expenses > stats.income && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-orange-800">Spending Alert</p>
                                    <p className="text-sm text-orange-700 mt-1">
                                        Your expenses exceed your income by {formatCurrency(stats.expenses - stats.income)} this month.
                                        Consider reviewing your spending.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {stats.savingsRate >= 20 && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-green-800">Great Job! 🎉</p>
                                    <p className="text-sm text-green-700 mt-1">
                                        You're saving {stats.savingsRate.toFixed(0)}% of your income. Keep up the good work!
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Transaction Modal */}
            {showAddTransaction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                                </h2>
                                <button
                                    onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddTransaction} className="p-6 space-y-5">
                            {/* Type Toggle */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'expense' }))}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${transactionForm.type === 'expense'
                                            ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                            : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                                        }`}
                                >
                                    <ArrowDownRight className="h-4 w-4 inline mr-2" />
                                    Expense
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'income' }))}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${transactionForm.type === 'income'
                                            ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                            : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                                        }`}
                                >
                                    <ArrowUpRight className="h-4 w-4 inline mr-2" />
                                    Income
                                </button>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={transactionForm.amount}
                                        onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-4 text-2xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {CATEGORIES.slice(0, 8).map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setTransactionForm(prev => ({ ...prev, category: cat.id }))}
                                            className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center ${transactionForm.category === cat.id
                                                    ? 'border-green-500 bg-green-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <cat.icon className={`h-5 w-5 ${transactionForm.category === cat.id ? 'text-green-600' : 'text-gray-500'}`} />
                                            <span className="text-xs mt-1 truncate w-full text-center">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={transactionForm.description}
                                    onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                    placeholder="e.g., Weekly groceries"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={transactionForm.date}
                                    onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                />
                            </div>

                            {/* Recurring */}
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id="recurring"
                                    checked={transactionForm.isRecurring}
                                    onChange={(e) => setTransactionForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <label htmlFor="recurring" className="text-sm text-gray-700">This is a recurring transaction</label>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddTransaction(false); setEditingTransaction(null); }}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : editingTransaction ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Budget Modal */}
            {showAddBudget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Set Budget</h2>
                                <button
                                    onClick={() => setShowAddBudget(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddBudget} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select
                                    value={budgetForm.category}
                                    onChange={(e) => setBudgetForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 bg-white"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Budget *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={budgetForm.amount}
                                        onChange={(e) => setBudgetForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBudget(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Create Budget'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

