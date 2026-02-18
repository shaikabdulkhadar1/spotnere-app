/**
 * Profile Screen Component
 * Displays vendor profile and settings
 */

import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { logout } from "../utils/auth";
import { useApp } from "../contexts/AppContext";
import BookingsListScreen from "../components/BookingsListScreen";
import ManageProfileScreen from "../components/ManageProfileScreen";
import PasswordSecurityScreen from "../components/PasswordSecurityScreen";
import AboutUsScreen from "../components/AboutUsScreen";
import HelpCenterScreen from "../components/HelpCenterScreen";
import PaymentInfoScreen from "../components/PaymentInfoScreen";

const ProfileScreen = ({ onLogout }) => {
  const { user } = useApp();
  const [showBookingsList, setShowBookingsList] = React.useState(false);
  const [showManageProfile, setShowManageProfile] = React.useState(false);
  const [showPasswordSecurity, setShowPasswordSecurity] = React.useState(false);
  const [showAboutUs, setShowAboutUs] = React.useState(false);
  const [showHelpCenter, setShowHelpCenter] = React.useState(false);
  const [showPaymentInfo, setShowPaymentInfo] = React.useState(false);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          if (onLogout) {
            onLogout();
          }
        },
      },
    ]);
  };

  const handleBookingsPress = () => {
    setShowBookingsList(true);
  };

  const handleBackFromBookings = () => {
    setShowBookingsList(false);
  };

  const handleManageProfilePress = () => {
    setShowManageProfile(true);
  };

  const handleBackFromManageProfile = () => {
    setShowManageProfile(false);
  };

  const handlePasswordSecurityPress = () => {
    setShowPasswordSecurity(true);
  };

  const handleBackFromPasswordSecurity = () => {
    setShowPasswordSecurity(false);
  };

  const handleLanguagePress = () => {
    Alert.alert(
      "Language",
      "The app is only available in English for now.",
      [{ text: "OK" }]
    );
  };

  const handleAboutUsPress = () => {
    setShowAboutUs(true);
  };

  const handleBackFromAboutUs = () => {
    setShowAboutUs(false);
  };

  const handleHelpCenterPress = () => {
    setShowHelpCenter(true);
  };

  const handleBackFromHelpCenter = () => {
    setShowHelpCenter(false);
  };

  const handlePaymentInfoPress = () => {
    setShowPaymentInfo(true);
  };

  const handleBackFromPaymentInfo = () => {
    setShowPaymentInfo(false);
  };

  // Handle Android back button for component screens
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const hasComponentScreenOpen =
      showBookingsList ||
      showManageProfile ||
      showPasswordSecurity ||
      showAboutUs ||
      showHelpCenter ||
      showPaymentInfo;

    if (!hasComponentScreenOpen) {
      return;
    }

    const backAction = () => {
      // Go back one step by closing the current component screen
      if (showHelpCenter) {
        handleBackFromHelpCenter();
      } else if (showAboutUs) {
        handleBackFromAboutUs();
      } else if (showPasswordSecurity) {
        handleBackFromPasswordSecurity();
      } else if (showManageProfile) {
        handleBackFromManageProfile();
      } else if (showBookingsList) {
        handleBackFromBookings();
      } else if (showPaymentInfo) {
        handleBackFromPaymentInfo();
      }
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => {
      backHandler.remove();
    };
  }, [
    showBookingsList,
    showManageProfile,
    showPasswordSecurity,
    showAboutUs,
    showHelpCenter,
    showPaymentInfo,
  ]);

  // Show HelpCenterScreen if selected
  if (showHelpCenter) {
    return <HelpCenterScreen onBack={handleBackFromHelpCenter} />;
  }

  // Show AboutUsScreen if selected
  if (showAboutUs) {
    return <AboutUsScreen onBack={handleBackFromAboutUs} />;
  }

  // Show PasswordSecurityScreen if selected
  if (showPasswordSecurity) {
    return (
      <PasswordSecurityScreen onBack={handleBackFromPasswordSecurity} />
    );
  }

  // Show ManageProfileScreen if selected
  if (showManageProfile) {
    return <ManageProfileScreen onBack={handleBackFromManageProfile} />;
  }

  // Show BookingsListScreen if selected
  if (showBookingsList) {
    return <BookingsListScreen onBack={handleBackFromBookings} />;
  }

  // Show PaymentInfoScreen if selected
  if (showPaymentInfo) {
    return <PaymentInfoScreen onBack={handleBackFromPaymentInfo} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
        </View>
        <Text style={styles.businessName}>
          {user?.business_name || "Vendor"}
        </Text>
        <Text style={styles.email}>
          {user?.vendor_email || "email@example.com"}
        </Text>
        <Text style={styles.description}>
          Manage your account settings and preferences
        </Text>
      </View>

      {/* Bookings Section */}
      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleBookingsPress}>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Your Bookings</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleManageProfilePress}
          >
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Manage Profile</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePasswordSecurityPress}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Password & Security</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handlePaymentInfoPress}
          >
            <Ionicons
              name="card-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Payment Info</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLanguagePress}
          >
            <Ionicons name="language-outline" size={20} color={colors.text} />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Language</Text>
              <Text style={styles.menuItemSubtext}>English</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleAboutUsPress}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>About Us</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons
              name="color-palette-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Theme</Text>
              <Text style={styles.menuItemSubtext}>Light</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleHelpCenterPress}
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.text}
            />
            <View style={styles.menuItemTextContainer}>
              <Text style={styles.menuItemText}>Help Center</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
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
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  businessName: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.cardBackground,
  },
  menuItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  menuItemSubtext: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 10,
    marginRight: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardBackground,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.error,
    marginLeft: 8,
  },
});

export default ProfileScreen;
