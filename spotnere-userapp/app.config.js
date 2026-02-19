/**
 * Expo App Configuration
 * This file allows us to use environment variables from .env file
 */

require("dotenv").config();

export default {
  expo: {
    name: "Spotnere",
    owner: "shaikabdulkhadar571",
    slug: "spotnere-mobileapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/icons/splash-icon.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      bundleIdentifier: "com.spotnere.mobileapp",
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs access to your location to show nearby places.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app needs access to your location to show nearby places.",
        LSApplicationQueriesSchemes: ["phonepe", "gpay", "upi"],
      },
      icons: {
        light: "./assets/icons/icon-light.png",
        dark: "./assets/icons/icon-dark.png",
        tinted: "./assets/icons/icon-tinted.png",
      },
    },
    android: {
      package: "com.spotnere.mobileapp",
      usesCleartextTraffic: true,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/icons/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey:
        process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY,
      countryStateCityApi: process.env.COUNTRY_STATE_CITY_API,
      apiBaseUrl:
        process.env.API_BASE_URL ||
        process.env.EXPO_PUBLIC_API_BASE_URL ||
        "http://localhost:5001",
      eas: {
        projectId: "b8b05f81-ba37-4e6f-a0f8-fe47a2ad058b",
      },
    },
  },
};
