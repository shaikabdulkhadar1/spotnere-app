import React, { useRef, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { CalendarDays, Store, User, Home } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

const PILL_TABS = [
  { id: "home", icon: Home },
  { id: "bookings", icon: CalendarDays },
  { id: "venduDetails", icon: Store },
];

const HIGHLIGHT_SIZE = 54;
const TAB_SIZE = 48;

const BottomNavBar = ({ activeTab, onTabChange }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const translateX = useRef(new Animated.Value(0)).current;
  const highlightOpacity = useRef(new Animated.Value(1)).current;
  const tabXPositions = useRef([]);
  const initializedRef = useRef(false);

  const activeIndex = PILL_TABS.findIndex((t) => t.id === activeTab);
  const isPillActive = activeIndex !== -1;

  useEffect(() => {
    Animated.timing(highlightOpacity, {
      toValue: isPillActive ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    if (!isPillActive) return;

    const targetX = tabXPositions.current[activeIndex];
    if (targetX !== undefined) {
      if (!initializedRef.current) {
        translateX.setValue(targetX);
        initializedRef.current = true;
      } else {
        Animated.spring(translateX, {
          toValue: targetX,
          damping: 18,
          stiffness: 200,
          mass: 0.8,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [activeTab]);

  const handleTabLayout = (index, event) => {
    const { x, width } = event.nativeEvent.layout;
    tabXPositions.current[index] = x + (width - HIGHLIGHT_SIZE) / 2;

    if (index === activeIndex && !initializedRef.current) {
      translateX.setValue(tabXPositions.current[index]);
      initializedRef.current = true;
    }
  };

  const profileAnim = useRef(
    new Animated.Value(activeTab === "profile" ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.spring(profileAnim, {
      toValue: activeTab === "profile" ? 1 : 0,
      tension: 180,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const profileScale = profileAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const highlightTop = 10 + (TAB_SIZE - HIGHLIGHT_SIZE) / 2;

  return (
    <View style={styles.floatingWrapper}>
      <View style={styles.pillShadow}>
        <View style={styles.pillContainer}>
          <Animated.View
            style={[
              styles.activeHighlight,
              {
                top: highlightTop,
                opacity: highlightOpacity,
                transform: [{ translateX }],
              },
            ]}
          />

          {PILL_TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.pillTab}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
              onLayout={(e) => handleTabLayout(index, e)}
            >
              {React.createElement(tab.icon, {
                size: 28,
                color: activeTab === tab.id ? colors.primary : "#9CA3AF",
                strokeWidth: activeTab === tab.id ? 2 : 1.6,
              })}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Animated.View
        style={[styles.circleShadow, { transform: [{ scale: profileScale }] }]}
      >
        <TouchableOpacity
          style={[
            styles.circleButton,
            activeTab === "profile" && styles.circleButtonActive,
          ]}
          onPress={() => onTabChange("profile")}
          activeOpacity={0.8}
        >
          <User
            size={24}
            color="#FFFFFF"
            strokeWidth={activeTab === "profile" ? 2.2 : 1.8}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    floatingWrapper: {
      position: "absolute",
      bottom: Platform.OS === "ios" ? 28 : 18,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      shadowColor: colors.shadow,
    },
    pillShadow: {
      marginRight: 12,
      borderRadius: 30,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
        android: {
          elevation: 14,
        },
      }),
    },
    pillContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-evenly",
      backgroundColor: colors.cardBackground,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: colors.border,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    pillTab: {
      alignItems: "center",
      justifyContent: "center",
      width: TAB_SIZE,
      height: TAB_SIZE,
      borderRadius: 24,
      marginHorizontal: 6,
    },
    activeHighlight: {
      position: "absolute",
      left: 0,
      width: HIGHLIGHT_SIZE,
      height: HIGHLIGHT_SIZE,
      borderRadius: HIGHLIGHT_SIZE / 2,
      backgroundColor: "rgba(134, 177, 247, 0.12)",
    },
    circleShadow: {
      borderRadius: 32,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
        },
        android: {
          elevation: 10,
        },
      }),
    },
    circleButton: {
      width: 55,
      height: 55,
      borderRadius: 50,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        },
        android: {
          elevation: 14,
        },
      }),
    },
    circleButtonActive: {
      backgroundColor: colors.primary,
    },
  });

export default BottomNavBar;
