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
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser } from "../utils/auth";
import { api } from "../api/client";
import { supabase } from "../config/supabase";
import { useToast } from "./ToastContext";

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
  NOTIFICATIONS: "@app_cache_notifications",
  NOTIFICATIONS_TIMESTAMP: "@app_cache_notifications_timestamp",
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

export const AppProvider = ({ children }) => {
  const { showToast } = useToast();
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
  const [notificationsData, setNotificationsData] = useState({
    notifications: [],
    unreadCount: 0,
    loading: true,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [bannerCacheBuster, setBannerCacheBuster] = useState(0);

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

        setBookingsData((prev) => ({ ...prev, loading: true }));

        const bookingsWithUserDetails = await api.getVendorBookings(user.place_id);

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

        const { reviews, summary } = await api.getVendorReviews(user.place_id);

        if (!reviews || reviews.length === 0) {
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

        const payload = {
          reviews,
          summary: summary || { average: 0, count: reviews.length },
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

  // Mark all notifications as read for a vendor
  const markAllNotificationsAsRead = useCallback(
    async (vendorId = null) => {
      const vid = vendorId ?? user?.id;
      if (!vid) return;
      try {
        await api.markNotificationsRead(vid);

        // Update local state and cache
        setNotificationsData((prev) => {
          const updated = (prev.notifications || []).map((n) => ({ ...n, is_read: true }));
          AsyncStorage.setItem(
            CACHE_KEYS.NOTIFICATIONS,
            JSON.stringify({ notifications: updated, unreadCount: 0 })
          ).catch((err) => console.warn("Cache update failed:", err));
          return { ...prev, notifications: updated, unreadCount: 0 };
        });
      } catch (error) {
        console.error("Error marking notifications as read:", error);
      }
    },
    [user?.id]
  );

  // Load vendor notifications from vendor_notifications table
  const loadNotifications = useCallback(
    async (forceRefresh = false, vendorId = null) => {
      const vid = vendorId ?? user?.id;
      try {
        if (!vid) {
          setNotificationsData({
            notifications: [],
            unreadCount: 0,
            loading: false,
            error: null,
          });
          return;
        }

        setNotificationsData((prev) => ({ ...prev, loading: true, error: null }));

        const { notifications: list, unreadCount } = await api.getVendorNotifications(vid);

        setNotificationsData({
          notifications: list,
          unreadCount,
          loading: false,
          error: null,
        });

        await AsyncStorage.setItem(
          CACHE_KEYS.NOTIFICATIONS,
          JSON.stringify({ notifications: list, unreadCount })
        );
        await AsyncStorage.setItem(
          CACHE_KEYS.NOTIFICATIONS_TIMESTAMP,
          Date.now().toString()
        );
      } catch (error) {
        console.error("Error loading notifications:", error);
        setNotificationsData((prev) => ({
          ...prev,
          loading: false,
          error: error?.message ?? "Failed to load notifications",
        }));
      }
    },
    [user?.id]
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
            const data = await api.getVendorPlace(currentUserData.place_id);

            if (data) {
              setPlaceData(data);
              // Cache place details only (exclude banner_image_link)
              const { banner_image_link: _b, ...placeForCache } = data;
              await AsyncStorage.setItem(
                CACHE_KEYS.PLACE,
                JSON.stringify(placeForCache)
              );
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

        // Load notifications (vendor_id = currentUserData.id)
        if (currentUserData?.id) {
          await loadNotifications(true, currentUserData.id);
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
        setNotificationsData({
          notifications: [],
          unreadCount: 0,
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error("Error loading HomeScreen data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [checkBookingsCache, loadBookings, checkPlaceCache, checkReviewsCache, loadReviews, loadNotifications]);

  // Check cache for place data (banner_image_link is excluded from cache, fetched fresh)
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
          const placeId = parsedPlace?.id;
          if (placeId) {
            const placeFull = await api.getVendorPlace(placeId);
            setPlaceData({
              ...parsedPlace,
              banner_image_link: placeFull?.banner_image_link ?? null,
            });
          } else {
            setPlaceData(parsedPlace);
          }
          return true; // Cache hit
        }
      }
      return false; // Cache miss
    } catch (error) {
      console.error("Error checking place cache:", error);
      return false;
    }
  }, []);

  // Refetch only banner_image_link (lightweight, for Vendu Details screen)
  const loadBannerImage = useCallback(async () => {
    const placeId = user?.place_id || placeData?.id;
    if (!placeId) return;
    try {
      const data = await api.getVendorPlace(placeId);
      if (data) {
        setPlaceData((prev) =>
          prev ? { ...prev, banner_image_link: data.banner_image_link } : prev
        );
        setBannerCacheBuster(Date.now());
      }
    } catch (err) {
      console.error("Error loading banner image:", err);
    }
  }, [user?.place_id, placeData?.id]);

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
        const data = await api.getVendorPlace(user.place_id);

        if (data) {
          setPlaceData(data);
          // Cache place details only (exclude banner_image_link)
          const { banner_image_link: _b, ...placeForCache } = data;
          await AsyncStorage.setItem(
            CACHE_KEYS.PLACE,
            JSON.stringify(placeForCache)
          );
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
        CACHE_KEYS.NOTIFICATIONS,
        CACHE_KEYS.NOTIFICATIONS_TIMESTAMP,
      ]);
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await loadUser();
    const currentUser = await getCurrentUser();
    await loadBookings(true);
    await loadReviews(true);
    await loadNotifications(true, currentUser?.id);
  }, [loadUser, loadBookings, loadReviews, loadNotifications]);

  // Initialize with empty state - HomeScreen will load data when needed
  useEffect(() => {
    // Don't auto-load on mount - let HomeScreen control when to load
    setIsLoading(false);
  }, []);

  // Subscribe to realtime notifications when vendor is logged in
  useEffect(() => {
    const vendorId = user?.id;
    if (!vendorId) return;

    const channel = supabase
      .channel(`vendor-notifications-${vendorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vendor_notifications",
          filter: `vendor_id=eq.${vendorId}`,
        },
        (payload) => {
          const newRow = payload.new;
          if (!newRow) return;

          if (AppState.currentState === "active") {
            showToast("New booking received 🎉");
          }

          setNotificationsData((prev) => {
            if (!prev) return prev;
            const existingIds = new Set((prev.notifications || []).map((n) => n.id));
            if (existingIds.has(newRow.id)) return prev;

            const notification = {
              id: newRow.id,
              vendor_id: newRow.vendor_id,
              place_id: newRow.place_id,
              booking_id: newRow.booking_id,
              type: newRow.type,
              title: newRow.title,
              body: newRow.body,
              is_read: newRow.is_read ?? false,
              created_at: newRow.created_at,
            };
            const updated = [notification, ...(prev.notifications || [])];
            const newUnreadCount = (prev.unreadCount || 0) + 1;

            AsyncStorage.setItem(
              CACHE_KEYS.NOTIFICATIONS,
              JSON.stringify({ notifications: updated, unreadCount: newUnreadCount })
            ).catch((err) => console.warn("Cache update failed:", err));

            return {
              ...prev,
              notifications: updated,
              unreadCount: newUnreadCount,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showToast]);

  const value = {
    user,
    bookingsData,
    placeData,
    bannerCacheBuster,
    reviewsData,
    notificationsData,
    isLoading,
    loadUser,
    loadBookings,
    loadPlace,
    loadBannerImage,
    loadReviews,
    loadNotifications,
    markAllNotificationsAsRead,
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
