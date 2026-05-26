import api from './api';
import { SHOW_VERIFICATION_CODES } from '../config/env';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function storeCode(channel: 'email' | 'phone', target: string, code: string) {
  await api.request('/api/verification/store-code', {
    method: 'POST',
    body: JSON.stringify({ channel, target, code }),
  });
}

export async function sendEmailVerificationCode(email: string) {
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    throw new Error('Invalid email format');
  }
  const code = generateCode();
  await storeCode('email', emailLower, code);

  let delivered = false;
  try {
    await api.sendEmailVerification(emailLower, code);
    delivered = true;
  } catch {
    delivered = false;
  }

  return {
    code,
    delivered,
    showCodeInUi: !delivered || SHOW_VERIFICATION_CODES,
  };
}

export async function sendPhoneVerificationCode(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (normalized.length !== 10) {
    throw new Error('Enter a valid 10-digit US phone number');
  }
  const code = generateCode();
  await storeCode('phone', normalized, code);

  let delivered = false;
  try {
    await api.sendSmsVerification(normalized, code);
    delivered = true;
  } catch {
    delivered = false;
  }

  return {
    code,
    delivered,
    showCodeInUi: !delivered || SHOW_VERIFICATION_CODES,
  };
}

export async function verifyEmailCode(email: string, code: string) {
  await api.request('/api/verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ channel: 'email', target: email.trim().toLowerCase(), code }),
  });
  return { verified: true };
}

export async function verifyPhoneCode(phone: string, code: string) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  await api.request('/api/verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ channel: 'phone', target: normalized, code }),
  });
  return { verified: true };
}
