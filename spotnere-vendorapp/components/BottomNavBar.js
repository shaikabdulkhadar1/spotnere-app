/**
 * Bottom Navigation Bar Component
 * Implements 4 tabs: Home, Bookings, Vendu Details, Profile
 */

import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import {
  LayoutDashboard,
  CalendarDays,
  Store,
  User,
} from "lucide-react-native";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const BottomNavBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: "home", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "bookings",
      label: "Bookings",
      icon: CalendarDays,
    },
    {
      id: "venduDetails",
      label: "Vendu Details",
      icon: Store,
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
    },
  ];

  const NavContent = () => (
    <View style={styles.navContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive && styles.activeTab,
              !isActive && styles.inactiveTab,
            ]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            {React.createElement(tab.icon, {
              size: 24,
              color: isActive ? "#ffffff" : colors.primary,
            })}
            <Text
              style={[styles.tabLabel, isActive && styles.activeTabLabel]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={80} style={styles.container} tint="light">
        <NavContent />
      </BlurView>
    );
  }

  return (
    <View style={[styles.container, styles.androidContainer]}>
      <NavContent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingTop: 10,
  },
  androidContainer: {
    backgroundColor: colors.cardBackground,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minWidth: 0,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  inactiveTab: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
    width: "100%",
    overflow: "hidden",
  },
  activeTabLabel: {
    color: colors.cardBackground,
    fontFamily: fonts.semiBold,
  },
});

export default BottomNavBar;
