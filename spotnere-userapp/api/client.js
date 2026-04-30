/**
 * API Client
 * All API calls go through the backend server.
 * Automatically attaches Supabase JWT as Bearer token.
 */

import Constants from "expo-constants";
import { supabase } from "../config/supabase";

const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:5001"
).replace(/\/$/, ""); // trim trailing slash

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

  const opts = {
    method,
    headers,
  };
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
  // Places (public — no auth required)
  getPlaces: (params) => request("GET", "/api/places", null, params),
  getPlacesByIds: (placeIds, country) =>
    request("POST", "/api/places/by-ids", { placeIds, country }),
  getPlace: (placeId) => request("GET", `/api/places/${placeId}`),
  getPlaceReviews: (placeId) => request("GET", `/api/places/${placeId}/reviews`),
  getPlaceGallery: (placeId) => request("GET", `/api/places/${placeId}/gallery`),
  getPlaceVendor: (placeId) => request("GET", `/api/places/${placeId}/vendor`),
  addReview: (placeId, payload) =>
    request("POST", `/api/places/${placeId}/reviews`, payload),

  // Favorites (auth required — userId derived from JWT on backend)
  getFavorites: (country) =>
    request("GET", "/api/favorites", null, country ? { country } : undefined),
  addFavorite: (placeId) =>
    request("POST", "/api/favorites", { placeId }),
  removeFavorite: (placeId) =>
    request("DELETE", "/api/favorites", { placeId }),
  checkFavorite: (placeId) =>
    request("GET", "/api/favorites/check", null, { placeId }),

  // Bookings (auth required — userId derived from JWT on backend)
  getBookings: () => request("GET", "/api/bookings"),

  // Auth
  register: (formData) =>
    request("POST", "/api/auth/register", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      password: formData.password,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      postalCode: formData.postalCode,
    }),
  login: (email, password) =>
    request("POST", "/api/auth/login", { email, password }),

  // Users (auth required — userId derived from JWT on backend)
  updateProfile: (formData) =>
    request("PATCH", "/api/users/profile", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      postalCode: formData.postalCode,
    }),
  updatePassword: (currentPassword, newPassword) =>
    request("PATCH", "/api/users/password", {
      currentPassword,
      newPassword,
    }),
};
