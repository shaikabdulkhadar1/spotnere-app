/**
 * Places Cache Utility
 * Provides in-memory caching for places data filtered by country
 */

// Cache storage
let placesCache = {
  allPlaces: null,
  country: null,
  timestamp: null,
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Get cached places data if available and not expired
 * @param {string} country - Country code to match cached data
 * @returns {Array|null} Cached places array or null if not available/expired
 */
export const getCachedPlaces = (country = null) => {
  // Check if cache exists
  if (!placesCache.allPlaces || !placesCache.timestamp) {
    console.log("📦 No cached places found");
    return null;
  }

  // Check if cache is expired
  const now = Date.now();
  const cacheAge = now - placesCache.timestamp;
  if (cacheAge > CACHE_EXPIRY_MS) {
    console.log("📦 Cache expired, clearing...");
    clearCache();
    return null;
  }

  // If country is specified, check if it matches cached country
  if (country && placesCache.country !== country) {
    console.log(
      `📦 Cache country mismatch (cached: ${placesCache.country}, requested: ${country})`
    );
    return null;
  }

  console.log("📦 Using cached places data");
  return placesCache.allPlaces;
};

/**
 * Set places data in cache
 * @param {Array} places - Array of places data
 * @param {string} country - Country code for the places
 */
export const setCachedPlaces = (places, country = null) => {
  if (!places || !Array.isArray(places)) {
    console.warn("⚠️ Invalid places data for caching");
    return;
  }

  placesCache = {
    allPlaces: places,
    country: country,
    timestamp: Date.now(),
  };

  console.log(
    `📦 Cached ${places.length} places${country ? ` for ${country}` : ""}`
  );
};

/**
 * Clear the cache
 */
export const clearCache = () => {
  placesCache = {
    allPlaces: null,
    country: null,
    timestamp: null,
  };
  console.log("📦 Cache cleared");
};
