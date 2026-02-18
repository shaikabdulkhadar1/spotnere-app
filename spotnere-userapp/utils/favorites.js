/**
 * Favorites Utility
 * Manages favorite places using Supabase database and local cache
 */

import { supabase } from "../config/supabase";
import { clearFavoritesCache } from "./favoritesCache";

// In-memory storage for favorites
let favoritesCache = [];

/**
 * Get all favorite place IDs
 * @returns {Promise<Array<string>>} Array of favorite place IDs
 */
export const getFavorites = async () => {
  try {
    // Try to use AsyncStorage if available
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const FAVORITES_KEY = "@spotnere_favorites";
    const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
    if (favoritesJson) {
      const favorites = JSON.parse(favoritesJson);
      favoritesCache = favorites; // Sync cache
      return favorites;
    }
    return favoritesCache;
  } catch (error) {
    // Fallback to in-memory cache if AsyncStorage is not available
    console.log("Using in-memory favorites storage");
    return favoritesCache;
  }
};

/**
 * Check if a place is favorited
 * @param {string} placeId - Place ID to check
 * @returns {Promise<boolean>} True if favorited
 */
export const isFavorite = async (placeId) => {
  try {
    const favorites = await getFavorites();
    return favorites.includes(placeId);
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
};

/**
 * Add a place to favorites
 * @param {string} placeId - Place ID to add
 * @returns {Promise<boolean>} True if successful
 */
export const addFavorite = async (placeId) => {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(placeId)) {
      favorites.push(placeId);
      favoritesCache = favorites;
      
      // Try to save to AsyncStorage if available
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const FAVORITES_KEY = "@spotnere_favorites";
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      } catch (storageError) {
        // Ignore storage errors, use in-memory cache
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error adding favorite:", error);
    return false;
  }
};

/**
 * Remove a place from favorites
 * @param {string} placeId - Place ID to remove
 * @returns {Promise<boolean>} True if successful
 */
export const removeFavorite = async (placeId) => {
  try {
    const favorites = await getFavorites();
    const updatedFavorites = favorites.filter((id) => id !== placeId);
    favoritesCache = updatedFavorites;
    
    // Try to save to AsyncStorage if available
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const FAVORITES_KEY = "@spotnere_favorites";
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updatedFavorites));
    } catch (storageError) {
      // Ignore storage errors, use in-memory cache
    }
    
    return true;
  } catch (error) {
    console.error("Error removing favorite:", error);
    return false;
  }
};

/**
 * Toggle favorite status of a place
 * @param {string} placeId - Place ID to toggle
 * @returns {Promise<boolean>} New favorite status (true if favorited, false if removed)
 */
export const toggleFavorite = async (placeId) => {
  try {
    const isFav = await isFavorite(placeId);
    if (isFav) {
      await removeFavorite(placeId);
      return false;
    } else {
      await addFavorite(placeId);
      return true;
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return false;
  }
};

/**
 * Clear all favorites
 * @returns {Promise<boolean>} True if successful
 */
export const clearFavorites = async () => {
  try {
    favoritesCache = [];
    
    // Try to clear AsyncStorage if available
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const FAVORITES_KEY = "@spotnere_favorites";
      await AsyncStorage.removeItem(FAVORITES_KEY);
    } catch (storageError) {
      // Ignore storage errors, use in-memory cache
    }
    
    return true;
  } catch (error) {
    console.error("Error clearing favorites:", error);
    return false;
  }
};

/**
 * Save favorite place to database (user_places table)
 * @param {string} userId - User ID
 * @param {string} placeId - Place ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const saveFavoriteToDatabase = async (userId, placeId) => {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized");
    }

    if (!userId || !placeId) {
      return {
        success: false,
        error: "User ID and Place ID are required",
      };
    }

    // Insert into user_places table
    const { error } = await supabase
      .from("user_places")
      .insert([
        {
          user_id: userId,
          fav_place_id: placeId,
        },
      ]);

    if (error) {
      // Check if it's a duplicate key error (already favorited)
      if (error.code === "23505") {
        // Unique constraint violation - already exists
        return {
          success: true,
          error: null,
        };
      }
      console.error("❌ Error saving favorite to database:", error);
      return {
        success: false,
        error: error.message || "Failed to save favorite",
      };
    }

    console.log("✅ Favorite saved to database:", { userId, placeId });
    
    // Clear cache to force refresh on next load
    await clearFavoritesCache(userId);
    
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Error saving favorite to database:", error);
    return {
      success: false,
      error: error.message || "Failed to save favorite",
    };
  }
};

/**
 * Remove favorite place from database (user_places table)
 * @param {string} userId - User ID
 * @param {string} placeId - Place ID
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const removeFavoriteFromDatabase = async (userId, placeId) => {
  try {
    if (!supabase) {
      throw new Error("Supabase client is not initialized");
    }

    if (!userId || !placeId) {
      return {
        success: false,
        error: "User ID and Place ID are required",
      };
    }

    // Delete from user_places table
    const { error } = await supabase
      .from("user_places")
      .delete()
      .eq("user_id", userId)
      .eq("fav_place_id", placeId);

    if (error) {
      console.error("❌ Error removing favorite from database:", error);
      return {
        success: false,
        error: error.message || "Failed to remove favorite",
      };
    }

    console.log("✅ Favorite removed from database:", { userId, placeId });
    
    // Clear cache to force refresh on next load
    await clearFavoritesCache(userId);
    
    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.error("Error removing favorite from database:", error);
    return {
      success: false,
      error: error.message || "Failed to remove favorite",
    };
  }
};

/**
 * Check if a place is favorited in database
 * @param {string} userId - User ID
 * @param {string} placeId - Place ID
 * @returns {Promise<boolean>} True if favorited
 */
export const isFavoriteInDatabase = async (userId, placeId) => {
  try {
    if (!supabase || !userId || !placeId) {
      return false;
    }

    const { data, error } = await supabase
      .from("user_places")
      .select("fav_place_id")
      .eq("user_id", userId)
      .eq("fav_place_id", placeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - not favorited
        return false;
      }
      console.error("Error checking favorite in database:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking favorite in database:", error);
    return false;
  }
};
