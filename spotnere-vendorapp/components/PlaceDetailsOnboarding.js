/**
 * Place Details Onboarding Component
 * One-time onboarding page to collect additional place details
 * Only shown once for new users after account creation
 */

import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { supabase } from "../config/supabase";
import { useApp } from "../contexts/AppContext";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Generate time options (every 30 minutes from 6 AM to 11 PM)
const generateTimeOptions = () => {
  const times = [];
  // Add "Closed" option at the top
  times.push({
    value: "closed",
    label: "Closed",
  });
  for (let hour = 6; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";
      const m = minute === 0 ? "00" : minute.toString();
      times.push({
        value: `${hour.toString().padStart(2, "0")}:${m}`,
        label: `${h}:${m} ${ampm}`,
      });
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

const PlaceDetailsOnboarding = ({ onComplete, onNext }) => {
  const { user, loadPlace } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    website: "",
    map_url: "",
    avg_price: "",
    description: "",
    amenities: [], // Changed to array for badges
    hours: {
      Monday: { open: "", close: "" },
      Tuesday: { open: "", close: "" },
      Wednesday: { open: "", close: "" },
      Thursday: { open: "", close: "" },
      Friday: { open: "", close: "" },
      Saturday: { open: "", close: "" },
      Sunday: { open: "", close: "" },
    },
  });
  const [amenityInput, setAmenityInput] = useState(""); // Input field for adding amenities
  const [errors, setErrors] = useState({});
  const [showTimeModal, setShowTimeModal] = useState({
    day: null,
    type: null, // 'open' or 'close'
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Website is required and must be valid URL format
    if (!formData.website.trim()) {
      newErrors.website = "Website is required";
    } else if (!/^https?:\/\/.+/.test(formData.website.trim())) {
      newErrors.website = "Please enter a valid URL (e.g., https://example.com)";
    }

    // Map URL is required and must be valid URL format
    if (!formData.map_url.trim()) {
      newErrors.map_url = "Map URL is required";
    } else if (!/^https?:\/\/.+/.test(formData.map_url.trim())) {
      newErrors.map_url = "Please enter a valid URL (e.g., https://maps.google.com/...)";
    }

    // Average price is required and must be a valid number
    if (!formData.avg_price.trim()) {
      newErrors.avg_price = "Average price is required";
    } else if (isNaN(parseFloat(formData.avg_price)) || parseFloat(formData.avg_price) <= 0) {
      newErrors.avg_price = "Please enter a valid positive number";
    }

    // Description is required
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    // Amenities is required - must have at least one amenity
    if (!formData.amenities || formData.amenities.length === 0) {
      newErrors.amenities = "At least one amenity is required";
    }

    // Working hours validation - at least one day must have valid hours (either both times or closed)
    let hasValidHours = false;
    const hoursErrors = {};
    DAYS_OF_WEEK.forEach((day) => {
      const dayHours = formData.hours[day];
      // Day is valid if it's closed or has both open and close times
      if (dayHours.open === "closed" && dayHours.close === "closed") {
        hasValidHours = true;
      } else if (dayHours.open && dayHours.close && dayHours.open !== "closed" && dayHours.close !== "closed") {
        hasValidHours = true;
      } else if (dayHours.open || dayHours.close) {
        // If one is set but not both (and not closed), show error
        if (dayHours.open !== "closed" && dayHours.close !== "closed") {
          hoursErrors[day] = "Both open and close times are required";
        }
      }
    });

    if (!hasValidHours) {
      newErrors.hours = "Please set working hours for at least one day";
    } else if (Object.keys(hoursErrors).length > 0) {
      newErrors.hours = hoursErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please correct the errors before submitting."
      );
      return;
    }

    if (!user?.place_id) {
      Alert.alert("Error", "Place information not found. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Format working hours as JSONB object
      // Structure: { "Monday": { "open": "09:00", "close": "18:00" }, ... }
      const hoursJsonb = {};
      DAYS_OF_WEEK.forEach((day) => {
        const dayHours = formData.hours[day];
        if (dayHours.open === "closed" && dayHours.close === "closed") {
          hoursJsonb[day] = { open: "closed", close: "closed" };
        } else if (dayHours.open && dayHours.close && dayHours.open !== "closed" && dayHours.close !== "closed") {
          // Store time values (e.g., "09:00") not labels
          hoursJsonb[day] = {
            open: dayHours.open,
            close: dayHours.close,
          };
        }
      });

      // Prepare update data
      // Amenities: stored as text[] (array)
      // Hours: stored as jsonb (JSON object)
      const updateData = {
        website: formData.website.trim(),
        location_map_link: formData.map_url.trim(),
        avg_price: parseFloat(formData.avg_price),
        description: formData.description.trim(),
        amenities: formData.amenities, // Array for text[] column
        hours: hoursJsonb, // JSON object for jsonb column
        updated_at: new Date().toISOString(),
      };

      // Update place in database
      const { error } = await supabase
        .from("places")
        .update(updateData)
        .eq("id", user.place_id);

      if (error) {
        throw error;
      }

      // Onboarding is considered completed when place details are saved
      // No need to update a flag - the presence of data indicates completion

      // Refresh place data
      await loadPlace(true);

      // Navigate to bank details page
      if (onNext) {
        onNext();
      } else if (onComplete) {
        // Fallback to completion if onNext is not provided
        onComplete();
      }
    } catch (error) {
      console.error("Error saving place details:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save details. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHoursChange = (day, type, value) => {
    setFormData((prev) => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [type]: value,
        },
      },
    }));
    // Clear hours error when user makes a change
    if (errors.hours) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (typeof prev.hours === "object" && prev.hours[day]) {
          delete newErrors.hours[day];
        } else {
          delete newErrors.hours;
        }
        return newErrors;
      });
    }
  };

  const openTimeModal = (day, type) => {
    setShowTimeModal({ day, type });
  };

  const selectTime = (timeValue) => {
    if (showTimeModal.day && showTimeModal.type) {
      // If "Closed" is selected, set both open and close to "closed"
      if (timeValue === "closed") {
        setFormData((prev) => ({
          ...prev,
          hours: {
            ...prev.hours,
            [showTimeModal.day]: {
              open: "closed",
              close: "closed",
            },
          },
        }));
      } else {
        handleHoursChange(showTimeModal.day, showTimeModal.type, timeValue);
      }
    }
    setShowTimeModal({ day: null, type: null });
  };

  const addAmenity = () => {
    const trimmedInput = amenityInput.trim();
    if (trimmedInput && !formData.amenities.includes(trimmedInput)) {
      setFormData((prev) => ({
        ...prev,
        amenities: [...prev.amenities, trimmedInput],
      }));
      setAmenityInput("");
      // Clear error when amenity is added
      if (errors.amenities) {
        setErrors((prev) => ({ ...prev, amenities: null }));
      }
    }
  };

  const removeAmenity = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenity),
    }));
  };

  const handleAmenityInputSubmit = () => {
    addAmenity();
  };

  const renderInputField = (
    field,
    label,
    placeholder,
    keyboardType = "default",
    multiline = false,
    numberOfLines = 1,
    icon = null
  ) => {
    const hasError = errors[field];
    const value = formData[field] || "";

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View
          style={[
            styles.inputWrapper,
            hasError && styles.inputWrapperError,
            multiline && styles.inputWrapperMultiline,
          ]}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={hasError ? colors.error : colors.textSecondary}
              style={styles.inputIcon}
            />
          )}
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={value}
            onChangeText={(text) => handleInputChange(field, text)}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={numberOfLines}
            textAlignVertical={multiline ? "top" : "center"}
          />
        </View>
        {hasError && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  const renderHoursRow = (day) => {
    const dayHours = formData.hours[day];
    const isClosed = dayHours.open === "closed" && dayHours.close === "closed";
    
    const openTime = isClosed
      ? "Closed"
      : dayHours.open
      ? TIME_OPTIONS.find((t) => t.value === dayHours.open)?.label || dayHours.open
      : "Select";
    const closeTime = isClosed
      ? "Closed"
      : dayHours.close
      ? TIME_OPTIONS.find((t) => t.value === dayHours.close)?.label || dayHours.close
      : "Select";
    const hasError = errors.hours && typeof errors.hours === "object" && errors.hours[day];

    return (
      <View style={styles.hoursRow}>
        <View style={styles.dayColumn}>
          <Text style={styles.dayText}>{day.substring(0, 3)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.timeColumn,
            hasError && styles.timeColumnError,
            isClosed && styles.timeColumnClosed,
          ]}
          onPress={() => openTimeModal(day, "open")}
        >
          <Text
            style={[
              styles.timeText,
              !dayHours.open && styles.timeTextPlaceholder,
              isClosed && styles.timeTextClosed,
            ]}
          >
            {openTime}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.timeColumn,
            hasError && styles.timeColumnError,
            isClosed && styles.timeColumnClosed,
          ]}
          onPress={() => openTimeModal(day, "close")}
        >
          <Text
            style={[
              styles.timeText,
              !dayHours.close && styles.timeTextPlaceholder,
              isClosed && styles.timeTextClosed,
            ]}
          >
            {closeTime}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="business-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Complete Your Place Details</Text>
          <Text style={styles.subtitle}>
            Add more information about your business to help customers find you
            better
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {renderInputField(
            "website",
            "Website",
            "https://example.com",
            "url",
            false,
            1,
            "globe-outline"
          )}

          {renderInputField(
            "map_url",
            "Map URL",
            "https://maps.google.com/...",
            "url",
            false,
            1,
            "map-outline"
          )}

          {renderInputField(
            "avg_price",
            "Average Price",
            "Enter average price (e.g., 50)",
            "decimal-pad",
            false,
            1,
            "cash-outline"
          )}

          {renderInputField(
            "description",
            "Description",
            "Tell customers about your place...",
            "default",
            true,
            4,
            "document-text-outline"
          )}

          {/* Amenities Section with Badges */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Amenities</Text>
            <View
              style={[
                styles.amenitiesInputWrapper,
                errors.amenities && styles.inputWrapperError,
              ]}
            >
              <Ionicons
                name="star-outline"
                size={20}
                color={errors.amenities ? colors.error : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.amenitiesInput}
                value={amenityInput}
                onChangeText={setAmenityInput}
                placeholder="Add an amenity (e.g., WiFi, Parking)"
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={handleAmenityInputSubmit}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={addAmenity}
                style={styles.addButton}
                disabled={!amenityInput.trim()}
              >
                <Ionicons
                  name="add-circle"
                  size={24}
                  color={
                    amenityInput.trim()
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
            {formData.amenities.length > 0 && (
              <View style={styles.amenitiesBadgesContainer}>
                {formData.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityBadge}>
                    <Text style={styles.amenityBadgeText}>{amenity}</Text>
                    <TouchableOpacity
                      onPress={() => removeAmenity(amenity)}
                      style={styles.removeBadgeButton}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {errors.amenities && (
              <Text style={styles.errorText}>{errors.amenities}</Text>
            )}
          </View>

          {/* Working Hours Section */}
          <View style={styles.hoursContainer}>
            <Text style={styles.inputLabel}>Working Hours</Text>
            <View style={styles.hoursTable}>
              <View style={styles.hoursHeader}>
                <Text style={styles.hoursHeaderText}>Day</Text>
                <Text style={styles.hoursHeaderText}>Open</Text>
                <Text style={styles.hoursHeaderText}>Close</Text>
              </View>
              {DAYS_OF_WEEK.map((day) => (
                <View key={day}>{renderHoursRow(day)}</View>
              ))}
            </View>
            {errors.hours && typeof errors.hours === "string" && (
              <Text style={styles.errorText}>{errors.hours}</Text>
            )}
          </View>
        </View>

        {/* Time Selection Modal */}
        <Modal
          visible={showTimeModal.day !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimeModal({ day: null, type: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Select {showTimeModal.type === "open" ? "Opening" : "Closing"} Time
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTimeModal({ day: null, type: null })}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={TIME_OPTIONS}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalItem,
                      item.value === "closed" && styles.modalItemClosed,
                    ]}
                    onPress={() => selectTime(item.value)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        item.value === "closed" && styles.modalItemTextClosed,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.modalList}
              />
            </View>
          </View>
        </Modal>

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
              <Text style={styles.submitButtonText}>Save & Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 8,
  },
  hoursContainer: {
    marginBottom: 20,
  },
  hoursTable: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: 8,
  },
  hoursHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary + "15",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hoursHeaderText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primary,
    textAlign: "center",
  },
  hoursRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "50",
  },
  dayColumn: {
    flex: 1,
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  timeColumn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeColumnError: {
    borderColor: colors.error,
    backgroundColor: "#FFF5F5",
  },
  timeText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  timeTextPlaceholder: {
    color: colors.textSecondary,
  },
  timeColumnClosed: {
    backgroundColor: colors.error + "15",
    borderColor: colors.error + "50",
  },
  timeTextClosed: {
    color: colors.error,
    fontFamily: fonts.semiBold,
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
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "30",
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  modalItemClosed: {
    backgroundColor: colors.error + "10",
    borderBottomColor: colors.error + "30",
  },
  modalItemTextClosed: {
    color: colors.error,
    fontFamily: fonts.semiBold,
  },
  amenitiesInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  amenitiesInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
    marginRight: 8,
  },
  addButton: {
    padding: 4,
  },
  amenitiesBadgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  amenityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "15",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityBadgeText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.primary,
    marginRight: 6,
  },
  removeBadgeButton: {
    padding: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperMultiline: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  inputWrapperError: {
    borderColor: colors.error,
    backgroundColor: "#FFF5F5",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 80,
    paddingTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
});

export default PlaceDetailsOnboarding;
