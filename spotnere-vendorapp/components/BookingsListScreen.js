/**
 * Bookings List Screen Component
 * Displays all bookings sorted by date in ascending order
 */

import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useApp } from "../contexts/AppContext";
import BookingDetailsScreen from "./BookingDetailsScreen";

const BookingsListScreen = ({ onBack }) => {
  const { bookingsData } = useApp();
  const [selectedBooking, setSelectedBooking] = React.useState(null);

  // Sort all bookings by date in descending order (newest first)
  const sortedBookings = useMemo(() => {
    if (!bookingsData?.bookings || bookingsData.bookings.length === 0) {
      return [];
    }

    // Sort by date in descending order (newest first)
    return [...bookingsData.bookings].sort((a, b) => {
      const dateA = a.booking_date_time
        ? new Date(a.booking_date_time)
        : new Date(0);
      const dateB = b.booking_date_time
        ? new Date(b.booking_date_time)
        : new Date(0);
      return dateB - dateA; // Reversed to show newest first
    });
  }, [bookingsData?.bookings]);

  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBookingStatus = (bookingDate) => {
    if (!bookingDate) return "unknown";
    const date = new Date(bookingDate);
    const now = new Date();

    // Check if booking is today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    if (date >= todayStart && date <= todayEnd) {
      return "today";
    }

    if (date >= now) return "upcoming";
    return "past";
  };

  const handleBookingPress = (booking) => {
    setSelectedBooking(booking);
  };

  const handleBackFromDetails = () => {
    setSelectedBooking(null);
  };

  // Show BookingDetailsScreen if a booking is selected
  if (selectedBooking) {
    return (
      <BookingDetailsScreen
        booking={selectedBooking}
        onBack={handleBackFromDetails}
      />
    );
  }

  const renderBookingItem = ({ item }) => {
    const status = getBookingStatus(item.booking_date_time);
    const isUpcoming = status === "upcoming";
    const isPast = status === "past";
    const isToday = status === "today";

    return (
      <TouchableOpacity
        style={styles.bookingItem}
        onPress={() => handleBookingPress(item)}
      >
        <View style={styles.bookingItemLeft}>
          <View
            style={[
              styles.bookingIconContainer,
              isUpcoming && styles.bookingIconUpcoming,
              isPast && styles.bookingIconPast,
              isToday && styles.bookingIconToday,
            ]}
          >
            <Ionicons
              name={
                isToday
                  ? "today-outline"
                  : isUpcoming
                  ? "calendar-outline"
                  : "time-outline"
              }
              size={24}
              color={
                isToday
                  ? colors.primary
                  : isUpcoming
                  ? colors.success
                  : colors.textSecondary
              }
            />
          </View>
          <View style={styles.bookingDetails}>
            <Text style={styles.bookingRef}>
              {item.user_first_name || item.user_last_name
                ? `${item.user_first_name || ""} ${
                    item.user_last_name || ""
                  }`.trim()
                : "Guest User"}
            </Text>
            <Text style={styles.bookingDate}>
              {formatDate(item.booking_date_time)}
            </Text>
            {item.amount_paid !== null && item.amount_paid !== undefined && (
              <Text style={styles.bookingDate}>
                Customer Paid: ${parseFloat(item.amount_paid).toFixed(2)}
              </Text>
            )}
            {item.transaction_id && (
              <Text style={styles.bookingDate}>
                Transaction: {item.transaction_id}
              </Text>
            )}
            {isToday && (
              <View style={[styles.statusBadge, styles.statusBadgeToday]}>
                <Text
                  style={[styles.statusBadgeText, styles.statusBadgeTextToday]}
                >
                  Today
                </Text>
              </View>
            )}
            {isUpcoming && !isToday && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>Upcoming</Text>
              </View>
            )}
            {isPast && (
              <View style={[styles.statusBadge, styles.statusBadgePast]}>
                <Text
                  style={[styles.statusBadgeText, styles.statusBadgeTextPast]}
                >
                  Past
                </Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Your Bookings</Text>
        </View>
        {/* Spacer to balance the back button */}
        {onBack && <View style={styles.backButtonSpacer} />}
      </View>

      {/* Bookings List */}
      {bookingsData.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sortedBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="calendar-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyText}>No Bookings</Text>
          <Text style={styles.emptySubtext}>
            You don't have any bookings yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item, index) => item.id || `booking-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    position: "absolute",
    left: 10,
    top: 20,
    padding: 4,
  },
  backButtonSpacer: {
    width: 32,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  bookingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bookingIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bookingIconUpcoming: {
    backgroundColor: `${colors.success}15`,
  },
  bookingIconPast: {
    backgroundColor: `${colors.textSecondary}15`,
  },
  bookingIconToday: {
    backgroundColor: `${colors.primary}15`,
  },
  bookingDetails: {
    flex: 1,
  },
  bookingRef: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${colors.success}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusBadgePast: {
    backgroundColor: `${colors.textSecondary}15`,
  },
  statusBadgeToday: {
    backgroundColor: `${colors.primary}15`,
  },
  statusBadgeText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.success,
  },
  statusBadgeTextPast: {
    color: colors.textSecondary,
  },
  statusBadgeTextToday: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

export default BookingsListScreen;
