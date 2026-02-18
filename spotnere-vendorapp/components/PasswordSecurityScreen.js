/**
 * Password & Security Screen Component
 * Allows vendor to change their password
 */

import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { fonts } from "../constants/fonts";
import { useApp } from "../contexts/AppContext";
import { supabase } from "../config/supabase";
import { hashPassword, verifyPassword } from "../utils/auth";

const PasswordSecurityScreen = ({ onBack }) => {
  const { user } = useApp();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword =
        "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User information not available");
      return;
    }

    setIsSaving(true);
    try {
      // First, verify the current password
      const { data: vendorData, error: fetchError } = await supabase
        .from("vendors")
        .select("password_hash")
        .eq("id", user.id)
        .single();

      if (fetchError || !vendorData) {
        throw new Error("Failed to verify current password");
      }

      // Verify current password
      const isValid = await verifyPassword(
        currentPassword,
        vendorData.password_hash
      );

      if (!isValid) {
        setErrors({ currentPassword: "Current password is incorrect" });
        setIsSaving(false);
        return;
      }

      // Hash the new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password in database
      const { error: updateError } = await supabase
        .from("vendors")
        .update({ password_hash: newPasswordHash })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      Alert.alert("Success", "Password updated successfully", [
        {
          text: "OK",
          onPress: () => {
            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setErrors({});
            if (onBack) {
              onBack();
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error updating password:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update password. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderPasswordField = (
    label,
    value,
    onChangeText,
    showPassword,
    setShowPassword,
    error,
    placeholder
  ) => {
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputContainer, error && styles.inputError]}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
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
          <Text style={styles.title}>Password & Security</Text>
        </View>
        {/* Spacer to balance the back button */}
        {onBack && <View style={styles.backButtonSpacer} />}
      </View>

      {/* Form */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  newPassword.length >= 6
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  newPassword.length >= 6
                    ? colors.success
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  newPassword.length >= 6 && styles.requirementTextMet,
                ]}
              >
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  newPassword === confirmPassword && newPassword.length > 0
                    ? "checkmark-circle"
                    : "ellipse-outline"
                }
                size={16}
                color={
                  newPassword === confirmPassword && newPassword.length > 0
                    ? colors.success
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  newPassword === confirmPassword &&
                    newPassword.length > 0 &&
                    styles.requirementTextMet,
                ]}
              >
                Passwords match
              </Text>
            </View>
          </View>
          <View style={styles.sectionCard}>
            {renderPasswordField(
              "Current Password",
              currentPassword,
              (text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) {
                  setErrors({ ...errors, currentPassword: "" });
                }
              },
              showCurrentPassword,
              setShowCurrentPassword,
              errors.currentPassword,
              "Enter your current password"
            )}

            <View style={styles.divider} />

            {renderPasswordField(
              "New Password",
              newPassword,
              (text) => {
                setNewPassword(text);
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: "" });
                }
              },
              showNewPassword,
              setShowNewPassword,
              errors.newPassword,
              "Enter your new password"
            )}

            <View style={styles.divider} />

            {renderPasswordField(
              "Confirm New Password",
              confirmPassword,
              (text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: "" });
                }
              },
              showConfirmPassword,
              setShowConfirmPassword,
              errors.confirmPassword,
              "Confirm your new password"
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.cancelButton}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
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
  sectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 10,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.error,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 10,
    marginRight: 10,
    marginVertical: 16,
  },
  requirementsContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  requirementTextMet: {
    color: colors.success,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: "#ffffff",
  },
});

export default PasswordSecurityScreen;
