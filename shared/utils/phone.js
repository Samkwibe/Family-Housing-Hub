/**
 * US phone normalization — shared by web and mobile.
 * Always stores/compares 10-digit national numbers.
 */

export function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** Normalize to 10-digit US mobile (strips leading 1 on 11-digit). */
export function normalizeUSPhone(phone) {
  let d = digitsOnly(phone);
  if (d.length === 11 && d.startsWith('1')) {
    d = d.slice(1);
  }
  return d.length === 10 ? d : '';
}

export function formatUSPhone(phone) {
  const d = normalizeUSPhone(phone);
  if (!d) return '';
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function validateUSPhone(phone) {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }
  const d = normalizeUSPhone(phone);
  if (d.length !== 10) {
    return { isValid: false, message: 'Phone number must be 10 digits' };
  }
  const fakeNumbers = ['0000000000', '1111111111', '1234567890', '9999999999', '5555555555'];
  if (fakeNumbers.includes(d)) {
    return { isValid: false, message: 'Please use a valid phone number' };
  }
  return {
    isValid: true,
    message: 'Phone number is valid',
    formatted: formatUSPhone(d),
    digitsOnly: d,
  };
}

export function resolveLoginEmailFromIdentifier(identifier, findEmailByPhoneDigits) {
  const raw = String(identifier || '').trim();
  if (!raw) throw new Error('Enter your email or phone number');
  if (raw.includes('@')) {
    return raw.toLowerCase();
  }
  const ten = normalizeUSPhone(raw);
  if (!ten) {
    throw new Error('Use a valid email or 10-digit US mobile number');
  }
  return findEmailByPhoneDigits(ten);
}
