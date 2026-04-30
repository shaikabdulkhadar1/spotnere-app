/**
 * TripCard — List-style card for bookings/trips
 * Shows place image, title, booking date/time, guests, ref, and status
 */

import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { fonts } from "../constants/fonts";

const getStatusColor = (status, colors) => {
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dateStr = trip.bookingDateFormatted || "—";
  const timeStr = trip.bookingTimeFormatted || "";
  const statusColor = getStatusColor(trip.paymentStatus, colors);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(trip)}
      activeOpacity={0.85}
    >
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

const createStyles = (colors) => StyleSheet.create({
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
        shadowColor: colors.shadow,
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
