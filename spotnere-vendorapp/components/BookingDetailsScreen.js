/**
 * Booking Details Screen Component
 * Displays detailed information about a specific booking
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const BookingDetailsScreen = ({ booking, onBack }) => {
  if (!booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Booking Details</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No booking data available</Text>
        </View>
      </View>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBookingStatus = () => {
    if (!booking.booking_date_time) return "unknown";
    const bookingDate = new Date(booking.booking_date_time);
    const now = new Date();
    
    // Check if booking is today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    if (bookingDate >= todayStart && bookingDate <= todayEnd) {
      return "today";
    }
    
    return bookingDate >= now ? "upcoming" : "past";
  };

  const status = getBookingStatus();
  const isUpcoming = status === "upcoming";
  const isToday = status === "today";

  const handleReceiptPress = () => {
    if (booking.receipt_url) {
      Linking.openURL(booking.receipt_url).catch((err) =>
        console.error("Error opening receipt URL:", err)
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>Booking Details</Text>
          <View
            style={[
              styles.statusBadge,
              isToday
                ? styles.statusBadgeToday
                : isUpcoming
                ? styles.statusBadgeUpcoming
                : styles.statusBadgePast,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isToday
                  ? styles.statusBadgeTextToday
                  : isUpcoming
                  ? styles.statusBadgeTextUpcoming
                  : styles.statusBadgeTextPast,
              ]}
            >
              {isToday ? "Today" : isUpcoming ? "Upcoming" : "Past"}
            </Text>
          </View>
        </View>
      </View>

      {/* Customer Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        <View style={styles.card}>
          {(booking.user_first_name || booking.user_last_name) && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>
                      {`${booking.user_first_name || ""} ${
                        booking.user_last_name || ""
                      }`.trim() || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
              {(booking.user_email || booking.user_phone_number) && (
                <View style={styles.divider} />
              )}
            </>
          )}
          {booking.user_email && (
            <>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{booking.user_email}</Text>
                  </View>
                </View>
              </View>
              {booking.user_phone_number && <View style={styles.divider} />}
            </>
          )}
          {booking.user_phone_number && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>
                    {booking.user_phone_number}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Booking Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Information</Text>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Booking Reference</Text>
                <Text style={styles.detailValue}>
                  {booking.booking_ref_number || "N/A"}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>
                  {formatDate(booking.booking_date_time)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Payment Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        <View style={styles.card}>
          {booking.amount_paid !== null &&
            booking.amount_paid !== undefined && (
              <>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Amount Paid</Text>
                      <Text style={styles.amountValue}>
                        ${parseFloat(booking.amount_paid).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
                {booking.transaction_id && <View style={styles.divider} />}
              </>
            )}
          {booking.transaction_id && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Transaction ID</Text>
                  <Text style={styles.detailValue}>
                    {booking.transaction_id}
                  </Text>
                </View>
              </View>
            </View>
          )}
          {booking.receipt_url && (
            <>
              {(booking.amount_paid !== null || booking.transaction_id) && (
                <View style={styles.divider} />
              )}
              <TouchableOpacity
                style={styles.detailRow}
                onPress={handleReceiptPress}
                activeOpacity={0.7}
              >
                <View style={styles.detailItem}>
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Receipt</Text>
                    <View style={styles.receiptContainer}>
                      <Text style={styles.receiptText}>View Receipt</Text>
                      <Ionicons
                        name="open-outline"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 10,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeUpcoming: {
    backgroundColor: `${colors.success}15`,
  },
  statusBadgePast: {
    backgroundColor: `${colors.textSecondary}15`,
  },
  statusBadgeToday: {
    backgroundColor: `${colors.primary}15`,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  statusBadgeTextUpcoming: {
    color: colors.success,
  },
  statusBadgeTextPast: {
    color: colors.textSecondary,
  },
  statusBadgeTextToday: {
    color: colors.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 24,
  },
  amountValue: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 2,
  },
  receiptContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  receiptText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.primary,
    marginRight: 6,
  },
  detailRow: {
    paddingVertical: 8,
    minHeight: 44,
  },
  detailItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});

export default BookingDetailsScreen;
