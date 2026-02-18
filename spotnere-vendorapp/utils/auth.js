/**
 * Authentication utilities for Spotnere Vendor App
 * Handles vendor registration and login using Supabase
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { supabase } from "../config/supabase";

const AUTH_STORAGE_KEY = "@spotnere_vendor_auth";
const USER_STORAGE_KEY = "@spotnere_vendor_user";

/**
 * Hash password using SHA-256 with salt and 10,000 iterations
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password with salt
 */
export const hashPassword = async (password) => {
  try {
    // Generate a random salt
    const salt = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}`,
    );

    // Hash password with salt (10,000 iterations)
    let hashedPassword = password + salt;
    for (let i = 0; i < 10000; i++) {
      hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashedPassword,
      );
    }

    // Return hash with salt separated by colon
    return `${hashedPassword}:${salt}`;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw new Error("Failed to hash password");
  }
};

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Stored hash with salt
 * @returns {Promise<boolean>} - True if password matches
 */
export const verifyPassword = async (password, hash) => {
  try {
    const [storedHash, salt] = hash.split(":");

    // Hash password with stored salt (10,000 iterations)
    let hashedPassword = password + salt;
    for (let i = 0; i < 10000; i++) {
      hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashedPassword,
      );
    }

    return hashedPassword === storedHash;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
};

/**
 * Create a place entry
 * @param {Object} formData - Place data from form
 * @returns {Promise<Object>} - Result object with success status and place data/error
 */
const createPlace = async (formData) => {
  try {
    // Prepare place data with business address details and category information
    // This is the business/place location address
    const placeData = {
      name: formData.businessName,
      address: formData.address, // Business address
      country: formData.country, // Business country
      city: formData.city, // Business city
      state: formData.state, // Business state
      postal_code: formData.postalCode, // Business postal code
      phone_number: formData.businessPhoneNumber,
      category: formData.businessCategory,
      sub_category: formData.businessSubCategory || null,
    };

    // Insert place into database
    const { data, error } = await supabase
      .from("places")
      .insert([placeData])
      .select()
      .single();

    if (error) {
      console.error("Error creating place:", error);
      throw error;
    }

    return {
      success: true,
      place: data,
      placeId: data.id,
    };
  } catch (error) {
    console.error("Error creating place:", error);
    return {
      success: false,
      error: error.message || "Failed to create place. Please try again.",
    };
  }
};

/**
 * Register a new vendor
 * @param {Object} formData - Vendor registration data
 * @returns {Promise<Object>} - Result object with success status and user/error
 */
export const registerUser = async (formData) => {
  try {
    // Step 1: First create the place and get its UUID
    const placeResult = await createPlace(formData);
    if (!placeResult.success) {
      return {
        success: false,
        error: placeResult.error || "Failed to create place. Please try again.",
      };
    }

    const placeId = placeResult.placeId;

    // Step 2: IMPORTANT: Hash password before storing - NEVER store plain text passwords
    // The password is hashed using SHA-256 with salt (10,000 iterations)
    const passwordHash = await hashPassword(formData.password);

    // Step 3: Prepare vendor data matching exact schema
    // SECURITY: Only password_hash is stored in database, never the plain password
    // NOTE: business_category and business_sub_category are stored in the places table, not vendors table
    // NOTE: Business address is stored in places table, vendor address is stored in vendors table
    // NOTE: business_phone_number is stored in places table (as phone_number), not in vendors table
    const vendorData = {
      business_name: formData.businessName,
      vendor_full_name: formData.vendorFullName,
      vendor_phone_number: formData.vendorPhoneNumber,
      vendor_email: formData.email.toLowerCase().trim(),
      password_hash: passwordHash, // HASHED password only - never plain text
      // Vendor address (personal address)
      vendor_address: formData.vendorAddress,
      vendor_city: formData.vendorCity,
      vendor_state: formData.vendorState,
      vendor_country: formData.vendorCountry,
      vendor_postal_code: formData.vendorPostalCode,
      place_id: placeId, // Add the place UUID to vendors table
    };

    // Step 4: Insert vendor into database with place_id
    const { data, error } = await supabase
      .from("vendors")
      .insert([vendorData])
      .select(
        "id, business_name, vendor_full_name, vendor_phone_number, vendor_email, password_hash, vendor_address, vendor_city, vendor_state, vendor_country, vendor_postal_code, place_id, created_at, updated_at"
      )
      .single();

    if (error) {
      // Handle unique constraint violation (duplicate email)
      if (error.code === "23505" || error.message.includes("unique")) {
        return {
          success: false,
          error:
            "An account with this email already exists. Please sign in instead.",
        };
      }
      throw error;
    }

    // Store auth state
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));

    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return {
      success: false,
      error: error.message || "Failed to create account. Please try again.",
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
    // Fetch vendor by vendor_email (excluding business_category and business_sub_category)
    // NOTE: business_phone_number is stored in places table, not vendors table
    const { data, error } = await supabase
      .from("vendors")
      .select(
        "id, business_name, vendor_full_name, vendor_phone_number, vendor_email, password_hash, vendor_address, vendor_city, vendor_state, vendor_country, vendor_postal_code, place_id, created_at, updated_at"
      )
      .eq("vendor_email", email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Verify password
    const isValid = await verifyPassword(password, data.password_hash);
    if (!isValid) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Store auth state
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, "true");
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));

    return {
      success: true,
      user: data,
    };
  } catch (error) {
    console.error("Error logging in:", error);
    return {
      success: false,
      error: error.message || "Failed to sign in. Please try again.",
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
    if (!currentUser) {
      throw new Error("No user logged in");
    }

    const { data, error } = await supabase
      .from("vendors")
      .update(userData)
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update stored user data
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error("Error updating user data:", error);
    throw error;
  }
};
