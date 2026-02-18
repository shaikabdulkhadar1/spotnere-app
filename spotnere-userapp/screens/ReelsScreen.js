import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../config/supabase";
import PlaceCard from "../components/PlaceCard";
import SkeletonCard from "../components/SkeletonCard";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { getReels } from "../utils/reels";

const { width, height } = Dimensions.get("window");

const ReelsScreen = ({ userCountry, onPlacePress, onBack }) => {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReels();
  }, [userCountry]);

  const fetchReels = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get reel place IDs from local storage
      const reelIds = await getReels();

      if (!reelIds || reelIds.length === 0) {
        setReels([]);
        setLoading(false);
        return;
      }

      // Check if supabase is available
      if (!supabase) {
        throw new Error("Supabase client is not initialized");
      }

      // Fetch reel places from database
      let query = supabase.from("places").select("*").in("id", reelIds);

      // Optionally filter by country
      if (userCountry) {
        query = query.eq("country", userCountry);
      }

      const { data: places, error: fetchError } = await query;

      if (fetchError) {
        console.error("❌ Error fetching reels:", fetchError);
        throw new Error(`Failed to fetch reels: ${fetchError.message}`);
      }

      if (!places || places.length === 0) {
        setReels([]);
        setLoading(false);
        return;
      }

      // Format places data
      const formatted = places.map((place) => ({
        id: place.id,
        title: place.title || place.name || place.place_name || "Place",
        price: `$${place.avg_price || 0} per person`,
        rating: parseFloat(place.rating || place.average_rating || 0) || 0,
        ratingString:
          place.rating?.toString() || place.average_rating?.toString() || "0",
        imageUri: place.banner_image_link || place.image || place.photo_url,
        isSmall: false,
      }));

      setReels(formatted);
    } catch (err) {
      console.error("Error fetching reels:", err);
      setError(err.message || "Failed to load reels");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Reels</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="home" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
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
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Reels</Text>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="home" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity onPress={fetchReels} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Reels</Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          reels.length === 0 ? styles.scrollContentCentered : styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.allPlacesContainer}>
          {reels.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Image
                  source={require("../assets/categoryImages/reelsImg.png")}
                  style={styles.emptyIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.emptyTitle}>No reels yet</Text>
              <Text style={styles.emptyText}>
                Discover amazing places through video reels
              </Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {reels.map((reel, index) => (
                <View key={reel.id || index} style={styles.gridCard}>
                  <PlaceCard
                    title={reel.title}
                    price={reel.price}
                    rating={reel.ratingString}
                    imageUri={reel.imageUri}
                    showBadge={false}
                    isSmall={false}
                    placeId={reel.id}
                    onPress={onPlacePress}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 70, // Extra padding to ensure content is visible above bottom nav
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: height - 200, // Account for top bar and bottom nav
  },
  allPlacesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconImage: {
    width: 74,
    height: 74,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: fonts.semiBold,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    fontFamily: fonts.regular,
  },
  errorText: {
    fontSize: 16,
    color: colors.error || "#FF3B30",
    textAlign: "center",
    marginBottom: 12,
    fontFamily: fonts.regular,
  },
  retryButton: {
    padding: 12,
  },
  retryText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: "underline",
    fontFamily: fonts.regular,
  },
});

export default ReelsScreen;
