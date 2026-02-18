import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import TripCard from "../components/TripCard";
import SkeletonCard from "../components/SkeletonCard";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useBookings } from "../context/BookingsContext";

const { width, height } = Dimensions.get("window");

const TripsScreen = ({ userCountry, onTripPress, onBack }) => {
  const { bookings, loading, error, hasUser, refreshBookings } = useBookings();

  // Filter by country when userCountry is set (include bookings with no country)
  const trips = userCountry
    ? bookings.filter((b) => !b.country || b.country === userCountry)
    : bookings;

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
          <Text style={styles.headerTitle}>Your Trips</Text>
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
          <View style={styles.listContainer}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View key={`skeleton-${index}`} style={styles.skeletonCard}>
                <SkeletonCard />
              </View>
            ))}
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
          <Text style={styles.headerTitle}>Your Trips</Text>
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
          <TouchableOpacity onPress={refreshBookings} style={styles.retryButton}>
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
        <Text style={styles.headerTitle}>Your Trips</Text>
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
          trips.length === 0
            ? styles.scrollContentCentered
            : styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.allPlacesContainer}>
          {trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Image
                  source={require("../assets/categoryImages/tripImg.png")}
                  style={styles.emptyIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {hasUser ? "No trips yet" : "Log in to see your bookings"}
              </Text>
              <Text style={styles.emptyText}>
                {hasUser
                  ? "Start planning your next adventure and your trips will appear here"
                  : "Sign in to view your booked trips and upcoming adventures"}
              </Text>
              {hasUser && (
                <TouchableOpacity
                  onPress={refreshBookings}
                  style={styles.refreshButton}
                >
                  <Ionicons name="refresh" size={20} color={colors.primary} />
                  <Text style={styles.refreshButtonText}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {trips.map((trip, index) => (
                <TripCard
                  key={trip.id || index}
                  trip={trip}
                  onPress={onTripPress}
                />
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
  listContainer: {
    paddingBottom: 24,
  },
  skeletonCard: {
    marginBottom: 16,
    height: 112,
    borderRadius: 16,
    overflow: "hidden",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.surface || "#f5f5f5",
    borderRadius: 12,
  },
  refreshButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontFamily: fonts.semiBold,
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

export default TripsScreen;
