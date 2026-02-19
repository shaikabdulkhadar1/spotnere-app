import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import { api } from "../api/client";
import PlaceCard from "../components/PlaceCard";
import SkeletonCard from "../components/SkeletonCard";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const { width } = Dimensions.get("window");

const TOP_K = 50; // Top 50 places to display initially
const LOAD_MORE_COUNT = 20; // Number of additional places to load

const HomeScreen = ({
  userCountry,
  activeCategory,
  onPlacePress,
  filters = { sortBy: "rating", rating: 0, category: "All", subCategory: "" },
  searchQuery = "",
}) => {
  const [allPlacesData, setAllPlacesData] = useState([]); // Store all fetched places
  const [displayedCount, setDisplayedCount] = useState(TOP_K); // Number of places currently displayed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userCountry) {
      fetchTopPlaces();
    }
  }, [userCountry, activeCategory, filters]);

  // Reset displayed count when search query changes
  useEffect(() => {
    setDisplayedCount(TOP_K);
  }, [searchQuery]);

  // Efficient top-K selection: Get top K items without full sorting
  // Uses a "keep top K" algorithm - O(n * k) instead of O(n log n)
  // where k is the number of items we need (50) and n is total items
  const getTopK = (items, k, compareFn) => {
    if (items.length === 0) return [];
    if (items.length <= k) {
      // If we need all items, just sort them
      return [...items].sort(compareFn);
    }

    // Keep only top K items in a sorted array
    const topK = [];

    for (const item of items) {
      if (topK.length < k) {
        // If we haven't filled up yet, insert in sorted position
        // Find insertion point using linear search (fast for small k)
        let insertIndex = topK.length;
        for (let i = 0; i < topK.length; i++) {
          if (compareFn(item, topK[i]) < 0) {
            insertIndex = i;
            break;
          }
        }
        topK.splice(insertIndex, 0, item);
      } else {
        // Compare with the worst item in our top K
        // Worst item is always at the end of sorted array (index k-1)
        const worstIndex = k - 1;

        if (compareFn(item, topK[worstIndex]) < 0) {
          // This item is better than worst, replace it
          topK[worstIndex] = item;
          // Re-sort only the small top K array (k is small, so this is fast)
          topK.sort(compareFn);
        }
      }
    }

    return topK;
  };

  // Helper: Get top K by rating (descending - highest first)
  const getTopKByRating = (items, k = TOP_K) => {
    return getTopK(items, k, (a, b) => b.rating - a.rating);
  };

  // Filter places by search query (matches title, category, subcategory, description, city, state, country)
  const filterBySearch = (items, query) => {
    if (!query || !query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter((place) => {
      const title = (place.title || "").toLowerCase();
      const category = (place.category || "").toLowerCase();
      const subCategory = (place.subCategory || "").toLowerCase();
      const description = (place.description || "").toLowerCase();
      const city = (place.city || "").toLowerCase();
      const state = (place.state || "").toLowerCase();
      const country = (place.country || "").toLowerCase();
      return (
        title.includes(q) ||
        category.includes(q) ||
        subCategory.includes(q) ||
        description.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        country.includes(q)
      );
    });
  };

  // Helper: Sort by different criteria
  const sortPlaces = (items, sortBy) => {
    const sorted = [...items];
    switch (sortBy) {
      case "rating":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "price":
        // Extract numeric price from string like "$50 per person"
        return sorted.sort((a, b) => {
          const priceA =
            parseFloat(a.price?.replace(/[^0-9.]/g, "") || "0") || 0;
          const priceB =
            parseFloat(b.price?.replace(/[^0-9.]/g, "") || "0") || 0;
          return priceA - priceB; // Low to high
        });
      case "distance":
        // For distance, we'll sort by rating as fallback since we don't have distance data
        // In a real app, you'd use actual distance calculations
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted.sort((a, b) => b.rating - a.rating);
    }
  };

  const fetchTopPlaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const allPlaces = await api.getPlaces(userCountry ? { country: userCountry } : {});

      if (!allPlaces || allPlaces.length === 0) {
        setAllPlacesData([]);
        setLoading(false);
        return;
      }

      // Format places with rating and category for top-K selection
      const placesWithRating = allPlaces.map((place) => ({
        id: place.id,
        title: place.title || place.name || place.place_name || "Place",
        price: `$${place.avg_price || 0} per person`,
        rating: parseFloat(place.rating || place.average_rating || 0) || 0,
        ratingString:
          place.rating?.toString() || place.average_rating?.toString() || "0",
        imageUri: place.banner_image_link || place.image || place.photo_url,
        category: place.category || "", // Store category for filtering
        subCategory: place.sub_category || place.subCategory || "", // Store sub-category for filtering
        description: place.description || "",
        city: place.city || place.location || "",
        state: place.state || "",
        country: place.country || "",
        isSmall: false,
      }));

      // Filter by category if not "All"
      let filteredPlaces = placesWithRating;
      
      // Apply category filter (from filters or activeCategory for backward compatibility)
      const categoryFilter = filters?.category || activeCategory;
      if (categoryFilter && categoryFilter !== "All") {
        filteredPlaces = filteredPlaces.filter((place) => {
          const placeCategory = (place.category || "").toLowerCase();
          const selectedCategory = categoryFilter.toLowerCase();
          return placeCategory === selectedCategory;
        });
      }

      // Filter by sub-category if provided
      if (filters?.subCategory && filters.subCategory !== "") {
        filteredPlaces = filteredPlaces.filter((place) => {
          const placeSubCategory = (place.subCategory || "").toLowerCase();
          const selectedSubCategory = filters.subCategory.toLowerCase();
          return placeSubCategory === selectedSubCategory;
        });
      }

      // Filter by rating if provided
      if (filters?.rating && filters.rating > 0) {
        filteredPlaces = filteredPlaces.filter((place) => {
          return place.rating >= filters.rating;
        });
      }

      // Sort places based on sortBy filter
      const sortedPlaces = sortPlaces(filteredPlaces, filters?.sortBy || "rating");

      // Use top-K selection to get top 50 places
      const topPlaces =
        sortedPlaces.length <= TOP_K
          ? sortedPlaces
          : sortedPlaces.slice(0, TOP_K);

      // Store sorted and filtered places data for "Load More" functionality
      setAllPlacesData(sortedPlaces);

      // Add showBadge to first 3 places
      const formatted = topPlaces.map((place, index) => ({
        ...place,
        showBadge: index < 3, // Show badge on first 3 cards
      }));

      setAllPlacesData(sortedPlaces);
      setDisplayedCount(TOP_K);
    } catch (err) {
      console.error("Error fetching places:", err);
      setError(err.message || "Failed to fetch places");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const searchFiltered = filterBySearch(allPlacesData, searchQuery);
    if (
      searchFiltered.length === 0 ||
      displayedCount >= searchFiltered.length
    ) {
      Alert.alert("", "No more places to load", [{ text: "OK" }]);
      return;
    }

    setDisplayedCount((prevCount) =>
      Math.min(prevCount + LOAD_MORE_COUNT, searchFiltered.length)
    );
  };

  // Apply search filter and slice for display
  const searchFilteredPlaces = filterBySearch(allPlacesData, searchQuery);
  const placesToDisplay = searchFilteredPlaces
    .slice(0, displayedCount)
    .map((place, index) => ({
      ...place,
      showBadge: index < 3,
    }));

  if (loading) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.allPlacesContainer}>
          <View style={styles.gridContainer}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`skeleton-${index}`} style={styles.gridCard}>
                <SkeletonCard />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={fetchTopPlaces}>
          Tap to retry
        </Text>
      </View>
    );
  }

  const hasMoreToLoad =
    searchFilteredPlaces.length > 0 &&
    displayedCount < searchFilteredPlaces.length;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.allPlacesContainer}>
        {placesToDisplay.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.trim()
                ? `No places found for "${searchQuery}"`
                : "No places found"}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.gridContainer}>
              {placesToDisplay.map((place, index) => (
                <View key={place.id || index} style={styles.gridCard}>
                  <PlaceCard
                    title={place.title}
                    price={place.price}
                    rating={place.ratingString}
                    imageUri={place.imageUri}
                    showBadge={place.showBadge}
                    isSmall={false}
                    placeId={place.id}
                    onPress={onPlacePress}
                  />
                </View>
              ))}
            </View>

            {/* Load More Button */}
            {hasMoreToLoad && (
              <View style={styles.loadMoreContainer}>
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                >
                  <Text style={styles.loadMoreButtonText}>
                    Load More Places
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 70, // Extra padding to ensure button is visible above bottom nav
  },
  allPlacesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  placeCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "400",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 12,
  },
  gridCard: {
    width: (width - 48) / 2, // Two columns: (screen width - 32px padding - 16px gap) / 2
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    fontFamily: fonts.regular,
  },
  errorText: {
    fontSize: 16,
    color: colors.error || "#FF3B30",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: fonts.regular,
  },
  retryText: {
    fontSize: 14,
    color: colors.secondary,
    textDecorationLine: "underline",
    fontFamily: fonts.regular,
  },
  loadMoreContainer: {
    paddingVertical: 18,
    paddingBottom: 6,
    alignItems: "center",
    marginBottom: 20, // Extra margin to ensure button is visible above bottom nav
  },
  loadMoreButton: {
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: fonts.regular,
  },
});

export default HomeScreen;
