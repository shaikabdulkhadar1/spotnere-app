/**
 * Favorites Cache Utility
 * Provides caching for favorite places data per user
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_CACHE_KEY = "@spotnere_favorites_cache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache for faster access

let favoritesCache = {
  places: null,
  userId: null,
  country: null,
  timestamp: null,
};

/**
 * Get cached favorite places for a user
 * @param {string} userId - User ID
 * @param {string} country - Optional country filter
 * @returns {Promise<Array|null>} Cached places array or null if not available/expired
 */
export const getCachedFavorites = async (userId, country = null) => {
  if (!userId) {
    return null;
  }

  try {
    // Check in-memory cache first
    if (
      favoritesCache.places &&
      favoritesCache.userId === userId &&
      favoritesCache.timestamp
    ) {
      const now = Date.now();
      const cacheAge = now - favoritesCache.timestamp;

      // Check if cache is expired
      if (cacheAge > CACHE_EXPIRY_MS) {
        clearCache(userId);
        return null;
      }

      // If country is specified, check if it matches cached country
      if (country && favoritesCache.country !== country) {
        return null;
      }

      return favoritesCache.places;
    }

    // Try to load from AsyncStorage
    const cacheKey = `${FAVORITES_CACHE_KEY}_${userId}`;
    const cacheJson = await AsyncStorage.getItem(cacheKey);

    if (cacheJson) {
      const cached = JSON.parse(cacheJson);
      const now = Date.now();
      const cacheAge = now - cached.timestamp;

      // Check if cache is expired
      if (cacheAge > CACHE_EXPIRY_MS) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      // If country is specified, check if it matches cached country
      if (country && cached.country !== country) {
        return null;
      }

      // Load into in-memory cache
      favoritesCache = {
        places: cached.places,
        userId: userId,
        country: cached.country,
        timestamp: cached.timestamp,
      };

      return cached.places;
    }

    return null;
  } catch (error) {
    console.error("Error getting cached favorites:", error);
    return null;
  }
};

/**
 * Set favorite places in cache
 * @param {Array} places - Array of formatted places data
 * @param {string} userId - User ID
 * @param {string} country - Optional country filter
 */
export const setCachedFavorites = async (places, userId, country = null) => {
  if (!places || !Array.isArray(places) || !userId) {
    console.warn("⚠️ Invalid favorites data for caching");
    return;
  }

  const timestamp = Date.now();

  // Update in-memory cache
  favoritesCache = {
    places: places,
    userId: userId,
    country: country,
    timestamp: timestamp,
  };

  // Save to AsyncStorage
  try {
    const cacheKey = `${FAVORITES_CACHE_KEY}_${userId}`;
    const cacheData = {
      places: places,
      country: country,
      timestamp: timestamp,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error saving favorites cache:", error);
    // Continue with in-memory cache even if AsyncStorage fails
  }
};

/**
 * Clear favorites cache for a user
 * @param {string} userId - User ID
 */
export const clearFavoritesCache = async (userId) => {
  if (!userId) {
    // Clear all caches if no userId provided
    favoritesCache = {
      places: null,
      userId: null,
      country: null,
      timestamp: null,
    };
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) =>
        key.startsWith(FAVORITES_CACHE_KEY)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Error clearing favorites cache:", error);
    }
    return;
  }

  // Clear specific user cache
  favoritesCache = {
    places: null,
    userId: null,
    country: null,
    timestamp: null,
  };

  try {
    const cacheKey = `${FAVORITES_CACHE_KEY}_${userId}`;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("Error clearing favorites cache:", error);
  }
};

/**
 * Clear cache (alias for backward compatibility)
 */
export const clearCache = clearFavoritesCache;
