/**
 * PlaceCard — Modern Redesign (2026 “premium glass + soft border + chip meta”)
 * ✅ Same props + same favorite logic (Supabase favorites helpers)
 * ✅ Cleaner layout: image → gradient → chips (badge + rating) → title/price
 * ✅ Better touch targets + subtle elevation + iOS/Android friendly rounded corners
 */

import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { getCurrentUser } from "../utils/auth";
import {
  saveFavoriteToDatabase,
  removeFavoriteFromDatabase,
  isFavoriteInDatabase,
} from "../utils/favorites";

const { width } = Dimensions.get("window");

const PlaceCard = ({
  title,
  price,
  rating,
  imageUri,
  showBadge = true,
  isSmall = false,
  containerStyle,
  placeId,
  onPress,
  onImageLoad,
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!placeId) return;
      const user = await getCurrentUser();
      if (user?.id) {
        const favorited = await isFavoriteInDatabase(user.id, placeId);
        setIsFavorited(favorited);
      }
    };
    checkFavoriteStatus();
  }, [placeId]);

  const handleFavoritePress = async () => {
    if (!placeId) return;

    const user = await getCurrentUser();
    if (!user?.id) return;

    const newFavoriteState = !isFavorited;
    setIsFavorited(newFavoriteState);

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.22,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    if (newFavoriteState) {
      const result = await saveFavoriteToDatabase(user.id, placeId);
      if (!result.success) setIsFavorited(false);
    } else {
      const result = await removeFavoriteFromDatabase(user.id, placeId);
      if (!result.success) setIsFavorited(true);
    }
  };

  const cardWidth = isSmall ? (width - 64) * 0.35 : (width - 64) * 0.5;
  const imageHeight = isSmall ? (width - 64) * 0.35 : (width - 64) * 0.42;

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }, containerStyle]}
      onPress={() => onPress && placeId && onPress(placeId)}
      activeOpacity={0.9}
    >
      {/* IMAGE */}
      <View style={[styles.media, { height: imageHeight }]}>
        <ExpoImage
          source={
            imageUri
              ? { uri: imageUri }
              : {
                  uri: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=450&fit=crop",
                }
          }
          style={styles.mediaImg}
          contentFit="cover"
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          onLoad={onImageLoad}
        />

        {/* Soft gradient overlay for text legibility */}
        <View style={styles.mediaGradient} />

        {/* Top-left badge */}
        {showBadge ? (
          <View style={styles.topLeft}>
            <BlurView intensity={18} tint="light" style={styles.chipBlur}>
              <Ionicons name="sparkles" size={12} color={colors.text} />
              <Text style={styles.chipText}>Guest favorite</Text>
            </BlurView>
          </View>
        ) : null}

        {/* Top-right favorite */}
        <TouchableOpacity
          style={styles.topRightBtn}
          activeOpacity={0.8}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BlurView intensity={18} tint="light" style={styles.iconBlur}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={16}
                color={isFavorited ? "#FF3B30" : colors.text}
              />
            </Animated.View>
          </BlurView>
        </TouchableOpacity>

        {/* Bottom-left rating chip */}
        <View style={styles.bottomLeft}>
          <BlurView intensity={18} tint="light" style={styles.ratingChipBlur}>
            <Ionicons name="star" size={12} color={colors.accent} />
            <Text style={styles.ratingChipText}>
              {rating != null && rating !== "" ? rating : "—"}
            </Text>
          </BlurView>
        </View>
      </View>

      {/* CONTENT */}
      <View style={[styles.content, isSmall && styles.contentSmall]}>
        <Text
          style={[styles.title, isSmall && styles.titleSmall]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={[styles.price, isSmall && styles.priceSmall]}
            numberOfLines={1}
          >
            {price}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 3 },
    }),
  },

  media: {
    width: "100%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.surface,
    overflow: "hidden",
    position: "relative",
  },
  mediaImg: { width: "100%", height: "100%" },

  // simple overlay without adding new dependencies
  mediaGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.10)",
  },

  topLeft: { position: "absolute", top: 10, left: 10 },
  bottomLeft: { position: "absolute", bottom: 10, left: 10 },

  topRightBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
  },

  chipBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  chipText: {
    fontSize: 9,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },

  iconBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 17,
  },

  ratingChipBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  ratingChipText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },

  content: {
    padding: 12,
    paddingTop: 10,
  },
  contentSmall: {
    padding: 10,
    paddingTop: 8,
  },

  title: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  titleSmall: {
    fontSize: 12,
    marginBottom: 5,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  priceSmall: {
    fontSize: 12,
  },
});

export default PlaceCard;
