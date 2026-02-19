/**
 * Authentication Utility
 * Manages user authentication state using AsyncStorage and backend API
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { api } from "../api/client";

// Password hashing utility functions
const SALT_ROUNDS = 10000; // Number of iterations for PBKDF2

/**
 * Simple hash function using SHA-256
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hashed text
 */
const sha256 = async (text) => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    text
  );
};

/**
 * Generate a random salt
 * @returns {Promise<string>} Random salt string
 */
const generateSalt = async () => {
  return await Crypto.getRandomBytesAsync(16).then((bytes) => {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
};

/**
 * Hash a password with salt using multiple iterations
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password with salt
 */
export const hashPassword = async (password) => {
  // Generate a random salt
  const salt = await generateSalt();
  // Hash password with salt multiple times for security
  let hash = password + salt;
  for (let i = 0; i < SALT_ROUNDS; i++) {
    hash = await sha256(hash);
  }
  // Return salt:hash format for storage
  return `${salt}:${hash}`;
};

/**
 * Verify a password against a stored hash
 * @param {string} password - Plain text password to verify
 * @param {string} storedHash - Stored hash in format "salt:hash"
 * @returns {Promise<boolean>} True if password matches
 */
export const verifyPassword = async (password, storedHash) => {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  // Recreate hash with same salt and iterations
  let hashToVerify = password + salt;
  for (let i = 0; i < SALT_ROUNDS; i++) {
    hashToVerify = await sha256(hashToVerify);
  }
  return hash === hashToVerify;
};

const AUTH_KEY = "@spotnere_user";
const USER_DATA_KEY = "@spotnere_user_data";

/**
 * Get current user data
 * @returns {Promise<Object|null>} User data or null if not logged in
 */
export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_DATA_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

/**
 * Check if user is logged in
 * @returns {Promise<boolean>} True if logged in
 */
export const isLoggedIn = async () => {
  try {
    const authToken = await AsyncStorage.getItem(AUTH_KEY);
    return authToken !== null;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

/**
 * Register a new user
 * @param {Object} formData - Registration form data
 * @returns {Promise<{success: boolean, user: Object|null, error: string|null}>}
 */
export const registerUser = async (formData) => {
  try {
    const { user: formattedUser } = await api.register(formData);

    if (!formattedUser) {
      return {
        success: false,
        user: null,
        error: "Failed to create account",
      };
    }

    await AsyncStorage.setItem(AUTH_KEY, "authenticated");
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(formattedUser));

    console.log("✅ User registered successfully:", formattedUser.email);
    return {
      success: true,
      user: formattedUser,
      error: null,
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      success: false,
      user: null,
      error: error?.data?.error || error.message || "Failed to register user",
    };
  }
};

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success: boolean, user: Object|null, error: string|null}>}
 */
export const loginUser = async (email, password) => {
  try {
    const { user: formattedUser } = await api.login(email, password);

    if (!formattedUser) {
      return {
        success: false,
        user: null,
        error: "Invalid email or password",
      };
    }

    await AsyncStorage.setItem(AUTH_KEY, "authenticated");
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(formattedUser));

    console.log("✅ User logged in successfully:", formattedUser.email);
    return {
      success: true,
      user: formattedUser,
      error: null,
    };
  } catch (error) {
    console.error("Error logging in:", error);
    return {
      success: false,
      user: null,
      error: error?.data?.error || error.message || "Invalid email or password",
    };
  }
};

/**
 * Login user (legacy function for backward compatibility)
 * Stores user data locally without Supabase verification
 * @param {Object} userData - User data to store
 * @returns {Promise<boolean>} True if successful
 */
export const login = async (userData) => {
  try {
    // Store auth token (simple implementation - in production use JWT)
    await AsyncStorage.setItem(AUTH_KEY, "authenticated");
    // Store user data
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error("Error logging in:", error);
    return false;
  }
};

/**
 * Logout user
 * @returns {Promise<boolean>} True if successful
 */
export const logout = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    return true;
  } catch (error) {
    console.error("Error logging out:", error);
    return false;
  }
};

/**
 * Update user data
 * @param {Object} userData - Updated user data
 * @returns {Promise<boolean>} True if successful
 */
export const updateUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error("Error updating user data:", error);
    return false;
  }
};
