/**
 * App Context
 * Provides global state management with caching for app-wide data
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser } from "../utils/auth";
import { supabase } from "../config/supabase";

const AppContext = createContext();

// Cache keys
const CACHE_KEYS = {
  USER: "@app_cache_user",
  BOOKINGS: "@app_cache_bookings",
  BOOKINGS_TIMESTAMP: "@app_cache_bookings_timestamp",
  PLACE: "@app_cache_place",
  PLACE_TIMESTAMP: "@app_cache_place_timestamp",
  REVIEWS: "@app_cache_reviews",
  REVIEWS_TIMESTAMP: "@app_cache_reviews_timestamp",
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [bookingsData, setBookingsData] = useState({
    total: 0,
    pending: 0,
    today: 0,
    loading: true,
    bookings: [],
  });
  const [placeData, setPlaceData] = useState(null);
  const [reviewsData, setReviewsData] = useState({
    reviews: [],
    summary: { average: 0, count: 0 },
    loading: true,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load user data
  const loadUser = useCallback(async () => {
    try {
      // Try to load from cache first
      const cachedUser = await AsyncStorage.getItem(CACHE_KEYS.USER);
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
      }

      // Always fetch fresh user data
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        // Cache the user data
        await AsyncStorage.setItem(
          CACHE_KEYS.USER,
          JSON.stringify(currentUser)
        );
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }, []);

  // Check cache for bookings data
  const checkBookingsCache = useCallback(async () => {
    try {
      const cachedBookings = await AsyncStorage.getItem(CACHE_KEYS.BOOKINGS);
      const cachedTimestamp = await AsyncStorage.getItem(
        CACHE_KEYS.BOOKINGS_TIMESTAMP
      );

      if (cachedBookings && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();

        // Use cache if it's still valid
        if (now - timestamp < CACHE_EXPIRY) {
          const parsedBookings = JSON.parse(cachedBookings);
          setBookingsData({
            ...parsedBookings,
            loading: false,
          });
          return true; // Cache hit
        }
      }
      return false; // Cache miss
    } catch (error) {
      console.error("Error checking bookings cache:", error);
      return false;
    }
  }, []);

  // Load bookings data with caching
  const loadBookings = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!user?.place_id) {
          setBookingsData({
            total: 0,
            pending: 0,
            today: 0,
            loading: false,
            bookings: [],
          });
          return;
        }

        // Check cache first if not forcing refresh
        if (!forceRefresh) {
          const cacheHit = await checkBookingsCache();
          if (cacheHit) {
            return; // Data already loaded from cache
          }
        }

        // Fetch fresh data
        setBookingsData((prev) => ({ ...prev, loading: true }));

        const { data: bookings, error } = await supabase
          .from("bookings")
          .select("*")
          .eq("place_id", user.place_id);

        if (error) {
          console.error("Error fetching bookings:", error);
          setBookingsData({
            total: 0,
            pending: 0,
            today: 0,
            loading: false,
            bookings: [],
          });
          return;
        }

        // Fetch user details for each booking
        const bookingsWithUserDetails = await Promise.all(
          (bookings || []).map(async (booking) => {
            if (!booking.user_id) {
              return {
                ...booking,
                user_first_name: null,
                user_last_name: null,
                user_phone_number: null,
                user_email: null,
              };
            }

            try {
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("first_name, last_name, phone_number, email")
                .eq("id", booking.user_id)
                .single();

              if (userError) {
                console.error(
                  `Error fetching user ${booking.user_id}:`,
                  userError
                );
                return {
                  ...booking,
                  user_first_name: null,
                  user_last_name: null,
                  user_phone_number: null,
                  user_email: null,
                };
              }

              return {
                ...booking,
                user_first_name: userData?.first_name || null,
                user_last_name: userData?.last_name || null,
                user_phone_number: userData?.phone_number || null,
                user_email: userData?.email || null,
              };
            } catch (err) {
              console.error(
                `Error processing user for booking ${booking.id}:`,
                err
              );
              return {
                ...booking,
                user_first_name: null,
                user_last_name: null,
                user_phone_number: null,
                user_email: null,
              };
            }
          })
        );

        const totalBookings = bookingsWithUserDetails?.length || 0;

        // Calculate pending bookings (bookings with future booking_date_time)
        const now = new Date();
        const pendingBookings =
          bookingsWithUserDetails?.filter((booking) => {
            if (!booking.booking_date_time) return false;
            const bookingDate = new Date(booking.booking_date_time);
            return bookingDate >= now;
          }).length || 0;

        // Calculate today's bookings
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const todayBookings =
          bookingsWithUserDetails?.filter((booking) => {
            if (!booking.booking_date_time) return false;
            const bookingDate = new Date(booking.booking_date_time);
            return bookingDate >= todayStart && bookingDate <= todayEnd;
          }).length || 0;

        const bookingsDataToCache = {
          total: totalBookings,
          pending: pendingBookings,
          today: todayBookings,
          bookings: bookingsWithUserDetails || [],
        };

        setBookingsData({
          ...bookingsDataToCache,
          loading: false,
        });

        // Cache the bookings data
        await AsyncStorage.setItem(
          CACHE_KEYS.BOOKINGS,
          JSON.stringify(bookingsDataToCache)
        );
        await AsyncStorage.setItem(
          CACHE_KEYS.BOOKINGS_TIMESTAMP,
          Date.now().toString()
        );
      } catch (error) {
        console.error("Error loading bookings:", error);
        setBookingsData({
          total: 0,
          pending: 0,
          today: 0,
          loading: false,
          bookings: [],
        });
      }
    },
    [user?.place_id, checkBookingsCache]
  );

  // Check cache for reviews data
  const checkReviewsCache = useCallback(async () => {
    try {
      const cachedReviews = await AsyncStorage.getItem(CACHE_KEYS.REVIEWS);
      const cachedTimestamp = await AsyncStorage.getItem(
        CACHE_KEYS.REVIEWS_TIMESTAMP,
      );

      if (cachedReviews && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();

        // Use cache if it's still valid
        if (now - timestamp < CACHE_EXPIRY) {
          const parsed = JSON.parse(cachedReviews);
          setReviewsData({
            reviews: parsed.reviews || [],
            summary: parsed.summary || { average: 0, count: 0 },
            loading: false,
            error: null,
          });
          return true; // Cache hit
        }
      }
      return false; // Cache miss
    } catch (error) {
      console.error("Error checking reviews cache:", error);
      return false;
    }
  }, []);

  // Load reviews data with caching
  const loadReviews = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!user?.place_id) {
          setReviewsData({
            reviews: [],
            summary: { average: 0, count: 0 },
            loading: false,
            error: null,
          });
          return;
        }

        // Check cache first if not forcing refresh
        if (!forceRefresh) {
          const cacheHit = await checkReviewsCache();
          if (cacheHit) {
            return; // Data already loaded from cache
          }
        }

        setReviewsData((prev) => ({ ...prev, loading: true, error: null }));

        // Fetch base reviews (schema: user_id, place_id, review, rating)
        const { data: reviewData, error: fetchError } = await supabase
          .from("reviews")
          .select("user_id, place_id, review, rating")
          .eq("place_id", user.place_id);

        if (fetchError) {
          throw fetchError;
        }

        const reviews = reviewData || [];

        if (reviews.length === 0) {
          const emptyPayload = {
            reviews: [],
            summary: { average: 0, count: 0 },
          };
          setReviewsData({
            ...emptyPayload,
            loading: false,
            error: null,
          });
          await AsyncStorage.setItem(
            CACHE_KEYS.REVIEWS,
            JSON.stringify(emptyPayload),
          );
          await AsyncStorage.setItem(
            CACHE_KEYS.REVIEWS_TIMESTAMP,
            Date.now().toString(),
          );
          return;
        }

        // Fetch user details for all unique user_ids
        const userIds = Array.from(
          new Set(reviews.map((r) => r.user_id).filter(Boolean)),
        );

        let usersMap = {};
        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("id, first_name, last_name, email")
            .in("id", userIds);

          if (usersError) {
            throw usersError;
          }

          (usersData || []).forEach((u) => {
            usersMap[u.id] = u;
          });
        }

        const merged = reviews.map((review) => ({
          ...review,
          user: usersMap[review.user_id] || null,
        }));

        const count = merged.length;
        const totalRating = merged.reduce(
          (sum, r) => sum + (r.rating || 0),
          0,
        );
        const average = count > 0 ? totalRating / count : 0;

        const payload = {
          reviews: merged,
          summary: { average, count },
        };

        setReviewsData({
          ...payload,
          loading: false,
          error: null,
        });

        // Cache reviews data
        await AsyncStorage.setItem(
          CACHE_KEYS.REVIEWS,
          JSON.stringify(payload),
        );
        await AsyncStorage.setItem(
          CACHE_KEYS.REVIEWS_TIMESTAMP,
          Date.now().toString(),
        );
      } catch (error) {
        console.error("Error loading reviews:", error);
        setReviewsData((prev) => ({
          ...prev,
          loading: false,
          error: error.message || "Failed to load reviews",
        }));
      }
    },
    [user?.place_id, checkReviewsCache],
  );

  // Load data for HomeScreen - checks cache first, then fetches if needed
  const loadHomeScreenData = useCallback(async () => {
    try {
      setIsLoading(true);

      let currentUserData = null;

      // Check user cache first
      const cachedUser = await AsyncStorage.getItem(CACHE_KEYS.USER);
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
        currentUserData = parsedUser;
      } else {
        // No user cache - fetch fresh user data
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          currentUserData = currentUser;
          await AsyncStorage.setItem(
            CACHE_KEYS.USER,
            JSON.stringify(currentUser)
          );
        }
      }

      // Load bookings, place, and reviews data if user has place_id
      if (currentUserData?.place_id) {
        // Check bookings cache
        const bookingsCacheHit = await checkBookingsCache();
        if (!bookingsCacheHit) {
          // Cache miss - fetch fresh bookings data
          await loadBookings(true);
        }

        // Check place cache first
        const placeCacheHit = await checkPlaceCache();
        if (!placeCacheHit) {
          // Cache miss - fetch fresh place data directly
          try {
            const { data, error } = await supabase
              .from("places")
              .select("*")
              .eq("id", currentUserData.place_id)
              .single();

            if (error) {
              console.error("Error fetching place data:", error);
            } else if (data) {
              setPlaceData(data);
              // Cache the place data
              await AsyncStorage.setItem(CACHE_KEYS.PLACE, JSON.stringify(data));
              await AsyncStorage.setItem(
                CACHE_KEYS.PLACE_TIMESTAMP,
                Date.now().toString()
              );
            }
          } catch (error) {
            console.error("Error loading place data:", error);
          }
        }

        // Check reviews cache
        const reviewsCacheHit = await checkReviewsCache();
        if (!reviewsCacheHit) {
          // Cache miss - fetch fresh reviews data
          await loadReviews(true);
        }
      } else {
        setBookingsData({
          total: 0,
          pending: 0,
          today: 0,
          loading: false,
          bookings: [],
        });
        setPlaceData(null);
        setReviewsData({
          reviews: [],
          summary: { average: 0, count: 0 },
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error loading HomeScreen data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [checkBookingsCache, loadBookings, checkPlaceCache, checkReviewsCache, loadReviews]);

  // Check cache for place data
  const checkPlaceCache = useCallback(async () => {
    try {
      const cachedPlace = await AsyncStorage.getItem(CACHE_KEYS.PLACE);
      const cachedTimestamp = await AsyncStorage.getItem(
        CACHE_KEYS.PLACE_TIMESTAMP
      );

      if (cachedPlace && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();

        // Use cache if it's still valid
        if (now - timestamp < CACHE_EXPIRY) {
          const parsedPlace = JSON.parse(cachedPlace);
          setPlaceData(parsedPlace);
          return true; // Cache hit
        }
      }
      return false; // Cache miss
    } catch (error) {
      console.error("Error checking place cache:", error);
      return false;
    }
  }, []);

  // Load place data with caching
  const loadPlace = useCallback(
    async (forceRefresh = false) => {
      try {
        if (!user?.place_id) {
          setPlaceData(null);
          return;
        }

        // Check cache first if not forcing refresh
        if (!forceRefresh) {
          const cacheHit = await checkPlaceCache();
          if (cacheHit) {
            return; // Use cached data
          }
        }

        // Fetch fresh place data
        const { data, error } = await supabase
          .from("places")
          .select("*")
          .eq("id", user.place_id)
          .single();

        if (error) {
          console.error("Error fetching place data:", error);
          return;
        }

        if (data) {
          setPlaceData(data);
          // Cache the place data
          await AsyncStorage.setItem(CACHE_KEYS.PLACE, JSON.stringify(data));
          await AsyncStorage.setItem(
            CACHE_KEYS.PLACE_TIMESTAMP,
            Date.now().toString()
          );
        }
      } catch (error) {
        console.error("Error loading place:", error);
      }
    },
    [user?.place_id, checkPlaceCache]
  );

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        CACHE_KEYS.USER,
        CACHE_KEYS.BOOKINGS,
        CACHE_KEYS.BOOKINGS_TIMESTAMP,
        CACHE_KEYS.PLACE,
        CACHE_KEYS.PLACE_TIMESTAMP,
        CACHE_KEYS.REVIEWS,
        CACHE_KEYS.REVIEWS_TIMESTAMP,
      ]);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await loadUser();
    await loadBookings(true);
    await loadReviews(true);
  }, [loadUser, loadBookings, loadReviews]);

  // Initialize with empty state - HomeScreen will load data when needed
  useEffect(() => {
    // Don't auto-load on mount - let HomeScreen control when to load
    setIsLoading(false);
  }, []);

  const value = {
    user,
    bookingsData,
    placeData,
    reviewsData,
    isLoading,
    loadUser,
    loadBookings,
    loadPlace,
    loadReviews,
    loadHomeScreenData,
    refreshData,
    clearCache,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export default AppContext;
