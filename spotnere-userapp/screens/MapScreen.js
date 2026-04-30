import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Country } from "country-state-city";
import { GoogleMaps, AppleMaps } from "expo-maps";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../constants/fonts";
import { formatListingPrice } from "../utils/placePrice";
import { getCachedPlaces, setCachedPlaces } from "../utils/placesCache";
import { PriceMarkerBitmapQueue } from "../components/PriceMarkerBitmapQueue";

/** When country is unknown yet — neutral world view (not a fixed “random” country). */
const WORLD_OVERVIEW_CAMERA = {
  coordinates: { latitude: 15, longitude: 0 },
  zoom: 2,
};

/** Country-level framing before we animate to GPS */
const COUNTRY_OVERVIEW_ZOOM = 5;

const USER_ZOOM = 16;

/** Max wait for App-provided `userCountry` before still zooming to GPS (reload race). */
const USER_COUNTRY_WAIT_MS = 1500;

/** Android: native camera animation duration (ms). iOS uses SwiftUI animation in expo-maps. */
const CAMERA_ANIMATION_DURATION_MS = 800;

/** Fixed-height strip under the map; one place per page (full width) */
const CAROUSEL_PLACES_LIMIT = 25;
const CAROUSEL_ROW_HEIGHT = 88;
const CAROUSEL_THUMB = 76;

/**
 * App.js renders BottomNavBar as position:absolute (height 70, bottom 10/20).
 * Without this inset, the map + carousel extend under the nav and the carousel is hidden.
 */
const FLOATING_BOTTOM_NAV_RESERVE = 70 + (Platform.OS === "ios" ? 20 : 8) + 10;

/** ~100m at mid-latitudes — tap near a pin on iOS (annotations do not emit onMarkerClick). */
const NEAR_PLACE_DEG_TAP = 0.0009;

/**
 * Center / zoom for a country name (from App geocode). Falls back to a world view.
 */
const getCameraForCountry = (countryName) => {
  if (!countryName || typeof countryName !== "string") {
    return WORLD_OVERVIEW_CAMERA;
  }
  const trimmed = countryName.trim();
  const countries = Country.getAllCountries();
  let found = countries.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!found) {
    const lower = trimmed.toLowerCase();
    found = countries.find(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        lower.includes(c.name.toLowerCase()),
    );
  }
  if (!found) {
    return WORLD_OVERVIEW_CAMERA;
  }
  const lat = parseFloat(found.latitude);
  const lng = parseFloat(found.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return WORLD_OVERVIEW_CAMERA;
  }
  return {
    coordinates: { latitude: lat, longitude: lng },
    zoom: COUNTRY_OVERVIEW_ZOOM,
  };
};

/** Parse lat/lng from DB fields or common Google Maps URL shapes */
const extractPlaceCoordinates = (place) => {
  if (!place) return null;
  const lat = place.latitude ?? place.lat;
  const lng = place.longitude ?? place.lng ?? place.lon;
  if (lat != null && lng != null) {
    const la = parseFloat(lat);
    const lo = parseFloat(lng);
    if (!Number.isNaN(la) && !Number.isNaN(lo)) {
      return { latitude: la, longitude: lo };
    }
  }
  const link = place.location_map_link || place.map_link || "";
  if (typeof link !== "string" || !link) return null;
  const atMatch = link.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    return {
      latitude: parseFloat(atMatch[1]),
      longitude: parseFloat(atMatch[2]),
    };
  }
  const qMatch = link.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qMatch) {
    return {
      latitude: parseFloat(qMatch[1]),
      longitude: parseFloat(qMatch[2]),
    };
  }
  return null;
};

const formatPlacesForCarousel = (allPlaces) => {
  if (!allPlaces?.length) return [];
  const formatted = allPlaces.map((place) => {
    const coords = extractPlaceCoordinates(place);
    const avg = Number(place.avg_price ?? 0);
    return {
      id: place.id,
      title: place.title || place.name || place.place_name || "Place",
      /** Short label for map pins (e.g. "$508") */
      pinLabel: `$${Math.round(avg)}`,
      price: formatListingPrice(place.avg_price, place.charge_per_guest),
      rating: parseFloat(place.rating || place.average_rating || 0) || 0,
      ratingString:
        place.rating?.toString() || place.average_rating?.toString() || "0",
      imageUri: place.banner_image_link || place.image || place.photo_url,
      showBadge: false,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    };
  });
  return formatted
    .sort((a, b) => b.rating - a.rating)
    .slice(0, CAROUSEL_PLACES_LIMIT);
};

