// src/services/paymentService.js - Stripe Payment Integration
import { loadStripe } from '@stripe/stripe-js';
import { rentService } from './firebaseService';
import toast from 'react-hot-toast';

// Initialize Stripe (use test key for development)
// IMPORTANT: Replace with your actual Stripe publishable key
// Get it from: https://dashboard.stripe.com/test/apikeys
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51...';

let stripePromise = null;

// Initialize Stripe
const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY !== 'pk_test_51...') {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

/**
 * Payment Service
 * Handles payment processing through Stripe
 */
class PaymentService {
  /**
   * Process a rent payment
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.amount - Amount in dollars
   * @param {string} paymentData.userId - User ID
   * @param {string} paymentData.description - Payment description
   * @param {Object} paymentData.metadata - Additional metadata
   * @returns {Promise<Object>} Payment result
   */
  async processPayment(paymentData) {
    try {
      const { amount, userId, description, metadata = {} } = paymentData;

      if (!amount || amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Convert amount to cents (Stripe uses cents)
      const amountInCents = Math.round(amount * 100);

      // Create payment intent on backend
      // NOTE: In production, this should be done on your backend server
      // For now, we'll simulate the payment flow
      const response = await this.createPaymentIntent({
        amount: amountInCents,
        currency: 'usd',
        description: description || `Rent payment for ${new Date().toLocaleDateString()}`,
        metadata: {
          userId,
          type: 'rent',
          ...metadata
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create payment intent');
      }

      // Initialize Stripe
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe is not initialized. Please add your Stripe publishable key.');
      }

      // Confirm payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        response.clientSecret,
        {
          payment_method: {
            card: response.paymentMethod,
            billing_details: {
              name: metadata.name || 'User',
              email: metadata.email
            }
          }
        }
      );

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Save payment to Firestore
        await this.savePaymentRecord({
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

        return {
          success: true,
          paymentIntent,
          message: 'Payment processed successfully'
        };
      }

      throw new Error('Payment was not completed');
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
  }

  /**
   * Create payment intent (should be done on backend in production)
   * @param {Object} intentData - Payment intent data
   * @returns {Promise<Object>} Payment intent response
   */
  async createPaymentIntent(intentData) {
    try {
      // NOTE: In production, this should call your backend API
      // For now, we'll return a mock response for development
      // Replace this with an actual API call to your backend
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      const response = await fetch(`${backendUrl}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(intentData)
      });

      if (!response.ok) {
        // Fallback to mock for development
        if (response.status === 404 || !backendUrl.includes('localhost')) {
          console.warn('Backend not available, using mock payment for development');
          return this.createMockPaymentIntent(intentData);
        }
        throw new Error('Failed to create payment intent');
      }

      return await response.json();
    } catch (error) {
      console.warn('Payment intent creation failed, using mock for development:', error);
      // Return mock for development
      return this.createMockPaymentIntent(intentData);
    }
  }

  /**
   * Mock payment intent for development (remove in production)
   */
  createMockPaymentIntent(intentData) {
    return {
      success: true,
      clientSecret: 'mock_client_secret_' + Date.now(),
      paymentMethod: {
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      },
      paymentIntentId: 'pi_mock_' + Date.now()
    };
  }

  /**
   * Save payment record to Firestore
   * @param {Object} paymentRecord - Payment record data
   */
  async savePaymentRecord(paymentRecord) {
    try {
      const paymentData = {
        userId: paymentRecord.userId,
        amount: paymentRecord.amount,
        dueDate: paymentRecord.dueDate instanceof Date 
          ? paymentRecord.dueDate 
          : new Date(paymentRecord.dueDate),
        paidDate: paymentRecord.paidDate instanceof Date 
          ? paymentRecord.paidDate 
          : new Date(paymentRecord.paidDate),
        status: paymentRecord.status || 'paid',
        paymentMethod: paymentRecord.paymentMethod || 'card',
        confirmationNumber: paymentRecord.confirmationNumber || paymentRecord.paymentIntentId,
        notes: paymentRecord.notes || '',
        metadata: paymentRecord.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await rentService.addPayment(paymentData.userId, paymentData);
      return paymentData;
    } catch (error) {
      console.error('Error saving payment record:', error);
      throw new Error('Failed to save payment record');
    }
  }

  /**
   * Get payment history
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Payment history
   */
  async getPaymentHistory(userId) {
    try {
      return await rentService.getPayments(userId);
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw new Error('Failed to load payment history');
    }
  }

  /**
   * Generate payment receipt
   * @param {Object} payment - Payment object
   * @returns {Object} Receipt data
   */
  generateReceipt(payment) {
    return {
      receiptNumber: payment.confirmationNumber || payment.id,
      date: payment.paidDate,
      amount: payment.amount,
      description: `Rent payment for ${new Date(payment.dueDate).toLocaleDateString()}`,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      metadata: payment.metadata || {}
    };
  }

  /**
   * Export payment history to CSV
   * @param {Array} payments - Array of payment objects
   * @returns {string} CSV string
   */
  exportToCSV(payments) {
    const headers = ['Date', 'Amount', 'Status', 'Payment Method', 'Confirmation Number', 'Notes'];
    const rows = payments.map(payment => [
      new Date(payment.paidDate || payment.dueDate).toLocaleDateString(),
      `$${payment.amount.toFixed(2)}`,
      payment.status,
      payment.paymentMethod,
      payment.confirmationNumber || 'N/A',
      payment.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download payment receipt as PDF (client-side generation)
   * @param {Object} payment - Payment object
   */
  async downloadReceipt(payment) {
    try {
      const receipt = this.generateReceipt(payment);
      
      // Create a simple HTML receipt
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${receipt.receiptNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .receipt-details { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .amount { font-size: 24px; font-weight: bold; color: #10b981; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payment Receipt</h1>
            <p>Receipt #${receipt.receiptNumber}</p>
          </div>
          <div class="receipt-details">
            <div class="detail-row">
              <span>Date:</span>
              <span>${new Date(receipt.date).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span>Amount:</span>
              <span class="amount">$${receipt.amount.toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span>Status:</span>
              <span>${receipt.status}</span>
            </div>
            <div class="detail-row">
              <span>Payment Method:</span>
              <span>${receipt.paymentMethod}</span>
            </div>
            <div class="detail-row">
              <span>Description:</span>
              <span>${receipt.description}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Open in new window for printing/downloading
      const printWindow = window.open('', '_blank');
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait a bit then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;

