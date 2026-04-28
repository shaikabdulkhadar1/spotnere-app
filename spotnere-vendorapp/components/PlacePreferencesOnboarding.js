/**
 * Place Preferences Onboarding Component
 * Collects vendor booking/pricing preferences after place details
 */

import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { fonts } from "../constants/fonts";
import { api } from "../api/client";
import { useApp } from "../contexts/AppContext";

const PREFERENCE_OPTIONS = [
  {
    key: "allow_overlapping_bookings",
    title: "Allow Overlapping Bookings",
    description:
      "When enabled, multiple guests can book the same time slot. Useful for venues that can accommodate several parties at once.",
    icon: "layers-outline",
  },
  {
    key: "allow_multiple_hours_booking",
    title: "Allow Multiple Hours Booking",
    description:
      "Let guests book consecutive hours in a single reservation instead of limiting them to one time slot.",
    icon: "time-outline",
  },
  {
    key: "charge_per_guest",
    title: "Charge Per Guest",
    description:
      "Price is calculated per person rather than a flat rate per booking. The total will scale with the number of guests.",
    icon: "people-outline",
  },
];

const PlacePreferencesOnboarding = ({ onComplete }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, loadPlace } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferences, setPreferences] = useState({
    allow_overlapping_bookings: false,
    allow_multiple_hours_booking: false,
    charge_per_guest: false,
  });

  const togglePreference = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!user?.place_id) {
      Alert.alert("Error", "Place information not found. Please try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateVendorPlace({
        allow_overlapping_bookings: preferences.allow_overlapping_bookings,
        allow_multiple_hours_booking: preferences.allow_multiple_hours_booking,
        charge_per_guest: preferences.charge_per_guest,
      });
      await loadPlace(true);
      onComplete?.();
    } catch (error) {
      console.error("Error saving place preferences:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save preferences. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="settings-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Your Place Preferences</Text>
          <Text style={styles.subtitle}>
            Configure how bookings and pricing work for your venue
          </Text>
        </View>

        {/* Toggle Options */}
        <View style={styles.optionsContainer}>
          {PREFERENCE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.optionCard,
                preferences[option.key] && styles.optionCardActive,
              ]}
              onPress={() => togglePreference(option.key)}
              activeOpacity={0.7}
            >
              <View style={styles.optionTop}>
                <View
                  style={[
                    styles.optionIconContainer,
                    preferences[option.key] && styles.optionIconContainerActive,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={
                      preferences[option.key]
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                </View>
                <Switch
                  value={preferences[option.key]}
                  onValueChange={() => togglePreference(option.key)}
                  trackColor={{
                    false: colors.border,
                    true: colors.primary + "60",
                  }}
                  thumbColor={
                    preferences[option.key] ? colors.primary : "#f4f3f4"
                  }
                  ios_backgroundColor={colors.border}
                />
              </View>
              <Text
                style={[
                  styles.optionTitle,
                  preferences[option.key] && styles.optionTitleActive,
                ]}
              >
                {option.title}
              </Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Save & Finish</Text>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardBackground,
  },
  optionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  optionIconContainerActive: {
    backgroundColor: colors.primary + "15",
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 6,
  },
  optionTitleActive: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: "#FFFFFF",
    marginRight: 8,
  },
});

export default PlacePreferencesOnboarding;
