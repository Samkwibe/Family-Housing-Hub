// src/pages/Rent.jsx - Enhanced Rent Management
import React, { useState, useMemo } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Download,
  ChevronRight,
  X,
  Building,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Zap,
  Droplet,
  Wifi,
  Trash2,
  Edit,
  Flame,
  Tv
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Rent() {
  const { rentPayments = [], addRentPayment, loading } = useFamily();
  const { userProfile } = useAuth();
  const { isDark } = useTheme();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showUtilitiesModal, setShowUtilitiesModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [utilities, setUtilities] = useState([]);
  const [editingUtility, setEditingUtility] = useState(null);

  // Utility form state
  const [utilityForm, setUtilityForm] = useState({
    name: '',
    type: 'electricity', // electricity, water, gas, internet, cable, other
    amount: '',
    dueDate: '',
    isPaid: false,
    paidDate: '',
    notes: ''
  });

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: userProfile?.lease?.monthlyRent || '',
    paymentMethod: 'bank_transfer',
    confirmationNumber: '',
    notes: '',
    paidDate: new Date().toISOString().split('T')[0]
  });

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const paidPayments = rentPayments.filter(p => p.status === 'paid');
    const pendingPayments = rentPayments.filter(p => p.status === 'pending' || p.status === 'due');
    const overduePayments = rentPayments.filter(p => {
      if (p.status === 'paid') return false;
      const dueDate = new Date(p.dueDate);
      return dueDate < now;
    });

    const totalPaidThisYear = paidPayments
      .filter(p => new Date(p.paidDate || p.dueDate).getFullYear() === currentYear)
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const nextDue = pendingPayments
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

    return {
      totalPaid: paidPayments.length,
      totalPending: pendingPayments.length,
      totalOverdue: overduePayments.length,
      totalPaidThisYear,
      nextDue,
      monthlyRent: userProfile?.lease?.monthlyRent || 0
    };
  }, [rentPayments, userProfile]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return rentPayments
      .filter(p => filterStatus === 'all' || p.status === filterStatus)
      .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  }, [rentPayments, filterStatus]);

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

  // Get status config
  const getStatusConfig = (status, dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const isOverdue = due < now && status !== 'paid';

    if (status === 'paid') {
      return { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
    if (isOverdue) {
      return { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    }
    return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
  };

  // Days until due
  const getDaysUntil = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Handle payment submission
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount) {
      toast.error('Please enter payment amount');
      return;
    }

    setSubmitting(true);
    try {
      await addRentPayment({
        amount: parseFloat(paymentForm.amount),
        dueDate: new Date(),
        paidDate: new Date(paymentForm.paidDate),
        status: 'paid',
        paymentMethod: paymentForm.paymentMethod,
        confirmationNumber: paymentForm.confirmationNumber,
        notes: paymentForm.notes
      });

      setPaymentForm({
        amount: userProfile?.lease?.monthlyRent || '',
        paymentMethod: 'bank_transfer',
        confirmationNumber: '',
        notes: '',
        paidDate: new Date().toISOString().split('T')[0]
      });
      setShowRecordModal(false);
      toast.success('Payment recorded successfully!');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building },
    { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
    { id: 'check', label: 'Check', icon: FileText },
    { id: 'cash', label: 'Cash', icon: Wallet },
    { id: 'other', label: 'Other', icon: DollarSign }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto dark:bg-gray-900 min-h-screen transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rent & Payments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your rent payments and view payment history</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowRecordModal(true)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-5 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Receipt className="h-5 w-5" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200"
          >
            <DollarSign className="h-5 w-5" />
            <span>Pay Rent</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Monthly Rent */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-100 font-medium">Monthly Rent</p>
            <div className="p-2 bg-white/20 rounded-lg">
              <Building className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(stats.monthlyRent)}</p>
          <p className="text-blue-100 text-sm mt-1">Due 1st of each month</p>
        </div>

        {/* Next Payment Due */}
        <div className={`rounded-2xl p-5 ${stats.nextDue
          ? getDaysUntil(stats.nextDue.dueDate) <= 5
            ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white'
            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
          : 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <p className={stats.nextDue ? 'text-white/80' : 'text-green-100'}>Next Payment</p>
            <div className="p-2 bg-white/20 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          {stats.nextDue ? (
            <>
              <p className="text-3xl font-bold">{formatCurrency(stats.nextDue.amount)}</p>
              <p className={`text-sm mt-1 ${stats.nextDue ? 'text-white/80' : 'text-green-100'}`}>
                Due {formatDate(stats.nextDue.dueDate)}
                {getDaysUntil(stats.nextDue.dueDate) > 0 && ` (${getDaysUntil(stats.nextDue.dueDate)} days)`}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">All Paid!</p>
              <p className="text-green-100 text-sm mt-1">No pending payments</p>
            </>
          )}
        </div>

        {/* Paid This Year */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium">Paid This Year</p>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalPaidThisYear)}</p>
          <p className="text-green-600 dark:text-green-400 text-sm mt-1 flex items-center">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            {stats.totalPaid} payment(s)
          </p>
        </div>

        {/* Payment Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 dark:text-gray-400 font-medium">Status</p>
            <div className={`p-2 rounded-lg ${stats.totalOverdue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              {stats.totalOverdue > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>
          {stats.totalOverdue > 0 ? (
            <>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.totalOverdue} Overdue</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">Requires immediate attention</p>
            </>
          ) : stats.totalPending > 0 ? (
            <>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalPending} Pending</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Upcoming payments</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">Good Standing</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">All payments up to date</p>
            </>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.totalOverdue > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">You have {stats.totalOverdue} overdue payment(s)</p>
              <p className="text-red-600 dark:text-red-400 text-sm">Please make a payment as soon as possible to avoid late fees.</p>
            </div>
          </div>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Pay Now
          </button>
        </div>
      )}

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment History</h2>
            <div className="flex space-x-2">
              {['all', 'paid', 'pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${filterStatus === status
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading?.rent ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => {
              const statusConfig = getStatusConfig(payment.status, payment.dueDate);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={payment.id}
                  className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${payment.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30' :
                      getStatusConfig(payment.status, payment.dueDate).label === 'Overdue' ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                      <StatusIcon className={`h-6 w-6 ${payment.status === 'paid' ? 'text-green-600 dark:text-green-400' :
                        getStatusConfig(payment.status, payment.dueDate).label === 'Overdue' ? 'text-red-600 dark:text-red-400' :
                          'text-yellow-600 dark:text-yellow-400'
                        }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(payment.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      {payment.paymentMethod && payment.status === 'paid' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                          via {payment.paymentMethod.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {payment.status === 'paid'
                          ? `Paid ${formatDate(payment.paidDate)}`
                          : `Due ${formatDate(payment.dueDate)}`
                        }
                      </p>
                      {payment.confirmationNumber && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400">#{payment.confirmationNumber}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color} dark:bg-opacity-30`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No payment records</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Start tracking your rent payments</p>
              <button
                onClick={() => setShowRecordModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Record First Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Utilities & Bills Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mt-8 transition-colors duration-200">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Utilities & Bills</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Track your monthly utility payments and other bills</p>
            </div>
            <button
              onClick={() => {
                setEditingUtility(null);
                setUtilityForm({
                  name: '',
                  type: 'electricity',
                  amount: '',
                  dueDate: '',
                  isPaid: false,
                  paidDate: '',
                  notes: ''
                });
                setShowUtilitiesModal(true);
              }}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Bill</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {utilities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {utilities.map((utility, idx) => {
                const isOverdue = !utility.isPaid && new Date(utility.dueDate) < new Date();
                const utilityIcons = {
                  electricity: Zap,
                  water: Droplet,
                  gas: Flame,
                  internet: Wifi,
                  cable: Tv,
                  other: FileText
                };
                const Icon = utilityIcons[utility.type] || FileText;

                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl border-2 transition-all ${utility.isPaid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : isOverdue
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${utility.isPaid
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : isOverdue
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                          }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{utility.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{utility.type}</p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingUtility(idx);
                            setUtilityForm({ ...utility });
                            setShowUtilitiesModal(true);
                          }}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUtilities(prev => prev.filter((_, i) => i !== idx));
                            toast.success('Bill removed');
                          }}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(utility.amount)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Due: {formatDate(utility.dueDate)}
                      </p>
                      {utility.isPaid && utility.paidDate && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Paid: {formatDate(utility.paidDate)}
                        </p>
                      )}
                      {isOverdue && (
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold">Overdue</p>
                      )}
                      <button
                        onClick={() => {
                          const updated = [...utilities];
                          updated[idx].isPaid = !updated[idx].isPaid;
                          if (updated[idx].isPaid) {
                            updated[idx].paidDate = new Date().toISOString().split('T')[0];
                          } else {
                            updated[idx].paidDate = '';
                          }
                          setUtilities(updated);
                          toast.success(updated[idx].isPaid ? 'Marked as paid' : 'Marked as unpaid');
                        }}
                        className={`w-full mt-2 py-2 rounded-lg font-medium text-sm transition-colors ${utility.isPaid
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                          : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'
                          }`}
                      >
                        {utility.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-gray-400 dark:text-gray-500 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No utilities or bills added</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Start tracking your monthly bills</p>
              <button
                onClick={() => setShowUtilitiesModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add First Bill
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pay Rent Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pay Rent</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center mb-6">
                <p className="text-green-700 dark:text-green-300 font-medium mb-2">Amount Due</p>
                <p className="text-4xl font-bold text-green-800 dark:text-green-300">{formatCurrency(stats.monthlyRent)}</p>
                {stats.nextDue && (
                  <p className="text-green-600 dark:text-green-400 text-sm mt-2">Due {formatDate(stats.nextDue.dueDate)}</p>
                )}
              </div>

              <div className="space-y-4 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Online payment integration coming soon. For now, please record your payment after making it through your preferred method.
                </p>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowRecordModal(true);
                  }}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Record a Payment Instead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
                <button
                  onClick={() => setShowRecordModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount Paid *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paidDate}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paidDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.slice(0, 3).map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: method.id }))}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1 ${paymentForm.paymentMethod === method.id
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <method.icon className={`h-5 w-5 ${paymentForm.paymentMethod === method.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                        }`} />
                      <span className={`text-xs font-medium ${paymentForm.paymentMethod === method.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
                        }`}>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmation Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmation/Reference # (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.confirmationNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  placeholder="e.g., TXN123456"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Record Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Utilities & Bills Modal */}
      {showUtilitiesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-colors duration-200">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingUtility !== null ? 'Edit Bill' : 'Add Bill'}
                </h2>
                <button
                  onClick={() => {
                    setShowUtilitiesModal(false);
                    setEditingUtility(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!utilityForm.name || !utilityForm.amount || !utilityForm.dueDate) {
                  toast.error('Please fill in all required fields');
                  return;
                }

                const newUtility = {
                  ...utilityForm,
                  amount: parseFloat(utilityForm.amount),
                  id: editingUtility !== null ? utilities[editingUtility].id : `utility_${Date.now()}`
                };

                if (editingUtility !== null) {
                  const updated = [...utilities];
                  updated[editingUtility] = newUtility;
                  setUtilities(updated);
                  toast.success('Bill updated');
                } else {
                  setUtilities(prev => [...prev, newUtility]);
                  toast.success('Bill added');
                }

                setShowUtilitiesModal(false);
                setEditingUtility(null);
                setUtilityForm({
                  name: '',
                  type: 'electricity',
                  amount: '',
                  dueDate: '',
                  isPaid: false,
                  paidDate: '',
                  notes: ''
                });
              }}
              className="p-6 space-y-5"
            >
              {/* Bill Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bill Name *
                </label>
                <input
                  type="text"
                  required
                  value={utilityForm.name}
                  onChange={(e) => setUtilityForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  placeholder="e.g., Electric Bill"
                />
              </div>

              {/* Bill Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bill Type *
                </label>
                <select
                  required
                  value={utilityForm.type}
                  onChange={(e) => setUtilityForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="gas">Gas</option>
                  <option value="internet">Internet</option>
                  <option value="cable">Cable/TV</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={utilityForm.amount}
                    onChange={(e) => setUtilityForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={utilityForm.dueDate}
                  onChange={(e) => setUtilityForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={utilityForm.notes}
                  onChange={(e) => setUtilityForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUtilitiesModal(false);
                    setEditingUtility(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingUtility !== null ? 'Update Bill' : 'Add Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
