/**
 * Push Notifications utility for Spotnere Vendor App
 * Registers for push notifications and stores the Expo push token in the vendors table.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "../config/supabase";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and return whether granted.
 * @returns {Promise<boolean>} True if permissions granted
 */
async function requestPermissions() {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  if (existingStatus === "granted") {
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Get the Expo push token for this device.
 * @returns {Promise<string|null>} Expo push token or null
 */
async function getExpoPushToken() {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn("EAS projectId not found in app config");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData?.data ?? null;
  } catch (error) {
    console.error("Error getting Expo push token:", error);
    return null;
  }
}

/**
 * Register for push notifications and store the token in the vendors table.
 * Call this when the app opens and the vendor is authenticated.
 * @param {string} vendorId - The vendor's UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function registerAndStorePushToken(vendorId) {
  if (!vendorId) {
    return { success: false, error: "Vendor ID is required" };
  }

  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      return { success: false, error: "Notification permissions denied" };
    }

    const token = await getExpoPushToken();
    if (!token) {
      return { success: false, error: "Could not get push token" };
    }

    const { error } = await supabase
      .from("vendors")
      .update({ push_token: token })
      .eq("id", vendorId);

    if (error) {
      console.error("Error storing push token:", error);
      return { success: false, error: error.message };
    }

    console.log("Push token stored for vendor:", vendorId);
    return { success: true };
  } catch (error) {
    console.error("Error registering push token:", error);
    return {
      success: false,
      error: error?.message ?? "Failed to register push token",
    };
  }
}

/**
 * Clear the push token from the vendors table when the vendor logs out.
 * @param {string} vendorId - The vendor's UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function clearPushToken(vendorId) {
  if (!vendorId) {
    return { success: false, error: "Vendor ID is required" };
  }

  if (!supabase) {
    return { success: false, error: "Supabase client not initialized" };
  }

  try {
    const { error } = await supabase
      .from("vendors")
      .update({ push_token: null })
      .eq("id", vendorId);

    if (error) {
      console.error("Error clearing push token:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error clearing push token:", error);
    return {
      success: false,
      error: error?.message ?? "Failed to clear push token",
    };
  }
}
