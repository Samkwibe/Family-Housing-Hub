// src/pages/Rent.jsx
import React from 'react'
import { useFamily } from '../contexts/FamilyContext'
import { DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react'

export default function Rent() {
  const { rentPayments } = useFamily()

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rent & Payments</h1>
          <p className="text-gray-600">Manage your rent payments and history</p>
        </div>
        <button className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 hover:bg-green-700 transition-colors">
          <DollarSign className="h-5 w-5" />
          <span>Pay Rent</span>
        </button>
      </div>

      {/* Current Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Balance</h3>
          <p className="text-3xl font-bold text-gray-900">$1,200</p>
          <p className="text-green-600 font-medium">Due March 1st</p>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Method</h3>
          <p className="text-gray-600">Credit Card ending in 4242</p>
          <button className="text-blue-600 font-medium mt-2">Update</button>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto Pay</h3>
          <p className="text-gray-600">Enabled for monthly payments</p>
          <button className="text-blue-600 font-medium mt-2">Manage</button>
        </div>
      </div>

      {/* Payment History */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Payment History</h2>
        <div className="space-y-4">
          {rentPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                {payment.status === 'paid' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <Clock className="h-8 w-8 text-orange-500" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">
                    ${payment.amount} - {payment.dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-600">
                    {payment.status === 'paid' 
                      ? `Paid on ${payment.paidDate.toLocaleDateString()}`
                      : `Due ${payment.dueDate.toLocaleDateString()}`
                    }
                  </p>
                </div>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                payment.status === 'paid' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {payment.status === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}