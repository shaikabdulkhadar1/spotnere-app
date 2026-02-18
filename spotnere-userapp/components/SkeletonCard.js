import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions, Platform } from "react-native";
import { colors } from "../constants/colors";

const { width } = Dimensions.get("window");

const SkeletonCard = ({ isSmall = false }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View
      style={[
        styles.skeletonCard,
        isSmall && styles.skeletonCardSmall,
      ]}
    >
      {/* Image Skeleton */}
      <Animated.View
        style={[
          styles.skeletonImage,
          isSmall && styles.skeletonImageSmall,
          Platform.OS === "ios" && styles.skeletonImageIOS,
          { opacity },
        ]}
      />

      {/* Content Skeleton */}
        <View
          style={[
            styles.skeletonContent,
            Platform.OS === "ios" && styles.skeletonContentIOS,
          ]}
        >
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonTitle, { opacity }]}
        />
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonSubtitle, { opacity }]}
        />
        <Animated.View
          style={[styles.skeletonLine, styles.skeletonRating, { opacity }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonCard: {
    width: (width - 64) * 0.5,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    // Only apply overflow hidden on Android to maintain rounded corners
    // On iOS, we need overflow visible for shadows to show
    ...(Platform.OS === "android" && {
    overflow: "hidden",
    }),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skeletonCardSmall: {
    width: (width - 64) * 0.35,
  },
  skeletonImage: {
    width: "100%",
    height: (width - 64) * 0.4,
    backgroundColor: colors.surface,
    // On iOS, ensure image respects border radius
    ...(Platform.OS === "ios" && {
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      overflow: "hidden",
    }),
  },
  skeletonImageIOS: {
    // Additional iOS-specific styling if needed
  },
  skeletonImageSmall: {
    height: (width - 64) * 0.35,
  },
  skeletonContent: {
    padding: 12,
    // On iOS, ensure content respects border radius
    ...(Platform.OS === "ios" && {
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      overflow: "hidden",
    }),
  },
  skeletonContentIOS: {
    // Additional iOS-specific styling if needed
  },
  skeletonLine: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTitle: {
    width: "80%",
    height: 16,
  },
  skeletonSubtitle: {
    width: "60%",
    height: 14,
  },
  skeletonRating: {
    width: "40%",
    height: 14,
    marginBottom: 0,
  },
});

export default SkeletonCard;

