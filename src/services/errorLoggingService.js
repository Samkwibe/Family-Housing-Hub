// src/services/errorLoggingService.js
// Centralized error logging service for production error tracking

class ErrorLoggingService {
  constructor() {
    this.environment = import.meta.env.MODE || 'development';
    this.isProduction = this.environment === 'production';
    this.errorQueue = [];
    this.maxQueueSize = 50;
  }

  /**
   * Log an error with context
   * @param {Error} error - The error object
   * @param {Object} context - Additional context (component, action, user, etc.)
   */
  logError(error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack || '',
      name: error?.name || 'Error',
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
        environment: this.environment,
      },
    };

    // In development, always log to console
    if (!this.isProduction) {
      console.error('Error Logged:', errorLog);
    }

    // Add to queue
    this.errorQueue.push(errorLog);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest
    }

    // In production, send to logging service
    if (this.isProduction) {
      this.sendToLoggingService(errorLog);
    }

    // Store in localStorage for debugging
    try {
      const storedErrors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      storedErrors.push(errorLog);
      // Keep only last 10 errors in localStorage
      if (storedErrors.length > 10) {
        storedErrors.shift();
      }
      localStorage.setItem('errorLogs', JSON.stringify(storedErrors));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Send error to external logging service (Sentry, LogRocket, etc.)
   * @param {Object} errorLog - The error log object
   */
  async sendToLoggingService(errorLog) {
    try {
      // TODO: Integrate with Sentry or other logging service
      // Example:
      // if (window.Sentry) {
      //   window.Sentry.captureException(new Error(errorLog.message), {
      //     extra: errorLog.context,
      //   });
      // }

      // For now, we can send to a backend endpoint
      // await fetch('/api/logs/error', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog),
      // });
    } catch (e) {
      // Silently fail - don't break the app if logging fails
      console.warn('Failed to send error to logging service:', e);
    }
  }

  /**
   * Log a warning
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  logWarning(message, context = {}) {
    const warningLog = {
      timestamp: new Date().toISOString(),
      message,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    };

    if (!this.isProduction) {
      console.warn('Warning:', warningLog);
    }

    // Store warnings separately if needed
    try {
      const storedWarnings = JSON.parse(localStorage.getItem('warningLogs') || '[]');
      storedWarnings.push(warningLog);
      if (storedWarnings.length > 10) {
        storedWarnings.shift();
      }
      localStorage.setItem('warningLogs', JSON.stringify(storedWarnings));
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Log an info message
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  logInfo(message, context = {}) {
    if (!this.isProduction) {
      console.info('Info:', { message, ...context });
    }
  }

  /**
   * Get error logs (for debugging/admin)
   * @returns {Array} Array of error logs
   */
  getErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem('errorLogs') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Clear error logs
   */
  clearErrorLogs() {
    this.errorQueue = [];
    try {
      localStorage.removeItem('errorLogs');
      localStorage.removeItem('warningLogs');
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Handle API errors with retry logic
   * @param {Error} error - The error
   * @param {Function} retryFn - Function to retry
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Result of retry function or throws error
   */
  async handleWithRetry(error, retryFn, maxRetries = 3) {
    this.logError(error, { action: 'api_call', retryAttempt: 0 });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return await retryFn();
      } catch (retryError) {
        this.logError(retryError, { action: 'api_call', retryAttempt: attempt });
        if (attempt === maxRetries) {
          throw retryError;
        }
      }
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLoggingService();
export default errorLogger;

