// src/pages/Budget.jsx - ENHANCED BUDGET APP WITH INCOME TRACKING
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
    Download,
    Briefcase,
    Building2,
    Coins,
    Award,
    BarChart3,
    LineChart,
    FileText,
    Save,
    RefreshCw,
    Bell,
    Search,
    Upload,
    Image as ImageIcon,
    Tag,
    Clock,
    Calculator,
    Copy,
    Settings,
    Layers,
    Receipt as ReceiptIcon,
    BookOpen,
    Sparkles,
    Zap as ZapIcon,
    Calendar as CalendarIcon,
    DollarSign as DollarSignIcon
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
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { userService } from '../services/firebaseService';

// Expense categories with icons and colors
const EXPENSE_CATEGORIES = [
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

// Income categories
const INCOME_CATEGORIES = [
    { id: 'salary', label: 'Salary', icon: Briefcase, color: 'bg-emerald-500', lightColor: 'bg-emerald-100 text-emerald-700' },
    { id: 'freelance', label: 'Freelance', icon: Building2, color: 'bg-teal-500', lightColor: 'bg-teal-100 text-teal-700' },
    { id: 'investment', label: 'Investment', icon: TrendingUp, color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' },
    { id: 'business', label: 'Business', icon: Building2, color: 'bg-indigo-500', lightColor: 'bg-indigo-100 text-indigo-700' },
    { id: 'rental', label: 'Rental Income', icon: Home, color: 'bg-purple-500', lightColor: 'bg-purple-100 text-purple-700' },
    { id: 'bonus', label: 'Bonus', icon: Award, color: 'bg-yellow-500', lightColor: 'bg-yellow-100 text-yellow-700' },
    { id: 'gift', label: 'Gift/Inheritance', icon: Gift, color: 'bg-pink-500', lightColor: 'bg-pink-100 text-pink-700' },
    { id: 'other', label: 'Other Income', icon: Coins, color: 'bg-gray-500', lightColor: 'bg-gray-100 text-gray-700' }
];

// Format currency function - defined outside component for better performance
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount || 0);
};

