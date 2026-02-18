/**
 * About Us Screen Component
 * Displays information about Spotnere and the app
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";

const AboutUsScreen = ({ onBack }) => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:support@spotnere.com").catch((err) =>
      console.error("Error opening email:", err)
    );
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://spotnere.com").catch((err) =>
      console.error("Error opening website:", err)
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerContent}>
          <Text style={styles.title}>About Us</Text>
        </View>
        {/* Spacer to balance the back button */}
        {onBack && <View style={styles.backButtonSpacer} />}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* App Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="business" size={48} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.appName}>Spotnere Vendor</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Spotnere</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.paragraph}>
              Spotnere is a comprehensive platform designed to help vendors and
              partners manage their places, bookings, and business operations
              efficiently.
            </Text>
            <Text style={styles.paragraph}>
              Our mission is to empower businesses by providing intuitive tools
              for managing bookings, tracking revenue, analyzing performance
              metrics, and connecting with customers seamlessly.
            </Text>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.sectionCard}>
            <View style={styles.featureItem}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Secure vendor authentication and profile management
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="location-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Comprehensive place and venue management
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Real-time booking management and tracking
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="bar-chart-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Analytics dashboard with revenue and performance insights
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.featureText}>
                Customer relationship management
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Support</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleEmailPress}
            >
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <View style={styles.contactContent}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>support@spotnere.com</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.contactItem}
              onPress={handleWebsitePress}
            >
              <Ionicons name="globe-outline" size={20} color={colors.primary} />
              <View style={styles.contactContent}>
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

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.sectionCard}>
            <Text style={styles.legalText}>
              © {new Date().getFullYear()} Spotnere. All rights reserved.
            </Text>
            <Text style={styles.legalText}>
              This app is licensed under the 0BSD License.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    position: "absolute",
    left: 10,
    top: 20,
    padding: 4,
  },
  backButtonSpacer: {
    width: 32,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
  },
  appName: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
  },
  paragraph: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 22,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  contactContent: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  legalText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default AboutUsScreen;
