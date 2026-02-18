import React from "react";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Animated,
  BackHandler,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useFonts } from "expo-font";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "./config/supabase";
import HomeScreen from "./screens/HomeScreen";
import FavoriteScreen from "./screens/FavoriteScreen";
import MapScreen from "./screens/MapScreen";
import TripsScreen from "./screens/TripsScreen";
import ReelsScreen from "./screens/ReelsScreen";
import BottomNavBar from "./components/BottomNavBar";
import PlaceDetailScreen from "./screens/PlaceDetailScreen";
import BookingDetailScreen from "./screens/BookingDetailScreen";
import ProfileScreen from "./screens/ProfileScreen";
import { BookingsProvider } from "./context/BookingsContext";
import { colors } from "./constants/colors";
import { fonts } from "./constants/fonts";
import { getCachedPlaces, setCachedPlaces } from "./utils/placesCache";

// Error Boundary Styles (defined before ErrorBoundary component)
const errorBoundaryStyles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: fonts.regular,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.regular,
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorBoundaryStyles.errorContainer}>
          <Text style={errorBoundaryStyles.errorText}>
            Something went wrong: {this.state.error?.message || "Unknown error"}
          </Text>
          <TouchableOpacity
            style={errorBoundaryStyles.retryButton}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorBoundaryStyles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const { width, height } = Dimensions.get("window");

