/**
 * TripCard — List-style card for bookings/trips
 * Shows place image, title, booking date/time, guests, ref, and status
 */

import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

// Parse booking_date_time from bookings table - display as stored (no timezone conversion)
// Stored format: "2025-01-27T10:00:00.000Z" - user's selected time is stored as-is
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
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
};

const formatBookingTime = (isoStr) => {
  if (!isoStr) return "";
  try {
    const match = String(isoStr).match(/T(\d{2}):(\d{2})/);
    if (!match) return "";
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return "";
  }
};

const getStatusColor = (status) => {
  switch ((status || "").toUpperCase()) {
    case "PAID":
    case "SUCCESS":
    case "CONFIRMED":
      return colors.success;
    case "PENDING":
      return colors.warning;
    case "FAILED":
    case "CANCELLED":
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const TripCard = ({ trip, onPress }) => {
  const dateStr = formatBookingDate(trip.bookingDateTime);
  const timeStr = formatBookingTime(trip.bookingDateTime);
  const statusColor = getStatusColor(trip.paymentStatus);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(trip)}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={styles.imageWrap}>
        <ExpoImage
          source={
            trip.imageUri
              ? { uri: trip.imageUri }
              : {
                  uri: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
                }
          }
          style={styles.image}
          contentFit="cover"
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {trip.title}
        </Text>

        <View style={styles.row}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={styles.metaText}>{dateStr}</Text>
        </View>

        {timeStr ? (
          <View style={styles.row}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>{timeStr}</Text>
          </View>
        ) : null}

        {trip.numberOfGuests != null && trip.numberOfGuests > 0 ? (
          <View style={styles.row}>
            <Ionicons
              name="people-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.metaText}>
              {trip.numberOfGuests}{" "}
              {trip.numberOfGuests === 1 ? "guest" : "guests"}
            </Text>
          </View>
        ) : null}

        {trip.bookingRefNumber ? (
          <View style={styles.row}>
            <Ionicons
              name="receipt-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.refText}>{trip.bookingRefNumber}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "22" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(trip.paymentStatus || "—").toUpperCase()}
            </Text>
          </View>
          {trip.amountPaid != null && trip.amountPaid > 0 && (
            <Text style={styles.amount}>
              ₹{Number(trip.amountPaid).toLocaleString()}
            </Text>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={colors.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
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
  imageWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  refText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
  },
  amount: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  chevron: {
    marginLeft: 4,
  },
});

export default TripCard;
