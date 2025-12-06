// src/components/PaymentForm.jsx - Stripe Payment Form Component
import React, { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentService } from '../services/paymentService';
import errorLogger from '../services/errorLoggingService';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

export default function PaymentForm({ 
  amount, 
  userId, 
  description, 
  metadata = {},
  onSuccess,
  onCancel 
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingIntent, setLoadingIntent] = useState(true);

  // Create payment intent on mount
  useEffect(() => {
    const createIntent = async () => {
      if (!amount || !userId) {
        setLoadingIntent(false);
        return;
      }

      try {
        setLoadingIntent(true);
        const amountInCents = Math.round(parseFloat(amount) * 100);
        const response = await paymentService.createPaymentIntent({
          amount: amountInCents,
          currency: 'usd',
          description: description || `Rent payment for ${new Date().toLocaleDateString()}`,
          metadata: {
            userId,
            type: 'rent',
            ...metadata
          }
        });

        if (response.success && response.clientSecret) {
          setClientSecret(response.clientSecret);
        } else {
          setError(response.error || 'Failed to initialize payment');
        }
      } catch (err) {
        errorLogger.logError(err, {
          component: 'PaymentForm',
          action: 'createPaymentIntent',
        });
        setError('Failed to initialize payment. Please try again.');
      } finally {
        setLoadingIntent(false);
      }
    };

    createIntent();
  }, [amount, userId, description, metadata]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setError('Payment system not ready. Please wait...');
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    try {
      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: metadata.name || 'User',
              email: metadata.email
            }
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        setSucceeded(true);
        
        // Save payment record
        try {
          await paymentService.savePaymentRecord({
            userId,
            amount,
            paymentIntentId: paymentIntent.id,
            status: 'paid',
            paymentMethod: 'card',
            paidDate: new Date(),
            dueDate: metadata.dueDate || new Date(),
            confirmationNumber: paymentIntent.id,
            notes: `Stripe payment: ${paymentIntent.id}`,
            metadata: {
              stripePaymentIntentId: paymentIntent.id,
              stripeChargeId: paymentIntent.charges?.data[0]?.id,
              ...metadata
            }
          });

          toast.success('Payment processed successfully!');
          
          if (onSuccess) {
            onSuccess(paymentIntent);
          }
        } catch (saveError) {
          console.error('Error saving payment:', saveError);
          toast.error('Payment processed but failed to save record. Please contact support.');
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'An error occurred processing your payment');
      setProcessing(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">Your payment has been processed successfully.</p>
        <button
          onClick={onSuccess}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Display */}
      <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
        <p className="text-blue-700 dark:text-blue-300 font-medium mb-2">Amount to Pay</p>
        <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
          ${parseFloat(amount).toFixed(2)}
        </p>
      </div>

      {/* Card Element */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-xl p-4 bg-white dark:bg-gray-700">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        {error && (
          <div className="mt-2 flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
        <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Your payment information is secure and encrypted. We never store your card details.
        </p>
      </div>

      {/* Test Card Info (Development Only) */}
      {import.meta.env.DEV && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Test Mode - Use these test cards:
          </p>
          <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
            <li>• Success: 4242 4242 4242 4242</li>
            <li>• Decline: 4000 0000 0000 0002</li>
            <li>• Any future expiry date, any CVC</li>
          </ul>
        </div>
      )}

      {/* Loading state while creating intent */}
      {loadingIntent && (
        <div className="text-center py-4">
          <Loader className="h-6 w-6 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Initializing payment...</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing || loadingIntent}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing || !clientSecret || loadingIntent}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {processing ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Pay ${parseFloat(amount).toFixed(2)}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

