/**
 * Reels Utility
 * Manages reel places using in-memory storage (can be upgraded to AsyncStorage later)
 */

// In-memory storage for reels
let reelsCache = [];

/**
 * Get all reel place IDs
 * @returns {Promise<Array<string>>} Array of reel place IDs
 */
export const getReels = async () => {
  try {
    // Try to use AsyncStorage if available
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const REELS_KEY = "@spotnere_reels";
    const reelsJson = await AsyncStorage.getItem(REELS_KEY);
    if (reelsJson) {
      const reels = JSON.parse(reelsJson);
      reelsCache = reels; // Sync cache
      return reels;
    }
    return reelsCache;
  } catch (error) {
    // Fallback to in-memory cache if AsyncStorage is not available
    console.log("Using in-memory reels storage");
    return reelsCache;
  }
};

/**
 * Check if a place is in reels
 * @param {string} placeId - Place ID to check
 * @returns {Promise<boolean>} True if in reels
 */
export const isInReels = async (placeId) => {
  try {
    const reels = await getReels();
    return reels.includes(placeId);
  } catch (error) {
    console.error("Error checking reel:", error);
    return false;
  }
};

/**
 * Add a place to reels
 * @param {string} placeId - Place ID to add
 * @returns {Promise<boolean>} True if successful
 */
export const addReel = async (placeId) => {
  try {
    const reels = await getReels();
    if (!reels.includes(placeId)) {
      reels.push(placeId);
      reelsCache = reels;

      // Try to save to AsyncStorage if available
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const REELS_KEY = "@spotnere_reels";
        await AsyncStorage.setItem(REELS_KEY, JSON.stringify(reels));
      } catch (storageError) {
        // Ignore storage errors, use in-memory cache
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding reel:", error);
    return false;
  }
};

/**
 * Remove a place from reels
 * @param {string} placeId - Place ID to remove
 * @returns {Promise<boolean>} True if successful
 */
export const removeReel = async (placeId) => {
  try {
    const reels = await getReels();
    const updatedReels = reels.filter((id) => id !== placeId);
    reelsCache = updatedReels;

    // Try to save to AsyncStorage if available
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const REELS_KEY = "@spotnere_reels";
      await AsyncStorage.setItem(REELS_KEY, JSON.stringify(updatedReels));
    } catch (storageError) {
      // Ignore storage errors, use in-memory cache
    }

    return true;
  } catch (error) {
    console.error("Error removing reel:", error);
    return false;
  }
};

/**
 * Toggle reel status of a place
 * @param {string} placeId - Place ID to toggle
 * @returns {Promise<boolean>} New reel status (true if added, false if removed)
 */
export const toggleReel = async (placeId) => {
  try {
    const isInReel = await isInReels(placeId);
    if (isInReel) {
      await removeReel(placeId);
      return false;
    } else {
      await addReel(placeId);
      return true;
    }
  } catch (error) {
    console.error("Error toggling reel:", error);
    return false;
  }
};

/**
 * Clear all reels
 * @returns {Promise<boolean>} True if successful
 */
export const clearReels = async () => {
  try {
    reelsCache = [];

    // Try to clear AsyncStorage if available
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const REELS_KEY = "@spotnere_reels";
      await AsyncStorage.removeItem(REELS_KEY);
    } catch (storageError) {
      // Ignore storage errors, use in-memory cache
    }

    return true;
  } catch (error) {
    console.error("Error clearing reels:", error);
    return false;
  }
};
