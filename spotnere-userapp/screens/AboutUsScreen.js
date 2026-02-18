import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const AboutUsScreen = ({ onBack }) => {
  const handleLinkPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.log(`Don't know how to open URI: ${url}`);
      }
    } catch (error) {
      console.error("Error opening link:", error);
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
      </View>

      {/* App Logo/Icon Section */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          <Ionicons name="location" size={60} color={colors.primary} />
        </View>
        <Text style={styles.appName}>Spotnere</Text>
        <Text style={styles.tagline}>Discover Amazing Places</Text>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About Spotnere</Text>
        <Text style={styles.description}>
          Spotnere is your ultimate companion for discovering and exploring
          amazing places around the world. Whether you're looking for
          restaurants, attractions, events, or hidden gems, Spotnere helps you
          find the perfect spots tailored to your preferences.
        </Text>
        <Text style={styles.description}>
          Our mission is to connect people with extraordinary experiences and
          help them create unforgettable memories at the places that matter most.
        </Text>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.featureList}>
          <View style={styles.featureItem}>
            <Ionicons
              name="star-outline"
              size={20}
              color={colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Discover top-rated places near you
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="heart-outline"
              size={20}
              color={colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Save your favorite places for later
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Plan trips and track your bookings
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.primary}
              style={styles.featureIcon}
            />
            <Text style={styles.featureText}>
              Get detailed information and reviews
            </Text>
          </View>
        </View>
      </View>

      {/* Contact Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Us</Text>
        <View style={styles.contactCard}>
          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleLinkPress("mailto:support@spotnere.com")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="mail-outline"
              size={22}
              color={colors.text}
              style={styles.contactIcon}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@spotnere.com</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleLinkPress("tel:+1234567890")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="call-outline"
              size={22}
              color={colors.text}
              style={styles.contactIcon}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+1 (234) 567-890</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactItem}
            onPress={() => handleLinkPress("https://www.spotnere.com")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="globe-outline"
              size={22}
              color={colors.text}
              style={styles.contactIcon}
            />
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Website</Text>
              <Text style={styles.contactValue}>www.spotnere.com</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Version Section */}
      <View style={styles.section}>
        <View style={styles.versionCard}>
          <Text style={styles.versionLabel}>App Version</Text>
          <Text style={styles.versionValue}>1.0.0</Text>
        </View>
        <Text style={styles.copyright}>
          © 2024 Spotnere. All rights reserved.
        </Text>
      </View>
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
  header: {
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
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
  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    fontFamily: fonts.regular,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: fonts.regular,
  },
  featureList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    fontFamily: fonts.regular,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  contactValue: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  versionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  versionLabel: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: fonts.regular,
  },
  copyright: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    fontFamily: fonts.regular,
  },
});

export default AboutUsScreen;
