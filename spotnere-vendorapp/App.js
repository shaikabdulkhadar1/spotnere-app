import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, BackHandler, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import BookingsScreen from "./screens/BookingsScreen";
import VenduDetailsScreen from "./screens/VenduDetailsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import BottomNavBar from "./components/BottomNavBar";
import PlaceDetailsOnboarding from "./components/PlaceDetailsOnboarding";
import PlacePreferencesOnboarding from "./components/PlacePreferencesOnboarding";
import BankDetailsOnboarding from "./components/BankDetailsOnboarding";
import ReviewsScreen from "./screens/ReviewsScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import { colors } from "./constants/colors";
import { isLoggedIn } from "./utils/auth";
import { AppProvider, useApp } from "./contexts/AppContext";
import { ToastProvider } from "./contexts/ToastContext";
import {
  registerAndStorePushToken,
  clearPushToken,
} from "./utils/pushNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Persists that this vendor finished preferences onboarding (survives API/cache quirks). */
const PREF_ONBOARDING_DONE_KEY = "spotnere_vendor_preferences_onboarding_done";

async function isPreferencesOnboardingDone(vendorId, apiSaysComplete) {
  if (apiSaysComplete) return true;
  if (!vendorId) return false;
  try {
    const stored = await AsyncStorage.getItem(PREF_ONBOARDING_DONE_KEY);
    return stored === vendorId;
  } catch {
    return false;
  }
}

