/**
 * Comprehensive Validation Utilities
 * Production-ready validation for all user inputs
 */

// Email validation - real format check
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' };
  }

  // Real email format validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format. Please enter a valid email address.' };
  }

  // Check for common fake domains
  const fakeDomains = ['test.com', 'example.com', 'fake.com', 'invalid.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (fakeDomains.includes(domain)) {
    return { valid: false, error: 'Please use a real email address.' };
  }

  return { valid: true, error: null };
};

// Phone number validation - US format (optional)
export const validatePhone = (phone) => {
  // If empty, it's valid (optional field)
  if (!phone || phone.trim() === '') {
    return { valid: true, error: null };
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Check if it's a valid US phone number (10 or 11 digits)
  if (digitsOnly.length < 10 || digitsOnly.length > 11) {
    return { valid: false, error: 'Phone number must be 10 digits (e.g., 6034971027)' };
  }

  // If 11 digits, must start with 1
  if (digitsOnly.length === 11 && !digitsOnly.startsWith('1')) {
    return { valid: false, error: 'Phone number must be 10 digits or start with 1' };
  }

  // Check for obviously fake numbers (all same digits, starts with 000, etc.)
  const checkDigits = digitsOnly.length === 11 ? digitsOnly.slice(1) : digitsOnly;
  if (/^(\d)\1{9}$/.test(checkDigits) || checkDigits.startsWith('000')) {
    return { valid: false, error: 'Please enter a valid phone number.' };
  }

  return { valid: true, error: null, formatted: formatPhoneNumber(digitsOnly) };
};

// Format phone number for display
export const formatPhoneNumber = (phone) => {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  return phone;
};

// Password validation - AWS Cognito requirements
export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  // Check for at least one special character
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }

  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'This password is too common. Please choose a stronger password.' };
  }

  return { valid: true, error: null, strength: calculatePasswordStrength(password) };
};

// Calculate password strength
export const calculatePasswordStrength = (password) => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/\d/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};

// XSS Protection - sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

// Name validation
export const validateName = (name, fieldName = 'Name') => {
  if (!name || name.trim() === '') {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (name.trim().length > 50) {
    return { valid: false, error: `${fieldName} must be less than 50 characters` };
  }

  // Check for only special characters or numbers
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return { valid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { valid: true, error: null };
};

// Validate password match
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true, error: null };
};



