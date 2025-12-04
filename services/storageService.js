import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PARENTS: 'parents',
  SESSIONS: 'sessions',
  OTP_DATA: 'otp_data',
  CHILDREN: 'children',
  ANALYTICS: 'analytics',
};

/**
 * Generic storage operations
 */
export const storageService = {
  // Get item from storage
  async getItem(key) {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  },

  // Set item in storage
  async setItem(key, value) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  },

  // Remove item from storage
  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      return false;
    }
  },

  // Clear all storage
  async clear() {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },
};

/**
 * Parent account storage
 */
export const parentStorage = {
  // Get all parents
  async getAll() {
    const parents = await storageService.getItem(STORAGE_KEYS.PARENTS);
    return parents || {};
  },

  // Get parent by email
  async getByEmail(email) {
    const parents = await parentStorage.getAll();
    return parents[email.toLowerCase()] || null;
  },

  // Save parent
  async save(parent) {
    const parents = await parentStorage.getAll();
    parents[parent.email.toLowerCase()] = parent;
    return await storageService.setItem(STORAGE_KEYS.PARENTS, parents);
  },

  // Delete parent
  async delete(email) {
    const parents = await parentStorage.getAll();
    delete parents[email.toLowerCase()];
    return await storageService.setItem(STORAGE_KEYS.PARENTS, parents);
  },
};

/**
 * Session storage
 */
export const sessionStorage = {
  // Get all sessions
  async getAll() {
    const sessions = await storageService.getItem(STORAGE_KEYS.SESSIONS);
    return sessions || {};
  },

  // Get session by token
  async getByToken(accessToken) {
    const sessions = await sessionStorage.getAll();
    return sessions[accessToken] || null;
  },

  // Save session
  async save(session) {
    const sessions = await sessionStorage.getAll();
    sessions[session.accessToken] = session;
    return await storageService.setItem(STORAGE_KEYS.SESSIONS, sessions);
  },

  // Delete session
  async delete(accessToken) {
    const sessions = await sessionStorage.getAll();
    delete sessions[accessToken];
    return await storageService.setItem(STORAGE_KEYS.SESSIONS, sessions);
  },

  // Get session by device fingerprint
  async getByDeviceFingerprint(fingerprint) {
    const sessions = await sessionStorage.getAll();
    return Object.values(sessions).find(s => s.deviceFingerprint === fingerprint) || null;
  },
};

/**
 * OTP storage
 */
export const otpStorage = {
  // Get all OTP data
  async getAll() {
    const otpData = await storageService.getItem(STORAGE_KEYS.OTP_DATA);
    return otpData || {};
  },

  // Get OTP data for email
  async getByEmail(email) {
    const otpData = await otpStorage.getAll();
    return otpData[email.toLowerCase()] || null;
  },

  // Save OTP data
  async save(email, data) {
    const otpData = await otpStorage.getAll();
    otpData[email.toLowerCase()] = data;
    return await storageService.setItem(STORAGE_KEYS.OTP_DATA, otpData);
  },

  // Delete OTP data
  async delete(email) {
    const otpData = await otpStorage.getAll();
    delete otpData[email.toLowerCase()];
    return await storageService.setItem(STORAGE_KEYS.OTP_DATA, otpData);
  },
};

/**
 * Children storage
 */
export const childrenStorage = {
  // Get all children for a parent
  async getByParentEmail(parentEmail) {
    const allChildren = await storageService.getItem(STORAGE_KEYS.CHILDREN);
    const parentChildren = allChildren?.[parentEmail.toLowerCase()] || [];
    return parentChildren;
  },

  // Save child
  async save(parentEmail, child) {
    const allChildren = await storageService.getItem(STORAGE_KEYS.CHILDREN) || {};
    const parentEmailKey = parentEmail.toLowerCase();
    
    if (!allChildren[parentEmailKey]) {
      allChildren[parentEmailKey] = [];
    }
    
    // If child has ID, update existing; otherwise add new
    const existingIndex = child.id 
      ? allChildren[parentEmailKey].findIndex(c => c.id === child.id)
      : -1;
    
    if (existingIndex >= 0) {
      allChildren[parentEmailKey][existingIndex] = child;
    } else {
      // Generate ID for new child
      child.id = `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      allChildren[parentEmailKey].push(child);
    }
    
    return await storageService.setItem(STORAGE_KEYS.CHILDREN, allChildren);
  },

  // Delete child
  async delete(parentEmail, childId) {
    const allChildren = await storageService.getItem(STORAGE_KEYS.CHILDREN) || {};
    const parentEmailKey = parentEmail.toLowerCase();
    
    if (allChildren[parentEmailKey]) {
      allChildren[parentEmailKey] = allChildren[parentEmailKey].filter(c => c.id !== childId);
      return await storageService.setItem(STORAGE_KEYS.CHILDREN, allChildren);
    }
    
    return true;
  },
};

/**
 * Analytics storage
 */
export const analyticsStorage = {
  // Get all analytics events
  async getAll() {
    const events = await storageService.getItem(STORAGE_KEYS.ANALYTICS);
    return events || [];
  },

  // Add analytics event
  async addEvent(event) {
    const events = await analyticsStorage.getAll();
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    return await storageService.setItem(STORAGE_KEYS.ANALYTICS, events);
  },

  // Clear analytics
  async clear() {
    return await storageService.setItem(STORAGE_KEYS.ANALYTICS, []);
  },
};

