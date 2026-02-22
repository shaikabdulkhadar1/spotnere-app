/**
 * Authentication utilities for Spotnere Vendor App
 * Handles vendor registration and login via backend API
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

const AUTH_STORAGE_KEY = "@spotnere_vendor_auth";
const USER_STORAGE_KEY = "@spotnere_vendor_user";

/**
 * Register a new vendor (creates place + vendor via backend)
 * @param {Object} formData - Vendor registration data
 * @returns {Promise<Object>} - Result object with success status and user/error
 */
export const registerUser = async (formData) => {
  try {
    const { user } = await api.vendorRegister(formData);
    if (!user) {
      return { success: false, error: "Failed to create account. Please try again." };
    }
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      success: false,
      error: error?.data?.error || error.message || "Failed to create account. Please try again.",
    };
  }
};

/**
 * Login vendor
 * @param {string} email - Vendor business email
 * @param {string} password - Vendor password
 * @returns {Promise<Object>} - Result object with success status and user/error
 */
export const loginUser = async (email, password) => {
  try {
    const { user } = await api.vendorLogin(email, password);
    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (error) {
    console.error("Error logging in:", error);
    return {
      success: false,
      error: error?.data?.error || error.message || "Invalid email or password",
    };
  }
};

/**
 * Logout vendor
 */
export const logout = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

/**
 * Get current logged-in vendor
 * @returns {Promise<Object|null>} - Vendor data or null
 */
export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
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
 * Check if vendor is logged in
 * @returns {Promise<boolean>} - True if logged in
 */
export const isLoggedIn = async () => {
  try {
    const authStatus = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return authStatus === "true";
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

/**
 * Update vendor data
 * @param {Object} userData - Updated vendor data
 * @returns {Promise<Object>} - Updated vendor data
 */
export const updateUserData = async (userData) => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("No user logged in");

    await api.updateVendorProfile(currentUser.id, userData);
    const updated = { ...currentUser, ...userData };
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error updating user data:", error);
    throw error;
  }
};
