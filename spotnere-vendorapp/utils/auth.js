/**
 * Authentication utilities for Spotnere Vendor App
 * Backend API handles credential verification + Supabase Auth account creation.
 * Client establishes a Supabase Auth session afterward for RLS-protected queries.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";
import { supabase } from "../config/supabase";

const AUTH_STORAGE_KEY = "@spotnere_vendor_auth";
const USER_STORAGE_KEY = "@spotnere_vendor_user";

/**
 * Establish a Supabase Auth session on the client.
 * Called after backend confirms credentials so the Supabase client
 * carries a JWT for RLS-protected reads and Realtime.
 */
async function establishSupabaseSession(email, password) {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.warn("[Auth] Supabase session failed (non-fatal):", error.message);
    }
  } catch (err) {
    console.warn("[Auth] Supabase session error (non-fatal):", err?.message);
  }
}

/**
 * Register a new vendor (creates Supabase Auth user + place + vendor via backend)
 */
export const registerUser = async (formData) => {
  try {
    const { user } = await api.vendorRegister(formData);
    if (!user) {
      return { success: false, error: "Failed to create account. Please try again." };
    }
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    await establishSupabaseSession(formData.email, formData.password);

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
 * Login vendor — backend verifies credentials (and lazily creates Supabase
 * Auth account for existing vendors), then we establish a local session.
 */
export const loginUser = async (email, password) => {
  try {
    const { user } = await api.vendorLogin(email, password);
    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    await establishSupabaseSession(email, password);

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
 * Logout vendor — clears both local storage and Supabase Auth session.
 */
export const logout = async () => {
  try {
    await supabase.auth.signOut();
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
 * Check if vendor is logged in (checks both local flag and Supabase session).
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

    await api.updateVendorProfile(userData);
    const updated = { ...currentUser, ...userData };
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Error updating user data:", error);
    throw error;
  }
};
