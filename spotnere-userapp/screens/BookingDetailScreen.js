/**
 * BookingDetailScreen — Shows full booking details
 * Displays place info + all booking data fetched from bookings & places tables
 */

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const { width } = Dimensions.get("window");

const formatBookingDate = (isoStr) => {
  if (!isoStr) return "—";
  try {
    const match = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return isoStr;
    const [, year, month, day] = match;
    const d = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
    );
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
};

const formatBookingTime = (isoStr) => {
  if (!isoStr) return "—";
  try {
    const match = String(isoStr).match(/T(\d{2}):(\d{2})/);
    if (!match) return "—";
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return "—";
  }
};

const formatPaidAt = (isoStr) => {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    const dateStr = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return "—";
  }
};

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={icon} size={20} color={colors.primary} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  </View>
);

const BookingDetailScreen = ({ booking, onClose, onViewPlace }) => {
  if (!booking) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No booking data</Text>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  const dateStr = formatBookingDate(booking.bookingDateTime);
  const timeStr = formatBookingTime(booking.bookingDateTime);
  const paidAtStr = formatPaidAt(booking.paidAt);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.heroWrap}>
          <ExpoImage
            source={
              booking.imageUri
                ? { uri: booking.imageUri }
                : {
                    uri: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=500&fit=crop",
                  }
            }
            style={styles.heroImage}
            contentFit="cover"
            placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          />
          <View style={styles.heroOverlay} />
          <Text style={styles.heroTitle}>{booking.title || "Place"}</Text>
        </View>

        {/* Booking Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Information</Text>

          <DetailRow
            icon="receipt-outline"
            label="Booking Reference"
            value={booking.bookingRefNumber || "—"}
          />
          <DetailRow icon="calendar-outline" label="Date" value={dateStr} />
          <DetailRow icon="time-outline" label="Time" value={timeStr} />
          <DetailRow
            icon="people-outline"
            label="Number of Guests"
            value={
              booking.numberOfGuests != null && booking.numberOfGuests > 0
                ? `${booking.numberOfGuests} ${booking.numberOfGuests === 1 ? "guest" : "guests"}`
                : "—"
            }
          />
          <DetailRow
            icon="checkmark-circle-outline"
            label="Payment Status"
            value={(booking.paymentStatus || "—").toUpperCase()}
          />
        </View>

        {/* Payment Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>

          <DetailRow
            icon="cash-outline"
            label="Amount Paid"
            value={
              booking.amountPaid != null && booking.amountPaid > 0
                ? `₹${Number(booking.amountPaid).toLocaleString()} ${booking.currencyPaid || ""}`.trim()
                : "—"
            }
          />
          <DetailRow
            icon="card-outline"
            label="Payment Method"
            value={booking.paymentMethod || "—"}
          />
          <DetailRow
            icon="calendar-outline"
            label="Payment Date & Time"
            value={paidAtStr}
          />
          <DetailRow
            icon="receipt-outline"
            label="Transaction ID"
            value={booking.transactionId || "—"}
          />
        </View>

        {/* View Place Button */}
        {booking.placeId && onViewPlace && (
          <TouchableOpacity
            style={styles.viewPlaceButton}
            onPress={() => onViewPlace(booking.placeId)}
            activeOpacity={0.85}
          >
            <Ionicons name="location-outline" size={22} color="#fff" />
            <Text style={styles.viewPlaceText}>View Place Details</Text>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        )}
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
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroWrap: {
    width: "100%",
    height: 220,
    backgroundColor: colors.surface,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  heroTitle: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    fontSize: 24,
    fontFamily: fonts.bold,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 2 },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.badgeBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  viewPlaceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
  },
  viewPlaceText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#fff",
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 100,
  },
});

export default BookingDetailScreen;
