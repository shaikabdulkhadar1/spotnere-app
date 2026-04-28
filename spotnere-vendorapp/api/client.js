/**
 * Vendor API Client
 * All API calls go through the backend server.
 * Authenticated routes send the Supabase JWT as a Bearer token.
 */

import Constants from "expo-constants";
import { supabase } from "../config/supabase";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:5001"
).replace(/\/$/, "");

async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

async function request(method, path, body = null, query = null) {
  let url = `${API_BASE}${path}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  const token = await getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const opts = { method, headers };
  if (body && (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE")) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  // Auth (no Bearer token needed — these are pre-login)
  vendorRegister: (formData) =>
    request("POST", "/api/vendor/auth/register", {
      businessName: formData.businessName,
      address: formData.address,
      country: formData.country,
      city: formData.city,
      state: formData.state,
      postalCode: formData.postalCode,
      businessPhoneNumber: formData.businessPhoneNumber,
      businessCategory: formData.businessCategory,
      businessSubCategory: formData.businessSubCategory,
      vendorFullName: formData.vendorFullName,
      vendorPhoneNumber: formData.vendorPhoneNumber,
      email: formData.email,
      password: formData.password,
      vendorAddress: formData.vendorAddress,
      vendorCity: formData.vendorCity,
      vendorState: formData.vendorState,
      vendorCountry: formData.vendorCountry,
      vendorPostalCode: formData.vendorPostalCode,
    }),
  vendorLogin: (email, password) =>
    request("POST", "/api/vendor/auth/login", { email, password }),

  // All routes below are JWT-protected — vendorId/placeId come from the token

  // Bookings
  getVendorBookings: () =>
    request("GET", "/api/vendor/bookings"),

  // Reviews
  getVendorReviews: () =>
    request("GET", "/api/vendor/reviews"),

  // Place
  getVendorPlace: () =>
    request("GET", "/api/vendor/place"),
  updateVendorPlace: (patch) =>
    request("PATCH", "/api/vendor/place", patch),

  // Notifications
  getVendorNotifications: () =>
    request("GET", "/api/vendor/notifications"),
  markNotificationsRead: () =>
    request("POST", "/api/vendor/notifications/mark-read"),

  // Gallery
  getVendorGallery: () =>
    request("GET", "/api/vendor/gallery"),
  addGalleryImages: (images) =>
    request("POST", "/api/vendor/gallery", { images }),
  deleteGalleryImages: (ids) =>
    request("DELETE", "/api/vendor/gallery", { ids }),

  // Profile
  getVendorProfile: () =>
    request("GET", "/api/vendor/profile"),
  updateVendorProfile: (patch) =>
    request("PATCH", "/api/vendor/profile", patch),

  // Password
  updateVendorPassword: (currentPassword, newPassword) =>
    request("PATCH", "/api/vendor/password", {
      currentPassword,
      newPassword,
    }),

  // Push token
  updatePushToken: (push_token) =>
    request("PATCH", "/api/vendor/push-token", { push_token }),

  // Onboarding
  getOnboardingStatus: () =>
    request("GET", "/api/vendor/onboarding-status"),

  // Uploads (base64)
  uploadBanner: (base64) =>
    request("POST", "/api/vendor/upload-banner", { base64 }),
  uploadGallery: (images) =>
    request("POST", "/api/vendor/upload-gallery", { images }),
  removeStoragePaths: (paths) =>
    request("POST", "/api/vendor/storage/remove", { paths }),
};