function AppContent() {
  const { user, refreshData, clearCache, markAllNotificationsAsRead } = useApp();

  const [fontsLoaded] = useFonts({
    "Parkinsans-Light": require("./assets/fonts/Parkinsans-Light.ttf"),
    "Parkinsans-Regular": require("./assets/fonts/Parkinsans-Regular.ttf"),
    "Parkinsans-Medium": require("./assets/fonts/Parkinsans-Medium.ttf"),
    "Parkinsans-SemiBold": require("./assets/fonts/Parkinsans-SemiBold.ttf"),
    "Parkinsans-Bold": require("./assets/fonts/Parkinsans-Bold.ttf"),
    "Parkinsans-ExtraBold": require("./assets/fonts/Parkinsans-ExtraBold.ttf"),
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlaceOnboarding, setShowPlaceOnboarding] = useState(false);
  const [showPreferencesOnboarding, setShowPreferencesOnboarding] = useState(false);
  const [showBankOnboarding, setShowBankOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [showReviewsScreen, setShowReviewsScreen] = useState(false);
  const [showNotificationsScreen, setShowNotificationsScreen] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const backAction = () => {
      // If NotificationsScreen is showing, go back
      if (showNotificationsScreen) {
        handleBackFromNotifications();
        return true;
      }
      // If ReviewsScreen is showing (component-like screen), go back one step
      if (showReviewsScreen) {
        handleBackFromReviews();
        return true; // Prevent default back behavior
      }

      // If on HomeScreen, exit app
      if (activeTab === "home") {
        BackHandler.exitApp();
        return true; // Prevent default back behavior
      }

      // For other screens from screens folder (BookingsScreen, VenduDetailsScreen, ProfileScreen), go to HomeScreen
      setActiveTab("home");
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => {
      backHandler.remove();
    };
  }, [activeTab, showReviewsScreen, showNotificationsScreen, handleBackFromNotifications]);

  useEffect(() => {
    // Check onboarding status when user becomes available
    if (isAuthenticated && user?.id && !checkingOnboarding && !showPlaceOnboarding && !showPreferencesOnboarding && !showBankOnboarding) {
      checkOnboardingStatus();
    }
  }, [isAuthenticated, user?.id]);

  // Register push token when app opens and vendor is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      registerAndStorePushToken(user.id).catch((err) =>
        console.warn("Push registration failed:", err)
      );
    }
  }, [isAuthenticated, user?.id]);

  const checkAuthStatus = async () => {
    try {
      const loggedIn = await isLoggedIn();
      setIsAuthenticated(loggedIn);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (userData) => {
    // Update authentication state
    setIsAuthenticated(true);
    setActiveTab("home");
    // Refresh context data after login/registration
    await refreshData();
    // Wait a bit for user state to update in context
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Check if onboarding is needed
    checkOnboardingStatus();
  };

  const checkOnboardingStatus = async () => {
    setCheckingOnboarding(true);
    try {
      let currentUser = user;
      if (!currentUser?.id) {
        const { getCurrentUser } = require("./utils/auth");
        currentUser = await getCurrentUser();
      }
      if (!currentUser?.id) {
        setCheckingOnboarding(false);
        return;
      }

      const { api } = require("./api/client");
      const { placeDetailsComplete, bankDetailsComplete, preferencesComplete } =
        await api.getOnboardingStatus(currentUser.id);

      const prefsDone = await isPreferencesOnboardingDone(
        currentUser.id,
        preferencesComplete,
      );

      // Show bank onboarding first, then place details, then preferences
      if (!bankDetailsComplete) {
        setShowBankOnboarding(true);
      } else if (!placeDetailsComplete) {
        setShowPlaceOnboarding(true);
      } else if (!prefsDone) {
        setShowPreferencesOnboarding(true);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setShowBankOnboarding(true);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handlePlaceOnboardingComplete = async () => {
    setShowPlaceOnboarding(false);
    await refreshData();
    const { getCurrentUser } = require("./utils/auth");
    const { api } = require("./api/client");
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      try {
        const { bankDetailsComplete, preferencesComplete } = await api.getOnboardingStatus(currentUser.id);
        const prefsDone = await isPreferencesOnboardingDone(
          currentUser.id,
          preferencesComplete,
        );
        if (!bankDetailsComplete) {
          setTimeout(() => setShowBankOnboarding(true), 100);
        } else if (!prefsDone) {
          setTimeout(() => setShowPreferencesOnboarding(true), 100);
        }
      } catch (e) {
        console.warn("Could not check next onboarding step:", e);
      }
    }
  };

  const handlePreferencesOnboardingComplete = async () => {
    try {
      const { getCurrentUser } = require("./utils/auth");
      const currentUser = await getCurrentUser();
      if (currentUser?.id) {
        await AsyncStorage.setItem(PREF_ONBOARDING_DONE_KEY, currentUser.id);
      }
    } catch (e) {
      console.warn("Could not persist preferences onboarding completion:", e);
    }
    setShowPreferencesOnboarding(false);
    await refreshData();
  };

  const handleBankOnboardingComplete = async () => {
    setShowBankOnboarding(false);
    await refreshData();
    const { getCurrentUser } = require("./utils/auth");
    const { api } = require("./api/client");
    const currentUser = await getCurrentUser();
    if (currentUser?.id) {
      try {
        const { placeDetailsComplete, preferencesComplete } = await api.getOnboardingStatus(currentUser.id);
        const prefsDone = await isPreferencesOnboardingDone(
          currentUser.id,
          preferencesComplete,
        );
        if (!placeDetailsComplete) {
          setTimeout(() => setShowPlaceOnboarding(true), 100);
        } else if (!prefsDone) {
          setTimeout(() => setShowPreferencesOnboarding(true), 100);
        }
      } catch (e) {
        console.warn("Could not check next onboarding step:", e);
      }
    }
  };

  const handleLogout = async () => {
    if (user?.id) {
      await clearPushToken(user.id);
    }
    await clearCache();
    setIsAuthenticated(false);
    setActiveTab("home");
  };

  const handleBack = () => {
    // Handle back navigation if needed
  };

  const handleNavigateToBookings = () => {
    setShowReviewsScreen(false);
    setActiveTab("bookings");
  };

  const handleNavigateToReviews = () => {
    setShowReviewsScreen(true);
  };

  const handleBackFromReviews = () => {
    setShowReviewsScreen(false);
  };

  const handleNavigateToNotifications = () => {
    setShowNotificationsScreen(true);
  };

  const handleBackFromNotifications = useCallback(() => {
    if (user?.id) {
      markAllNotificationsAsRead(user.id); // Mark as read in DB (fire-and-forget)
    }
    setShowNotificationsScreen(false);
  }, [user?.id, markAllNotificationsAsRead]);

  const handleTabChange = (tab) => {
    if (showReviewsScreen) setShowReviewsScreen(false);
    if (showNotificationsScreen) setShowNotificationsScreen(false);
    setActiveTab(tab);
  };

  const renderScreen = () => {
    if (showNotificationsScreen) {
      return <NotificationsScreen onBack={handleBackFromNotifications} />;
    }
    if (showReviewsScreen) {
      return <ReviewsScreen onBack={handleBackFromReviews} />;
    }

    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onNavigateToBookings={handleNavigateToBookings}
            onNavigateToReviews={handleNavigateToReviews}
            onNavigateToNotifications={handleNavigateToNotifications}
          />
        );
      case "bookings":
        return <BookingsScreen />;
      case "venduDetails":
        return <VenduDetailsScreen />;
      case "profile":
        return <ProfileScreen onLogout={handleLogout} />;
      default:
        return (
          <HomeScreen
            onNavigateToBookings={handleNavigateToBookings}
            onNavigateToReviews={handleNavigateToReviews}
            onNavigateToNotifications={handleNavigateToNotifications}
          />
        );
    }
  };

  // Show loading state while checking authentication or loading fonts
  if (!fontsLoaded || isLoading || checkingOnboarding) {
    return (
      <>
        <StatusBar style="auto" />
        <View style={styles.outerContainer}>
          <View style={styles.container}>
            <View style={[styles.screenWrapper, styles.loadingContainer]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <View style={styles.outerContainer}>
        <View style={styles.container}>
          <View style={styles.screenWrapper}>
            {isAuthenticated ? (
              showPlaceOnboarding ? (
                <PlaceDetailsOnboarding
                  onNext={handlePlaceOnboardingComplete}
                  onComplete={handlePlaceOnboardingComplete}
                />
              ) : showPreferencesOnboarding ? (
                <PlacePreferencesOnboarding onComplete={handlePreferencesOnboardingComplete} />
              ) : showBankOnboarding ? (
                <BankDetailsOnboarding onComplete={handleBankOnboardingComplete} />
              ) : (
                <>
                  {renderScreen()}
                  <BottomNavBar
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                  />
                </>
              )
            ) : (
              <LoginScreen
                onLoginSuccess={handleLoginSuccess}
                onBack={handleBack}
              />
            )}
          </View>
        </View>
      </View>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    margin: 10,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: "hidden",
  },
  screenWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
