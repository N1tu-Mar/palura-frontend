import { otpStorage } from './storageService';

/**
 * OTP Service
 * Generates, validates, and tracks OTP attempts
 * - 6 digits
 * - Valid for 10 minutes
 * - Max 5 attempts per hour per email
 */

const OTP_CONFIG = {
  LENGTH: 6,
  VALIDITY_MS: 10 * 60 * 1000, // 10 minutes
  MAX_ATTEMPTS: 5,
  ATTEMPT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
};

/**
 * Generate a random 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Get OTP data for email (or create if doesn't exist)
 */
const getOTPData = async (email) => {
  let data = await otpStorage.getByEmail(email);
  
  if (!data) {
    data = {
      email: email.toLowerCase(),
      attempts: [],
      currentOTP: null,
      otpGeneratedAt: null,
    };
  }
  
  return data;
};

/**
 * Clean old attempts outside the window
 */
const cleanOldAttempts = (attempts) => {
  const now = Date.now();
  return attempts.filter(attempt => 
    now - attempt.timestamp < OTP_CONFIG.ATTEMPT_WINDOW_MS
  );
};

/**
 * Check if email has exceeded max attempts
 */
const hasExceededMaxAttempts = (attempts) => {
  const recentAttempts = cleanOldAttempts(attempts);
  return recentAttempts.length >= OTP_CONFIG.MAX_ATTEMPTS;
};

/**
 * Generate and store OTP for email
 */
export const generateOTPForEmail = async (email) => {
  const data = await getOTPData(email);
  
  // Check if too many attempts
  if (hasExceededMaxAttempts(data.attempts)) {
    return {
      success: false,
      error: 'Too many attempts. Please try again later.',
    };
  }
  
  // Generate new OTP
  const otp = generateOTP();
  const now = Date.now();
  
  data.currentOTP = otp;
  data.otpGeneratedAt = now;
  
  await otpStorage.save(email, data);
  
  // In a real app, you'd send this via email/SMS
  // For local storage, we'll just return it (for testing)
  console.log(`[OTP Service] Generated OTP for ${email}: ${otp}`);
  
  return {
    success: true,
    otp, // Only for development/testing
    expiresAt: now + OTP_CONFIG.VALIDITY_MS,
  };
};

/**
 * Validate OTP for email
 */
export const validateOTP = async (email, inputOTP) => {
  const data = await getOTPData(email);
  
  // Check if OTP exists
  if (!data.currentOTP || !data.otpGeneratedAt) {
    return {
      valid: false,
      error: 'No OTP found. Please request a new one.',
    };
  }
  
  // Check if OTP expired
  const now = Date.now();
  const isExpired = now - data.otpGeneratedAt > OTP_CONFIG.VALIDITY_MS;
  
  if (isExpired) {
    // Record failed attempt
    data.attempts.push({
      otp: inputOTP,
      timestamp: now,
      success: false,
      reason: 'expired',
    });
    await otpStorage.save(email, data);
    
    return {
      valid: false,
      error: 'Code expired',
    };
  }
  
  // Check if too many attempts
  if (hasExceededMaxAttempts(data.attempts)) {
    return {
      valid: false,
      error: 'Too many attempts',
    };
  }
  
  // Validate OTP
  const isValid = data.currentOTP === inputOTP;
  
  // Record attempt
  data.attempts.push({
    otp: inputOTP,
    timestamp: now,
    success: isValid,
    reason: isValid ? null : 'invalid',
  });
  
  if (isValid) {
    // Clear OTP on success
    data.currentOTP = null;
    data.otpGeneratedAt = null;
  }
  
  await otpStorage.save(email, data);
  
  if (!isValid) {
    // Check if now exceeded max attempts
    const recentAttempts = cleanOldAttempts(data.attempts);
    if (recentAttempts.length >= OTP_CONFIG.MAX_ATTEMPTS) {
      return {
        valid: false,
        error: 'Too many attempts',
      };
    }
    
    return {
      valid: false,
      error: 'Invalid code',
    };
  }
  
  return {
    valid: true,
    error: null,
  };
};

/**
 * Get remaining attempts for email
 */
export const getRemainingAttempts = async (email) => {
  const data = await getOTPData(email);
  const recentAttempts = cleanOldAttempts(data.attempts);
  return Math.max(0, OTP_CONFIG.MAX_ATTEMPTS - recentAttempts.length);
};

/**
 * Check if OTP is still valid (not expired)
 */
export const isOTPValid = async (email) => {
  const data = await getOTPData(email);
  
  if (!data.currentOTP || !data.otpGeneratedAt) {
    return false;
  }
  
  const now = Date.now();
  return now - data.otpGeneratedAt <= OTP_CONFIG.VALIDITY_MS;
};

