/**
 * Bookings Context
 * Fetches and caches user bookings from Supabase.
 * Used by TripsScreen to display booked trips.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../config/supabase";
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

const formatBookingForDisplay = (booking) => {
  // Join returns place under "places" key; fallback passes places: {...}
  const place = booking.places || booking.place || {};
  const placeId = booking.place_id || place.id;
  const title = place.name || "Place";
  const imageUri = place.banner_image_link;
  const avgPrice = place.avg_price || 0;

  return {
    id: booking.id,
    placeId,
    title,
    price: `$${avgPrice} per person`,
    imageUri,
    isSmall: false,
    country: place.country,
    // From bookings table: booking_date_time (ISO datetime)
    bookingRefNumber: booking.booking_ref_number,
    bookingDateTime: booking.booking_date_time,
    amountPaid: booking.amount_paid,
    currencyPaid: booking.currency_paid,
    paymentStatus: booking.payment_status,
    numberOfGuests: booking.number_of_guests,
    paymentMethod: booking.payment_method,
    paidAt: booking.paid_at,
    transactionId: booking.transaction_id,
  };
};

const fetchBookingsFromSupabase = async (userId) => {
  if (!supabase || !userId) {
    return [];
  }

  // Join: use place_id (bookings) to fetch from places table
  const { data: bookingsWithPlaces, error: joinError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      place_id,
      booking_date_time,
      booking_ref_number,
      amount_paid,
      currency_paid,
      payment_status,
      number_of_guests,
      payment_method,
      paid_at,
      transaction_id,
      places!place_id (
        id,
        name,
        banner_image_link,
        avg_price,
        rating,
        country,
        city,
        address
      )
    `,
    )
    .eq("user_id", userId)
    .order("booking_date_time", { ascending: false });

  if (!joinError && bookingsWithPlaces && bookingsWithPlaces.length > 0) {
    return bookingsWithPlaces.map(formatBookingForDisplay);
  }

  // Fallback: use place_id from bookings to fetch from places table
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "id, place_id, booking_date_time, booking_ref_number, amount_paid, currency_paid, payment_status, number_of_guests, payment_method, paid_at, transaction_id",
    )
    .eq("user_id", userId)
    .order("booking_date_time", { ascending: false });

  if (bookingsError) {
    console.error("❌ Bookings fetch error:", bookingsError);
    throw new Error(bookingsError.message || "Failed to fetch bookings");
  }

  if (!bookings || bookings.length === 0) {
    return [];
  }

  const placeIds = [
    ...new Set(bookings.map((b) => b.place_id).filter(Boolean)),
  ];
  const { data: places } = await supabase
    .from("places")
    .select(
      "id, name, banner_image_link, avg_price, rating, country, city, address",
    )
    .in("id", placeIds);

  const placesMap = (places || []).reduce((acc, p) => {
    acc[String(p.id)] = p;
    return acc;
  }, {});

  return bookings.map((b) =>
    formatBookingForDisplay({
      ...b,
      places: placesMap[String(b.place_id)] || {},
    }),
  );
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

      const fetched = await fetchBookingsFromSupabase(user.id);
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
