/**
 * Email validation utility
 * Validates email format and checks against disposable email domains
 */

// Common disposable email domains (subset for MVP)
const DISPOSABLE_DOMAINS = [
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'fakeinbox.com',
  'trashmail.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'bccto.me',
  'chitthi.in',
  'dispostable.com',
  'meltmail.com',
  'emailondeck.com',
  'spamgourmet.com',
  'mytrashmail.com',
  'tempinbox.co.uk',
  'mintemail.com',
  'melt.li',
  '33mail.com',
  'mailcatch.com',
  'spambox.us',
];

/**
 * Validates email format using regex
 */
export const isValidEmailFormat = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant regex (simplified version)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // More strict validation
  const strictEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return strictEmailRegex.test(email.trim());
};

/**
 * Checks if email domain is disposable
 */
export const isDisposableDomain = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const domain = email.toLowerCase().split('@')[1];
  if (!domain) {
    return false;
  }

  return DISPOSABLE_DOMAINS.includes(domain);
};

/**
 * Validates email (format + disposable check)
 * Returns { valid: boolean, error: string | null }
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return {
      valid: false,
      error: 'Email is required',
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!isValidEmailFormat(trimmedEmail)) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  if (isDisposableDomain(trimmedEmail)) {
    return {
      valid: false,
      error: 'Disposable email domains are not allowed',
    };
  }

  return {
    valid: true,
    error: null,
  };
};

