import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";

const { width } = Dimensions.get("window");

const BottomNavBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "home", icon: "home" },
    { id: "favorite", icon: "heart" },
    { id: "map", icon: "map" },
    { id: "trips", icon: "airplane" },
    { id: "reels", icon: "play-circle" },
    { id: "profile", icon: "person" },
  ];

  // Indicator values (keep your current layout animation)
  const homeIndicator = useRef(new Animated.Value(1)).current;
  const favoriteIndicator = useRef(new Animated.Value(0)).current;
  const mapIndicator = useRef(new Animated.Value(0)).current;
  const tripsIndicator = useRef(new Animated.Value(0)).current;
  const reelsIndicator = useRef(new Animated.Value(0)).current;
  const profileIndicator = useRef(new Animated.Value(0)).current;

  // ✅ NEW: bounce scale only for the active indicator
  const bounceScale = useRef(new Animated.Value(1)).current;

  const getIndicator = (tabId) => {
    switch (tabId) {
      case "home":
        return homeIndicator;
      case "favorite":
        return favoriteIndicator;
      case "map":
        return mapIndicator;
      case "trips":
        return tripsIndicator;
      case "reels":
        return reelsIndicator;
      case "profile":
        return profileIndicator;
      default:
        return homeIndicator;
    }
  };

  useEffect(() => {
    // Keep your existing indicator size animation
    tabs.forEach((tab) => {
      const isActive = activeTab === tab.id;
      const indicator = getIndicator(tab.id);

      Animated.spring(indicator, {
        toValue: isActive ? 1 : 0,
        useNativeDriver: false, // width/height interpolations
        tension: 120,
        friction: 8,
      }).start();
    });

    // ✅ Bounce only when active tab changes (applies to the active indicator)
    // useNativeDriver: false required - same view has width/height which aren't supported by native driver
    bounceScale.setValue(1);
    Animated.sequence([
      Animated.spring(bounceScale, {
        toValue: 1.12,
        useNativeDriver: false,
        tension: 220,
        friction: 5,
      }),
      Animated.spring(bounceScale, {
        toValue: 1,
        useNativeDriver: false,
        tension: 220,
        friction: 6,
      }),
    ]).start();
  }, [activeTab]);

  const BlurContainer = Platform.OS === "ios" ? BlurView : View;
  const blurProps = Platform.OS === "ios" ? { intensity: 80 } : {};

  return (
    <View style={styles.navBarContainer}>
      <View style={styles.navBar}>
        <BlurContainer {...blurProps} style={styles.blurView}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const indicator = getIndicator(tab.id);

            const backgroundWidth = indicator.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 50],
            });

            const backgroundHeight = indicator.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 50],
            });

            const backgroundTranslateX = indicator.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -25],
            });

            const backgroundTranslateY = indicator.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -25],
            });

            const backgroundOpacity = indicator.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            });

            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.navItem}
                onPress={() => onTabChange(tab.id)}
                activeOpacity={0.7}
              >
                <View style={styles.navItemWrapper}>
                  <Animated.View
                    style={[
                      styles.activeTabBackground,
                      {
                        opacity: backgroundOpacity,
                        width: backgroundWidth,
                        height: backgroundHeight,
                        transform: [
                          { translateX: backgroundTranslateX },
                          { translateY: backgroundTranslateY },
                          // ✅ bounce ONLY when it's the active tab
                          ...(isActive ? [{ scale: bounceScale }] : []),
                        ],
                      },
                    ]}
                  />
                  <View style={styles.navItemContent}>
                    <Ionicons
                      name={isActive ? tab.icon : `${tab.icon}-outline`}
                      size={24}
                      color={isActive ? "#000" : "#fff"}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </BlurContainer>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navBarContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 20 : 10,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  navBar: {
    width: width - 32,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(202, 211, 167, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  blurView: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 35,
    overflow: "hidden",
    backgroundColor: colors.primary,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    position: "relative",
  },
  navItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
    height: "100%",
  },
  activeTabBackground: {
    position: "absolute",
    top: "50%",
    left: "50%",
    backgroundColor: "rgba(240, 240, 240, 0.95)",
    borderRadius: 25,
    zIndex: 0,
  },
  navItemContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    position: "relative",
    width: "100%",
    height: "100%",
  },
});

export default BottomNavBar;
