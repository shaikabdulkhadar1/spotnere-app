import React, { useState, useEffect } from "react";
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
import BankDetailsOnboarding from "./components/BankDetailsOnboarding";
import ReviewsScreen from "./screens/ReviewsScreen";
import { colors } from "./constants/colors";
import { isLoggedIn } from "./utils/auth";
import { AppProvider, useApp } from "./contexts/AppContext";

function AppContent() {
  const { user, refreshData, clearCache } = useApp();

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
  const [showBankOnboarding, setShowBankOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [showReviewsScreen, setShowReviewsScreen] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const backAction = () => {
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
  }, [activeTab, showReviewsScreen]);

  useEffect(() => {
    // Check onboarding status when user becomes available
    if (isAuthenticated && user?.id && !checkingOnboarding && !showPlaceOnboarding && !showBankOnboarding) {
      checkOnboardingStatus();
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
      // Get fresh user data from context
      // If user is not available yet, try to get it directly
      let currentUser = user;
      
      // If user is not in context yet, fetch it directly
      if (!currentUser?.id) {
        const { getCurrentUser } = require("./utils/auth");
        currentUser = await getCurrentUser();
      }
      
      if (!currentUser?.id) {
        console.log("No user ID found, skipping onboarding check");
        setCheckingOnboarding(false);
        return;
      }

      console.log("Checking onboarding status for user:", currentUser.id, "place_id:", currentUser.place_id);

      const { supabase } = require("./config/supabase");

      // Check place details onboarding status
      // For new users, place_id should exist but place details might be empty
      if (currentUser?.place_id) {
        const { data: placeData, error: placeError } = await supabase
          .from("places")
          .select("description, website, hours, avg_price, amenities, location_map_link")
          .eq("id", currentUser.place_id)
          .single();

        console.log("Place data:", placeData, "Error:", placeError);

        if (placeError) {
          console.error("Error fetching place data:", placeError);
          // If place doesn't exist, show place onboarding
          setShowPlaceOnboarding(true);
          setCheckingOnboarding(false);
          return;
        }

        if (placeData) {
          // Check if any of the key fields are filled
          // hours can be JSONB (object) or string
          const hasHours = placeData.hours && (
            (typeof placeData.hours === "object" && Object.keys(placeData.hours).length > 0) ||
            (typeof placeData.hours === "string" && placeData.hours.trim())
          );
          
          const hasPlaceDetails =
            (placeData.description && placeData.description.trim()) ||
            (placeData.website && placeData.website.trim()) ||
            (placeData.location_map_link && placeData.location_map_link.trim()) ||
            hasHours ||
            placeData.avg_price ||
            (placeData.amenities &&
              Array.isArray(placeData.amenities) &&
              placeData.amenities.length > 0);

          console.log("Has place details:", hasPlaceDetails);

          if (!hasPlaceDetails) {
            console.log("Showing place onboarding");
            setShowPlaceOnboarding(true);
            setCheckingOnboarding(false);
            return;
          }
        } else {
          // No place data found, show onboarding
          console.log("No place data, showing place onboarding");
          setShowPlaceOnboarding(true);
          setCheckingOnboarding(false);
          return;
        }
      } else {
        // No place_id means place wasn't created, but this shouldn't happen
        // Still show place onboarding as fallback
        console.log("No place_id found, showing place onboarding");
        setShowPlaceOnboarding(true);
        setCheckingOnboarding(false);
        return;
      }

      // Only check bank details if place onboarding is already completed
      // (Bank onboarding will be triggered directly from handlePlaceOnboardingComplete)
      // This check is for users who already have place details but missing bank details
      console.log("Checking bank details");
      const { data: vendorData, error: vendorError } = await supabase
        .from("vendors")
        .select("account_holder_name, account_number, ifsc_code, upi_id")
        .eq("id", currentUser.id)
        .single();

      console.log("Vendor data:", vendorData, "Error:", vendorError);

      if (!vendorError && vendorData) {
        // Check if bank details are filled
        const hasBankDetails =
          (vendorData.account_holder_name && vendorData.account_holder_name.trim()) ||
          (vendorData.account_number && vendorData.account_number.trim()) ||
          (vendorData.ifsc_code && vendorData.ifsc_code.trim()) ||
          (vendorData.upi_id && vendorData.upi_id.trim());

        console.log("Has bank details:", hasBankDetails);

        if (!hasBankDetails) {
          console.log("Showing bank onboarding");
          setShowBankOnboarding(true);
        }
      } else if (vendorError) {
        console.error("Error fetching vendor data:", vendorError);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handlePlaceOnboardingComplete = async () => {
    console.log("handlePlaceOnboardingComplete called");
    
    // Refresh data to get updated place details
    await refreshData();
    
    // Immediately show bank onboarding for new users
    // (This is called after place onboarding, so user is definitely new)
    console.log("Place onboarding complete, showing bank onboarding");
    setShowPlaceOnboarding(false);
    
    // Use setTimeout to ensure state update happens after render cycle
    setTimeout(() => {
      console.log("Setting showBankOnboarding to true");
      setShowBankOnboarding(true);
    }, 100);
  };

  const handleBankOnboardingComplete = async () => {
    setShowBankOnboarding(false);
    // Refresh data to get updated vendor details
    await refreshData();
  };

  const handleLogout = async () => {
    // Clear cache on logout
    await clearCache();
    setIsAuthenticated(false);
    setActiveTab("home");
  };

  const handleBack = () => {
    // Handle back navigation if needed
    console.log("Back pressed");
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

  const handleTabChange = (tab) => {
    // Hide ReviewsScreen when switching tabs via navbar
    if (showReviewsScreen) {
      setShowReviewsScreen(false);
    }
    setActiveTab(tab);
  };

  const renderScreen = () => {
    if (showReviewsScreen) {
      return <ReviewsScreen onBack={handleBackFromReviews} />;
    }

    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onNavigateToBookings={handleNavigateToBookings}
            onNavigateToReviews={handleNavigateToReviews}
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
    <AppProvider>
      <AppContent />
    </AppProvider>
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
