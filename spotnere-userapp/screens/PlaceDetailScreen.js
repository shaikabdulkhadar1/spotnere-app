/**
 * PlaceDetailScreen — Modern Redesign (2026 “premium card + glass + soft gradient” UI)
 * ✅ Keeps your existing logic (Supabase fetch, favorites, reviews carousel, vendor info, booking modal)
 * ✅ Uses your current libs/imports: expo-linear-gradient, expo-blur, expo-image, Ionicons
 * ✅ Cleaner hierarchy: Hero (image + title + chips) → Quick Actions → About → Details → Hours → Reviews → Vendor → CTA
 *
 * NOTE:
 * - I kept all your fetching + parsing logic, just reorganized UI + styles.
 * - You can copy-paste as-is.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Linking,
  Animated,
  Share,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { api } from "../api/client";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { getCurrentUser } from "../utils/auth";
import {
  saveFavoriteToDatabase,
  removeFavoriteFromDatabase,
  isFavoriteInDatabase,
} from "../utils/favorites";
import BookingModal from "../components/BookingModal";

const { width, height } = Dimensions.get("window");

const CARD_MARGIN = 12;
const ARROW_SIZE = 32;
const CARD_WIDTH = width - 40 - ARROW_SIZE * 2;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const PlaceDetailScreen = ({ placeId, onClose }) => {
  const [placeDetails, setPlaceDetails] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [addReviewText, setAddReviewText] = useState("");
  const [addReviewRating, setAddReviewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const reviewsScrollRef = useRef(null);
  const heroCarouselRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);
  const [heroScrollX, setHeroScrollX] = useState(0);

  useEffect(() => {
    if (placeId) {
      fetchPlaceDetails();
      fetchReviews();
      fetchGalleryImages();
      fetchVendorDetails();
      checkFavoriteStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  const checkFavoriteStatus = async () => {
    if (!placeId) return;
    const user = await getCurrentUser();
    if (user?.id) {
      const favorited = await isFavoriteInDatabase(user.id, placeId);
      setIsFavorited(favorited);
    }
  };

  const handleFavoritePress = async () => {
    if (!placeId) return;
    const user = await getCurrentUser();
    if (!user?.id) return;

    const newFavoriteState = !isFavorited;
    setIsFavorited(newFavoriteState);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.22,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (newFavoriteState) {
      const result = await saveFavoriteToDatabase(user.id, placeId);
      if (!result.success) setIsFavorited(false);
    } else {
      const result = await removeFavoriteFromDatabase(user.id, placeId);
      if (!result.success) setIsFavorited(true);
    }
  };

  const handleSharePlace = async () => {
    try {
      const name =
        placeDetails?.title ||
        placeDetails?.name ||
        placeDetails?.place_name ||
        "Place";
      const city = placeDetails?.city || "";
      const state = placeDetails?.state ? `, ${placeDetails.state}` : "";
      const url =
        placeDetails?.website ||
        placeDetails?.website_url ||
        placeDetails?.url ||
        placeDetails?.location_map_link ||
        "";
      const msg = `${name}${city ? ` — ${city}${state}` : ""}${
        url ? `\n${url}` : ""
      }`;
      await Share.share({ message: msg, title: "Spotnere Place" });
    } catch (e) {
      // ignore
    }
  };

  const fetchPlaceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPlace(placeId);
      setPlaceDetails(data);
    } catch (err) {
      setError(err?.message || "Failed to fetch place details");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await api.getPlaceReviews(placeId);
      const formatted = (data || []).map((r, index) => ({
        id: (r.user_id || "u") + "-" + index,
        review: r.review,
        rating: r.rating,
        user_name: r.user
          ? `${r.user.first_name || ""} ${r.user.last_name || ""}`.trim() ||
            "User"
          : "User",
        user_avatar:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop",
      }));
      setReviews(formatted);
    } catch (err) {
      setReviews([]);
    }
  };

  const fetchGalleryImages = async () => {
    try {
      const data = await api.getPlaceGallery(placeId);
      setGalleryImages(data || []);
    } catch (err) {
      setGalleryImages([]);
    }
  };

  const fetchVendorDetails = async () => {
    try {
      const data = await api.getPlaceVendor(placeId);
      setVendor(data || null);
    } catch (err) {
      setVendor(null);
    }
  };

  const handleSubmitReview = async () => {
    const user = await getCurrentUser();
    if (!user?.id) {
      Alert.alert("Login required", "Please log in to add a review.", [
        { text: "OK" },
      ]);
      return;
    }

    const trimmed = addReviewText?.trim() || "";
    if (!trimmed) {
      Alert.alert("Review required", "Please write your review.", [
        { text: "OK" },
      ]);
      return;
    }

    if (addReviewRating < 1 || addReviewRating > 5) {
      Alert.alert("Rating required", "Please select a rating (1–5 stars).", [
        { text: "OK" },
      ]);
      return;
    }

    try {
      setSubmittingReview(true);

      await api.addReview(placeId, {
        userId: user.id,
        review: trimmed,
        rating: Number(addReviewRating),
      });

      setShowAddReviewModal(false);
      setAddReviewText("");
      setAddReviewRating(0);
      await fetchReviews();
      await fetchPlaceDetails(); // Refresh place details so hero rating updates
      Alert.alert("Success", "Your review has been posted.", [{ text: "OK" }]);
    } catch (err) {
      Alert.alert("Error", "Failed to add review. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setSubmittingReview(false);
    }
  };

  const openAddReviewModal = async () => {
    const user = await getCurrentUser();
    if (!user?.id) {
      Alert.alert("Login required", "Please log in to add a review.", [
        { text: "OK" },
      ]);
      return;
    }
    setAddReviewText("");
    setAddReviewRating(0);
    setShowAddReviewModal(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.stateCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateTitle}>Loading place…</Text>
          <Text style={styles.stateSubtitle}>Fetching latest details</Text>
        </View>
      </View>
    );
  }

  if (error || !placeDetails) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.stateCenter}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={colors.error}
          />
          <Text style={[styles.stateTitle, { marginTop: 10 }]}>
            {error || "Place not found"}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={fetchPlaceDetails}
          >
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}>
            <Text style={styles.ghostBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Prefer avg from reviews; fallback to place's stored rating
  const ratingFromReviews =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + parseFloat(r.rating ?? 0), 0) /
        reviews.length
      : null;
  const rawRating =
    ratingFromReviews ??
    parseFloat(placeDetails.rating || placeDetails.average_rating || 0);
  const rating = isNaN(rawRating) ? 0 : Math.min(5, Math.max(0, rawRating));
  const likes = placeDetails.likes || placeDetails.favorites || 1300;

  const imageUri =
    placeDetails.banner_image_link ||
    placeDetails.image ||
    placeDetails.photo_url ||
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&h=900&fit=crop";

  const heroCarouselImages = [
    imageUri,
    ...galleryImages.map((g) => g.gallery_image_url),
  ];

  const heroPageIndex = Math.round(heroScrollX / width);
  const heroDotsCount = heroCarouselImages.length;

  const placeName =
    placeDetails.title ||
    placeDetails.name ||
    placeDetails.place_name ||
    "Place";

  const locationText = `${placeDetails.city || placeDetails.location || "Location"}${
    placeDetails.state ? `, ${placeDetails.state}` : ""
  }`;

  const capitalizeFirst = (text) => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const formatAmenity = (amenity) => {
    if (!amenity) return "";
    return amenity
      .replace(/-/g, " ")
      .split(" ")
      .map((w) => capitalizeFirst(w))
      .join(" ");
  };

  const openWebsite = () => {
    let url =
      placeDetails.website || placeDetails.website_url || placeDetails.url;
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://"))
      url = `https://${url}`;
    Linking.openURL(url);
  };

  const openMaps = () => {
    const link = placeDetails.location_map_link;
    if (link) return Linking.openURL(link);

    // fallback: try geo query
    const q = encodeURIComponent(`${placeName} ${locationText}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const callPhone = () => {
    const phone =
      placeDetails.phone ||
      placeDetails.phone_number ||
      placeDetails.contact_phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  // Hours renderer (supports object/string/legacy fallback)
  const renderOpeningHours = (place) => {
    let hours = null;

    if (place.opening_hours_json) {
      try {
        hours =
          typeof place.opening_hours_json === "string"
            ? JSON.parse(place.opening_hours_json)
            : place.opening_hours_json;
      } catch {}
    } else if (place.opening_hours) {
      try {
        hours =
          typeof place.opening_hours === "string"
            ? JSON.parse(place.opening_hours)
            : place.opening_hours;
      } catch {}
    } else if (place.hours) {
      try {
        hours =
          typeof place.hours === "string"
            ? JSON.parse(place.hours)
            : place.hours;
      } catch {
        hours = place.hours;
      }
    }

    if (!hours) {
      hours = {
        Monday: "9:00 AM - 10:00 PM",
        Tuesday: "9:00 AM - 10:00 PM",
        Wednesday: "9:00 AM - 10:00 PM",
        Thursday: "9:00 AM - 10:00 PM",
        Friday: "9:00 AM - 11:00 PM",
        Saturday: "10:00 AM - 11:00 PM",
        Sunday: "10:00 AM - 9:00 PM",
      };
    }

    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

    return days.map((day, index) => {
      let raw = hours[day] || hours[day.toLowerCase()] || hours[index] || null;

      let value = "Closed";
      if (raw) {
        if (typeof raw === "string") value = raw;
        else if (typeof raw === "object") {
          if (raw.open && raw.close) value = `${raw.open} - ${raw.close}`;
          else if (raw.close === null || raw.close === false) value = "Closed";
          else value = "Hours available";
        } else if (Array.isArray(raw)) {
          if (raw.length >= 2) value = `${raw[0]} - ${raw[1]}`;
          else if (raw.length === 1) value = raw[0];
        }
      }

      const isToday = today === day;

      return (
        <View key={day} style={[styles.row, isToday && styles.rowToday]}>
          <Text style={[styles.rowLabel, isToday && styles.rowLabelToday]}>
            {day.slice(0, 3)}
          </Text>
          <Text
            style={[
              styles.rowValue,
              isToday && styles.rowValueToday,
              value === "Closed" && styles.rowValueClosed,
            ]}
          >
            {value}
          </Text>
        </View>
      );
    });
  };

  const amenitiesArray = Array.isArray(placeDetails.amenities)
    ? placeDetails.amenities.filter(Boolean)
    : typeof placeDetails.amenities === "string"
      ? placeDetails.amenities
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

  const pageIndex = Math.round(scrollX / (CARD_WIDTH + CARD_MARGIN));
  const dotsCount = clamp(reviews.length, 0, 8); // keep dots sane

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO — Image carousel (banner + gallery) */}
        <View style={styles.hero}>
          <FlatList
            ref={heroCarouselRef}
            data={heroCarouselImages}
            keyExtractor={(_, i) => `hero-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => setHeroScrollX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.heroSlide}>
                <ExpoImage
                  source={{ uri: item }}
                  style={styles.heroImg}
                  contentFit="cover"
                  placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
                />
              </View>
            )}
          />

          {/* Overlay gradients */}
          <LinearGradient
            colors={[
              "transparent",
              "rgba(0,0,0,0.15)",
              "rgba(0,0,0,0.55)",
              "rgba(0,0,0,0.72)",
            ]}
            locations={[0, 0.35, 0.7, 1]}
            style={styles.heroBottomFade}
          />

          {/* Carousel arrows */}
          {heroDotsCount > 1 ? (
            <>
              <TouchableOpacity
                style={[styles.heroArrow, styles.heroArrowLeft]}
                onPress={() => {
                  if (heroPageIndex > 0) {
                    heroCarouselRef.current?.scrollToIndex({
                      index: heroPageIndex - 1,
                      animated: true,
                    });
                  }
                }}
                disabled={heroPageIndex === 0}
                activeOpacity={0.85}
              >
                <BlurView
                  intensity={75}
                  tint="light"
                  style={styles.heroArrowBlur}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={heroPageIndex === 0 ? "rgba(0,0,0,0.3)" : "#000"}
                  />
                </BlurView>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroArrow, styles.heroArrowRight]}
                onPress={() => {
                  if (heroPageIndex < heroDotsCount - 1) {
                    heroCarouselRef.current?.scrollToIndex({
                      index: heroPageIndex + 1,
                      animated: true,
                    });
                  }
                }}
                disabled={heroPageIndex === heroDotsCount - 1}
                activeOpacity={0.85}
              >
                <BlurView
                  intensity={75}
                  tint="light"
                  style={styles.heroArrowBlur}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={
                      heroPageIndex === heroDotsCount - 1
                        ? "rgba(0,0,0,0.3)"
                        : "#000"
                    }
                  />
                </BlurView>
              </TouchableOpacity>
            </>
          ) : null}

          {/* Top controls */}
          <View style={styles.heroTopBar}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <BlurView
                intensity={75}
                tint="light"
                style={styles.circleBtnBlur}
              >
                <Ionicons name="arrow-back" size={20} color="#000" />
              </BlurView>
            </TouchableOpacity>

            <View style={styles.heroTopRight}>
              <TouchableOpacity
                style={styles.circleBtn}
                onPress={handleSharePlace}
                activeOpacity={0.85}
              >
                <BlurView
                  intensity={75}
                  tint="light"
                  style={styles.circleBtnBlur}
                >
                  <Ionicons name="share-outline" size={20} color="#000" />
                </BlurView>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleBtn}
                onPress={handleFavoritePress}
                activeOpacity={0.85}
              >
                <BlurView
                  intensity={75}
                  tint="light"
                  style={styles.circleBtnBlur}
                >
                  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons
                      name={isFavorited ? "heart" : "heart-outline"}
                      size={20}
                      color={isFavorited ? "#FF3B30" : "#000"}
                    />
                  </Animated.View>
                </BlurView>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom content in hero */}
          <View style={styles.heroMeta}>
            <View style={styles.heroChipsRow}>
              <View style={styles.heroChip}>
                <Ionicons name="shield-checkmark" size={14} color="#000" />
                <Text style={styles.heroChipText}>
                  {capitalizeFirst(placeDetails.category || "Category")}
                </Text>
              </View>
              {placeDetails.sub_category ? (
                <View style={[styles.heroChip, { opacity: 0.95 }]}>
                  <Ionicons name="pricetag-outline" size={14} color="#000" />
                  <Text style={styles.heroChipText}>
                    {capitalizeFirst(placeDetails.sub_category)}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {placeName}
            </Text>

            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Ionicons name="location" size={14} color="#fff" />
                <Text style={styles.heroStatText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Ionicons name="star" size={14} color={colors.accent} />
                <Text style={styles.heroStatText}>{rating.toFixed(1)}</Text>
              </View>

              <View style={styles.heroStatDivider} />

              <View style={styles.heroStat}>
                <Ionicons name="heart" size={14} color="#FF3B30" />
                <Text style={styles.heroStatText}>
                  {(likes / 1000).toFixed(1)}k
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* CONTENT */}
        <View style={styles.body}>
          {/* Quick actions */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={openMaps}
              activeOpacity={0.9}
            >
              <Ionicons
                name="navigate-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.quickBtnText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={openWebsite}
              activeOpacity={0.9}
            >
              <Ionicons name="globe-outline" size={18} color={colors.primary} />
              <Text style={styles.quickBtnText}>Website</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickBtn}
              onPress={callPhone}
              activeOpacity={0.9}
            >
              <Ionicons name="call-outline" size={18} color={colors.primary} />
              <Text style={styles.quickBtnText}>Call</Text>
            </TouchableOpacity>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.sectionText}>
              {placeDetails.description ||
                "A Scottish-themed pub offering whiskeys, craft beers, and traditional dishes — a favorite among locals and tourists."}
            </Text>
          </View>

          {/* Details card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Details</Text>
            </View>

            {/* Price */}
            {placeDetails.avg_price ||
            placeDetails.price_per_night ||
            placeDetails.price ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Avg price</Text>
                <Text style={styles.rowValue}>
                  ₹
                  {placeDetails.avg_price ||
                    placeDetails.price_per_night ||
                    placeDetails.price}{" "}
                  {placeDetails.price_unit || "per person"}
                </Text>
              </View>
            ) : null}

            {/* Amenities */}
            {amenitiesArray.length > 0 ? (
              <View style={[styles.row, { alignItems: "flex-start" }]}>
                <Text style={styles.rowLabel}>Amenities</Text>
                <View style={styles.amenitiesWrap}>
                  {amenitiesArray.slice(0, 6).map((a, idx) => (
                    <View key={`${a}-${idx}`} style={styles.amenityPill}>
                      <Text style={styles.amenityPillText}>
                        {formatAmenity(a)}
                      </Text>
                    </View>
                  ))}
                  {amenitiesArray.length > 6 ? (
                    <View style={[styles.amenityPill, styles.amenityMore]}>
                      <Text style={styles.amenityPillText}>
                        +{amenitiesArray.length - 6}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Phone */}
            {/* {placeDetails.phone ||
            placeDetails.phone_number ||
            placeDetails.contact_phone ? (
              <TouchableOpacity
                style={styles.row}
                onPress={callPhone}
                activeOpacity={0.85}
              >
                <Text style={styles.rowLabel}>Phone</Text>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowValue, styles.linkText]}>
                    {placeDetails.phone ||
                      placeDetails.phone_number ||
                      placeDetails.contact_phone}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ) : null} */}

            {/* Website */}
            {placeDetails.website ||
            placeDetails.website_url ||
            placeDetails.url ? (
              <TouchableOpacity
                style={[styles.row, styles.rowLast]}
                onPress={openWebsite}
                activeOpacity={0.85}
              >
                <Text style={styles.rowLabel}>Website</Text>
                <View style={styles.rowRight}>
                  {/* <Text
                    style={[styles.rowValue, styles.linkText]}
                    numberOfLines={1}
                  >
                    {placeDetails.website ||
                      placeDetails.website_url ||
                      placeDetails.url}
                  </Text> */}
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.rowLast} />
            )}
          </View>

          {/* Hours card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Opening hours</Text>
            </View>
            <View style={{ paddingTop: 2 }}>
              {renderOpeningHours(placeDetails)}
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity
              style={styles.smallPrimary}
              activeOpacity={0.9}
              onPress={openAddReviewModal}
            >
              <Text style={styles.smallPrimaryText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewsWrap}>
            {reviews.length > 0 ? (
              <>
                <View style={styles.carouselShell}>
                  <ScrollView
                    ref={reviewsScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.carouselContent,
                      { paddingHorizontal: ARROW_SIZE },
                    ]}
                    snapToInterval={CARD_WIDTH + CARD_MARGIN}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
                    scrollEventThrottle={16}
                  >
                    {reviews.map((review) => {
                      const r = parseFloat(review.rating ?? 0);
                      const text =
                        review.review ||
                        review.text ||
                        review.review_text ||
                        review.comment ||
                        "";
                      const name = review.user_name || review.name || "User";

                      const shareReview = () => {
                        Share.share({
                          message: `"${text}" — ${name} (${r.toFixed(1)}★)`,
                          title: "Review",
                        });
                      };

                      return (
                        <View
                          key={review.id}
                          style={[
                            styles.reviewCard,
                            { width: CARD_WIDTH, marginRight: CARD_MARGIN },
                          ]}
                        >
                          <View style={styles.reviewTop}>
                            <View style={styles.reviewUser}>
                              <ExpoImage
                                source={{
                                  uri:
                                    review.user_avatar ||
                                    review.avatar ||
                                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
                                }}
                                style={styles.avatar}
                                contentFit="cover"
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.userName} numberOfLines={1}>
                                  {name}
                                </Text>
                                <Text style={styles.userRole}>Visitor</Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={shareReview}
                              activeOpacity={0.85}
                            >
                              <View style={styles.iconPill}>
                                <Ionicons
                                  name="share-outline"
                                  size={18}
                                  color={colors.textSecondary}
                                />
                              </View>
                            </TouchableOpacity>
                          </View>

                          <Text style={styles.reviewText} numberOfLines={4}>
                            {text}
                          </Text>

                          <View style={styles.reviewBottom}>
                            <View style={styles.stars}>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Ionicons
                                  key={s}
                                  name={r >= s ? "star" : "star-outline"}
                                  size={16}
                                  color={colors.accent}
                                  style={{ marginRight: 2 }}
                                />
                              ))}
                            </View>
                            <Text style={styles.ratingPill}>
                              {r.toFixed(1)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {/* arrows */}
                  <TouchableOpacity
                    style={[styles.arrow, styles.arrowLeft]}
                    onPress={() => {
                      const newX = Math.max(
                        0,
                        scrollX - (CARD_WIDTH + CARD_MARGIN),
                      );
                      reviewsScrollRef.current?.scrollTo({
                        x: newX,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.arrow, styles.arrowRight]}
                    onPress={() => {
                      const maxScroll =
                        (reviews.length - 1) * (CARD_WIDTH + CARD_MARGIN);
                      const newX = Math.min(
                        maxScroll,
                        scrollX + (CARD_WIDTH + CARD_MARGIN),
                      );
                      reviewsScrollRef.current?.scrollTo({
                        x: newX,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={22}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* dots */}
                <View style={styles.dotsRow}>
                  {Array.from({ length: dotsCount }).map((_, i) => {
                    const active = i === clamp(pageIndex, 0, dotsCount - 1);
                    return (
                      <View
                        key={`dot-${i}`}
                        style={[styles.dot, active && styles.dotActive]}
                      />
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={26}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No reviews yet</Text>
                <Text style={styles.emptySubtitle}>
                  Be the first to leave feedback
                </Text>
              </View>
            )}
          </View>

          {/* Vendor */}
          {vendor ? (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Venue owner</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Business</Text>
                <Text style={styles.rowValue}>
                  {vendor.business_name || "—"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Owner</Text>
                <Text style={styles.rowValue}>
                  {vendor.vendor_full_name || "—"}
                </Text>
              </View>

              {/* {vendor.vendor_phone_number ? (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    Linking.openURL(`tel:${vendor.vendor_phone_number}`)
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.rowLabel}>Phone</Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, styles.linkText]}>
                      {vendor.vendor_phone_number}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ) : null} */}

              {vendor.vendor_email ? (
                <TouchableOpacity
                  style={[styles.row, styles.rowLast]}
                  onPress={() =>
                    Linking.openURL(`mailto:${vendor.vendor_email}`)
                  }
                  activeOpacity={0.85}
                >
                  <Text style={styles.rowLabel}>Email</Text>
                  <View style={styles.rowRight}>
                    {/* <Text
                      style={[styles.rowValue, styles.linkText]}
                      numberOfLines={1}
                    >
                      {vendor.vendor_email}
                    </Text> */}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.rowLast} />
              )}
            </View>
          ) : null}

          {/* spacer for bottom CTA */}
          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* Bottom glass CTA */}
      <View style={styles.bottomBar}>
        <BlurView intensity={20} tint="light" style={styles.bottomBarBlur}>
          <View style={styles.bottomInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bottomTitle} numberOfLines={1}>
                {placeName}
              </Text>
              <Text style={styles.bottomSub} numberOfLines={1}>
                Tap to book instantly
              </Text>
            </View>

            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => setShowBookingModal(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.ctaText}>Book now</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>

      <BookingModal
        visible={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        placeDetails={placeDetails}
        vendor={vendor}
      />

      {/* Add Review Modal */}
      <Modal
        visible={showAddReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddReviewModal(false)}
      >
        <View style={styles.addReviewOverlay}>
          <View style={styles.addReviewModal}>
            <View style={styles.addReviewHeader}>
              <Text style={styles.addReviewTitle}>Write a review</Text>
              <TouchableOpacity
                onPress={() => setShowAddReviewModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.addReviewLabel}>Rating</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setAddReviewRating(star)}
                  style={styles.starBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={addReviewRating >= star ? "star" : "star-outline"}
                    size={32}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.addReviewLabel}>Your review</Text>
            <TextInput
              style={styles.addReviewInput}
              placeholder="Share your experience..."
              placeholderTextColor={colors.textSecondary}
              value={addReviewText}
              onChangeText={setAddReviewText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.addReviewCharCount}>
              {addReviewText.length}/500
            </Text>

            <TouchableOpacity
              style={[
                styles.addReviewSubmit,
                submittingReview && styles.addReviewSubmitDisabled,
              ]}
              onPress={handleSubmitReview}
              disabled={submittingReview}
              activeOpacity={0.9}
            >
              {submittingReview ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addReviewSubmitText}>Submit review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Loading / error state
  stateCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    textAlign: "center",
  },
  stateSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  ghostBtn: { marginTop: 10, padding: 10 },
  ghostBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  // Hero
  hero: {
    width: "100%",
    height: height * 0.44,
    position: "relative",
    backgroundColor: colors.surface,
  },
  heroSlide: {
    width,
    height: height * 0.44,
  },
  heroImg: { width: "100%", height: "100%" },
  heroArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    zIndex: 9,
  },
  heroArrowLeft: {
    left: 12,
  },
  heroArrowRight: {
    right: 12,
  },
  heroArrowBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  heroShade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroBottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  },
  heroTopBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 44,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  heroTopRight: { flexDirection: "row", gap: 10 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  circleBtnBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },

  heroMeta: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 8,
  },
  heroChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroChipText: { fontSize: 12, fontFamily: fonts.semiBold, color: "#000" },
  heroTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: "#fff",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  heroStatsRow: { flexDirection: "row", alignItems: "center" },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "46%",
  },
  heroStatText: { fontSize: 12.5, fontFamily: fonts.semiBold, color: "#fff" },
  heroStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.28)",
    marginHorizontal: 10,
  },

  // Body
  body: { paddingHorizontal: 16, paddingTop: 14 },

  quickRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  quickBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 2 },
    }),
  },
  quickBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15.5,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 22,
  },

  // Cards
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.15,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowToday: {
    backgroundColor: colors.todayRow,
    borderBottomWidth: 0,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    flex: 1,
  },
  rowLabelToday: { fontFamily: fonts.bold },
  rowValue: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "right",
    maxWidth: "62%",
  },
  rowValueToday: { fontFamily: fonts.semiBold, color: colors.text },
  rowValueClosed: { fontFamily: fonts.bold, color: colors.error },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  linkText: { color: colors.primary },

  // Amenities
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    maxWidth: "70%",
  },
  amenityPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityMore: {
    backgroundColor: colors.primary + "14",
    borderColor: colors.primary + "28",
  },
  amenityPillText: {
    fontSize: 12.5,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },

  // Reviews
  reviewsHeader: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  smallPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  smallPrimaryText: {
    color: "#fff",
    fontSize: 12.5,
    fontFamily: fonts.semiBold,
  },

  reviewsWrap: { marginBottom: 14 },
  carouselShell: { position: "relative", minHeight: 200 },
  carouselContent: { paddingVertical: 8 },

  reviewCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  reviewUser: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userName: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  userRole: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewText: {
    fontSize: 14.5,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 12,
  },
  reviewBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stars: { flexDirection: "row", alignItems: "center" },
  ratingPill: {
    fontSize: 12.5,
    fontFamily: fonts.bold,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -ARROW_SIZE / 2,
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
      },
      android: { elevation: 3 },
    }),
    zIndex: 10,
  },
  arrowLeft: { left: 0 },
  arrowRight: { right: 0 },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.primary },

  emptyBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 1 },
    }),
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomBarBlur: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    overflow: "hidden",
  },
  bottomInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  bottomSub: {
    marginTop: 3,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },

  ctaBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { fontSize: 14, fontFamily: fonts.semiBold, color: "#fff" },

  // Add Review Modal
  addReviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  addReviewModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    }),
  },
  addReviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  addReviewTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  addReviewLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 10,
  },
  starRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  starBtn: {
    padding: 4,
  },
  addReviewInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 100,
  },
  addReviewCharCount: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 16,
  },
  addReviewSubmit: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  addReviewSubmitDisabled: {
    opacity: 0.7,
  },
  addReviewSubmitText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#fff",
  },
});

export default PlaceDetailScreen;
