/**
 * Trips Utility
 * Manages trip places using in-memory storage (can be upgraded to AsyncStorage later)
 */

// In-memory storage for trips
let tripsCache = [];

/**
 * Get all trip place IDs
 * @returns {Promise<Array<string>>} Array of trip place IDs
 */
export const getTrips = async () => {
  try {
    // Try to use AsyncStorage if available
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const TRIPS_KEY = "@spotnere_trips";
    const tripsJson = await AsyncStorage.getItem(TRIPS_KEY);
    if (tripsJson) {
      const trips = JSON.parse(tripsJson);
      tripsCache = trips; // Sync cache
      return trips;
    }
    return tripsCache;
  } catch (error) {
    // Fallback to in-memory cache if AsyncStorage is not available
    console.log("Using in-memory trips storage");
    return tripsCache;
  }
};

/**
 * Check if a place is in trips
 * @param {string} placeId - Place ID to check
 * @returns {Promise<boolean>} True if in trips
 */
export const isInTrips = async (placeId) => {
  try {
    const trips = await getTrips();
    return trips.includes(placeId);
  } catch (error) {
    console.error("Error checking trip:", error);
    return false;
  }
};

/**
 * Add a place to trips
 * @param {string} placeId - Place ID to add
 * @returns {Promise<boolean>} True if successful
 */
export const addTrip = async (placeId) => {
  try {
    const trips = await getTrips();
    if (!trips.includes(placeId)) {
      trips.push(placeId);
      tripsCache = trips;

      // Try to save to AsyncStorage if available
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const TRIPS_KEY = "@spotnere_trips";
        await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
      } catch (storageError) {
        // Ignore storage errors, use in-memory cache
      }

      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding trip:", error);
    return false;
  }
};

/**
 * Remove a place from trips
 * @param {string} placeId - Place ID to remove
 * @returns {Promise<boolean>} True if successful
 */
export const removeTrip = async (placeId) => {
  try {
    const trips = await getTrips();
    const updatedTrips = trips.filter((id) => id !== placeId);
    tripsCache = updatedTrips;

    // Try to save to AsyncStorage if available
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const TRIPS_KEY = "@spotnere_trips";
      await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updatedTrips));
    } catch (storageError) {
      // Ignore storage errors, use in-memory cache
    }

    return true;
  } catch (error) {
    console.error("Error removing trip:", error);
    return false;
  }
};

/**
 * Toggle trip status of a place
 * @param {string} placeId - Place ID to toggle
 * @returns {Promise<boolean>} New trip status (true if added, false if removed)
 */
export const toggleTrip = async (placeId) => {
  try {
    const isInTrip = await isInTrips(placeId);
    if (isInTrip) {
      await removeTrip(placeId);
      return false;
    } else {
      await addTrip(placeId);
      return true;
    }
  } catch (error) {
    console.error("Error toggling trip:", error);
    return false;
  }
};

/**
 * Clear all trips
 * @returns {Promise<boolean>} True if successful
 */
export const clearTrips = async () => {
  try {
    tripsCache = [];

    // Try to clear AsyncStorage if available
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const TRIPS_KEY = "@spotnere_trips";
      await AsyncStorage.removeItem(TRIPS_KEY);
    } catch (storageError) {
      // Ignore storage errors, use in-memory cache
    }

    return true;
  } catch (error) {
    console.error("Error clearing trips:", error);
    return false;
  }
};
