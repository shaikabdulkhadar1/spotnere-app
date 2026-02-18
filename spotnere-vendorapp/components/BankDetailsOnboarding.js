/**
 * Bank Details Onboarding Component
 * Page to collect vendor bank account details
 * Shown after PlaceDetailsOnboarding for new users
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { supabase } from "../config/supabase";
import { useApp } from "../contexts/AppContext";

const BankDetailsOnboarding = ({ onComplete }) => {
  const { user, refreshData } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.account_holder_name.trim()) {
      newErrors.account_holder_name = "Account holder name is required";
    }

    if (!formData.account_number.trim()) {
      newErrors.account_number = "Account number is required";
    } else if (!/^\d+$/.test(formData.account_number.trim())) {
      newErrors.account_number = "Account number must contain only numbers";
    }

    if (!formData.ifsc_code.trim()) {
      newErrors.ifsc_code = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc_code.trim().toUpperCase())) {
      newErrors.ifsc_code = "Please enter a valid IFSC code (e.g., ABCD0123456)";
    }

    if (!formData.upi_id.trim()) {
      newErrors.upi_id = "UPI ID is required";
    } else if (!/^[\w.-]+@[\w]+$/.test(formData.upi_id.trim())) {
      newErrors.upi_id = "Please enter a valid UPI ID (e.g., name@paytm)";
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

    if (!user?.id) {
      Alert.alert("Error", "User information not found. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare update data
      const updateData = {
        account_holder_name: formData.account_holder_name.trim(),
        account_number: formData.account_number.trim(),
        ifsc_code: formData.ifsc_code.trim().toUpperCase(),
        upi_id: formData.upi_id.trim(),
        updated_at: new Date().toISOString(),
      };

      // Update vendor in database
      const { error } = await supabase
        .from("vendors")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Refresh user data
      await refreshData();

      // Call completion callback
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving bank details:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save bank details. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInputField = (
    field,
    label,
    placeholder,
    keyboardType = "default",
    icon = null,
    maxLength = null
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
            style={styles.input}
            value={value}
            onChangeText={(text) => handleInputChange(field, text)}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            keyboardType={keyboardType}
            maxLength={maxLength}
            autoCapitalize={field === "ifsc_code" ? "characters" : "words"}
          />
        </View>
        {hasError && <Text style={styles.errorText}>{errors[field]}</Text>}
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
            <Ionicons name="card-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Bank Account Details</Text>
          <Text style={styles.subtitle}>
            Add your bank account information to receive payments
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {renderInputField(
            "account_holder_name",
            "Account Holder Name",
            "Enter account holder name",
            "default",
            "person-outline"
          )}

          {renderInputField(
            "account_number",
            "Account Number",
            "Enter account number",
            "numeric",
            "keypad-outline"
          )}

          {renderInputField(
            "ifsc_code",
            "IFSC Code",
            "Enter IFSC code (e.g., ABCD0123456)",
            "default",
            "code-outline",
            11
          )}

          {renderInputField(
            "upi_id",
            "UPI ID",
            "Enter UPI ID (e.g., name@paytm)",
            "email-address",
            "wallet-outline"
          )}
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
});

export default BankDetailsOnboarding;
