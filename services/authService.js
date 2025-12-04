import { parentStorage, sessionStorage } from './storageService';
import { generateOTPForEmail, validateOTP } from './otpService';
import { validateEmail } from '../utils/emailValidation';
import { analyticsStorage } from './storageService';

/**
 * Generate a simple device fingerprint
 * In production, this would use more sophisticated methods
 */
const generateDeviceFingerprint = () => {
  // Simple fingerprint based on user agent and screen info
  // In a real app, you'd use more sophisticated methods
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const screenInfo = typeof screen !== 'undefined' 
    ? `${screen.width}x${screen.height}` 
    : 'unknown';
  
  // Create a simple hash
  const str = `${userAgent}_${screenInfo}_${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `device_${Math.abs(hash).toString(36)}`;
};

/**
 * Generate access and refresh tokens
 */
const generateTokens = () => {
  const accessToken = `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return { accessToken, refreshToken };
};

/**
 * Rotate refresh token (generate new tokens)
 */
const rotateRefreshToken = (oldRefreshToken) => {
  const newTokens = generateTokens();
  return {
    ...newTokens,
    oldRefreshToken, // Keep old one for validation during rotation
  };
};

/**
 * Start signup process - request OTP
 */
export const startSignup = async (email) => {
  // Track analytics
  await analyticsStorage.addEvent({
    event: 'auth_signup_started',
    email: email.toLowerCase(),
  });
  
  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    await analyticsStorage.addEvent({
      event: 'auth_signup_failed',
      email: email.toLowerCase(),
      reason: emailValidation.error,
    });
    
    return {
      success: false,
      error: emailValidation.error,
    };
  }
  
  // Check if parent already exists
  const existingParent = await parentStorage.getByEmail(email);
  if (existingParent) {
    // For MVP, we'll allow re-signup (in production, you might want to show "already exists" or "sign in")
    // Still generate OTP for them
  }
  
  // Generate OTP
  const otpResult = await generateOTPForEmail(email);
  
  if (!otpResult.success) {
    await analyticsStorage.addEvent({
      event: 'auth_signup_failed',
      email: email.toLowerCase(),
      reason: otpResult.error,
    });
    
    return {
      success: false,
      error: otpResult.error,
    };
  }
  
  // Always return OTP in development (for testing)
  // Check both __DEV__ (React Native) and NODE_ENV (web)
  const isDev = (typeof __DEV__ !== 'undefined' && __DEV__) || 
                (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') ||
                (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost');
  
  if (isDev && otpResult.otp) {
    console.log(`[Auth Service] OTP for ${email}: ${otpResult.otp}`);
  }
  
  const result = {
    success: true,
    expiresAt: otpResult.expiresAt,
  };
  
  // In development, always return OTP for testing
  if (isDev && otpResult.otp) {
    result.otp = otpResult.otp;
  }
  
  return result;
};

/**
 * Complete signup - verify OTP and create session
 */
export const completeSignup = async (email, otp) => {
  // Validate OTP
  const otpValidation = await validateOTP(email, otp);
  
  if (!otpValidation.valid) {
    await analyticsStorage.addEvent({
      event: 'auth_signup_failed',
      email: email.toLowerCase(),
      reason: otpValidation.error,
    });
    
    return {
      success: false,
      error: otpValidation.error,
    };
  }
  
  // Create or update parent account
  const parent = {
    email: email.toLowerCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await parentStorage.save(parent);
  
  // Generate device fingerprint
  const deviceFingerprint = generateDeviceFingerprint();
  
  // Generate tokens
  const { accessToken, refreshToken } = generateTokens();
  
  // Create session
  const session = {
    accessToken,
    refreshToken,
    parentEmail: email.toLowerCase(),
    deviceFingerprint,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  
  await sessionStorage.save(session);
  
  // Track success
  await analyticsStorage.addEvent({
    event: 'auth_signup_success',
    email: email.toLowerCase(),
  });
  
  return {
    success: true,
    session,
    parent,
  };
};

/**
 * Get current session from access token
 */
export const getSession = async (accessToken) => {
  if (!accessToken) {
    return null;
  }
  
  const session = await sessionStorage.getByToken(accessToken);
  
  if (!session) {
    return null;
  }
  
  // Check if session expired
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  
  if (now > expiresAt) {
    // Session expired, delete it
    await sessionStorage.delete(accessToken);
    return null;
  }
  
  return session;
};

/**
 * Refresh session using refresh token
 */
export const refreshSession = async (refreshToken) => {
  if (!refreshToken) {
    return null;
  }
  
  // Find session by refresh token
  const allSessions = await sessionStorage.getAll();
  const session = Object.values(allSessions).find(s => s.refreshToken === refreshToken);
  
  if (!session) {
    return null;
  }
  
  // Rotate tokens
  const newTokens = rotateRefreshToken(refreshToken);
  
  // Update session with new tokens
  const updatedSession = {
    ...session,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  
  // Delete old session
  await sessionStorage.delete(session.accessToken);
  
  // Save new session
  await sessionStorage.save(updatedSession);
  
  return updatedSession;
};

/**
 * Sign out - delete session
 */
export const signOut = async (accessToken) => {
  if (accessToken) {
    await sessionStorage.delete(accessToken);
  }
  return { success: true };
};

/**
 * Get parent by session
 */
export const getParentFromSession = async (accessToken) => {
  const session = await getSession(accessToken);
  if (!session) {
    return null;
  }
  
  const parent = await parentStorage.getByEmail(session.parentEmail);
  return parent;
};

