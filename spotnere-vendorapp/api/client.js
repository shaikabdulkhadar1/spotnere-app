/**
 * Vendor API Client
 * All API calls go through the backend server.
 */

import Constants from "expo-constants";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:5001"
).replace(/\/$/, "");

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
  // Auth
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

  // Bookings
  getVendorBookings: (placeId) =>
    request("GET", "/api/vendor/bookings", null, { placeId }),

  // Reviews
  getVendorReviews: (placeId) =>
    request("GET", "/api/vendor/reviews", null, { placeId }),

  // Place
  getVendorPlace: (placeId) =>
    request("GET", "/api/vendor/place", null, { placeId }),
  updateVendorPlace: (placeId, patch) =>
    request("PATCH", "/api/vendor/place", { placeId, ...patch }),

  // Notifications
  getVendorNotifications: (vendorId) =>
    request("GET", "/api/vendor/notifications", null, { vendorId }),
  markNotificationsRead: (vendorId) =>
    request("POST", "/api/vendor/notifications/mark-read", { vendorId }),

  // Gallery
  getVendorGallery: (placeId) =>
    request("GET", "/api/vendor/gallery", null, { placeId }),
  addGalleryImages: (placeId, images) =>
    request("POST", "/api/vendor/gallery", { placeId, images }),
  deleteGalleryImages: (ids) =>
    request("DELETE", "/api/vendor/gallery", { ids }),

  // Profile
  getVendorProfile: (vendorId) =>
    request("GET", "/api/vendor/profile", null, { vendorId }),
  updateVendorProfile: (vendorId, patch) =>
    request("PATCH", "/api/vendor/profile", { vendorId, ...patch }),

  // Password
  updateVendorPassword: (vendorId, currentPassword, newPassword) =>
    request("PATCH", "/api/vendor/password", {
      vendorId,
      currentPassword,
      newPassword,
    }),

  // Push token
  updatePushToken: (vendorId, push_token) =>
    request("PATCH", "/api/vendor/push-token", { vendorId, push_token }),

  // Onboarding
  getOnboardingStatus: (vendorId) =>
    request("GET", "/api/vendor/onboarding-status", null, { vendorId }),

  // Uploads (base64)
  uploadBanner: (placeId, base64) =>
    request("POST", "/api/vendor/upload-banner", { placeId, base64 }),
  uploadGallery: (placeId, images) =>
    request("POST", "/api/vendor/upload-gallery", { placeId, images }),
  removeStoragePaths: (paths) =>
    request("POST", "/api/vendor/storage/remove", { paths }),
};
