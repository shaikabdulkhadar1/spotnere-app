/**
 * Bookings Cache Utility
 * Provides caching for user bookings data
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKINGS_CACHE_KEY = "@spotnere_bookings_cache";
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

let bookingsCache = {
  bookings: null,
  userId: null,
  timestamp: null,
};

/**
 * Get cached bookings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array|null>} Cached bookings array or null if not available/expired
 */
export const getCachedBookings = async (userId) => {
  if (!userId) {
    return null;
  }

  try {
    // Check in-memory cache first
    if (
      bookingsCache.bookings &&
      bookingsCache.userId === userId &&
      bookingsCache.timestamp
    ) {
      const now = Date.now();
      const cacheAge = now - bookingsCache.timestamp;

      if (cacheAge > CACHE_EXPIRY_MS) {
        console.log("📦 Bookings cache expired, clearing...");
        clearBookingsCache(userId);
        return null;
      }

      console.log("📦 Using in-memory cached bookings");
      return bookingsCache.bookings;
    }

    // Try to load from AsyncStorage
    const cacheKey = `${BOOKINGS_CACHE_KEY}_${userId}`;
    const cacheJson = await AsyncStorage.getItem(cacheKey);

    if (cacheJson) {
      const cached = JSON.parse(cacheJson);
      const now = Date.now();
      const cacheAge = now - cached.timestamp;

      if (cacheAge > CACHE_EXPIRY_MS) {
        console.log("📦 Bookings cache expired, clearing...");
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      bookingsCache = {
        bookings: cached.bookings,
        userId: userId,
        timestamp: cached.timestamp,
      };

      console.log("📦 Using AsyncStorage cached bookings");
      return cached.bookings;
    }

    return null;
  } catch (error) {
    console.error("Error getting cached bookings:", error);
    return null;
  }
};

/**
 * Set bookings in cache
 * @param {Array} bookings - Array of formatted booking data
 * @param {string} userId - User ID
 */
export const setCachedBookings = async (bookings, userId) => {
  if (!bookings || !Array.isArray(bookings) || !userId) {
    console.warn("⚠️ Invalid bookings data for caching");
    return;
  }

  const timestamp = Date.now();

  bookingsCache = {
    bookings: bookings,
    userId: userId,
    timestamp: timestamp,
  };

  try {
    const cacheKey = `${BOOKINGS_CACHE_KEY}_${userId}`;
    const cacheData = {
      bookings: bookings,
      timestamp: timestamp,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`📦 Cached ${bookings.length} bookings`);
  } catch (error) {
    console.error("Error saving bookings cache:", error);
  }
};

/**
 * Clear bookings cache for a user
 * @param {string} userId - User ID
 */
export const clearBookingsCache = async (userId) => {
  if (!userId) {
    bookingsCache = {
      bookings: null,
      userId: null,
      timestamp: null,
    };
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) =>
        key.startsWith(BOOKINGS_CACHE_KEY)
      );
      await AsyncStorage.multiRemove(cacheKeys);
      console.log("📦 Cleared all bookings caches");
    } catch (error) {
      console.error("Error clearing bookings cache:", error);
    }
    return;
  }

  bookingsCache = {
    bookings: null,
    userId: null,
    timestamp: null,
  };

  try {
    const cacheKey = `${BOOKINGS_CACHE_KEY}_${userId}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`📦 Cleared bookings cache for user ${userId}`);
  } catch (error) {
    console.error("Error clearing bookings cache:", error);
  }
};
