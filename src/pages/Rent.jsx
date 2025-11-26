// src/pages/Rent.jsx - Enhanced Rent Management
import React, { useState, useMemo } from 'react';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';
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
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Rent() {
  const { rentPayments = [], addRentPayment, loading } = useFamily();
  const { userProfile } = useAuth();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [submitting, setSubmitting] = useState(false);

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rent & Payments</h1>
          <p className="text-gray-600 mt-1">Manage your rent payments and view payment history</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowRecordModal(true)}
            className="bg-white border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-gray-50 transition-colors"
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
        <div className={`rounded-2xl p-5 ${
          stats.nextDue 
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
        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 font-medium">Paid This Year</p>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalPaidThisYear)}</p>
          <p className="text-green-600 text-sm mt-1 flex items-center">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            {stats.totalPaid} payment(s)
          </p>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-500 font-medium">Status</p>
            <div className={`p-2 rounded-lg ${stats.totalOverdue > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              {stats.totalOverdue > 0 ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
          </div>
          {stats.totalOverdue > 0 ? (
            <>
              <p className="text-3xl font-bold text-red-600">{stats.totalOverdue} Overdue</p>
              <p className="text-red-600 text-sm mt-1">Requires immediate attention</p>
            </>
          ) : stats.totalPending > 0 ? (
            <>
              <p className="text-3xl font-bold text-yellow-600">{stats.totalPending} Pending</p>
              <p className="text-gray-500 text-sm mt-1">Upcoming payments</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-green-600">Good Standing</p>
              <p className="text-gray-500 text-sm mt-1">All payments up to date</p>
            </>
          )}
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.totalOverdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">You have {stats.totalOverdue} overdue payment(s)</p>
              <p className="text-red-600 text-sm">Please make a payment as soon as possible to avoid late fees.</p>
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
            <div className="flex space-x-2">
              {['all', 'paid', 'pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                    filterStatus === status
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading?.rent ? (
            <div className="p-8 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => {
              const statusConfig = getStatusConfig(payment.status, payment.dueDate);
              const StatusIcon = statusConfig.icon;

              return (
                <div 
                  key={payment.id} 
                  className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${
                      payment.status === 'paid' ? 'bg-green-100' : 
                      getStatusConfig(payment.status, payment.dueDate).label === 'Overdue' ? 'bg-red-100' : 
                      'bg-yellow-100'
                    }`}>
                      <StatusIcon className={`h-6 w-6 ${
                        payment.status === 'paid' ? 'text-green-600' : 
                        getStatusConfig(payment.status, payment.dueDate).label === 'Overdue' ? 'text-red-600' : 
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(payment.dueDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      {payment.paymentMethod && payment.status === 'paid' && (
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">
                          via {payment.paymentMethod.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {payment.status === 'paid' 
                          ? `Paid ${formatDate(payment.paidDate)}`
                          : `Due ${formatDate(payment.dueDate)}`
                        }
                      </p>
                      {payment.confirmationNumber && (
                        <p className="text-xs text-gray-400">#{payment.confirmationNumber}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payment records</h3>
              <p className="text-gray-600 mb-4">Start tracking your rent payments</p>
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

      {/* Pay Rent Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Pay Rent</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center mb-6">
                <p className="text-green-700 font-medium mb-2">Amount Due</p>
                <p className="text-4xl font-bold text-green-800">{formatCurrency(stats.monthlyRent)}</p>
                {stats.nextDue && (
                  <p className="text-green-600 text-sm mt-2">Due {formatDate(stats.nextDue.dueDate)}</p>
                )}
              </div>

              <div className="space-y-4 text-center">
                <p className="text-gray-600">
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
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                <button
                  onClick={() => setShowRecordModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paidDate}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paidDate: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.slice(0, 3).map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentForm(prev => ({ ...prev, paymentMethod: method.id }))}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1 ${
                        paymentForm.paymentMethod === method.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <method.icon className={`h-5 w-5 ${
                        paymentForm.paymentMethod === method.id ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                      <span className={`text-xs font-medium ${
                        paymentForm.paymentMethod === method.id ? 'text-blue-700' : 'text-gray-600'
                      }`}>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmation Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmation/Reference # (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.confirmationNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, confirmationNumber: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., TXN123456"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
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
    </div>
  );
}