// Enhanced Pie Chart Component with better visuals
const SimplePieChart = ({ data, categories, title }) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    if (total === 0) {
        return (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <PieChart className="h-16 w-16 mx-auto mb-2" />
                <p>No data to display</p>
            </div>
        );
    }

    const entries = Object.entries(data)
        .map(([catId, amount]) => {
            const category = categories.find(c => c.id === catId);
            return {
                ...category,
                amount,
                percentage: (amount / total * 100)
            };
        })
        .sort((a, b) => b.amount - a.amount);

    let currentAngle = 0;
    const radius = 80;
    const centerX = 120;
    const centerY = 120;

    const colorMap = {
        'bg-blue-500': '#3b82f6',
        'bg-green-500': '#10b981',
        'bg-yellow-500': '#eab308',
        'bg-orange-500': '#f97316',
        'bg-red-500': '#ef4444',
        'bg-purple-500': '#a855f7',
        'bg-amber-500': '#f59e0b',
        'bg-cyan-500': '#06b6d4',
        'bg-pink-500': '#ec4899',
        'bg-rose-500': '#f43f5e',
        'bg-indigo-500': '#6366f1',
        'bg-gray-500': '#6b7280',
        'bg-emerald-500': '#10b981',
        'bg-teal-500': '#14b8a6'
    };

    return (
        <div className="flex items-center justify-center space-x-8">
            <svg width="240" height="240" viewBox="0 0 240 240">
                {entries.map((item, index) => {
                    const angle = (item.percentage / 100) * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;
                    currentAngle = endAngle;

                    const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
                    const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
                    const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
                    const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
                    const largeArc = angle > 180 ? 1 : 0;

                    return (
                        <path
                            key={item.id}
                            d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={colorMap[item.color] || '#6b7280'}
                            className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                            onMouseEnter={(e) => {
                                e.target.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.opacity = '0.8';
                            }}
                        />
                    );
                })}
                <circle cx={centerX} cy={centerY} r="40" fill="white" />
                <text x={centerX} y={centerY} textAnchor="middle" dy="4" className="text-lg font-bold fill-gray-700">
                    {formatCurrency(total)}
                </text>
            </svg>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {entries.map(item => (
                    <div key={item.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                        <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</div>
                            <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Enhanced Line Chart Component with balance line
const SimpleLineChart = ({ data, title }) => {
    if (!data || data.length === 0) {
        return (
            <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <LineChart className="h-16 w-16 mx-auto mb-2" />
                <p>No data to display</p>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => Math.max(d.income || 0, d.expenses || 0, d.balance || 0)));
    const chartHeight = 200;
    const chartWidth = 500;
    const padding = 40;

    const getY = (value) => chartHeight - padding - ((value / maxValue) * (chartHeight - padding * 2));
    const getX = (index) => padding + (index * ((chartWidth - padding * 2) / (data.length - 1)));

    const incomePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.income || 0)}`).join(' ');
    const expensesPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.expenses || 0)}`).join(' ');
    const balancePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.balance || 0)}`).join(' ');

    return (
        <div className="overflow-x-auto">
            <svg width={chartWidth} height={chartHeight + 60} viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                    <line
                        key={ratio}
                        x1={padding}
                        y1={padding + (ratio * (chartHeight - padding * 2))}
                        x2={chartWidth - padding}
                        y2={padding + (ratio * (chartHeight - padding * 2))}
                        stroke="currentColor"
                        strokeWidth="1"
                        className="text-gray-200 dark:text-gray-700"
                    />
                ))}

                {/* Income line */}
                <path
                    d={incomePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Expenses line */}
                <path
                    d={expensesPath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Balance line */}
                <path
                    d={balancePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    strokeLinecap="round"
                />

                {/* Data points */}
                {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(d.income || 0)} r="4" fill="#10b981" />
                        <circle cx={getX(i)} cy={getY(d.expenses || 0)} r="4" fill="#ef4444" />
                        <circle cx={getX(i)} cy={getY(d.balance || 0)} r="3" fill="#3b82f6" />
                    </g>
                ))}

                {/* Labels */}
                {data.map((d, i) => (
                    <text
                        key={i}
                        x={getX(i)}
                        y={chartHeight + 20}
                        textAnchor="middle"
                        className="text-xs fill-gray-600 dark:fill-gray-400"
                    >
                        {d.month.split(' ')[0]}
                    </text>
                ))}
            </svg>
            <div className="flex items-center justify-center space-x-6 mt-4">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Expenses</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">Balance</span>
                </div>
            </div>
        </div>
    );
};

export default function Budget() {
    const { currentUser, userProfile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [showAddTransaction, setShowAddTransaction] = useState(false);
    const [showAddBudget, setShowAddBudget] = useState(false);
    const [showIncomeGoal, setShowIncomeGoal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [viewMode, setViewMode] = useState('month'); // month, year
    const [submitting, setSubmitting] = useState(false);
    const [incomeGoal, setIncomeGoal] = useState(0);

    // New feature states
    const [financialGoals, setFinancialGoals] = useState([]);
    const [bills, setBills] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [recurringTransactions, setRecurringTransactions] = useState([]);
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [showAddBill, setShowAddBill] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showAddRecurring, setShowAddRecurring] = useState(false);
    const [showCharts, setShowCharts] = useState(false);
    const [showBudgetTemplates, setShowBudgetTemplates] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [showReceiptUpload, setShowReceiptUpload] = useState(false);
    const [selectedTransactionForReceipt, setSelectedTransactionForReceipt] = useState(null);

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

    // Income goal form
    const [incomeGoalForm, setIncomeGoalForm] = useState({
        amount: '',
        period: 'monthly'
    });

    // Financial goal form
    const [goalForm, setGoalForm] = useState({
        name: '',
        targetAmount: '',
        currentAmount: '',
        targetDate: '',
        category: 'savings', // savings, debt, emergency, vacation, etc.
        priority: 'medium'
    });

    // Bill form
    const [billForm, setBillForm] = useState({
        name: '',
        amount: '',
        dueDate: '',
        category: 'utilities',
        isPaid: false,
        autoPay: false,
        recurring: true
    });

    // Account form
    const [accountForm, setAccountForm] = useState({
        name: '',
        type: 'checking', // checking, savings, credit, investment
        balance: '',
        accountNumber: '',
        bankName: ''
    });

    // Recurring transaction form
    const [recurringForm, setRecurringForm] = useState({
        type: 'expense',
        amount: '',
        category: 'other',
        description: '',
        frequency: 'monthly', // daily, weekly, monthly, yearly
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        nextDueDate: new Date().toISOString().split('T')[0]
    });

    // Load data
    useEffect(() => {
        if (currentUser) {
            loadData();
        }
    }, [currentUser, selectedMonth, viewMode]);

    const loadData = async () => {
        setLoading(true);
        try {
            let allTransactions = [];
            let allBudgets = [];

            // Load transactions
            try {
                const transactionsQuery = query(
                    collection(db, 'transactions'),
                    where('userId', '==', currentUser.uid),
                    orderBy('date', 'desc')
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

            // Load income goal from user profile
            if (userProfile?.incomeGoal) {
                setIncomeGoal(userProfile.incomeGoal);
            }

            // Load financial goals
            try {
                const goalsQuery = query(
                    collection(db, 'financialGoals'),
                    where('userId', '==', currentUser.uid)
                );
                const goalsSnap = await getDocs(goalsQuery);
                setFinancialGoals(goalsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    targetDate: doc.data().targetDate?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                })));
            } catch (err) {
                console.log('No goals yet:', err.code);
            }

            // Load bills
            try {
                const billsQuery = query(
                    collection(db, 'bills'),
                    where('userId', '==', currentUser.uid),
                    orderBy('dueDate', 'asc')
                );
                const billsSnap = await getDocs(billsQuery);
                setBills(billsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    dueDate: doc.data().dueDate?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                })));
            } catch (err) {
                console.log('No bills yet:', err.code);
            }

            // Load accounts
            try {
                const accountsQuery = query(
                    collection(db, 'accounts'),
                    where('userId', '==', currentUser.uid)
                );
                const accountsSnap = await getDocs(accountsQuery);
                setAccounts(accountsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })));
            } catch (err) {
                console.log('No accounts yet:', err.code);
            }

            // Load recurring transactions
            try {
                const recurringQuery = query(
                    collection(db, 'recurringTransactions'),
                    where('userId', '==', currentUser.uid)
                );
                const recurringSnap = await getDocs(recurringQuery);
                setRecurringTransactions(recurringSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startDate: doc.data().startDate?.toDate(),
                    endDate: doc.data().endDate?.toDate(),
                    nextDueDate: doc.data().nextDueDate?.toDate()
                })));
            } catch (err) {
                console.log('No recurring transactions yet:', err.code);
            }

            // Filter by selected period
            let filteredTransactions = allTransactions;
            if (viewMode === 'month') {
                const startDate = new Date(selectedMonth + '-01');
                const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                filteredTransactions = allTransactions.filter(t => {
                    if (!t.date) return false;
                    const tDate = new Date(t.date);
                    return tDate >= startDate && tDate <= endDate;
                });
            } else {
                // Year view
                const year = parseInt(selectedMonth.split('-')[0]);
                filteredTransactions = allTransactions.filter(t => {
                    if (!t.date) return false;
                    return new Date(t.date).getFullYear() === year;
                });
            }

            setTransactions(filteredTransactions.sort((a, b) => b.date - a.date));
            setBudgets(allBudgets);
        } catch (error) {
            console.error('Error loading budget data:', error);
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
        const expensesByCategory = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

        // Income by category
        const incomeByCategory = {};
        transactions.filter(t => t.type === 'income').forEach(t => {
            incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
        });

        // Income goal progress
        const incomeGoalProgress = incomeGoal > 0 ? (income / incomeGoal * 100) : 0;

        return {
            income,
            expenses,
            balance,
            savingsRate,
            expensesByCategory,
            incomeByCategory,
            incomeGoalProgress,
            incomeGoal
        };
    }, [transactions, incomeGoal]);

    // Budget vs Actual
    const budgetProgress = useMemo(() => {
        return budgets.map(budget => {
            const spent = stats.expensesByCategory[budget.category] || 0;
            const percentage = budget.amount > 0 ? (spent / budget.amount * 100) : 0;
            return {
                ...budget,
                spent,
                percentage: Math.min(percentage, 100),
                remaining: budget.amount - spent,
                isOver: spent > budget.amount
            };
        });
    }, [budgets, stats.expensesByCategory]);

    // Format date
    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: viewMode === 'year' ? 'numeric' : undefined
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

    // Handle income goal
    const handleSetIncomeGoal = async (e) => {
        e.preventDefault();
        if (!incomeGoalForm.amount) {
            toast.error('Please enter an income goal');
            return;
        }

        setSubmitting(true);
        try {
            // Update user profile with income goal
            await userService.updateUserProfile(currentUser.uid, {
                incomeGoal: parseFloat(incomeGoalForm.amount)
            });

            setIncomeGoal(parseFloat(incomeGoalForm.amount));
            toast.success('Income goal set!');
            setShowIncomeGoal(false);
            setIncomeGoalForm({ amount: '', period: 'monthly' });
        } catch (error) {
            console.error('Error setting income goal:', error);
            toast.error('Failed to set income goal');
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


    // Get category info
    const getCategoryInfo = (categoryId, type = 'expense') => {
        const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        return categories.find(c => c.id === categoryId) || categories[categories.length - 1];
    };

    // Export data
    const handleExport = () => {
        const csv = [
            ['Type', 'Category', 'Description', 'Amount', 'Date'].join(','),
            ...filteredTransactions.map(t => [
                t.type,
                t.category,
                `"${t.description || ''}"`,
                t.amount,
                formatDate(t.date)
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `budget-${selectedMonth}.csv`;
        a.click();
        toast.success('Data exported!');
    };

    // Handle add financial goal
    const handleAddGoal = async (e) => {
        e.preventDefault();
        if (!goalForm.name || !goalForm.targetAmount) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'financialGoals'), {
                userId: currentUser.uid,
                name: goalForm.name,
                targetAmount: parseFloat(goalForm.targetAmount),
                currentAmount: parseFloat(goalForm.currentAmount || 0),
                targetDate: goalForm.targetDate ? Timestamp.fromDate(new Date(goalForm.targetDate)) : null,
                category: goalForm.category,
                priority: goalForm.priority,
                createdAt: serverTimestamp()
            });

            toast.success('Financial goal created!');
            await loadData();
            setShowAddGoal(false);
            setGoalForm({ name: '', targetAmount: '', currentAmount: '', targetDate: '', category: 'savings', priority: 'medium' });
        } catch (error) {
            console.error('Error saving goal:', error);
            toast.error('Failed to save goal');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle add bill
    const handleAddBill = async (e) => {
        e.preventDefault();
        if (!billForm.name || !billForm.amount || !billForm.dueDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'bills'), {
                userId: currentUser.uid,
                name: billForm.name,
                amount: parseFloat(billForm.amount),
                dueDate: Timestamp.fromDate(new Date(billForm.dueDate)),
                category: billForm.category,
                isPaid: billForm.isPaid,
                autoPay: billForm.autoPay,
                recurring: billForm.recurring,
                createdAt: serverTimestamp()
            });

            toast.success('Bill added!');
            await loadData();
            setShowAddBill(false);
            setBillForm({ name: '', amount: '', dueDate: '', category: 'utilities', isPaid: false, autoPay: false, recurring: true });
        } catch (error) {
            console.error('Error saving bill:', error);
            toast.error('Failed to save bill');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle add account
    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (!accountForm.name || !accountForm.balance) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'accounts'), {
                userId: currentUser.uid,
                name: accountForm.name,
                type: accountForm.type,
                balance: parseFloat(accountForm.balance),
                accountNumber: accountForm.accountNumber || '',
                bankName: accountForm.bankName || '',
                createdAt: serverTimestamp()
            });

            toast.success('Account added!');
            await loadData();
            setShowAddAccount(false);
            setAccountForm({ name: '', type: 'checking', balance: '', accountNumber: '', bankName: '' });
        } catch (error) {
            console.error('Error saving account:', error);
            toast.error('Failed to save account');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle add recurring transaction
    const handleAddRecurring = async (e) => {
        e.preventDefault();
        if (!recurringForm.amount || !recurringForm.description) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, 'recurringTransactions'), {
                userId: currentUser.uid,
                type: recurringForm.type,
                amount: parseFloat(recurringForm.amount),
                category: recurringForm.category,
                description: recurringForm.description,
                frequency: recurringForm.frequency,
                startDate: Timestamp.fromDate(new Date(recurringForm.startDate)),
                endDate: recurringForm.endDate ? Timestamp.fromDate(new Date(recurringForm.endDate)) : null,
                nextDueDate: Timestamp.fromDate(new Date(recurringForm.nextDueDate)),
                createdAt: serverTimestamp()
            });

            toast.success('Recurring transaction created!');
            await loadData();
            setShowAddRecurring(false);
            setRecurringForm({
                type: 'expense',
                amount: '',
                category: 'other',
                description: '',
                frequency: 'monthly',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                nextDueDate: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            console.error('Error saving recurring transaction:', error);
            toast.error('Failed to save recurring transaction');
        } finally {
            setSubmitting(false);
        }
    };

    // Mark bill as paid
    const handleMarkBillPaid = async (billId, isPaid) => {
        try {
            await updateDoc(doc(db, 'bills', billId), {
                isPaid: !isPaid,
                paidDate: !isPaid ? serverTimestamp() : null
            });
            await loadData();
            toast.success(isPaid ? 'Bill marked as unpaid' : 'Bill marked as paid!');
        } catch (error) {
            toast.error('Failed to update bill');
        }
    };

    // Apply budget template
    const applyBudgetTemplate = (template) => {
        const templateBudgets = template.budgets;
        templateBudgets.forEach(async (budget) => {
            try {
                await addDoc(collection(db, 'budgets'), {
                    userId: currentUser.uid,
                    category: budget.category,
                    amount: budget.amount,
                    period: 'monthly',
                    createdAt: serverTimestamp()
                });
            } catch (error) {
                console.error('Error creating budget:', error);
            }
        });
        toast.success('Budget template applied!');
        loadData();
    };

    // Budget templates
    const budgetTemplates = [
        {
            name: '50/30/20 Rule',
            description: '50% needs, 30% wants, 20% savings',
            budgets: [
                { category: 'housing', amount: stats.income * 0.30 },
                { category: 'utilities', amount: stats.income * 0.10 },
                { category: 'groceries', amount: stats.income * 0.10 },
                { category: 'transport', amount: stats.income * 0.05 },
                { category: 'food', amount: stats.income * 0.10 },
                { category: 'entertainment', amount: stats.income * 0.10 },
                { category: 'other', amount: stats.income * 0.10 }
            ]
        },
        {
            name: 'Zero-Based Budget',
            description: 'Every dollar has a purpose',
            budgets: EXPENSE_CATEGORIES.slice(0, 8).map(cat => ({
                category: cat.id,
                amount: stats.income * 0.10
            }))
        }
    ];

    // Calculate spending trends
    const spendingTrends = useMemo(() => {
        const months = [];
        const currentDate = new Date(selectedMonth + '-01');

        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = monthDate.toISOString().slice(0, 7);

            const monthTransactions = transactions.filter(t => {
                if (!t.date) return false;
                const tDate = new Date(t.date);
                return tDate.toISOString().slice(0, 7) === monthKey;
            });

            const monthIncome = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            const monthExpenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + (t.amount || 0), 0);

            months.push({
                month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                income: monthIncome,
                expenses: monthExpenses,
                balance: monthIncome - monthExpenses
            });
        }

        return months;
    }, [transactions, selectedMonth]);

    // Filter transactions with search
    const filteredTransactions = useMemo(() => {
        let filtered = transactions.filter(t => {
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            if (selectedAccount !== 'all' && t.accountId !== selectedAccount) return false;
            if (searchQuery && !t.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
        return filtered;
    }, [transactions, filterCategory, filterType, selectedAccount, searchQuery]);

    // Upcoming bills
    const upcomingBills = useMemo(() => {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return bills
            .filter(bill => !bill.isPaid && bill.dueDate)
            .filter(bill => {
                const dueDate = new Date(bill.dueDate);
                return dueDate >= now && dueDate <= nextWeek;
            })
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [bills]);

    // Calculate goal progress
    const goalProgress = useMemo(() => {
        return financialGoals.map(goal => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount * 100) : 0;
            const daysRemaining = goal.targetDate
                ? Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
                : null;

            return {
                ...goal,
                progress: Math.min(progress, 100),
                remaining: goal.targetAmount - goal.currentAmount,
                daysRemaining
            };
        });
    }, [financialGoals]);

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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
                            <Wallet className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        Budget & Expenses
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Track your income, expenses, and stay on budget</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'month'
                                ? 'bg-green-600 dark:bg-green-500 text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setViewMode('year')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${viewMode === 'year'
                                ? 'bg-green-600 dark:bg-green-500 text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            Year
                        </button>
                    </div>
                    {viewMode === 'month' ? (
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                        />
                    ) : (
                        <select
                            value={selectedMonth.split('-')[0]}
                            onChange={(e) => setSelectedMonth(e.target.value + '-01')}
                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                    )}
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={() => setShowCharts(!showCharts)}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>Charts</span>
                    </button>
                    <button
                        onClick={() => {
                            resetTransactionForm();
                            setEditingTransaction(null);
                            setShowAddTransaction(true);
                        }}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-500 dark:to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-600 dark:hover:to-emerald-600 transition-all shadow-lg shadow-green-200 dark:shadow-green-900/50"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm dark:shadow-lg">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search transactions..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                            />
                        </div>
                    </div>
                    {accounts.length > 0 && (
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                        >
                            <option value="all">All Accounts</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={() => setShowAddGoal(true)}
                        className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center space-x-2 font-medium transition-colors"
                    >
                        <Target className="h-4 w-4" />
                        <span>Add Goal</span>
                    </button>
                    <button
                        onClick={() => setShowAddBill(true)}
                        className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 flex items-center space-x-2 font-medium transition-colors"
                    >
                        <Bell className="h-4 w-4" />
                        <span>Add Bill</span>
                    </button>
                    <button
                        onClick={() => setShowAddAccount(true)}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center space-x-2 font-medium transition-colors"
                    >
                        <Wallet className="h-4 w-4" />
                        <span>Add Account</span>
                    </button>
                    <button
                        onClick={() => setShowAddRecurring(true)}
                        className="px-4 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-xl hover:bg-teal-200 dark:hover:bg-teal-900/50 flex items-center space-x-2 font-medium transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span>Recurring</span>
                    </button>
                    <button
                        onClick={() => setShowBudgetTemplates(true)}
                        className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 flex items-center space-x-2 font-medium transition-colors"
                    >
                        <BookOpen className="h-4 w-4" />
                        <span>Templates</span>
                    </button>
                </div>
            </div>

            {/* Upcoming Bills Alert */}
            {upcomingBills.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            <div>
                                <h3 className="font-semibold text-orange-900 dark:text-orange-200 text-lg">Upcoming Bills</h3>
                                <p className="text-sm text-orange-700 dark:text-orange-300">
                                    {upcomingBills.length} bill{upcomingBills.length > 1 ? 's' : ''} due in the next 7 days
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddBill(true)}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
                        >
                            View All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {upcomingBills.map(bill => {
                            const daysUntilDue = bill.dueDate
                                ? Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
                                : null;

                            return (
                                <div key={bill.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white">{bill.name}</h4>
                                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(bill.amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-300">Due {formatDate(bill.dueDate)}</span>
                                        <span className={`font-medium ${daysUntilDue <= 1 ? 'text-red-600 dark:text-red-400' :
                                            daysUntilDue <= 3 ? 'text-orange-600 dark:text-orange-400' :
                                                'text-green-600 dark:text-green-400'
                                            }`}>
                                            {daysUntilDue === 0 ? 'Today' :
                                                daysUntilDue === 1 ? 'Tomorrow' :
                                                    `${daysUntilDue} days`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-green-100 text-sm font-medium">Total Income</p>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(stats.income)}</p>
                        {stats.incomeGoal > 0 && (
                            <div className="mt-3">
                                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all"
                                        style={{ width: `${Math.min(stats.incomeGoalProgress, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-green-100 mt-1">
                                    {stats.incomeGoalProgress.toFixed(0)}% of {formatCurrency(stats.incomeGoal)} goal
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <ArrowDownRight className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(stats.expenses)}</p>
                        {stats.income > 0 && (
                            <p className="text-xs text-red-100 mt-2">
                                {(stats.expenses / stats.income * 100).toFixed(0)}% of income
                            </p>
                        )}
                    </div>
                </div>

                <div className={`rounded-2xl p-5 text-white relative overflow-hidden ${stats.balance >= 0
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    : 'bg-gradient-to-br from-orange-500 to-amber-600'
                    }`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-white/80 text-sm font-medium">Net Balance</p>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <DollarSign className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(stats.balance)}</p>
                        <p className="text-xs text-white/80 mt-2">
                            {stats.balance >= 0 ? 'In surplus' : 'In deficit'}
                        </p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-purple-100 text-sm font-medium">Savings Rate</p>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <PiggyBank className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-3xl font-bold">{stats.savingsRate.toFixed(0)}%</p>
                        <p className="text-xs text-purple-100 mt-2">
                            {stats.savingsRate >= 20 ? 'Excellent!' : stats.savingsRate >= 10 ? 'Good' : 'Can improve'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            {showCharts && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Analytics</h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart - Expenses */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm dark:shadow-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                                <PieChart className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <span>Expense Breakdown</span>
                            </h3>
                            <div className="h-64 flex items-center justify-center">
                                <SimplePieChart data={stats.expensesByCategory} categories={EXPENSE_CATEGORIES} title="Expense Distribution" />
                            </div>
                        </div>

                        {/* Line Chart - Trends */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm dark:shadow-lg">
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                                <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <span>Spending Trends</span>
                            </h3>
                            <div className="h-64">
                                <SimpleLineChart data={spendingTrends} title="Income vs Expenses Trend" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Goals Section */}
            {goalProgress.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8 shadow-sm dark:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                            <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <span>Financial Goals</span>
                        </h3>
                        <button
                            onClick={() => setShowAddGoal(true)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-500 dark:to-pink-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2 hover:from-purple-700 hover:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600 transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Goal</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {goalProgress.map(goal => (
                            <div key={goal.id} className="bg-white dark:bg-gray-700/50 rounded-2xl border border-gray-200 dark:border-gray-600 p-6 hover:shadow-lg dark:hover:shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{goal.name}</h4>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${goal.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                        goal.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                        }`}>
                                        {goal.priority}
                                    </span>
                                </div>
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-gray-600 dark:text-gray-300">Progress</span>
                                        <span className="font-semibold text-purple-700 dark:text-purple-400">{goal.progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-full transition-all"
                                            style={{ width: `${goal.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        <span>{formatCurrency(goal.currentAmount)}</span>
                                        <span>{formatCurrency(goal.targetAmount)}</span>
                                    </div>
                                </div>
                                {goal.daysRemaining !== null && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-300">
                                            {goal.daysRemaining > 0
                                                ? `${goal.daysRemaining} days remaining`
                                                : goal.daysRemaining === 0
                                                    ? 'Due today!'
                                                    : `${Math.abs(goal.daysRemaining)} days overdue`
                                            }
                                        </span>
                                        <span className="text-gray-500 dark:text-gray-400 capitalize">{goal.category}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Income Goal Card */}
            {stats.incomeGoal > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Monthly Income Goal</h3>
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(stats.incomeGoal)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Current: {formatCurrency(stats.income)} ({stats.incomeGoalProgress.toFixed(0)}%)
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="w-32">
                                <div className="h-3 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all"
                                        style={{ width: `${Math.min(stats.incomeGoalProgress, 100)}%` }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIncomeGoalForm({ amount: stats.incomeGoal.toString(), period: 'monthly' });
                                    setShowIncomeGoal(true);
                                }}
                                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium text-sm transition-colors"
                            >
                                Edit Goal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Transactions List */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Income Section */}
                    {filteredTransactions.filter(t => t.type === 'income').length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-lg">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                                        <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <span>Income Sources</span>
                                    </h2>
                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(stats.income)}
                                    </span>
                                </div>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredTransactions
                                    .filter(t => t.type === 'income')
                                    .map((t) => {
                                        const category = getCategoryInfo(t.category, 'income');
                                        const CategoryIcon = category.icon;

                                        return (
                                            <div key={t.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-xl ${category.lightColor} dark:bg-opacity-20`}>
                                                            <CategoryIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {t.description || category.label}
                                                            </p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {formatDate(t.date)} • {category.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="font-bold text-green-600 dark:text-green-400">
                                                            +{formatCurrency(t.amount)}
                                                        </span>
                                                        <div className="flex items-center space-x-1">
                                                            <button
                                                                onClick={() => openEditTransaction(t)}
                                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                            >
                                                                <Edit3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTransaction(t.id)}
                                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* Expenses Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-lg">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <h2 className="font-semibold text-gray-900 dark:text-white">Expenses</h2>
                                <div className="flex gap-2">
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg text-sm"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="income">Income</option>
                                        <option value="expense">Expenses</option>
                                    </select>
                                    <select
                                        value={filterCategory}
                                        onChange={(e) => setFilterCategory(e.target.value)}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg text-sm"
                                    >
                                        <option value="all">All Categories</option>
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
                            {filteredTransactions.filter(t => t.type === 'expense').length > 0 ? (
                                filteredTransactions
                                    .filter(t => t.type === 'expense')
                                    .map((t) => {
                                        const category = getCategoryInfo(t.category);
                                        const CategoryIcon = category.icon;

                                        return (
                                            <div key={t.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`p-2 rounded-xl ${category.lightColor} dark:bg-opacity-20`}>
                                                            <CategoryIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                                {t.description || category.label}
                                                            </p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {formatDate(t.date)} • {category.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="font-bold text-red-600 dark:text-red-400">
                                                            -{formatCurrency(t.amount)}
                                                        </span>
                                                        <div className="flex items-center space-x-1">
                                                            <button
                                                                onClick={() => openEditTransaction(t)}
                                                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                                            >
                                                                <Edit3 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTransaction(t.id)}
                                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <div className="p-12 text-center">
                                    <DollarSign className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">No transactions this {viewMode}</p>
                                    <button
                                        onClick={() => setShowAddTransaction(true)}
                                        className="bg-green-600 dark:bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                                    >
                                        Add Transaction
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Income Goal */}
                    {stats.incomeGoal === 0 && (
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6">
                            <div className="text-center">
                                <Target className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Set Income Goal</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Track your progress towards your monthly income target</p>
                                <button
                                    onClick={() => setShowIncomeGoal(true)}
                                    className="bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                                >
                                    Set Goal
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Budget Progress */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm dark:shadow-lg">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 dark:text-white">Budget Progress</h2>
                            <button
                                onClick={() => setShowAddBudget(true)}
                                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium text-sm flex items-center transition-colors"
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
                                                    <div className={`p-1.5 rounded-lg ${category.lightColor} dark:bg-opacity-20`}>
                                                        <CategoryIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-medium text-gray-900 dark:text-white text-sm">{category.label}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-sm font-medium ${budget.isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteBudget(budget.id)}
                                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                    >
                                                        <X className="h-3 w-3 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${budget.isOver ? 'bg-red-500 dark:bg-red-400' : budget.percentage > 80 ? 'bg-orange-500 dark:bg-orange-400' : 'bg-green-500 dark:bg-green-400'
                                                        }`}
                                                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                                />
                                            </div>
                                            {budget.isOver && (
                                                <p className="text-xs text-red-600 dark:text-red-400 flex items-center">
                                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                                    Over budget by {formatCurrency(Math.abs(budget.remaining))}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-6">
                                    <Target className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No budgets set</p>
                                    <button
                                        onClick={() => setShowAddBudget(true)}
                                        className="mt-2 text-green-600 dark:text-green-400 font-medium text-sm hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                    >
                                        Create your first budget
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Income by Category */}
                    {Object.keys(stats.incomeByCategory).length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-900">Income by Source</h2>
                            </div>
                            <div className="p-4 space-y-3">
                                {Object.entries(stats.incomeByCategory)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([categoryId, amount]) => {
                                        const category = getCategoryInfo(categoryId, 'income');
                                        const CategoryIcon = category.icon;
                                        const percentage = stats.income > 0 ? (amount / stats.income * 100) : 0;

                                        return (
                                            <div key={categoryId} className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-lg ${category.lightColor}`}>
                                                    <CategoryIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-medium text-gray-700">{category.label}</span>
                                                        <span className="text-sm font-semibold text-green-600">{formatCurrency(amount)}</span>
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
                            </div>
                        </div>
                    )}

                    {/* Spending by Category */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">Spending by Category</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {Object.entries(stats.expensesByCategory)
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

                            {Object.keys(stats.expensesByCategory).length === 0 && (
                                <p className="text-center text-gray-500 py-4 text-sm">No expenses recorded</p>
                            )}
                        </div>
                    </div>

                    {/* Bills Section */}
                    {bills.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 flex items-center space-x-2">
                                    <Bell className="h-5 w-5 text-orange-600" />
                                    <span>Bills</span>
                                </h2>
                                <button
                                    onClick={() => setShowAddBill(true)}
                                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                                >
                                    <Plus className="h-4 w-4 inline mr-1" />
                                </button>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {bills.slice(0, 5).map(bill => {
                                    const isOverdue = bill.dueDate && new Date(bill.dueDate) < new Date() && !bill.isPaid;
                                    const daysUntilDue = bill.dueDate
                                        ? Math.ceil((new Date(bill.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
                                        : null;

                                    return (
                                        <div key={bill.id} className="p-3 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium text-gray-900">{bill.name}</p>
                                                        {bill.isPaid && (
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Paid</span>
                                                        )}
                                                        {isOverdue && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Overdue</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        {bill.dueDate && formatDate(bill.dueDate)}
                                                        {daysUntilDue !== null && !bill.isPaid && (
                                                            <span className={`ml-2 ${isOverdue ? 'text-red-600' : daysUntilDue <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
                                                                {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `${daysUntilDue} days left`}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-semibold text-gray-900">{formatCurrency(bill.amount)}</span>
                                                    <button
                                                        onClick={() => handleMarkBillPaid(bill.id, bill.isPaid)}
                                                        className={`p-1.5 rounded-lg transition-colors ${bill.isPaid
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Accounts Section */}
                    {accounts.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 flex items-center space-x-2">
                                    <Wallet className="h-5 w-5 text-blue-600" />
                                    <span>Accounts</span>
                                </h2>
                                <button
                                    onClick={() => setShowAddAccount(true)}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    <Plus className="h-4 w-4 inline mr-1" />
                                </button>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {accounts.map(account => {
                                    const accountTypeColors = {
                                        checking: 'bg-blue-100 text-blue-700',
                                        savings: 'bg-green-100 text-green-700',
                                        credit: 'bg-red-100 text-red-700',
                                        investment: 'bg-purple-100 text-purple-700'
                                    };

                                    return (
                                        <div key={account.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <p className="font-medium text-gray-900">{account.name}</p>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${accountTypeColors[account.type] || 'bg-gray-100 text-gray-700'}`}>
                                                            {account.type}
                                                        </span>
                                                    </div>
                                                    {account.bankName && (
                                                        <p className="text-sm text-gray-600">{account.bankName}</p>
                                                    )}
                                                </div>
                                                <span className="font-bold text-gray-900">{formatCurrency(account.balance || 0)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recurring Transactions */}
                    {recurringTransactions.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 flex items-center space-x-2">
                                    <RefreshCw className="h-5 w-5 text-teal-600" />
                                    <span>Recurring</span>
                                </h2>
                                <button
                                    onClick={() => setShowAddRecurring(true)}
                                    className="text-teal-600 hover:text-teal-700 font-medium text-sm"
                                >
                                    <Plus className="h-4 w-4 inline mr-1" />
                                </button>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {recurringTransactions.slice(0, 5).map(recurring => {
                                    const category = getCategoryInfo(recurring.category, recurring.type);
                                    const CategoryIcon = category.icon;

                                    return (
                                        <div key={recurring.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className={`p-2 rounded-xl ${category.lightColor}`}>
                                                        <CategoryIcon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{recurring.description}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{recurring.frequency}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${recurring.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Smart Tips */}
                    {stats.expenses > stats.income && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-orange-800">Spending Alert</p>
                                    <p className="text-sm text-orange-700 mt-1">
                                        Your expenses exceed your income by {formatCurrency(stats.expenses - stats.income)} this {viewMode}.
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

                    {/* Spending Insights */}
                    {spendingTrends.length >= 2 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start space-x-3">
                                <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-blue-800">Spending Insight</p>
                                    {(() => {
                                        const current = spendingTrends[spendingTrends.length - 1];
                                        const previous = spendingTrends[spendingTrends.length - 2];
                                        const change = current.expenses - previous.expenses;
                                        const changePercent = previous.expenses > 0
                                            ? ((change / previous.expenses) * 100).toFixed(0)
                                            : 0;

                                        if (change > 0) {
                                            return (
                                                <p className="text-sm text-blue-700 mt-1">
                                                    You spent {formatCurrency(Math.abs(change))} ({changePercent}%) more this month than last month.
                                                </p>
                                            );
                                        } else if (change < 0) {
                                            return (
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Great! You spent {formatCurrency(Math.abs(change))} ({Math.abs(changePercent)}%) less this month. 🎉
                                                </p>
                                            );
                                        } else {
                                            return (
                                                <p className="text-sm text-blue-700 mt-1">
                                                    Your spending stayed the same this month.
                                                </p>
                                            );
                                        }
                                    })()}
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
                                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'expense', category: 'other' }))}
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
                                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'income', category: 'salary' }))}
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
                                    {(transactionForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).slice(0, 8).map((cat) => (
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
                                    placeholder={transactionForm.type === 'income' ? 'e.g., Monthly salary' : 'e.g., Weekly groceries'}
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
                                    {EXPENSE_CATEGORIES.map(cat => (
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

            {/* Income Goal Modal */}
            {showIncomeGoal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Set Income Goal</h2>
                                <button
                                    onClick={() => setShowIncomeGoal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSetIncomeGoal} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Income Goal *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={incomeGoalForm.amount}
                                        onChange={(e) => setIncomeGoalForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full pl-10 pr-4 py-4 text-2xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    Set a target monthly income to track your progress
                                </p>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowIncomeGoal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Set Goal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Financial Goal Modal */}
            {showAddGoal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Add Financial Goal</h2>
                                <button onClick={() => setShowAddGoal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleAddGoal} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Goal Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={goalForm.name}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g., Emergency Fund"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={goalForm.targetAmount}
                                        onChange={(e) => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={goalForm.currentAmount}
                                        onChange={(e) => setGoalForm(prev => ({ ...prev, currentAmount: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Target Date</label>
                                <input
                                    type="date"
                                    value={goalForm.targetDate}
                                    onChange={(e) => setGoalForm(prev => ({ ...prev, targetDate: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <select
                                        value={goalForm.category}
                                        onChange={(e) => setGoalForm(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="savings">Savings</option>
                                        <option value="debt">Debt Payoff</option>
                                        <option value="emergency">Emergency Fund</option>
                                        <option value="vacation">Vacation</option>
                                        <option value="house">House Down Payment</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                    <select
                                        value={goalForm.priority}
                                        onChange={(e) => setGoalForm(prev => ({ ...prev, priority: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddGoal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Create Goal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Bill Modal */}
            {showAddBill && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Add Bill</h2>
                                <button onClick={() => setShowAddBill(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleAddBill} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bill Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={billForm.name}
                                    onChange={(e) => setBillForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                    placeholder="e.g., Electric Bill"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={billForm.amount}
                                        onChange={(e) => setBillForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={billForm.dueDate}
                                        onChange={(e) => setBillForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select
                                    value={billForm.category}
                                    onChange={(e) => setBillForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="utilities">Utilities</option>
                                    <option value="internet">Internet/Phone</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="subscription">Subscription</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={billForm.recurring}
                                        onChange={(e) => setBillForm(prev => ({ ...prev, recurring: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">Recurring</span>
                                </label>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={billForm.autoPay}
                                        onChange={(e) => setBillForm(prev => ({ ...prev, autoPay: e.target.checked }))}
                                        className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">Auto Pay</span>
                                </label>
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddBill(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-red-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Add Bill'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Account Modal */}
            {showAddAccount && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Add Account</h2>
                                <button onClick={() => setShowAddAccount(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleAddAccount} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={accountForm.name}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., Chase Checking"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                                <select
                                    value={accountForm.type}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="checking">Checking</option>
                                    <option value="savings">Savings</option>
                                    <option value="credit">Credit Card</option>
                                    <option value="investment">Investment</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Current Balance *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={accountForm.balance}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, balance: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={accountForm.bankName}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, bankName: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    value={accountForm.accountNumber}
                                    onChange={(e) => setAccountForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional - Last 4 digits"
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddAccount(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Add Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Recurring Transaction Modal */}
            {showAddRecurring && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Add Recurring Transaction</h2>
                                <button onClick={() => setShowAddRecurring(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleAddRecurring} className="p-6 space-y-4">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRecurringForm(prev => ({ ...prev, type: 'income' }))}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${recurringForm.type === 'income'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Income
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRecurringForm(prev => ({ ...prev, type: 'expense' }))}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${recurringForm.type === 'expense'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Expense
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                                <input
                                    type="text"
                                    required
                                    value={recurringForm.description}
                                    onChange={(e) => setRecurringForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={recurringForm.amount}
                                        onChange={(e) => setRecurringForm(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
                                    <select
                                        value={recurringForm.frequency}
                                        onChange={(e) => setRecurringForm(prev => ({ ...prev, frequency: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                <select
                                    value={recurringForm.category}
                                    onChange={(e) => setRecurringForm(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                >
                                    {(recurringForm.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        value={recurringForm.startDate}
                                        onChange={(e) => setRecurringForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Next Due Date</label>
                                    <input
                                        type="date"
                                        value={recurringForm.nextDueDate}
                                        onChange={(e) => setRecurringForm(prev => ({ ...prev, nextDueDate: e.target.value }))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={recurringForm.endDate}
                                    onChange={(e) => setRecurringForm(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddRecurring(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-3 rounded-xl font-medium hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Create Recurring'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Budget Templates Modal */}
            {showBudgetTemplates && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Budget Templates</h2>
                                <button onClick={() => setShowBudgetTemplates(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {budgetTemplates.map((template, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                            <div className="text-xs text-gray-500">
                                                {template.budgets.length} categories • Based on {formatCurrency(stats.income)} income
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                applyBudgetTemplate(template);
                                                setShowBudgetTemplates(false);
                                            }}
                                            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