const MapScreen = ({ onBack, userCountry, onPlacePress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const mapRef = useRef(null);
  /** Clears delayed camera state sync (keeps React `cameraPosition` aligned with native after animations). */
  const cameraStateSyncTimeoutRef = useRef(null);
  const userCountryRef = useRef(userCountry);
  /** True after we have animated/zoomed to the device GPS fix (blocks resetting to country overview). */
  const hasAnimatedToUserGpsRef = useRef(false);
  /** GPS coords to apply once native map is ready (rare race). */
  const pendingUserGpsRef = useRef(null);

  const [cameraPosition, setCameraPosition] = useState(() =>
    getCameraForCountry(userCountry),
  );
  /** Last known GPS fix for Android `userLocation` (dot only; must not follow/center camera). */
  const [userLocationCoords, setUserLocationCoords] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationHint, setLocationHint] = useState(null);
  const [carouselPlaces, setCarouselPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  /** Android: expo-image ImageRefs for pill markers keyed by pinLabel */
  const [androidMarkerIcons, setAndroidMarkerIcons] = useState({});

  const markerPinLabels = useMemo(
    () => [...new Set(carouselPlaces.map((p) => p.pinLabel).filter(Boolean))],
    [carouselPlaces],
  );

  const googleMarkers = useMemo(
    () =>
      carouselPlaces
        .filter(
          (p) =>
            p.latitude != null &&
            p.longitude != null &&
            !Number.isNaN(p.latitude) &&
            !Number.isNaN(p.longitude),
        )
        .map((p) => ({
          id: String(p.id),
          coordinates: { latitude: p.latitude, longitude: p.longitude },
          title: p.title,
          snippet: p.pinLabel || "",
          showCallout: false,
          anchor: { x: 0.5, y: 1 },
          icon: androidMarkerIcons[p.pinLabel] ?? undefined,
        })),
    [carouselPlaces, androidMarkerIcons],
  );

  /** iOS: pill-style labels via Map annotations (custom bitmap icons are fixed 50×50 in expo-maps). */
  const appleAnnotations = useMemo(
    () =>
      carouselPlaces
        .filter(
          (p) =>
            p.latitude != null &&
            p.longitude != null &&
            !Number.isNaN(p.latitude) &&
            !Number.isNaN(p.longitude),
        )
        .map((p) => ({
          id: String(p.id),
          coordinates: { latitude: p.latitude, longitude: p.longitude },
          title: p.title,
          text: p.pinLabel || "",
          backgroundColor: "#FFFFFF",
          textColor: "#000000",
        })),
    [carouselPlaces],
  );

  const scheduleCameraStateSyncAfterMove = useCallback((coordinates, zoom) => {
    if (cameraStateSyncTimeoutRef.current) {
      clearTimeout(cameraStateSyncTimeoutRef.current);
    }
    const delay =
      Platform.OS === "android" ? CAMERA_ANIMATION_DURATION_MS + 60 : 420;
    cameraStateSyncTimeoutRef.current = setTimeout(() => {
      cameraStateSyncTimeoutRef.current = null;
      setCameraPosition({
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        },
        zoom,
      });
    }, delay);
  }, []);

  const animateCameraToCoordinates = useCallback(
    (coordinates, zoom) => {
      if (
        coordinates?.latitude == null ||
        coordinates?.longitude == null ||
        Number.isNaN(coordinates.latitude) ||
        Number.isNaN(coordinates.longitude)
      ) {
        return;
      }
      if (Platform.OS === "android") {
        mapRef.current?.setCameraPosition?.({
          coordinates,
          zoom,
          duration: CAMERA_ANIMATION_DURATION_MS,
        });
      } else if (Platform.OS === "ios") {
        mapRef.current?.setCameraPosition?.({ coordinates, zoom });
      }
      scheduleCameraStateSyncAfterMove(coordinates, zoom);
    },
    [scheduleCameraStateSyncAfterMove],
  );

  /**
   * Smooth camera move to a place pin. Imperative API animates; we sync React
   * `cameraPosition` after the animation so prop updates (markers, etc.) do not
   * snap the camera back to the initial GPS fix.
   */
  const animateCameraToPlace = useCallback(
    (place) => {
      if (
        place?.latitude == null ||
        place?.longitude == null ||
        Number.isNaN(place.latitude) ||
        Number.isNaN(place.longitude)
      ) {
        return;
      }
      animateCameraToCoordinates(
        { latitude: place.latitude, longitude: place.longitude },
        USER_ZOOM,
      );
    },
    [animateCameraToCoordinates],
  );

  /** Annotations do not emit onMarkerClick in expo-maps; use map tap + nearest pin. */
  const handleIosMapTapPlace = useCallback(
    (event) => {
      if (Platform.OS !== "ios") return;
      const lat = event?.coordinates?.latitude;
      const lng = event?.coordinates?.longitude;
      if (lat == null || lng == null) return;
      let bestIdx = -1;
      let bestD = NEAR_PLACE_DEG_TAP;
      carouselPlaces.forEach((p, i) => {
        if (p.latitude == null || p.longitude == null) return;
        const d = Math.hypot(p.latitude - lat, p.longitude - lng);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0) {
        setCarouselIndex(bestIdx);
        animateCameraToPlace(carouselPlaces[bestIdx]);
      }
    },
    [carouselPlaces, animateCameraToPlace],
  );

  const handleMarkerPress = useCallback(
    (marker) => {
      const id = marker?.id;
      if (id == null) return;
      const idx = carouselPlaces.findIndex((p) => String(p.id) === String(id));
      if (idx < 0) return;
      setCarouselIndex(idx);
      animateCameraToPlace(carouselPlaces[idx]);
    },
    [carouselPlaces, animateCameraToPlace],
  );

  const goCarouselPrev = useCallback(() => {
    setCarouselIndex((i) => {
      const n = Math.max(0, i - 1);
      const place = carouselPlaces[n];
      if (place) animateCameraToPlace(place);
      return n;
    });
  }, [carouselPlaces, animateCameraToPlace]);

  const goCarouselNext = useCallback(() => {
    setCarouselIndex((i) => {
      const n = Math.min(carouselPlaces.length - 1, i + 1);
      const place = carouselPlaces[n];
      if (place) animateCameraToPlace(place);
      return n;
    });
  }, [carouselPlaces, animateCameraToPlace]);

  useEffect(() => {
    setCarouselIndex((i) =>
      carouselPlaces.length === 0 ? 0 : Math.min(i, carouselPlaces.length - 1),
    );
  }, [carouselPlaces.length]);

  useEffect(() => {
    return () => {
      if (cameraStateSyncTimeoutRef.current) {
        clearTimeout(cameraStateSyncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    userCountryRef.current = userCountry;
  }, [userCountry]);

  useEffect(() => {
    if (!userCountry) return;
    if (hasAnimatedToUserGpsRef.current) return;
    setCameraPosition(getCameraForCountry(userCountry));
  }, [userCountry]);

  const handleMapLoaded = useCallback(() => {
    const pending = pendingUserGpsRef.current;
    if (!pending) return;
    pendingUserGpsRef.current = null;
    animateCameraToCoordinates(pending, USER_ZOOM);
  }, [animateCameraToCoordinates]);

  const loadUserLocation = useCallback(async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      const granted = status === "granted";
      setHasLocationPermission(granted);

      if (!granted) {
        setLocationHint("Location off — showing default area");
        return;
      }

      setLocationHint(null);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      const coords = { latitude, longitude };
      setUserLocationCoords(coords);

      const waitStart = Date.now();
      while (Date.now() - waitStart < USER_COUNTRY_WAIT_MS) {
        if (userCountryRef.current) break;
        await new Promise((r) => setTimeout(r, 80));
      }

      hasAnimatedToUserGpsRef.current = true;
      if (mapRef.current) {
        animateCameraToCoordinates(coords, USER_ZOOM);
      } else {
        pendingUserGpsRef.current = coords;
      }
    } catch {
      setLocationHint("Could not get location — showing default area");
      setHasLocationPermission(false);
    }
  }, [animateCameraToCoordinates]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    loadUserLocation();
  }, [loadUserLocation]);

  useEffect(() => {
    let cancelled = false;
    const loadPlaces = async () => {
      setPlacesLoading(true);
      try {
        const cached = getCachedPlaces(userCountry || null);
        if (cached?.length) {
          if (!cancelled) setCarouselPlaces(formatPlacesForCarousel(cached));
          return;
        }
        const allPlaces = await api.getPlaces(
          userCountry ? { country: userCountry } : {},
        );
        if (!cancelled) {
          setCachedPlaces(
            Array.isArray(allPlaces) ? allPlaces : [],
            userCountry || null,
          );
          setCarouselPlaces(formatPlacesForCarousel(allPlaces || []));
        }
      } catch {
        if (!cancelled) setCarouselPlaces([]);
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    };
    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [userCountry]);

  const mapCommonProps = useMemo(() => {
    const base = {
      style: styles.map,
      cameraPosition,
      properties: { isMyLocationEnabled: hasLocationPermission },
      uiSettings: { myLocationButtonEnabled: hasLocationPermission },
    };
    if (
      Platform.OS === "android" &&
      userLocationCoords &&
      hasLocationPermission
    ) {
      return {
        ...base,
        userLocation: {
          coordinates: userLocationCoords,
          followUserLocation: false,
        },
      };
    }
    return base;
  }, [cameraPosition, hasLocationPermission, userLocationCoords]);

  const renderMap = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.webPlaceholder}>
          <Image
            source={require("../assets/categoryImages/mapImg.png")}
            style={styles.webPlaceholderImage}
            resizeMode="contain"
          />
          <Text style={styles.webPlaceholderTitle}>Map on mobile</Text>
          <Text style={styles.webPlaceholderText}>
            Open the app on Android or iOS to use the map.
          </Text>
        </View>
      );
    }

    if (Platform.OS === "android") {
      return (
        <GoogleMaps.View
          ref={mapRef}
          {...mapCommonProps}
          markers={googleMarkers}
          onMapLoaded={handleMapLoaded}
          onMarkerClick={handleMarkerPress}
        />
      );
    }

    if (Platform.OS === "ios") {
      return (
        <AppleMaps.View
          ref={mapRef}
          {...mapCommonProps}
          annotations={appleAnnotations}
          onMapLoaded={handleMapLoaded}
          onMapClick={handleIosMapTapPlace}
        />
      );
    }

    return (
      <View style={styles.webPlaceholder}>
        <Text style={styles.webPlaceholderText}>
          Map not available on this platform.
        </Text>
      </View>
    );
  };

  const renderCarousel = () => {
    if (placesLoading) {
      return (
        <View style={styles.carouselInner}>
          <View style={styles.carouselLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      );
    }
    if (carouselPlaces.length === 0) {
      return (
        <View style={styles.carouselInner}>
          <Text style={styles.carouselEmpty}>No places to show yet.</Text>
        </View>
      );
    }

    const item = carouselPlaces[carouselIndex];
    const atStart = carouselIndex <= 0;
    const atEnd = carouselIndex >= carouselPlaces.length - 1;

    return (
      <View style={styles.carouselInner}>
        <View style={styles.carouselRow}>
          <TouchableOpacity
            style={[
              styles.carouselArrow,
              atStart && styles.carouselArrowDisabled,
            ]}
            onPress={goCarouselPrev}
            disabled={atStart}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Previous place"
          >
            <Ionicons
              name="chevron-back"
              size={26}
              color={atStart ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.carouselCardTouchable}
            onPress={() => item && onPlacePress?.(item.id)}
            activeOpacity={0.88}
          >
            <View style={styles.carouselCard}>
              <ExpoImage
                source={
                  item.imageUri
                    ? { uri: item.imageUri }
                    : {
                        uri: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=450&fit=crop",
                      }
                }
                style={styles.carouselThumb}
                contentFit="cover"
              />
              <View style={styles.carouselCardBody}>
                <Text style={styles.carouselPlaceTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.carouselPrice} numberOfLines={1}>
                  {item.price}
                </Text>
                <View style={styles.carouselRatingRow}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <Text style={styles.carouselRatingText}>
                    {item.ratingString}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.carouselArrow,
              atEnd && styles.carouselArrowDisabled,
            ]}
            onPress={goCarouselNext}
            disabled={atEnd}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Next place"
          >
            <Ionicons
              name="chevron-forward"
              size={26}
              color={atEnd ? colors.textSecondary : colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { paddingBottom: FLOATING_BOTTOM_NAV_RESERVE }]}
    >
      <PriceMarkerBitmapQueue
        labels={markerPinLabels}
        onIcons={setAndroidMarkerIcons}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find places Nearby</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {locationHint ? (
        <Text style={styles.locationHint} numberOfLines={2}>
          {locationHint}
        </Text>
      ) : null}

      <View style={styles.content}>
        <View style={styles.mapSection}>{renderMap()}</View>
        <View style={styles.carouselSection}>{renderCarousel()}</View>
      </View>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop:
      Platform.OS === "ios" ? 80 : (StatusBar.currentHeight || 0) + 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: 4,
    zIndex: 1,
  },
  homeButton: {
    padding: 4,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  locationHint: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapSection: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  carouselSection: {
    flexGrow: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  carouselInner: {
    paddingTop: 15,
    paddingBottom: 12,
  },

  carouselLoading: {
    height: CAROUSEL_ROW_HEIGHT + 8,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: CAROUSEL_ROW_HEIGHT,
  },
  carouselArrow: {
    width: 40,
    height: CAROUSEL_ROW_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselArrowDisabled: {
    opacity: 0.45,
  },
  carouselCardTouchable: {
    flex: 1,
    minWidth: 0,
  },
  carouselCard: {
    flexDirection: "row",
    alignItems: "center",
    height: CAROUSEL_ROW_HEIGHT,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    overflow: "hidden",
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
  },
  carouselThumb: {
    width: CAROUSEL_THUMB,
    height: CAROUSEL_THUMB,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  carouselCardBody: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
    minWidth: 0,
  },
  carouselPlaceTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 20,
  },
  carouselPrice: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  carouselRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  carouselRatingText: {
    marginLeft: 4,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  webPlaceholderImage: {
    width: 74,
    height: 74,
    marginBottom: 16,
  },
  webPlaceholderTitle: {
    fontSize: 20,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  webPlaceholderText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default MapScreen;
