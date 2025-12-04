import { analyticsStorage } from './storageService';

/**
 * Analytics Service
 * Tracks events locally (no API calls)
 */

/**
 * Track an analytics event
 */
export const trackEvent = async (eventName, properties = {}) => {
  try {
    await analyticsStorage.addEvent({
      event: eventName,
      ...properties,
    });
    
    // Log for debugging (remove in production)
    console.log(`[Analytics] ${eventName}`, properties);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

/**
 * Get all analytics events
 */
export const getAllEvents = async () => {
  return await analyticsStorage.getAll();
};

/**
 * Clear all analytics
 */
export const clearAnalytics = async () => {
  return await analyticsStorage.clear();
};

/**
 * Get events by name
 */
export const getEventsByName = async (eventName) => {
  const allEvents = await analyticsStorage.getAll();
  return allEvents.filter(event => event.event === eventName);
};

