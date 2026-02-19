/**
 * Bookings Context
 * Fetches and caches user bookings from backend API.
 * Used by TripsScreen to display booked trips.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "../api/client";
import { getCurrentUser } from "../utils/auth";
import {
  getCachedBookings,
  setCachedBookings,
  clearBookingsCache,
} from "../utils/bookingsCache";

const BookingsContext = createContext(null);

export const useBookings = () => {
  const ctx = useContext(BookingsContext);
  if (!ctx) {
    throw new Error("useBookings must be used within BookingsProvider");
  }
  return ctx;
};

const fetchBookingsFromApi = async (userId) => {
  if (!userId) return [];
  return await api.getBookings(userId);
};

export const BookingsProvider = ({ children }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchedUserId, setLastFetchedUserId] = useState(null);
  const [hasUser, setHasUser] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await getCurrentUser();
      setHasUser(!!(user && user.id));

      if (!user || !user.id) {
        setBookings([]);
        setLastFetchedUserId(null);
        setLoading(false);
        return;
      }

      // Try cache first
      const cached = await getCachedBookings(user.id);
      if (cached) {
        setBookings(cached);
        setLastFetchedUserId(user.id);
        setLoading(false);
        return;
      }

      const fetched = await fetchBookingsFromApi(user.id);
      setBookings(fetched);
      setLastFetchedUserId(user.id);
      await setCachedBookings(fetched, user.id);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.message || "Failed to load bookings");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBookings = useCallback(async () => {
    const user = await getCurrentUser();
    if (user?.id) {
      await clearBookingsCache(user.id);
    }
    await fetchBookings();
  }, [fetchBookings]);

  const clearBookings = useCallback(async () => {
    const user = await getCurrentUser();
    if (user?.id) {
      await clearBookingsCache(user.id);
    }
    setBookings([]);
    setLastFetchedUserId(null);
  }, []);

  // Fetch on mount and when user might have changed
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const value = {
    bookings,
    loading,
    error,
    hasUser,
    refreshBookings,
    clearBookings,
    lastFetchedUserId,
  };

  return (
    <BookingsContext.Provider value={value}>
      {children}
    </BookingsContext.Provider>
  );
};