export default function App() {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "Parkinsans-Light": require("./assets/fonts/Parkinsans-Light.ttf"),
    "Parkinsans-Regular": require("./assets/fonts/Parkinsans-Regular.ttf"),
    "Parkinsans-Medium": require("./assets/fonts/Parkinsans-Medium.ttf"),
    "Parkinsans-SemiBold": require("./assets/fonts/Parkinsans-SemiBold.ttf"),
    "Parkinsans-Bold": require("./assets/fonts/Parkinsans-Bold.ttf"),
    "Parkinsans-ExtraBold": require("./assets/fonts/Parkinsans-ExtraBold.ttf"),
  });

  const [city, setCity] = useState("Your City"); // Will be updated from location
  const [activeTab, setActiveTab] = useState("home");
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter state (temporary - for modal)
  const [selectedSortBy, setSelectedSortBy] = useState("rating");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSubCategoryDropdown, setShowSubCategoryDropdown] = useState(false);

  // Applied filters (actual filters being used)
  const [appliedFilters, setAppliedFilters] = useState({
    sortBy: "rating",
    rating: 0,
    category: "All",
    subCategory: "",
  });

  const slideAnim = useRef(new Animated.Value(height)).current;
  const lastBackPress = useRef(0);

  // Android back button: navigate back instead of exiting app
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // 1. Close filter modal if open
        if (showFilterModal) {
          Animated.spring(slideAnim, {
            toValue: height,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start(() => setShowFilterModal(false));
          return true;
        }

        // 2. Close booking detail if viewing
        if (selectedBooking) {
          setSelectedBooking(null);
          return true;
        }

        // 3. Close place detail if viewing
        if (selectedPlaceId) {
          setSelectedPlaceId(null);
          return true;
        }

        // 4. Go back to home if on another tab
        if (activeTab !== "home") {
          setActiveTab("home");
          return true;
        }

        // 5. On home: "Press back again to exit"
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress.current = now;
        Alert.alert("Exit App", "Press back again to exit", [{ text: "OK" }]);
        return true;
      }
    );

    return () => backHandler.remove();
  }, [
    showFilterModal,
    selectedBooking,
    selectedPlaceId,
    activeTab,
    slideAnim,
    height,
  ]);

  // Sub-categories mapping based on image
  const subCategories = {
    All: [],
    Sports: [
      "Cricket",
      "Racquet games",
      "Football",
      "Basket ball",
      "Volly ball",
      "Golf",
      "Bowling",
      "Snooker",
      "Aiming Games",
      "VR Games",
      "Paintball",
      "Go Carting",
      "Trampolin",
      "Cycling",
    ],
    Adventure: [
      "Water Amusement",
      "Jungle Safari",
      "Para Gliding",
      "Para Motoring",
      "Trekking",
      "Ziplining",
      "Horse Riding",
    ],
    Parks: ["Water Amusement", "Family Park", "Zoological park", "Kids park"],
    Staycation: ["Farm House", "Resorts", "5S Villa's"],
    Tickets: [
      "Football Match",
      "Cricket Match",
      "Hockey Match",
      "Snooker Match",
      "Tennis Match",
      "Kabaddi Match",
      "IPL Tickets",
    ],
    Exclusive: [
      "Scuba Diving",
      "Sky Diving",
      "Hot Air Ballon",
      "Disney Land",
      "Ferrari World",
      "Mount Everest Climbing",
    ],
  };

  // Category navigation data
  const categories = [
    {
      id: "All",
      label: "All",
      image: require("./assets/categoryImages/allImg.png"),
      iconSize: 38,
      isActive: true,
    },
    {
      id: "Sports",
      label: "Sports",
      image: require("./assets/categoryImages/sportsImg.png"),
      iconSize: 50,
      isActive: false,
    },
    {
      id: "Adventure",
      label: "Adventure",
      image: require("./assets/categoryImages/adventureImg.png"),
      iconSize: 50,
      isActive: false,
    },
    {
      id: "Parks",
      label: "Parks",
      image: require("./assets/categoryImages/parkImg.png"),
      iconSize: 50,
      isActive: false,
    },
    {
      id: "Staycation",
      label: "Staycation",
      image: require("./assets/categoryImages/staycationImg.png"),
      iconSize: 50,
      isActive: false,
    },
    {
      id: "Tickets",
      label: "Tickets",
      image: require("./assets/categoryImages/ticketImg.png"),
      iconSize: 50,
      isActive: false,
    },
    {
      id: "Exclusive",
      label: "Exclusive",
      image: require("./assets/categoryImages/exclusiveImg.png"),
      iconSize: 50,
      isActive: false,
    },
  ];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCountry, setUserCountry] = useState(null);

  // Track if initial fetch has been completed
  const hasInitialFetchCompleted = useRef(false);

  useEffect(() => {
    // Only fetch once on initial app load
    if (hasInitialFetchCompleted.current) {
      console.log("📦 App already initialized, skipping fetch");
      return;
    }

    // Delay initialization slightly to ensure app is mounted
    const initTimer = setTimeout(() => {
      // Get location to determine country for filtering
      getLocationAndSetCountry().catch((err) => {
        console.error("Error getting location:", err);
        setError(err.message || "Failed to get location");
        setLoading(false);
      });
    }, 100);

    return () => clearTimeout(initTimer);
  }, []);

  // Function to get location and set country for filtering
  const getLocationAndSetCountry = async () => {
    // Prevent multiple fetches - only fetch once on initial load
    if (hasInitialFetchCompleted.current) {
      console.log("📦 Initial fetch already completed, will not fetch again");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location permission is required to show nearby places. Please enable it in settings.",
          [{ text: "OK" }],
        );
        setError("Location permission denied");
        setLoading(false);
        return;
      }

      // Get device location with timeout
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 10000, // 10 second timeout
      });

      if (!location || !location.coords) {
        throw new Error("Could not get location coordinates");
      }

      const { latitude, longitude } = location.coords;

      if (!latitude || !longitude) {
        throw new Error("Invalid location coordinates");
      }

      // Reverse geocode to get country
      let geocode;
      try {
        geocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
      } catch (geocodeError) {
        console.warn("Reverse geocoding failed:", geocodeError);
        setLoading(false);
        return;
      }

      if (geocode && geocode.length > 0) {
        const country = geocode[0].country;
        const cityName = geocode[0].city || geocode[0].subAdministrativeArea;

        console.log("📍 Extracted Location Information:");
        console.log("Country:", country);
        console.log("City:", cityName);

        setUserCountry(country);
        if (cityName) {
          setCity(cityName);
        }
      } else {
        throw new Error("Could not determine location");
      }
    } catch (err) {
      console.error("Error getting location:", err);
      setError(err.message || "Failed to get location");
    } finally {
      setLoading(false);
      hasInitialFetchCompleted.current = true;
    }
  };

  // Show loading indicator while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary || "#007AFF"} />
      </View>
    );
  }

  // Don't show loading screen - let HomeScreen show skeleton loaders
  // if (loading) {
  //   return (
  //     <View style={[styles.container, styles.loadingContainer]}>
  //       <ActivityIndicator size="large" color="#007AFF" />
  //       <Text style={styles.loadingText}>Getting your location...</Text>
  //     </View>
  //   );
  // }

  if (error) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={getLocationAndSetCountry}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <BookingsProvider>
      <View style={styles.container}>
        <ExpoStatusBar style="light" />

        {/* Top Section - Search Bar and Categories - Hidden on detail screens and shown only on Home tab */}
        {!selectedPlaceId && !selectedBooking && activeTab === "home" && (
          <View style={styles.topSection}>
            {/* Search Bar */}
            <View style={styles.searchBarWrapper}>
              <View style={styles.searchBarRow}>
                <View style={styles.searchBarContainer}>
                  <Ionicons
                    name="search"
                    size={20}
                    color="#717171"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchBarInput}
                    placeholder="Start typing to search"
                    placeholderTextColor="#717171"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    editable={true}
                    returnKeyType="search"
                  />
                </View>
                <TouchableOpacity
                  style={styles.filterButton}
                  onPress={() => {
                    // Initialize modal with currently applied filters
                    setSelectedSortBy(appliedFilters.sortBy);
                    setSelectedRating(appliedFilters.rating);
                    setSelectedCategory(appliedFilters.category);
                    setSelectedSubCategory(appliedFilters.subCategory);
                    setShowFilterModal(true);
                    slideAnim.setValue(height);
                    Animated.spring(slideAnim, {
                      toValue: 0,
                      useNativeDriver: true,
                      tension: 65,
                      friction: 11,
                    }).start();
                  }}
                >
                  <Ionicons name="filter-outline" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Navigation */}
            <View style={styles.categoryContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {categories.map((category) => {
                  const isActive = activeCategory === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryItem,
                        isActive && styles.categoryItemActive,
                      ]}
                      onPress={() => setActiveCategory(category.id)}
                    >
                      <View style={styles.categoryIconContainer}>
                        {category.image ? (
                          <Image
                            source={category.image}
                            style={[
                              styles.categoryImage,
                              {
                                width: category.iconSize,
                                height: category.iconSize,
                              },
                            ]}
                            resizeMode="contain"
                          />
                        ) : (
                          <Ionicons
                            name={category.icon}
                            size={category.iconSize}
                            color="#222"
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          isActive && styles.categoryLabelActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                      {isActive && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {selectedBooking ? (
          <BookingDetailScreen
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            onViewPlace={(placeId) => {
              setSelectedBooking(null);
              setSelectedPlaceId(placeId);
            }}
          />
        ) : selectedPlaceId ? (
          <PlaceDetailScreen
            placeId={selectedPlaceId}
            onClose={() => setSelectedPlaceId(null)}
          />
        ) : (
          <>
            {activeTab === "favorite" ? (
              <FavoriteScreen
                userCountry={userCountry}
                onPlacePress={setSelectedPlaceId}
                onBack={() => setActiveTab("home")}
              />
            ) : activeTab === "map" ? (
              <MapScreen
                userCountry={userCountry}
                onPlacePress={setSelectedPlaceId}
                onBack={() => setActiveTab("home")}
              />
            ) : activeTab === "trips" ? (
              <TripsScreen
                userCountry={userCountry}
                onTripPress={setSelectedBooking}
                onBack={() => setActiveTab("home")}
              />
            ) : activeTab === "reels" ? (
              <ReelsScreen
                userCountry={userCountry}
                onPlacePress={setSelectedPlaceId}
                onBack={() => setActiveTab("home")}
              />
            ) : activeTab === "profile" ? (
              <ProfileScreen
                onLoginSuccess={(userData) => {
                  // Handle successful login - user data is stored in auth utility
                  console.log("User logged in:", userData);
                }}
                onBack={() => setActiveTab("home")}
                onTripPress={setSelectedBooking}
              />
            ) : (
              <HomeScreen
                userCountry={userCountry}
                activeCategory={activeCategory}
                onPlacePress={setSelectedPlaceId}
                filters={appliedFilters}
                searchQuery={searchQuery}
              />
            )}
            <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
          </>
        )}

        {/* Filter Bottom Sheet Modal */}
        <Modal
          visible={showFilterModal}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            Animated.spring(slideAnim, {
              toValue: height,
              useNativeDriver: true,
              tension: 65,
              friction: 11,
            }).start(() => setShowFilterModal(false));
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              Animated.spring(slideAnim, {
                toValue: height,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
              }).start(() => setShowFilterModal(false));
            }}
          >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback
                onPress={() => setShowSortDropdown(false)}
              >
                <Animated.View
                  style={[
                    styles.filterModal,
                    {
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View style={styles.modalHandle} />
                  <View style={styles.modalContentWrapper}>
                    <ScrollView
                      style={styles.modalScrollView}
                      contentContainerStyle={styles.modalScrollContent}
                      showsVerticalScrollIndicator={false}
                    >
                      <View style={styles.filterContent}>
                        {/* Sort By Section */}
                        <View style={styles.filterSection}>
                          <Text style={styles.sectionLabel}>Sort By</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.pillScrollView}
                            contentContainerStyle={styles.pillScrollContent}
                          >
                            <TouchableOpacity
                              style={[
                                styles.pillButton,
                                selectedSortBy === "distance" &&
                                  styles.pillButtonActive,
                              ]}
                              onPress={() => {
                                setSelectedSortBy("distance");
                                console.log("Sort by: Distance");
                              }}
                            >
                              <Text
                                style={[
                                  styles.pillButtonText,
                                  selectedSortBy === "distance" &&
                                    styles.pillButtonTextActive,
                                ]}
                              >
                                Distance
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.pillButton,
                                selectedSortBy === "price" &&
                                  styles.pillButtonActive,
                              ]}
                              onPress={() => {
                                setSelectedSortBy("price");
                                console.log("Sort by: Price");
                              }}
                            >
                              <Text
                                style={[
                                  styles.pillButtonText,
                                  selectedSortBy === "price" &&
                                    styles.pillButtonTextActive,
                                ]}
                              >
                                Price
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.pillButton,
                                selectedSortBy === "rating" &&
                                  styles.pillButtonActive,
                              ]}
                              onPress={() => {
                                setSelectedSortBy("rating");
                                console.log("Sort by: Rating");
                              }}
                            >
                              <Text
                                style={[
                                  styles.pillButtonText,
                                  selectedSortBy === "rating" &&
                                    styles.pillButtonTextActive,
                                ]}
                              >
                                Rating
                              </Text>
                            </TouchableOpacity>
                          </ScrollView>
                        </View>

                        {/* Category Section */}
                        <View style={styles.filterSection}>
                          <Text style={styles.sectionLabel}>Category</Text>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => {
                              setShowCategoryDropdown(!showCategoryDropdown);
                              setShowSubCategoryDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownButtonText}>
                              {selectedCategory === "All"
                                ? "Select Category"
                                : categories.find(
                                    (c) => c.id === selectedCategory,
                                  )?.label || "Select Category"}
                            </Text>
                            <Ionicons
                              name={
                                showCategoryDropdown
                                  ? "chevron-up"
                                  : "chevron-down"
                              }
                              size={20}
                              color={colors.textSecondary}
                            />
                          </TouchableOpacity>

                          {showCategoryDropdown && (
                            <View style={styles.dropdownMenu}>
                              <ScrollView
                                style={styles.dropdownScrollView}
                                nestedScrollEnabled={true}
                                showsVerticalScrollIndicator={true}
                              >
                                {categories.map((category) => (
                                  <TouchableOpacity
                                    key={category.id}
                                    style={[
                                      styles.dropdownOption,
                                      selectedCategory === category.id &&
                                        styles.dropdownOptionSelected,
                                    ]}
                                    onPress={() => {
                                      setSelectedCategory(category.id);
                                      setSelectedSubCategory(""); // Reset sub-category when category changes
                                      setShowCategoryDropdown(false);
                                      console.log("Category:", category.id);
                                    }}
                                  >
                                    <Text
                                      style={[
                                        styles.dropdownOptionText,
                                        selectedCategory === category.id &&
                                          styles.dropdownOptionTextSelected,
                                      ]}
                                    >
                                      {category.label}
                                    </Text>
                                    {selectedCategory === category.id && (
                                      <Ionicons
                                        name="checkmark"
                                        size={20}
                                        color={colors.primary}
                                      />
                                    )}
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>

                        {/* Sub-category Section */}
                        <View style={styles.filterSection}>
                          <Text style={styles.sectionLabel}>Sub-category</Text>
                          <TouchableOpacity
                            style={[
                              styles.dropdownButton,
                              (selectedCategory === "All" ||
                                !subCategories[selectedCategory]?.length) &&
                                styles.dropdownButtonDisabled,
                            ]}
                            disabled={
                              selectedCategory === "All" ||
                              !subCategories[selectedCategory]?.length
                            }
                            onPress={() => {
                              if (
                                selectedCategory !== "All" &&
                                subCategories[selectedCategory]?.length
                              ) {
                                setShowSubCategoryDropdown(
                                  !showSubCategoryDropdown,
                                );
                                setShowCategoryDropdown(false);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.dropdownButtonText,
                                (selectedCategory === "All" ||
                                  !subCategories[selectedCategory]?.length) &&
                                  styles.dropdownButtonTextDisabled,
                              ]}
                            >
                              {selectedSubCategory
                                ? selectedSubCategory
                                : "Select Sub-category"}
                            </Text>
                            <Ionicons
                              name={
                                showSubCategoryDropdown
                                  ? "chevron-up"
                                  : "chevron-down"
                              }
                              size={20}
                              color={
                                selectedCategory === "All" ||
                                !subCategories[selectedCategory]?.length
                                  ? colors.border
                                  : colors.textSecondary
                              }
                            />
                          </TouchableOpacity>

                          {showSubCategoryDropdown &&
                            selectedCategory !== "All" &&
                            subCategories[selectedCategory]?.length > 0 && (
                              <View style={styles.dropdownMenu}>
                                <ScrollView
                                  style={styles.dropdownScrollView}
                                  nestedScrollEnabled={true}
                                  showsVerticalScrollIndicator={true}
                                >
                                  {subCategories[selectedCategory].map(
                                    (subCat) => (
                                      <TouchableOpacity
                                        key={subCat}
                                        style={[
                                          styles.dropdownOption,
                                          selectedSubCategory === subCat &&
                                            styles.dropdownOptionSelected,
                                        ]}
                                        onPress={() => {
                                          setSelectedSubCategory(subCat);
                                          setShowSubCategoryDropdown(false);
                                          console.log("Sub-category:", subCat);
                                        }}
                                      >
                                        <Text
                                          style={[
                                            styles.dropdownOptionText,
                                            selectedSubCategory === subCat &&
                                              styles.dropdownOptionTextSelected,
                                          ]}
                                        >
                                          {subCat}
                                        </Text>
                                        {selectedSubCategory === subCat && (
                                          <Ionicons
                                            name="checkmark"
                                            size={20}
                                            color={colors.primary}
                                          />
                                        )}
                                      </TouchableOpacity>
                                    ),
                                  )}
                                </ScrollView>
                              </View>
                            )}
                        </View>

                        {/* Rating Filter Section */}
                        <View style={styles.filterSection}>
                          <Text style={styles.sectionLabel}>Rating</Text>
                          <View style={styles.ratingContainer}>
                            <View style={styles.ratingProgressBarContainer}>
                              <View style={styles.ratingProgressBarBackground}>
                                <View
                                  style={[
                                    styles.ratingProgressBarFill,
                                    {
                                      width: `${(selectedRating / 5) * 100}%`,
                                    },
                                  ]}
                                />
                              </View>
                              {[0, 1, 2, 3, 4, 5].map((rating) => (
                                <TouchableOpacity
                                  key={rating}
                                  style={[
                                    styles.ratingMarker,
                                    {
                                      left: `${(rating / 5) * 100}%`,
                                    },
                                  ]}
                                  onPress={() => {
                                    setSelectedRating(rating);
                                    console.log(`Rating filter: ${rating}`);
                                  }}
                                >
                                  <View
                                    style={[
                                      styles.ratingMarkerDot,
                                      selectedRating >= rating &&
                                        styles.ratingMarkerDotActive,
                                    ]}
                                  />
                                </TouchableOpacity>
                              ))}
                            </View>
                            <View style={styles.ratingLabels}>
                              <Text style={styles.ratingLabelText}>0</Text>
                              <Text style={styles.ratingLabelText}>5</Text>
                            </View>
                            {selectedRating > 0 && (
                              <View style={styles.ratingValueContainer}>
                                <Text style={styles.ratingValue}>
                                  {selectedRating}+ stars
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity
                        style={styles.resetButton}
                        onPress={() => {
                          // Reset temporary filter state
                          setSelectedSortBy("rating");
                          setSelectedRating(0);
                          setSelectedCategory("All");
                          setSelectedSubCategory("");
                          setShowCategoryDropdown(false);
                          setShowSubCategoryDropdown(false);

                          // Reset applied filters
                          setAppliedFilters({
                            sortBy: "rating",
                            rating: 0,
                            category: "All",
                            subCategory: "",
                          });

                          // Update active category to "All"
                          setActiveCategory("All");

                          console.log("Filters reset");

                          // Close modal
                          Animated.spring(slideAnim, {
                            toValue: height,
                            useNativeDriver: true,
                            tension: 65,
                            friction: 11,
                          }).start(() => setShowFilterModal(false));
                        }}
                      >
                        <Text style={styles.resetButtonText}>Reset</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.applyButton}
                        onPress={() => {
                          // Apply filters
                          const newFilters = {
                            sortBy: selectedSortBy,
                            rating: selectedRating,
                            category: selectedCategory,
                            subCategory: selectedSubCategory,
                          };

                          setAppliedFilters(newFilters);

                          // Update active category if different
                          if (selectedCategory !== activeCategory) {
                            setActiveCategory(selectedCategory);
                          }

                          console.log("Applying filters:", newFilters);

                          // Close modal
                          Animated.spring(slideAnim, {
                            toValue: height,
                            useNativeDriver: true,
                            tension: 65,
                            friction: 11,
                          }).start(() => setShowFilterModal(false));
                        }}
                      >
                        <Text style={styles.applyButtonText}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
      </BookingsProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topSection: {
    backgroundColor: colors.topsectionbackground,
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 0) + 10,
    paddingHorizontal: 0,
    zIndex: 100,
  },
  searchBarWrapper: {
    paddingTop: 30,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 40, // More rounded, pill-shaped like Airbnb
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  filterButton: {
    backgroundColor: "#fff",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 16,
    color: "#222",
  },
  categoryContainer: {
    paddingBottom: 0,
    padding: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.topsectionbackground,
    overflow: "hidden", // Clip any shadows that might appear on top
    // Shadow only at the bottom - iOS
    ...(Platform.OS === "ios" && {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 6, // Only downward shadow
      },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    }),
    // Android: Use borderBottom for shadow effect, no elevation to avoid top shadow
    ...(Platform.OS === "android" && {
      elevation: 0, // Remove elevation to prevent shadows on all sides
    }),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
    borderTopWidth: 0, // Explicitly remove top border
    borderLeftWidth: 0, // Explicitly remove side borders
    borderRightWidth: 0,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingRight: 16,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 32,
    position: "relative",
    paddingBottom: 8, // Add padding to accommodate the indicator
    minHeight: 60, // Ensure enough height
  },
  categoryItemActive: {
    // Active state styling
  },
  categoryIconContainer: {
    marginBottom: 8,
    width: 32,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryImage: {
    width: 32,
    height: 32,
  },
  categoryLabel: {
    fontSize: 12,
    color: "#717171",
    fontFamily: fonts.regular,
  },
  categoryLabelActive: {
    color: "#222",
    fontFamily: fonts.semiBold,
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0, // Position at the bottom of the category item
    left: "45%",
    transform: [{ translateX: -22 }], // Center the indicator (half of width 40)
    width: 50,
    height: 3,
    backgroundColor: "#000",
    borderRadius: 2,
    zIndex: 10, // Ensure it's above other elements
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    fontFamily: fonts.regular,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.regular,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    fontFamily: fonts.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingHorizontal: 20,
    height: height * 0.65,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 24,
  },
  modalContentWrapper: {
    flex: 1,
    minHeight: 0,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  filterContent: {
    paddingBottom: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    fontFamily: fonts.semiBold,
  },
  pillScrollView: {
    marginHorizontal: -4,
  },
  pillScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  pillButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  pillButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  pillButtonTextActive: {
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  inputField: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontFamily: fonts.regular,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  dropdownButtonTextDisabled: {
    color: colors.textSecondary,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    maxHeight: 200,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.surface,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  dropdownOptionTextSelected: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  ratingContainer: {
    gap: 8,
  },
  ratingProgressBarContainer: {
    position: "relative",
    height: 40,
    justifyContent: "center",
  },
  ratingProgressBarBackground: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  ratingProgressBarFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  ratingMarker: {
    position: "absolute",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -12,
  },
  ratingMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  ratingMarkerDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.cardBackground,
  },
  ratingLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  ratingLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  ratingValueContainer: {
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },
  ratingValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
    fontFamily: fonts.semiBold,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.cardBackground,
    fontFamily: fonts.semiBold,
  },
});
