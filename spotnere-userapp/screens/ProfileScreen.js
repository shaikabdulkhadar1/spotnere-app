import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import LoginForm from "../components/LoginForm";
import LoginScreen from "./LoginScreen";
import ManageProfileScreen from "./ManageProfileScreen";
import PasswordSecurityScreen from "./PasswordSecurityScreen";
import AboutUsScreen from "./AboutUsScreen";
import HelpCenterScreen from "./HelpCenterScreen";
import UpcomingBookingsScreen from "./UpcomingBookingsScreen";
import PastBookingsScreen from "./PastBookingsScreen";
import { getCurrentUser, logout } from "../utils/auth";
import { useBookings } from "../context/BookingsContext";

const { width } = Dimensions.get("window");

const ProfileScreen = ({ onLoginSuccess, onBack, onTripPress }) => {
  const { refreshBookings, clearBookings } = useBookings();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showManageProfile, setShowManageProfile] = useState(false);
  const [showPasswordSecurity, setShowPasswordSecurity] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("Light");
  const [showUpcomingBookings, setShowUpcomingBookings] = useState(false);
  const [showPastBookings, setShowPastBookings] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const user = await getCurrentUser();
    if (user) {
      setIsLoggedIn(true);
      setUserData(user);
    } else {
      setIsLoggedIn(false);
      setUserData(null);
    }
  };

  const handleLogin = async (userData) => {
    // User data is already stored in auth utility by loginUser function
    setIsLoggedIn(true);
    setUserData(userData);
    setShowLoginForm(false);
    await refreshBookings();
    if (onLoginSuccess) {
      onLoginSuccess(userData);
    }
  };

  const handleRegister = async (userData) => {
    // User data is already stored in auth utility by registerUser function
    setIsLoggedIn(true);
    setUserData(userData);
    setShowRegisterForm(false);
    await refreshBookings();
    if (onLoginSuccess) {
      onLoginSuccess(userData);
    }
  };

  const handleLogout = async () => {
    await logout();
    await clearBookings();
    setIsLoggedIn(false);
    setUserData(null);
    setShowLoginForm(false);
    setShowRegisterForm(false);
  };

  // Generate initials from first name and last name
  const getInitials = (firstName, lastName) => {
    const firstInitial =
      firstName && firstName.length > 0
        ? firstName.charAt(0).toUpperCase()
        : "";
    const lastInitial =
      lastName && lastName.length > 0 ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}` || "U"; // Default to "U" if no name
  };

  const accountItems = [
    {
      id: "manage-profile",
      label: "Manage Profile",
      icon: "person-circle-outline",
    },
    {
      id: "password-security",
      label: "Password & Security",
      icon: "lock-closed-outline",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "notifications-outline",
    },
    {
      id: "language",
      label: "Language",
      icon: "language-outline",
      value: "English",
    },
  ];

  const preferencesItems = [
    {
      id: "about-us",
      label: "About Us",
      icon: "document-text-outline",
    },
    {
      id: "theme",
      label: "Theme",
      icon: "color-palette-outline",
      value: selectedTheme,
    },
  ];

  const bookingsItems = [
    {
      id: "upcoming-bookings",
      label: "Upcoming Bookings",
      icon: "calendar-outline",
    },
    {
      id: "past-bookings",
      label: "Past Bookings",
      icon: "time-outline",
    },
    {
      id: "cancelled-bookings",
      label: "Cancelled Bookings",
      icon: "close-circle-outline",
    },
  ];

  const supportItems = [
    {
      id: "help-center",
      label: "Help Center",
      icon: "help-circle-outline",
    },
  ];

  const handleMenuItemPress = (itemId) => {
    switch (itemId) {
      case "manage-profile":
        setShowManageProfile(true);
        break;
      case "password-security":
        setShowPasswordSecurity(true);
        break;
      case "notifications":
        // TODO: Implement notifications screen
        console.log("Notifications clicked");
        break;
      case "language":
        Alert.alert(
          "Language",
          "The app is only available in English for now.",
          [{ text: "OK" }],
        );
        break;
      case "theme":
        setShowThemeModal(true);
        break;
      case "about-us":
        setShowAboutUs(true);
        break;
      case "help-center":
        setShowHelpCenter(true);
        break;
      case "upcoming-bookings":
        setShowUpcomingBookings(true);
        break;
      case "past-bookings":
        setShowPastBookings(true);
        break;
      default:
        console.log(`Menu item clicked: ${itemId}`);
    }
  };

  const renderMenuItem = (item, index, total) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.menuItem, index === total - 1 && styles.menuItemLast]}
      activeOpacity={0.7}
      onPress={() => handleMenuItemPress(item.id)}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={item.icon}
          size={22}
          color={colors.text}
          style={styles.menuIcon}
        />
        <View style={styles.menuItemContent}>
          <Text style={styles.menuItemLabel}>{item.label}</Text>
          {item.value && <Text style={styles.menuItemValue}>{item.value}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  // Show upcoming bookings screen
  if (showUpcomingBookings) {
    return (
      <UpcomingBookingsScreen
        onTripPress={onTripPress}
        onBack={() => setShowUpcomingBookings(false)}
      />
    );
  }

  // Show past bookings screen
  if (showPastBookings) {
    return (
      <PastBookingsScreen
        onTripPress={onTripPress}
        onBack={() => setShowPastBookings(false)}
      />
    );
  }

  // Show help center screen
  if (showHelpCenter) {
    return <HelpCenterScreen onBack={() => setShowHelpCenter(false)} />;
  }

  // Show about us screen
  if (showAboutUs) {
    return <AboutUsScreen onBack={() => setShowAboutUs(false)} />;
  }

  // Show password & security screen
  if (showPasswordSecurity) {
    return (
      <PasswordSecurityScreen onBack={() => setShowPasswordSecurity(false)} />
    );
  }

  // Show manage profile screen
  if (showManageProfile) {
    return (
      <ManageProfileScreen
        userData={userData}
        onBack={async () => {
          setShowManageProfile(false);
          // Refresh user data after returning from edit screen
          await checkAuthStatus();
        }}
      />
    );
  }

  // Show registration form
  if (showRegisterForm) {
    return (
      <LoginScreen
        onLoginSuccess={handleRegister}
        onBack={() => setShowRegisterForm(false)}
      />
    );
  }

  // Show login form
  if (showLoginForm) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowLoginForm(false)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          {onBack && (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="home" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
        <LoginForm
          onLoginSuccess={handleLogin}
          onSwitchToRegister={() => {
            setShowLoginForm(false);
            setShowRegisterForm(true);
          }}
        />
      </ScrollView>
    );
  }

  // Show logged out state
  if (!isLoggedIn) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentCentered}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Profile</Text>
          {onBack && (
            <TouchableOpacity
              style={styles.homeButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Ionicons name="home" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.loggedOutContainer}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="person-circle-outline"
              size={80}
              color={colors.textSecondary}
            />
          </View>
          <Text style={styles.loggedOutTitle}>Welcome to Spotnere</Text>
          <Text style={styles.loggedOutSubtitle}>
            Sign in to access your profile, favorites, and trips
          </Text>

          <View style={styles.authButtonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowLoginForm(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowRegisterForm(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Show logged in state - original profile design
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Profile</Text>
        {onBack && (
          <TouchableOpacity
            style={styles.homeButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="home" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Profile Summary Section */}
      <View style={styles.profileCard}>
        <View style={styles.profileCardContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(
                  userData?.firstName || "",
                  userData?.lastName || "",
                )}
              </Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>{userData?.name || "User"}</Text>
            <Text style={styles.userEmail}>{userData?.email || ""}</Text>
          </View>
        </View>
      </View>

      {/* Bookings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bookings</Text>
        <View style={styles.menuCard}>
          {bookingsItems.map((item, index) =>
            renderMenuItem(item, index, bookingsItems.length),
          )}
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {accountItems.map((item, index) =>
            renderMenuItem(item, index, accountItems.length),
          )}
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuCard}>
          {preferencesItems.map((item, index) =>
            renderMenuItem(item, index, preferencesItems.length),
          )}
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          {supportItems.map((item, index) =>
            renderMenuItem(item, index, supportItems.length),
          )}
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={colors.error}
            style={styles.menuIcon}
          />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Theme Selection Modal */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Theme</Text>
              <TouchableOpacity
                onPress={() => setShowThemeModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  selectedTheme === "Light" && styles.themeOptionSelected,
                ]}
                onPress={() => {
                  setSelectedTheme("Light");
                  setShowThemeModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeOptionContent}>
                  <Ionicons
                    name="sunny-outline"
                    size={24}
                    color={
                      selectedTheme === "Light"
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      selectedTheme === "Light" &&
                        styles.themeOptionTextSelected,
                    ]}
                  >
                    Light
                  </Text>
                </View>
                {selectedTheme === "Light" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  selectedTheme === "Dark" && styles.themeOptionSelected,
                ]}
                onPress={() => {
                  setSelectedTheme("Dark");
                  setShowThemeModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeOptionContent}>
                  <Ionicons
                    name="moon-outline"
                    size={24}
                    color={
                      selectedTheme === "Dark"
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      selectedTheme === "Dark" &&
                        styles.themeOptionTextSelected,
                    ]}
                  >
                    Dark
                  </Text>
                </View>
                {selectedTheme === "Dark" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  selectedTheme === "System Default" &&
                    styles.themeOptionSelected,
                ]}
                onPress={() => {
                  setSelectedTheme("System Default");
                  setShowThemeModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.themeOptionContent}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={24}
                    color={
                      selectedTheme === "System Default"
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      selectedTheme === "System Default" &&
                        styles.themeOptionTextSelected,
                    ]}
                  >
                    System Default
                  </Text>
                </View>
                {selectedTheme === "System Default" && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 100,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  homeButton: {
    position: "absolute",
    right: 0,
    padding: 4,
    zIndex: 1,
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.regular,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
  },
  profileCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.cardBackground,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderColor: colors.border,
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: colors.text,
    fontFamily: fonts.regular,
  },
  menuItemValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  loggedOutContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  loggedOutTitle: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  loggedOutSubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  authButtonsContainer: {
    width: "100%",
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.error,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.regular,
  },
  themeOptions: {
    padding: 20,
  },
  themeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
  },
  themeOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  themeOptionText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 12,
    fontFamily: fonts.regular,
  },
  themeOptionTextSelected: {
    color: colors.text,
    fontFamily: fonts.semiBold,
  },
});

export default ProfileScreen;
