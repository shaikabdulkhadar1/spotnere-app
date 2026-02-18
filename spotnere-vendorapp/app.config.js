/**
 * Expo App Configuration
 * This file allows us to use environment variables from .env file
 */

require("dotenv").config();

export default {
  expo: {
    name: "Spotnere Vendor",
    owner: "shaikabdulkhadar571",
    slug: "spotnere-vendor",
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
      bundleIdentifier: "com.spotnere.vendor",
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "This app needs access to your location to manage your places.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app needs access to your location to manage your places.",
      },
      icons: {
        light: "./assets/icons/ios-light.png",
        dark: "./assets/icons/ios-dark.png",
        tinted: "./assets/icons/ios-tinted.png",
      },
    },
    android: {
      package: "com.spotnere.vendor",
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
      eas: {
        projectId: "d5153358-6939-40d5-95ac-f49b94a227e6",
      },
    },
  },
};
