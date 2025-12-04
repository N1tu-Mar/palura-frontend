import { parentStorage } from './storageService';
import { trackEvent } from './analyticsService';

/**
 * Parent Profile Service
 * Manages parent profile creation and validation
 */

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 50;

/**
 * Validate parent name
 */
export const validateParentName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: 'Name is required',
    };
  }

  const trimmed = name.trim();
  
  if (trimmed.length < MIN_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name must be at least ${MIN_NAME_LENGTH} characters`,
    };
  }
  
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name must be ${MAX_NAME_LENGTH} characters or less`,
    };
  }
  
  return {
    valid: true,
    error: null,
    name: trimmed,
  };
};

/**
 * Get parent profile
 */
export const getParent = async (email) => {
  return await parentStorage.getByEmail(email);
};

/**
 * Update parent profile
 */
export const updateParentProfile = async (email, profileData) => {
  // Validate name if provided
  if (profileData.name !== undefined) {
    const nameValidation = validateParentName(profileData.name);
    if (!nameValidation.valid) {
      return {
        success: false,
        error: nameValidation.error,
      };
    }
    profileData.name = nameValidation.name;
  }
  
  // Get existing parent
  const existingParent = await parentStorage.getByEmail(email);
  
  if (!existingParent) {
    return {
      success: false,
      error: 'Parent not found',
    };
  }
  
  // Update parent with new profile data
  const updatedParent = {
    ...existingParent,
    ...profileData,
    updatedAt: new Date().toISOString(),
  };
  
  await parentStorage.save(updatedParent);
  
  // Track analytics
  await trackEvent('parent_profile_updated', {
    parentEmail: email.toLowerCase(),
  });
  
  return {
    success: true,
    parent: updatedParent,
  };
};

/**
 * Check if parent profile is complete
 */
export const isParentProfileComplete = (parent) => {
  // For MVP, we consider profile complete if name is set
  return parent && parent.name && parent.name.trim().length >= MIN_NAME_LENGTH;
};

