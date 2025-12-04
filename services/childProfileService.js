import { childrenStorage } from './storageService';
import { trackEvent } from './analyticsService';

/**
 * Child Profile Service
 * Manages child profile creation and validation
 */

const MAX_CHILDREN_PER_PARENT = 5;
const MIN_AGE = 2;
const MAX_AGE = 14;
const MIN_NICKNAME_LENGTH = 2;
const MAX_NICKNAME_LENGTH = 20;

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validate date of birth
 */
export const validateDOB = (dob) => {
  if (!dob) {
    return {
      valid: false,
      error: 'Date of birth is required',
    };
  }

  const birthDate = new Date(dob);
  const today = new Date();
  
  // Check if valid date
  if (isNaN(birthDate.getTime())) {
    return {
      valid: false,
      error: 'Invalid date',
    };
  }
  
  // Check if date is in the future
  if (birthDate > today) {
    return {
      valid: false,
      error: 'Date of birth cannot be in the future',
    };
  }
  
  // Check age range
  const age = calculateAge(dob);
  
  if (age < MIN_AGE) {
    return {
      valid: false,
      error: `Child must be at least ${MIN_AGE} years old`,
    };
  }
  
  if (age > MAX_AGE) {
    return {
      valid: false,
      error: `Child must be ${MAX_AGE} years old or younger`,
    };
  }
  
  return {
    valid: true,
    error: null,
    age,
  };
};

/**
 * Validate nickname
 */
export const validateNickname = (nickname) => {
  if (!nickname || typeof nickname !== 'string') {
    return {
      valid: false,
      error: 'Nickname is required',
    };
  }

  const trimmed = nickname.trim();
  
  if (trimmed.length < MIN_NICKNAME_LENGTH) {
    return {
      valid: false,
      error: `Nickname must be at least ${MIN_NICKNAME_LENGTH} characters`,
    };
  }
  
  if (trimmed.length > MAX_NICKNAME_LENGTH) {
    return {
      valid: false,
      error: `Nickname must be ${MAX_NICKNAME_LENGTH} characters or less`,
    };
  }
  
  return {
    valid: true,
    error: null,
    nickname: trimmed,
  };
};

/**
 * Validate language profile
 */
export const validateLanguageProfile = (languageProfile) => {
  // For MVP, accept any non-empty string
  // In production, you'd validate against a list of supported languages
  if (!languageProfile || typeof languageProfile !== 'string' || !languageProfile.trim()) {
    return {
      valid: false,
      error: 'Language profile is required',
    };
  }
  
  return {
    valid: true,
    error: null,
    languageProfile: languageProfile.trim(),
  };
};

/**
 * Get all children for a parent
 */
export const getChildren = async (parentEmail) => {
  return await childrenStorage.getByParentEmail(parentEmail);
};

/**
 * Check if parent can create more children
 */
export const canCreateChild = async (parentEmail) => {
  const children = await getChildren(parentEmail);
  return children.length < MAX_CHILDREN_PER_PARENT;
};

/**
 * Create a child profile
 */
export const createChild = async (parentEmail, childData) => {
  // Validate nickname
  const nicknameValidation = validateNickname(childData.nickname);
  if (!nicknameValidation.valid) {
    return {
      success: false,
      error: nicknameValidation.error,
    };
  }
  
  // Validate DOB
  const dobValidation = validateDOB(childData.dob);
  if (!dobValidation.valid) {
    return {
      success: false,
      error: dobValidation.error,
    };
  }
  
  // Validate language profile
  const languageValidation = validateLanguageProfile(childData.languageProfile);
  if (!languageValidation.valid) {
    return {
      success: false,
      error: languageValidation.error,
    };
  }
  
  // Check if parent can create more children
  const canCreate = await canCreateChild(parentEmail);
  if (!canCreate) {
    return {
      success: false,
      error: `Maximum of ${MAX_CHILDREN_PER_PARENT} children allowed per parent`,
    };
  }
  
  // Create child object
  const child = {
    nickname: nicknameValidation.nickname,
    dob: childData.dob,
    age: dobValidation.age,
    languageProfile: languageValidation.languageProfile,
    avatar: null, // No avatar for now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Save child
  await childrenStorage.save(parentEmail, child);
  
  // Track analytics
  await trackEvent('child_created', {
    parentEmail: parentEmail.toLowerCase(),
    childId: child.id,
  });
  
  return {
    success: true,
    child,
  };
};

/**
 * Update child profile
 */
export const updateChild = async (parentEmail, childId, updates) => {
  const children = await getChildren(parentEmail);
  const child = children.find(c => c.id === childId);
  
  if (!child) {
    return {
      success: false,
      error: 'Child not found',
    };
  }
  
  // Validate updates if provided
  if (updates.nickname !== undefined) {
    const nicknameValidation = validateNickname(updates.nickname);
    if (!nicknameValidation.valid) {
      return {
        success: false,
        error: nicknameValidation.error,
      };
    }
    child.nickname = nicknameValidation.nickname;
  }
  
  if (updates.dob !== undefined) {
    const dobValidation = validateDOB(updates.dob);
    if (!dobValidation.valid) {
      return {
        success: false,
        error: dobValidation.error,
      };
    }
    child.dob = updates.dob;
    child.age = dobValidation.age;
  }
  
  if (updates.languageProfile !== undefined) {
    const languageValidation = validateLanguageProfile(updates.languageProfile);
    if (!languageValidation.valid) {
      return {
        success: false,
        error: languageValidation.error,
      };
    }
    child.languageProfile = languageValidation.languageProfile;
  }
  
  child.updatedAt = new Date().toISOString();
  
  await childrenStorage.save(parentEmail, child);
  
  return {
    success: true,
    child,
  };
};

/**
 * Delete child profile
 */
export const deleteChild = async (parentEmail, childId) => {
  await childrenStorage.delete(parentEmail, childId);
  return {
    success: true,
  };
};

